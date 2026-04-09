import { NextResponse } from 'next/server';
import { appwriteServer, APPWRITE_DB_ID, APPWRITE_SUBSCRIBER_COLLECTION_ID, ensureAppwriteConfig } from '@/lib/appwrite.server';
import { ID, Query } from 'node-appwrite';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        
        if (!email || !email.includes('@')) {
            return NextResponse.json({ success: false, error: 'Invalid email address provided.' }, { status: 400 });
        }

        // Initialize Appwrite and ensure our collection is ready
        await ensureAppwriteConfig();
        const db = appwriteServer.databases;

        // Check if email already exists
        const existingDocs = await db.listDocuments(APPWRITE_DB_ID, APPWRITE_SUBSCRIBER_COLLECTION_ID, [
            Query.equal('email', email)
        ]);

        if (existingDocs.documents.length > 0) {
            return NextResponse.json({ success: false, error: 'This email is already subscribed.' }, { status: 409 });
        }

        // Create new subscriber doc
        await db.createDocument(APPWRITE_DB_ID, APPWRITE_SUBSCRIBER_COLLECTION_ID, ID.unique(), {
            email: email
        });

        return NextResponse.json({ success: true, message: 'Successfully subscribed to security alerts!' });

    } catch (error: any) {
        console.error('Subscription API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error while subscribing.' }, { status: 500 });
    }
}
