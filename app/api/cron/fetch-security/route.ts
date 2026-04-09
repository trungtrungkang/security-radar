import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, ensureAppwriteConfig } from '@/lib/appwrite.server';
import { ID } from 'node-appwrite';

const GITHUB_SOURCES = [
    { owner: 'vercel', repo: 'next.js', tech: 'Next.js' },
    { owner: 'matrix-org', repo: 'synapse', tech: 'Matrix' },
    { owner: 'livekit', repo: 'livekit', tech: 'LiveKit' },
    { owner: 'golang', repo: 'go', tech: 'Golang' },
    { owner: 'python', repo: 'cpython', tech: 'Python' },
    { owner: 'rust-lang', repo: 'rust', tech: 'Rust' },
    { owner: 'apple', repo: 'swift', tech: 'Swift' },
    { owner: 'JetBrains', repo: 'kotlin', tech: 'Kotlin' },
    { owner: 'electron', repo: 'electron', tech: 'Electron' },
    { owner: 'chromium', repo: 'chromium', tech: 'Chromium' },
    { owner: 'mozilla', repo: 'gecko-dev', tech: 'Firefox' }
];

const CIRCL_SOURCES = [
    { vendor: 'nodejs', product: 'node.js', tech: 'Node.js' },
    { vendor: 'appwrite', product: 'appwrite', tech: 'Appwrite' },
    { vendor: 'microsoft', product: 'windows_11', tech: 'Windows' },
    { vendor: 'apple', product: 'mac_os_x', tech: 'MacOS' },
    { vendor: 'apple', product: 'iphone_os', tech: 'iOS' },
    { vendor: 'google', product: 'android', tech: 'Android' },
    { vendor: 'apple', product: 'safari', tech: 'Safari' }
];

async function notifyMatrix(feed: any) {
    const webhookUrl = process.env.MATRIX_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
        text: `🚨 [${feed.severity} Alert] ${feed.technology} - ${feed.title}\nAdvisory: ${feed.link}`,
        msgtype: "m.text"
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`Notification sent for ${feed.technology}`);
    } catch (error) {
        console.error('Matrix Webhook Error:', error);
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (
            process.env.NODE_ENV !== 'development' && 
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Invalid Cron Secret' }, { status: 401 });
        }

        await ensureAppwriteConfig();
        const db = appwriteServer.databases;
        let newCount = 0;

        // 1. Fetch from GitHub Advisory arrays
        const ghToken = process.env.GITHUB_TOKEN;
        for (const target of GITHUB_SOURCES) {
            const headers: Record<string, string> = {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Security-Tracker-App'
            };
            
            if (ghToken) {
                headers['Authorization'] = `Bearer ${ghToken}`;
            }

            const res = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}/security-advisories`, {
                headers
            });

            if (!res.ok) {
                console.warn(`Failed to fetch for ${target.tech}: ${res.statusText}`);
                continue;
            }

            const advisories = await res.json();
            
            for (const adv of advisories) {
                const severity = adv.severity ? adv.severity.charAt(0).toUpperCase() + adv.severity.slice(1) : 'Medium';
                const fullDescription = adv.description || adv.summary || 'No description provided.';
                
                const payload = {
                    title: adv.title || adv.summary || 'Security Advisory',
                    technology: target.tech,
                    severity: severity,
                    date: adv.published_at || adv.updated_at || new Date().toISOString(),
                    description: fullDescription.substring(0, 4999),
                    link: adv.html_url
                };

                const documentId = adv.ghsa_id || ID.unique();

                try {
                    await db.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId);
                } catch (e: any) {
                    if (e.code === 404) {
                        try {
                            await db.createDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId, payload);
                            newCount++;

                            if (severity === 'High' || severity === 'Critical') {
                                await notifyMatrix(payload);
                            }
                        } catch (err: any) {
                            console.error(`Failed to create document ${documentId}:`, err);
                        }
                    }
                }
            }
        }

        // 2. Fetch from CIRCL API (The Free NVD Mirror in EU)
        for (const target of CIRCL_SOURCES) {
            const circlUrl = `https://cve.circl.lu/api/search/${target.vendor}/${target.product}`;
            const res = await fetch(circlUrl, {
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                console.warn(`Failed to fetch CIRCL for ${target.tech}: ${res.statusText}`);
                continue;
            }

            const data = await res.json();
            
            // CIRCL returns a deeply nested object: { results: { fkie_nvd: [ ["key", {cve_obj}] ] } }
            const resultsObj = data?.results || {};
            const nvdArray = resultsObj.fkie_nvd || resultsObj.nvd || [];
            
            // Extract the actual CVE objects which are at index 1 of each tuple
            const rawVulns = Array.isArray(data) ? data : nvdArray.map((item: any) => Array.isArray(item) ? item[1] : item);
            const vulnerabilities = rawVulns.slice(0, 5); // Grab 5 most recent
            
            for (const cve of vulnerabilities) {
                if (!cve || !cve.id) continue;

                const title = cve.id; // e.g. CVE-2023-XXXXX
                const date = cve.published || cve.Published || new Date().toISOString();
                
                const descObj = cve.descriptions?.find((d: any) => d.lang === 'en') || cve.descriptions?.[0];
                const fullDescription = descObj?.value || cve.summary || 'No description provided.';
                
                let severity = 'Medium';
                if (cve.metrics?.cvssMetricV31?.[0]) {
                    const sevScore = cve.metrics.cvssMetricV31[0].cvssData.baseSeverity;
                    severity = sevScore ? sevScore.charAt(0).toUpperCase() + sevScore.slice(1).toLowerCase() : 'Medium';
                } else if (cve.cvss) {
                    const score = parseFloat(cve.cvss);
                    if (score >= 9.0) severity = 'Critical';
                    else if (score >= 7.0) severity = 'High';
                    else if (score >= 4.0) severity = 'Medium';
                    else severity = 'Low';
                }

                const payload = {
                    title: `${target.tech} Security Update: ${title}`,
                    technology: target.tech,
                    severity: severity,
                    date: date,
                    description: fullDescription.substring(0, 4999), 
                    link: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${title}`
                };

                const documentId = title;

                try {
                    await db.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId);
                } catch (e: any) {
                    if (e.code === 404) {
                        try {
                            await db.createDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId, payload);
                            newCount++;

                            if (severity === 'High' || severity === 'Critical') {
                                await notifyMatrix(payload);
                            }
                        } catch (err: any) {
                            console.error(`Failed to create CIRCL document ${documentId}:`, err);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, newRecordsInserted: newCount });
    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
