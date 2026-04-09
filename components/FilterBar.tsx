'use client';

import React from 'react';
import styles from './FilterBar.module.css';

export default function FilterBar({
  technologies,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  dateFilter,
  onDateChange,
  datesWithCounts,
  totalFeeds
} : {
  technologies: string[];
  activeFilters: string[];
  onToggleFilter: (tech: string) => void;
  onClearFilters: () => void;
  dateFilter: string;
  onDateChange: (date: string) => void;
  datesWithCounts: [string, number][];
  totalFeeds: number;
}) {
  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterHeader}>Tech Stack</div>
      <button 
        className={`${styles.filterBtn} ${activeFilters.length === 0 ? styles.active : ''}`}
        onClick={onClearFilters}
      >
        All Updates
      </button>
      
      {technologies.map(tech => (
        <button
          key={tech}
          className={`${styles.filterBtn} ${activeFilters.includes(tech) ? styles.active : ''}`}
          onClick={() => onToggleFilter(tech)}
        >
          {tech}
          {activeFilters.includes(tech) && <span>✓</span>}
        </button>
      ))}

      <div className={styles.dateFilterWrapper}>
        <div className={styles.dateLabel}>Timeline Filter</div>
        <select 
          className={styles.dateSelect}
          value={dateFilter}
          onChange={(e) => onDateChange(e.target.value)}
        >
          <option value="">All Dates ({totalFeeds})</option>
          {datesWithCounts.map(([date, count]) => (
            <option key={date} value={date}>
              {date} ({count})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
