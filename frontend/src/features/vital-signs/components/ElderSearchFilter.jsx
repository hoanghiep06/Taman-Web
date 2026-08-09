import React from 'react';
import styles from './ElderSearchFilter.module.css';

export const ElderSearchFilter = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode = 'VITALS',
  onViewModeChange,
  canManageWeightDue = false,
  counts = { all: 0, warning: 0, weightDue: 0 }
}) => {
  return (
    <div className={styles.filterContainer}>
      <div className={styles.topRow}>
        {/* THANH TÌM KIẾM */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm tên, phòng..."
            className={styles.searchInput}
          />
          {searchTerm && (
            <button type="button" onClick={() => onSearchChange('')} className={styles.clearBtn}>✕</button>
          )}
        </div>

        {/* CHUYỂN ĐỔI CHẾ ĐỘ XEM TRỰC TIẾP (Đã rút gọn chữ) */}
        <div className={styles.viewModeToggle}>
          <button
            type="button"
            onClick={() => {
              onViewModeChange('VITALS');
              onFilterChange('ALL');
            }}
            className={`${styles.modeBtn} ${viewMode === 'VITALS' ? styles.modeBtnActiveVital : ''}`}
          >
            🩺 Sinh Hiệu
          </button>
          
          {canManageWeightDue && (
            <button
              type="button"
              onClick={() => {
                onViewModeChange('WEIGHT');
                onFilterChange('WEIGHT_DUE'); // Tự động lọc danh sách cân nặng
              }}
              className={`${styles.modeBtn} ${viewMode === 'WEIGHT' ? styles.modeBtnActiveWeight : ''}`}
            >
              ⚖️ Cân Nặng ({counts.weightDue})
            </button>
          )}
        </div>
      </div>

      {/* CHỈ HIỂN THỊ CHIP LỌC KHI Ở TAB SINH HIỆU (Để tránh lặp lại) */}
      {viewMode === 'VITALS' && (
        <div className={styles.chipGroup}>
          <button
            type="button"
            onClick={() => onFilterChange('ALL')}
            className={`${styles.btnChip} ${activeFilter === 'ALL' ? styles.btnChipActiveAll : ''}`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('WARNING')}
            className={`${styles.btnChip} ${activeFilter === 'WARNING' ? styles.btnChipActiveWarning : ''}`}
          >
            ⚠️ Cần chú ý ngay ({counts.warning})
          </button>
        </div>
      )}
    </div>
  );
};