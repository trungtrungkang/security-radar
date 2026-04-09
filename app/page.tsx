'use client';

import { useState, useMemo, useEffect } from 'react';
import SecurityCard, { SecurityFeed } from '@/components/SecurityCard';
import FilterBar from '@/components/FilterBar';
import styles from './page.module.css';

export default function Home() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [feeds, setFeeds] = useState<SecurityFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-feeds', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setFeeds(json.data);
      }
    } catch (e) {
      console.error('List feeds error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const syncFromGitHub = async () => {
    let headers: Record<string, string> = {};
    if (process.env.NODE_ENV !== 'development') {
      const secret = window.prompt("Vercel CRON_SECRET is required to force a manual sync on Production. Enter secret:");
      if (!secret) return; 
      headers['Authorization'] = `Bearer ${secret}`;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/cron/fetch-security', { headers });
      const json = await res.json();
      if (json.success) {
        alert(`Sync complete! ${json.newRecordsInserted} new/updated records processed.`);
        loadFeeds();
      } else {
        alert('Sync failed: ' + json.error);
      }
    } catch (e) {
      alert('Sync failed due to network error.');
    }
    setSyncing(false);
  };

  const technologies = useMemo(() => {
    const techSet = new Set(feeds.map(feed => feed.technology));
    return Array.from(techSet).sort();
  }, [feeds]);

  const datesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    feeds.forEach(feed => {
      try {
        const dateStr = new Date(feed.date).toISOString().split('T')[0];
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (e) {}
    });
    return Object.entries(counts).sort((a, b) => b[0].localeCompare(a[0]));
  }, [feeds]);

  const toggleFilter = (tech: string) => {
    setActiveFilters(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech) 
        : [...prev, tech]
    );
  };

  const clearFilters = () => setActiveFilters([]);

  const filteredFeeds = useMemo(() => {
    return feeds.filter(feed => {
      const matchTech = activeFilters.length === 0 || activeFilters.includes(feed.technology);
      let matchDate = true;
      if (dateFilter) {
        try {
          const feedDateString = new Date(feed.date).toISOString().split('T')[0];
          matchDate = feedDateString === dateFilter;
        } catch(e) {
          matchDate = true;
        }
      }
      return matchTech && matchDate;
    });
  }, [activeFilters, dateFilter, feeds]);

  return (
    <main className={`container ${styles.main}`}>
      <div className={styles.headerArea}>
        <h1 className={styles.title}>
          <span className={styles.highlight}>Security</span> Radar
        </h1>
        <p className={styles.subtitle}>
          Real-time security vulnerability and release tracking for your core stack.
        </p>
      </div>

      <div className={styles.contentLayout}>
        <aside className={styles.sidebar}>
          {!loading && feeds.length > 0 ? (
            <FilterBar 
              technologies={technologies} 
              activeFilters={activeFilters}
              onToggleFilter={toggleFilter}
              onClearFilters={clearFilters}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              datesWithCounts={datesWithCounts}
              totalFeeds={feeds.length}
            />
          ) : (
            <div className="glass-panel" style={{ padding: '24px', opacity: 0.7 }}>
              Filters loading...
            </div>
          )}

          <div className="glass-panel" style={{ marginTop: '32px', padding: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Alert Systems
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Instant matrix/email notifications for your stack.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="email" 
                placeholder="Email address" 
                className={styles.input} 
                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              />
              <button className="btn btn-primary" style={{ padding: '8px 12px', width: '100%', fontSize: '0.9rem' }}>
                Subscribe
              </button>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button 
              onClick={syncFromGitHub} 
              disabled={syncing}
              style={{ 
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                opacity: 0.7
              }}
            >
              {syncing ? 'Syncing hidden...' : 'Force manual sync'}
            </button>
          </div>
        </aside>

        <section className={styles.mainContent}>
          {loading ? (
            <div className={styles.emptyState}>Loading security feeds from Appwrite DB...</div>
          ) : feeds.length === 0 ? (
            <div className={styles.emptyState}>
              No security advisories found in the database. <br/>
              <strong>Click "Force Sync Updates Now" above to load data!</strong>
            </div>
          ) : filteredFeeds.length === 0 ? (
            <div className={styles.emptyState}>
              No security advisories matched your filters. You are safe! 🛡️
            </div>
          ) : (
            <div className="grid-cards">
              {filteredFeeds.map(feed => (
                <SecurityCard key={feed.id} feed={feed} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
