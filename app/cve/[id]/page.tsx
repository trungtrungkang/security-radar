import { appwriteServer, APPWRITE_DB_ID, APPWRITE_COLLECTION_ID } from '@/lib/appwrite.server';
import Link from 'next/link';
import styles from './page.module.css';

export default async function CVEDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    let feed = null;
    try {
        const doc = await appwriteServer.databases.getDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, id);
        feed = {
            id: doc.$id,
            title: doc.title,
            technology: doc.technology,
            severity: doc.severity,
            date: doc.date,
            description: doc.description,
            link: doc.link
        };
    } catch (e) {
        return (
            <main className={`container ${styles.main}`}>
                <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
                    <h1>Vulnerability Not Found</h1>
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>The requested security advisory could not be located in our database.</p>
                    <div style={{ marginTop: '32px' }}>
                        <Link href="/" className="btn btn-primary">← Back to Dashboard</Link>
                    </div>
                </div>
            </main>
        );
    }

    const formattedDate = new Date(feed.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const getSeverityColor = (sev: string) => {
        switch (sev.toLowerCase()) {
            case 'critical': return 'var(--severity-critical)';
            case 'high': return '#f97316'; // High orange
            case 'medium': return 'var(--severity-medium)';
            default: return 'var(--severity-neutral)';
        }
    };

    return (
        <main className={`container ${styles.main}`}>
            <div style={{ marginBottom: '32px' }}>
                <Link href="/" className={styles.backLink}>← Back to Dashboard</Link>
            </div>
            
            <article className={`glass-panel ${styles.detailCard}`}>
                <div className={styles.header}>
                    <span className={styles.techBadge}>{feed.technology}</span>
                    <span 
                        className={styles.severityBadge} 
                        style={{ backgroundColor: `${getSeverityColor(feed.severity)}20`, color: getSeverityColor(feed.severity), border: `1px solid ${getSeverityColor(feed.severity)}40` }}
                    >
                        {feed.severity}
                    </span>
                </div>
                
                <h1 className={styles.title}>{feed.title}</h1>
                <p className={styles.date}>Published on {formattedDate} • ID: {feed.id}</p>
                
                <div className={styles.content}>
                    <h3>Advisory Description</h3>
                    <p className={styles.description}>{feed.description}</p>
                </div>
                
                <div className={styles.actions}>
                    <a href={feed.link} target="_blank" rel="noopener noreferrer" className={`btn ${styles.externalBtn}`}>
                        View Original Advisory on External Source ↗
                    </a>
                </div>
            </article>
        </main>
    );
}
