import React from 'react';
import { SearchInput } from '../../../components/SearchInput';
import styles from './SearchBar.module.css';

const STATUS_FILTERS = [
  { key: 'All', label: 'Tất cả' },
  { key: 'Unchecked', label: 'Chưa kiểm kê' },
  { key: 'Processing', label: 'Đang xử lý' },
  { key: 'Success', label: 'Đã nộp' },
  { key: 'Missing', label: 'Đã báo mất' },
  { key: 'Error', label: 'Lỗi ảnh' },
];

// className theo variant — map trực tiếp sang token màu trong index.css
const CHIP_VARIANT_CLASS = {
  All: 'chipNeutral',
  Unchecked: 'chipNeutral',
  Processing: 'chipInfo',
  Success: 'chipSuccess',
  Missing: 'chipWarning',
  Error: 'chipDanger',
};

export const SearchBar = ({ searchTerm, onSearch, statusFilter = 'All', onStatusFilterChange, statusCounts = {} }) => {
  const totalCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className={styles.wrapper}>
      <SearchInput value={searchTerm} onChange={onSearch} onClear={() => onSearch('')} placeholder="Tìm tên đồ đạc, tên Cụ..." />

      {onStatusFilterChange && (
        <div className={styles.chipRow}>
          {STATUS_FILTERS.map(({ key, label }) => {
            const variantClass = styles[CHIP_VARIANT_CLASS[key]];
            const count = key === 'All' ? totalCount : statusCounts[key] || 0;
            const isActive = statusFilter === key;
            const isDisabled = key !== 'All' && count === 0 && !isActive;

            return (
              <button
                key={key}
                onClick={() => !isDisabled && onStatusFilterChange(key)}
                disabled={isDisabled}
                className={`${styles.chip} ${variantClass} ${isActive ? styles.chipActive : ''} ${isDisabled ? styles.chipDisabled : ''}`}
              >
                {label}
                <span className={styles.chipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};