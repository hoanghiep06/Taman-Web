import React from 'react';
import styles from './ElderSearchFilter.module.css';

export const ElderSearchFilter = ({
    searchTerm, 
    onSearchChange, 
    activeFilter, 
    onFilterChange, 
    counts = { all: 0, warning: 0, weightDue: 0 }
}) => {
    return (
        <div className={styles.filterContainer}>
            <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm kiếm theo tên, mã số, phòng..."
                    className={styles.searchInput}
                />
                {searchTerm && (
                    <button 
                        type="button"
                        onClick={() => onSearchChange('')}
                        className={styles.clearBtn}
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className={styles.chipGroup}>
                <button
                    type="button"
                    onClick={() => onFilterChange('ALL')}
                    className={`${styles.btnChip} ${activeFilter === 'ALL' ? styles.btnChipActiveAll : ''}`}
                >
                    👥 Tất cả các Cụ <span className={styles.badgeCount}>{counts.all}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onFilterChange('WARNING')}
                    className={`${styles.btnChip} ${activeFilter === 'WARNING' ? styles.btnChipActiveWarning : ''}`}
                >
                    🚨 Cần chú ý ngay <span className={styles.badgeCount}>{counts.warning}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onFilterChange('WEIGHT_DUE')}
                    className={`${styles.btnChip} ${activeFilter === 'WEIGHT_DUE' ? styles.btnChipActiveWeight : ''}`}
                >
                    ⚖️ Cần cân tháng này <span className={styles.badgeCount}>{counts.weightDue}</span>
                </button>
            </div>
        </div>
    );
};