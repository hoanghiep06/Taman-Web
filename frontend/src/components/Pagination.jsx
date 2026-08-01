import styles from './Pagination.module.css';

/**
 * Thanh phân trang dùng chung — thay cho pageBtn/pageBtnDisabled bị lặp lại
 * giống hệt ở GlobalHistoryTab và ShiftHistoryTab.
 */
export const Pagination = ({ currentPage, totalPages, onPageChange, totalRecords }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className={styles.pager}>
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={currentPage === 1 ? styles.btnDisabled : styles.btn}
      >
        ❮ Trước
      </button>
      <span className={styles.info}>
        Trang <b>{currentPage}</b> / {totalPages}
        {totalRecords != null && <span className={styles.total}> ({totalRecords} mục)</span>}
      </span>
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={currentPage === totalPages ? styles.btnDisabled : styles.btn}
      >
        Sau ❯
      </button>
    </div>
  );
};