import styles from './Table.module.css';

/**
 * Bộ component bảng dùng chung cho toàn app.
 * Đã tích hợp sẵn overflow-x:auto + minWidth để tránh lỗi tràn ngang/mất chữ
 * từng gặp ở UserManagementPage — không cần tự viết lại cho mỗi bảng mới.
 */
export const TableWrapper = ({ children }) => (
  <div className={styles.tableWrapper}>{children}</div>
);

export const Table = ({ children, minWidth = 640 }) => (
  <table className={styles.table} style={{ minWidth }}>
    {children}
  </table>
);

export const Th = ({ children, align = 'left', width }) => (
  <th className={styles.th} style={{ textAlign: align, width }}>
    {children}
  </th>
);

export const Td = ({ children, align = 'left', bold, muted, mono }) => (
  <td
    className={styles.td}
    style={{
      textAlign: align,
      fontWeight: bold ? 700 : undefined,
      color: muted ? 'var(--color-text-muted)' : undefined,
      fontFamily: mono ? 'var(--mono)' : undefined,
    }}
  >
    {children}
  </td>
);

export const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className={styles.emptyState}>
      {children}
    </td>
  </tr>
);