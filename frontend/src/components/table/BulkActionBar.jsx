import styles from './BulkActionBar.module.css';

/**
 * Thanh hành động khi có mục được chọn (checkbox) trong bảng.
 * Thay cho bulkActionRow bị lặp lại giống hệt ở ElderManagerTab, AssetManagerTab.
 */
export const BulkActionBar = ({ count, itemLabel, onDelete, deleteLabel = '🗑️ Xóa Mục Đã Chọn' }) => {
  if (count <= 0) return null;
  return (
    <div className={styles.row}>
      <span>
        Đã chọn <b>{count}</b> {itemLabel}
      </span>
      <button className={styles.deleteBtn} onClick={onDelete}>
        {deleteLabel}
      </button>
    </div>
  );
};