import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, APPWRITE_SUBSCRIBER_COLLECTION_ID, ensureAppwriteConfig } from '@/lib/appwrite.server';
import { ID, Query } from 'node-appwrite';
import { Resend } from 'resend';
import Parser from 'rss-parser';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const rssParser = new Parser();

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
    { vendor: 'apple', product: 'safari', tech: 'Safari' },
    { vendor: 'docker', product: 'docker', tech: 'Docker' }
];

const RSS_SOURCES = [
    {
        url: 'https://nodejs.org/en/feed/blog.xml',
        tech: 'Node.js',
        titleMatch: ['security'],
        linkMatch: ['/vulnerability/'],
        severity: 'High'
    },
    {
        url: 'https://go.dev/blog/feed.atom',
        tech: 'Golang',
        titleMatch: ['security'],
        linkMatch: [],
        severity: 'High'
    },
    {
        url: 'https://www.bleepingcomputer.com/feed/',
        tech: 'BleepingComputer',
        titleMatch: ['zero-day', 'cve-', 'critical'],
        linkMatch: [],
        severity: 'Critical'
    },
    {
        url: 'https://developer.apple.com/news/releases/rss/releases.rss',
        tech: 'Apple',
        titleMatch: [],
        linkMatch: [],
        severity: 'Medium'
    }
];

async function notifyAlerts(feed: any, db: any) {
    // 1. Notify Matrix
    const webhookUrl = process.env.MATRIX_WEBHOOK_URL;
    if (webhookUrl) {
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
            console.log(`Matrix notification sent for ${feed.technology}`);
        } catch (error) {
            console.error('Matrix Webhook Error:', error);
        }
    }

    // 2. Notify Email Subscribers via Resend
    if (process.env.RESEND_API_KEY) {
        try {
            const subsData = await db.listDocuments(APPWRITE_DB_ID, APPWRITE_SUBSCRIBER_COLLECTION_ID, [
                Query.limit(100) // Supports up to 100 subscribers per request right now
            ]);

            const emails = subsData.documents.map((doc: any) => doc.email);

            if (emails.length > 0) {
                const appDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL
                    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
                    : (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));

                const htmlTemplate = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <img src="${appDomain}/images/logo_512x512.png" alt="Security Radar" width="64" style="border-radius: 8px; margin-bottom: 12px; display: block;" />
                        <h2 style="color: ${feed.severity === 'Critical' ? '#dc2626' : '#ea580c'}; margin-top: 0;">🚨 Security Radar Alert</h2>
                        <h3>New <strong>${feed.severity}</strong> Vulnerability found in ${feed.technology}!</h3>
                        <p><strong>Title:</strong> ${feed.title}</p>
                        <p><strong>Published Date:</strong> ${feed.date}</p>
                        <hr />
                        <p style="white-space: pre-wrap;">${feed.description}</p>
                        <br />
                        <a href="${feed.link}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Full Advisory</a>
                    </div>
                `;

                // Send email
                await resend.emails.send({
                    from: 'Security Radar <alerts@backingscore.com>',
                    to: emails, // Sending dynamically to multiple directly or bcc to mask
                    subject: `[${feed.severity}] ${feed.technology} Vulnerability Alert`,
                    html: htmlTemplate
                });
                console.log(`Resend email dispatched to ${emails.length} subscribers.`);
            }
        } catch (error) {
            console.error('Resend Email Error:', error);
        }
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
                                await notifyAlerts(payload, db);
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
                                await notifyAlerts(payload, db);
                            }
                        } catch (err: any) {
                            console.error(`Failed to create CIRCL document ${documentId}:`, err);
                        }
                    }
                }
            }
        }

        // 3. Fetch from Multi-Channel RSS Sources
        try {
            for (const source of RSS_SOURCES) {
                try {
                    const feed = await rssParser.parseURL(source.url);

                    for (const item of feed.items) {
                        const titleLower = item.title?.toLowerCase() || '';
                        const linkLower = item.link?.toLowerCase() || '';

                        // Rule Matching Engine
                        let matchTitle = source.titleMatch.length === 0; // If empty, auto-match
                        let matchLink = source.linkMatch.length === 0;

                        if (source.titleMatch.length > 0) {
                            matchTitle = source.titleMatch.some(keyword => titleLower.includes(keyword));
                        }

                        if (source.linkMatch.length > 0) {
                            matchLink = source.linkMatch.some(keyword => linkLower.includes(keyword));
                        }

                        if (matchTitle && matchLink) {
                            // MD5 Anti-duplication Hashing
                            const hashInput = item.link || item.guid || item.title || ID.unique();
                            const docIdHash = crypto.createHash('md5').update(hashInput).digest('hex');

                            const payload = {
                                title: `[Early Warning] ${item.title}`,
                                technology: source.tech,
                                severity: source.severity,
                                date: item.pubDate || item.isoDate || new Date().toISOString(),
                                description: `A newly spotted release matching security radar criteria has been announced by ${source.tech}.\n\nRead the full advisory here:\n${item.link}`,
                                link: item.link || source.url
                            };

                            try {
                                await db.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, docIdHash);
                            } catch (e: any) {
                                if (e.code === 404) {
                                    try {
                                        await db.createDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, docIdHash, payload);
                                        newCount++;

                                        if (source.severity === 'High' || source.severity === 'Critical') {
                                            await notifyAlerts(payload, db);
                                        }
                                    } catch (err: any) {
                                        console.error(`Failed to create RSS document ${docIdHash}:`, err);
                                    }
                                }
                            }
                        }
                    }
                } catch (sourceError) {
                    console.warn(`Failed to fetch RSS for ${source.tech}:`, sourceError);
                }
            }
        } catch (error) {
            console.error('RSS Feed Error:', error);
        }

        return NextResponse.json({ success: true, newRecordsInserted: newCount });
    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
