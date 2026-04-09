import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, ensureAppwriteConfig } from '@/lib/appwrite.server';
import { ID } from 'node-appwrite';

const TARGET_REPOS = [
    { owner: 'vercel', repo: 'next.js', tech: 'Next.js' },
    { owner: 'nodejs', repo: 'node', tech: 'Node.js' },
    { owner: 'appwrite', repo: 'appwrite', tech: 'Appwrite' },
    { owner: 'matrix-org', repo: 'synapse', tech: 'Matrix' },
    { owner: 'livekit', repo: 'livekit', tech: 'LiveKit' }
];

async function notifyMatrix(feed: any) {
    const webhookUrl = process.env.MATRIX_WEBHOOK_URL;
    if (!webhookUrl) return;

    // Formatting for modern Matrix or Discord/Slack style webhooks
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
        // 1. Cron Security check
        const authHeader = request.headers.get('Authorization');
        if (
            process.env.NODE_ENV !== 'development' && 
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Invalid Cron Secret' }, { status: 401 });
        }

        // 2. Init Appwrite SDK
        await ensureAppwriteConfig();
        const db = appwriteServer.databases;
        let newCount = 0;

        // 3. Fetch from all target repositories
        for (const target of TARGET_REPOS) {
            const res = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}/security-advisories`, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'Security-Tracker-App'
                }
            });

            if (!res.ok) {
                console.warn(`Failed to fetch for ${target.tech}: ${res.statusText}`);
                continue;
            }

            const advisories = await res.json();
            
            for (const adv of advisories) {
                const severity = adv.severity ? adv.severity.charAt(0).toUpperCase() + adv.severity.slice(1) : 'Medium';
                const description = adv.summary || adv.description?.substring(0, 500) || 'No description provided.';
                
                const payload = {
                    title: adv.title || adv.summary || 'Security Advisory',
                    technology: target.tech,
                    severity: severity,
                    date: adv.published_at || adv.updated_at || new Date().toISOString(),
                    description: description,
                    link: adv.html_url
                };

                const documentId = adv.ghsa_id || ID.unique();

                try {
                    await db.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId);
                } catch (e: any) {
                    if (e.code === 404) { // Does not exist
                        try {
                            await db.createDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId, payload);
                            newCount++;

                            // Trigger notification only for High/Critical severities
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

        return NextResponse.json({ success: true, newRecordsInserted: newCount });
    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
