import { Client, Databases, ID, Query } from 'node-appwrite';

const createAdminClient = () => {
    const client = new Client();

    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_SECRET) {
        console.warn('Appwrite environment variables are missing.');
    }

    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
        .setKey(process.env.APPWRITE_API_SECRET || '');

    return {
        get databases() {
            return new Databases(client);
        }
    };
};

export const appwriteServer = createAdminClient();
export const APPWRITE_DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'security_feeds_db';
export const APPWRITE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || 'cve_data';

export async function ensureAppwriteConfig() {
    const db = appwriteServer.databases;
    
    try {
        // Try to get database
        await db.get(APPWRITE_DB_ID);
    } catch (e: any) {
        if (e.code === 404) {
            console.log('Database not found. Creating database...');
            await db.create(APPWRITE_DB_ID, 'Security Feeds DB');
        } else {
            throw e;
        }
    }

    try {
        // Try to get collection
        await db.getCollection(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID);
    } catch (e: any) {
        if (e.code === 404) {
            console.log('Collection not found. Creating collection...');
            await db.createCollection(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'CVE Data');
            console.log('Creating attributes...');
            await db.createStringAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'title', 255, true);
            await db.createStringAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'technology', 100, true);
            await db.createStringAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'severity', 50, true);
            await db.createDatetimeAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'date', true);
            await db.createStringAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'description', 5000, true);
            await db.createUrlAttribute(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, 'link', true);
            
            console.log('Waiting for attributes to be created...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            throw e;
        }
    }
}
