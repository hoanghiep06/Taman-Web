import styles from './SearchInput.module.css';

/**
 * Ô tìm kiếm dùng chung (icon 🔍 + input + nút xoá tuỳ chọn).
 * Thay cho searchBox/searchInput bị lặp lại ở RoomManagerTab, ElderManagerTab,
 * AssetManagerTab, GlobalHistoryTab, patrol/SearchBar...
 */
export const SearchInput = ({ value, onChange, placeholder = 'Tìm kiếm...', onClear, autoFocus }) => (
  <div className={styles.wrapper}>
    <span className={styles.icon}>🔍</span>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles.input}
      autoFocus={autoFocus}
    />
    {onClear && value && (
      <button onClick={() => onClear()} className={styles.clearBtn} aria-label="Xoá tìm kiếm">
        ✕
      </button>
    )}
  </div>
);