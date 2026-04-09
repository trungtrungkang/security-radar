import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, ensureAppwriteConfig } from '@/lib/appwrite.server';
import { ID, Query } from 'node-appwrite';

const TARGET_REPOS = [
    { owner: 'vercel', repo: 'next.js', tech: 'Next.js' },
    { owner: 'nodejs', repo: 'node', tech: 'Node.js' },
    { owner: 'appwrite', repo: 'appwrite', tech: 'Appwrite' },
    { owner: 'matrix-org', repo: 'synapse', tech: 'Matrix' },
    { owner: 'livekit', repo: 'livekit', tech: 'LiveKit' }
];

export async function GET() {
    try {
        await ensureAppwriteConfig();
        const db = appwriteServer.databases;
        
        let newCount = 0;

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
                // Determine severity mapping or default to Medium
                const severity = adv.severity ? adv.severity.charAt(0).toUpperCase() + adv.severity.slice(1) : 'Medium';
                
                // Truncate description if too long
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
                    // check if exists
                    await db.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId);
                    // if exists, skip or update. We will just skip to save writes
                } catch (e: any) {
                    if (e.code === 404) {
                        try {
                            await db.createDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, documentId, payload);
                            newCount++;
                        } catch (err: any) {
                          // Could happen if attributes were just created and Appwrite cache hasn't updated
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
