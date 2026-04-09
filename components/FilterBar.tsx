'use client';

import React from 'react';
import styles from './FilterBar.module.css';

export default function FilterBar({
  technologies,
  activeFilter,
  onFilterChange
} : {
  technologies: string[];
  activeFilter: string | null;
  onFilterChange: (tech: string | null) => void;
}) {
  return (
    <div className={styles.filterContainer}>
      <button 
        className={`${styles.filterBtn} ${activeFilter === null ? styles.active : ''}`}
        onClick={() => onFilterChange(null)}
      >
        All Updates
      </button>
      
      {technologies.map(tech => (
        <button
          key={tech}
          className={`${styles.filterBtn} ${activeFilter === tech ? styles.active : ''}`}
          onClick={() => onFilterChange(tech)}
        >
          {tech}
        </button>
      ))}
    </div>
  );
}
