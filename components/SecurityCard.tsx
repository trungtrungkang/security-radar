import React from 'react';
import Link from 'next/link';
import styles from './SecurityCard.module.css';

export type SecurityFeed = {
  id: string;
  title: string;
  technology: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  date: string;
  description: string;
  link: string;
};

export default function SecurityCard({ feed }: { feed: SecurityFeed }) {
  const getSeverityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles.severityCritical;
      case 'high': return styles.severityHigh;
      case 'medium': return styles.severityMedium;
      case 'low': return styles.severityLow;
      default: return styles.severityNeutral;
    }
  };

  const formattedDate = new Date(feed.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <article className={`glass-panel ${styles.card}`}>
      <div className={styles.header}>
        <span className={styles.techBadge}>{feed.technology}</span>
        <span className={`${styles.severityBadge} ${getSeverityClass(feed.severity)}`}>
          {feed.severity}
        </span>
      </div>
      
      <h3 className={styles.title}>{feed.title}</h3>
      <p className={styles.date}>{formattedDate}</p>
      
      <p className={styles.description}>
        {feed.description.length > 150 
          ? feed.description.substring(0, 150) + '...' 
          : feed.description}
      </p>
      
      <div className={styles.footer}>
        <Link href={`/cve/${feed.id}`} className={styles.readMore}>
          View Details →
        </Link>
      </div>
    </article>
  );
}
