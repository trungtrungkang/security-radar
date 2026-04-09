import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID } from '@/lib/appwrite.server';
import { Query } from 'node-appwrite';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '30', 10);
        const techParam = searchParams.get('tech');
        const dateParam = searchParams.get('date');

        const db = appwriteServer.databases;
        
        try {
            const queries = [
                Query.limit(limit > 100 ? 100 : limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('date')
            ];

            if (techParam) {
                queries.push(Query.equal('technology', techParam.split(',')));
            }

            if (dateParam && /^\d{4}-\d{2}$/.test(dateParam)) {
                const year = parseInt(dateParam.split('-')[0], 10);
                const month = parseInt(dateParam.split('-')[1], 10);
                const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
                const endDate = new Date(Date.UTC(year, month, 1)).toISOString();
                
                queries.push(Query.greaterThanEqual('date', startDate));
                queries.push(Query.lessThan('date', endDate));
            }

            const result = await db.listDocuments(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, queries);

            const mapDocumentToFeed = (doc: any) => ({
                id: doc.$id,
                title: doc.title,
                technology: doc.technology,
                severity: doc.severity,
                date: doc.date,
                description: doc.description,
                link: doc.link
            });

            return NextResponse.json({ 
                success: true, 
                data: result.documents.map(mapDocumentToFeed),
                total: result.total,
                page,
                limit
            });
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
