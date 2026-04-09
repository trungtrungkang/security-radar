'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import SecurityCard, { SecurityFeed } from '@/components/SecurityCard';
import FilterBar from '@/components/FilterBar';
import styles from './page.module.css';

export default function Home() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [feeds, setFeeds] = useState<SecurityFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Newsletter States
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subMessage, setSubMessage] = useState('');

  const handleSubscribe = async () => {
    if (!email) return;
    setSubscribing(true);
    setSubMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setSubMessage('✅ Subscribed successfully!');
        setEmail('');
      } else {
        setSubMessage('❌ ' + data.error);
      }
    } catch (e) {
      setSubMessage('❌ Network error. Please try again.');
    }
    setSubscribing(false);
  };

  const loadFeeds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '30');
      if (activeFilters.length > 0) params.append('tech', activeFilters.join(','));
      if (dateFilter) params.append('date', dateFilter);

      const res = await fetch(`/api/security-feeds?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setFeeds(json.data);
        setTotalPages(Math.ceil(json.total / json.limit));
      }
    } catch (e) {
      console.error('List feeds error:', e);
    }
    setLoading(false);
  }, [page, activeFilters, dateFilter]);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

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

  const technologies = [
    'Android', 'Apple', 'Appwrite', 'BleepingComputer', 'Docker', 'Golang', 'MacOS', 'Next.js', 'Node.js', 'Safari', 'Windows', 'iOS'
  ];

  const availableMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() - i);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
    }
    return months;
  }, []);

  const toggleFilter = (tech: string) => {
    setPage(1);
    setActiveFilters(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech) 
        : [...prev, tech]
    );
  };

  const clearFilters = () => {
    setPage(1);
    setActiveFilters([]);
  };

  const handleDateChange = (date: string) => {
    setPage(1);
    setDateFilter(date);
  };

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
          {!loading ? (
            <FilterBar 
              technologies={technologies} 
              activeFilters={activeFilters}
              onToggleFilter={toggleFilter}
              onClearFilters={clearFilters}
              dateFilter={dateFilter}
              onDateChange={handleDateChange}
              availableMonths={availableMonths}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button 
                className="btn btn-primary" 
                style={{ padding: '8px 12px', width: '100%', fontSize: '0.9rem' }}
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? 'Submitting...' : 'Subscribe'}
              </button>
              {subMessage && (
                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: subMessage.includes('✅') ? 'var(--severity-low)' : 'var(--severity-critical)' }}>
                  {subMessage}
                </div>
              )}
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
          ) : feeds.length === 0 ? (
            <div className={styles.emptyState}>
              No security advisories matched your filters or database is empty. You are safe! 🛡️
            </div>
          ) : (
            <>
              <div className="grid-cards">
                {feeds.map(feed => (
                  <SecurityCard key={feed.id} feed={feed} />
                ))}
              </div>
              <div className={styles.paginationSettings} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '8px 16px', borderRadius: '8px' }}>Previous</button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages || 1}</span>
                <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '8px 16px', borderRadius: '8px' }}>Next</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
