import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID } from '@/lib/appwrite.server';
import { Query } from 'node-appwrite';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = appwriteServer.databases;
        
        try {
            const result = await db.listDocuments(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, [
                Query.orderDesc('date'),
                Query.limit(100)
            ]);

            const mapDocumentToFeed = (doc: any) => ({
                id: doc.$id,
                title: doc.title,
                technology: doc.technology,
                severity: doc.severity,
                date: doc.date,
                description: doc.description,
                link: doc.link
            });

            return NextResponse.json({ success: true, data: result.documents.map(mapDocumentToFeed) });
        } catch (dbError: any) {
            // DB might not be initialized yet
            if (dbError.code === 404) {
                 return NextResponse.json({ success: true, data: [] });
            }
            throw dbError;
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
