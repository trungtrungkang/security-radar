import { Client, Databases, Account } from 'appwrite';

const client = new Client();

// NOTE: Please replace with your actual Appwrite Endpoint and Project ID
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID');

export const account = new Account(client);
export const databases = new Databases(client);

// Default Database ID config
export const APPWRITE_DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'security_feeds_db';
export const APPWRITE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || 'cve_data';
