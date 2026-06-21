import React, { useState } from 'react';
import { theme } from '../utils/theme';

const STATUS_FILTERS = [
  { key: 'All',        label: 'Tất cả' },
  { key: 'Unchecked',  label: 'Chưa kiểm kê' },
  { key: 'Processing', label: 'Đang xử lý' },
  { key: 'Success',    label: 'Đã nộp' },
  { key: 'Missing',    label: 'Đã báo mất' },
  { key: 'Error',      label: 'Lỗi ảnh' },
];

const CHIP_COLORS = {
  All:        { active: theme.color.ink,        tintBg: theme.color.surfaceMuted, tintColor: theme.color.inkSecondary },
  Unchecked:  { active: theme.color.inkTertiary, tintBg: theme.color.surfaceMuted, tintColor: theme.color.inkTertiary },
  Processing: { active: theme.color.info,        tintBg: theme.color.infoTint,     tintColor: theme.color.infoDark },
  Success:    { active: theme.color.success,     tintBg: theme.color.successTint,  tintColor: theme.color.successDark },
  Missing:    { active: theme.color.warning,     tintBg: theme.color.warningTint,  tintColor: theme.color.warningDark },
  Error:      { active: theme.color.danger,      tintBg: theme.color.dangerTint,   tintColor: theme.color.dangerDark },
};

export const SearchBar = ({ searchTerm, onSearch, statusFilter = 'All', onStatusFilterChange, statusCounts = {} }) => {
  const [isFocused, setIsFocused] = useState(false);
  const totalCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div style={styles.wrapper}>
      <div style={{
        ...styles.searchContainer,
        borderColor: isFocused ? theme.color.primary : theme.color.border,
        boxShadow: isFocused ? `0 0 0 3px ${theme.color.primaryRing}` : 'none',
      }}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Tìm tên đồ đạc, tên Cụ..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => onSearch('')} style={styles.clearBtn} aria-label="Xoá tìm kiếm">✕</button>
        )}
      </div>

      {onStatusFilterChange && (
        <div style={styles.chipRow}>
          {STATUS_FILTERS.map(({ key, label }) => {
            const c = CHIP_COLORS[key];
            const count = key === 'All' ? totalCount : (statusCounts[key] || 0);
            const isActive = statusFilter === key;
            const isDisabled = key !== 'All' && count === 0 && !isActive;

            return (
              <button
                key={key}
                onClick={() => !isDisabled && onStatusFilterChange(key)}
                disabled={isDisabled}
                style={{
                  ...styles.chip,
                  backgroundColor: isActive ? c.active : c.tintBg,
                  color: isActive ? '#FFF' : c.tintColor,
                  opacity: isDisabled ? 0.4 : 1,
                  cursor: isDisabled ? 'default' : 'pointer',
                }}
              >
                {label}
                <span style={{
                  ...styles.chipCount,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.06)',
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: { marginBottom: '14px' },
  searchContainer: {
    display: 'flex', alignItems: 'center', backgroundColor: theme.color.surface,
    padding: '0 14px', borderRadius: theme.radius.lg, border: '1.5px solid',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  searchIcon: { fontSize: '15px', marginRight: '8px', color: theme.color.inkMuted },
  searchInput: { flex: 1, padding: '13px 0', border: 'none', outline: 'none', fontSize: '16px', backgroundColor: 'transparent', color: theme.color.ink },
  clearBtn: {
    background: theme.color.surfaceMuted, border: 'none', color: theme.color.inkTertiary, cursor: 'pointer',
    width: '24px', height: '24px', borderRadius: theme.radius.pill, fontSize: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  chipRow: {
    display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px',
    paddingBottom: '2px', WebkitOverflowScrolling: 'touch',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 13px',
    borderRadius: theme.radius.pill, border: 'none', fontSize: '12.5px', fontWeight: '600',
    whiteSpace: 'nowrap', flexShrink: 0, transition: 'background-color 0.15s ease',
  },
  chipCount: { fontSize: '11px', fontWeight: '700', padding: '1px 6px', borderRadius: theme.radius.pill },
};