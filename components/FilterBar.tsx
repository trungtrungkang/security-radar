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
  availableMonths
} : {
  technologies: string[];
  activeFilters: string[];
  onToggleFilter: (tech: string) => void;
  onClearFilters: () => void;
  dateFilter: string;
  onDateChange: (date: string) => void;
  availableMonths: string[];
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
          <option value="">All Times</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
