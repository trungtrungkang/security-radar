'use client';

import { useState, useMemo, useEffect } from 'react';
import SecurityCard, { SecurityFeed } from '@/components/SecurityCard';
import FilterBar from '@/components/FilterBar';
import styles from './page.module.css';

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<SecurityFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch from database on load
  const loadFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-feeds', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setFeeds(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  // Trigger GitHub Cron sync manually
  const syncFromGitHub = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/cron/fetch-security');
      const json = await res.json();
      if (json.success) {
        alert(`Sync complete! ${json.newRecordsInserted} records inserted/updated.`);
        loadFeeds(); // reload the data
      } else {
        alert('Sync failed: ' + json.error);
      }
    } catch (e) {
      alert('Sync failed.');
    }
    setSyncing(false);
  };

  // Extract unique technologies from feeds
  const technologies = useMemo(() => {
    const techSet = new Set(feeds.map(feed => feed.technology));
    return Array.from(techSet).sort();
  }, [feeds]);

  // Filter feeds
  const filteredFeeds = useMemo(() => {
    if (!activeFilter) return feeds;
    return feeds.filter(feed => feed.technology === activeFilter);
  }, [activeFilter, feeds]);

  return (
    <main className={`container ${styles.main}`}>
      <div className={styles.headerArea}>
        <h1 className={styles.title}>
          <span className={styles.highlight}>Security</span> Radar
        </h1>
        <p className={styles.subtitle}>
          Real-time security vulnerability and release tracking for your core stack.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '24px' }}>
            <button 
              onClick={syncFromGitHub} 
              disabled={syncing}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              {syncing ? 'Fetching...' : 'Sync with GitHub (Cron Simulation)'}
            </button>
          </div>
        )}
      </div>

      {!loading && feeds.length > 0 && (
        <FilterBar 
          technologies={technologies} 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
        />
      )}

      {loading ? (
        <div className={styles.emptyState}>Loading security feeds from Appwrite DB...</div>
      ) : feeds.length === 0 ? (
        <div className={styles.emptyState}>
          No security advisories found in the database. <br/>
          <strong>Click "Sync with GitHub" above to initialize Appwrite DB and load data!</strong>
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className={styles.emptyState}>
          No recent security advisories for {activeFilter}. You are safe! 🛡️
        </div>
      ) : (
        <div className="grid-cards">
          {filteredFeeds.map(feed => (
            <SecurityCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}
      
      <div className={styles.newsletterSection}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '64px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Subscribe for Alerts</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Get instant Matrix/Email notifications when critical CVEs match your tech stack.
          </p>
          <div className={styles.formGroup}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              className={styles.input} 
            />
            <button className="btn btn-primary">Subscribe</button>
          </div>
        </div>
      </div>
    </main>
  );
}
