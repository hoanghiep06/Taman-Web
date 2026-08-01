import React from 'react';
import { TableWrapper, Table, Th, Td, EmptyRow } from '../../../components/table/Table';
import { StatusBadge } from '../../../components/StatusBadge';
import { Pagination } from '../../../components/Pagination';
import styles from './GlobalHistoryTab.module.css';

const STATUS_MAP = {
  Xanh: { variant: 'success', text: 'Đã nộp ảnh' },
  Vang: { variant: 'warning', text: 'Báo mất' },
  Loi_Upload: { variant: 'danger', text: 'Lỗi Upload' },
};

export const GlobalHistoryTab = ({
  historyLogs,
  loadingHistory,
  historyPage,
  historyTotalPages,
  setHistoryPage,
  searchOperator,
  setSearchOperator,
  filterRoomNum,
  setFilterRoomNum,
  filterStatus,
  setFilterStatus,
  onTriggerFilter,
  onViewImage,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.actionBar}>
        <div className={styles.inputWrapper}>
          <span className={styles.fieldIcon}>👤</span>
          <input
            type="text"
            placeholder="Tìm tên nhân viên..."
            value={searchOperator}
            onChange={(e) => setSearchOperator(e.target.value)}
            className={styles.inputField}
          />
        </div>
        <div className={styles.inputWrapperShort}>
          <span className={styles.fieldIcon}>📍</span>
          <input
            type="text"
            placeholder="Phòng..."
            value={filterRoomNum}
            onChange={(e) => setFilterRoomNum(e.target.value)}
            className={styles.inputField}
          />
        </div>
        <div className={styles.selectWrapper}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.selectField}>
            <option value="">Toàn bộ bộ lọc màu</option>
            <option value="Xanh">✓ Đã nộp ảnh (Xanh)</option>
            <option value="Vang">⚠️ Báo mất (Vàng)</option>
            <option value="Loi_Upload">❌ Lỗi tải ảnh (Đỏ)</option>
          </select>
        </div>
        <button onClick={onTriggerFilter} className={styles.queryBtn}>
          ⚙️ Trích Xuất
        </button>
      </div>

      {loadingHistory ? (
        <div className={styles.loading}>Đang truy vấn dữ liệu từ bộ nhớ Drive...</div>
      ) : (
        <>
          <TableWrapper>
            <Table minWidth={860}>
              <thead>
                <tr>
                  <Th>Mốc Thời Gian Quét</Th>
                  <Th>Nhân Viên Ca Trực</Th>
                  <Th>Vị Trí</Th>
                  <Th>Vật Phẩm Vật Tư</Th>
                  <Th>Kết Quả Kiểm Kê</Th>
                  <Th>Ghi Chú Giải Trình</Th>
                  <Th align="center">File Gốc</Th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.length > 0 ? (
                  historyLogs.map((log) => {
                    const status = STATUS_MAP[log.status] || { variant: 'neutral', text: log.status };
                    return (
                      <tr key={log.log_id}>
                        <Td mono muted><code>{log.inspected_at}</code></Td>
                        <Td bold>{log.operator_name}</Td>
                        <Td>Phòng {log.room_number}</Td>
                        <Td bold>{log.asset_name}</Td>
                        <Td>
                          <StatusBadge variant={status.variant}>{status.text}</StatusBadge>
                        </Td>
                        <Td muted>{log.note || '-'}</Td>
                        <td className={styles.tdCenter}>
                          {log.status === 'Xanh' && log.log_id ? (
                            <button onClick={() => onViewImage(log.log_id, log.asset_name)} className={styles.actionTableBtn}>
                              🔍 Xem file
                            </button>
                          ) : (
                            <span className={styles.disabledText}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <EmptyRow colSpan={7}>Không tìm thấy dữ liệu tuần tra nào phù hợp với bộ lọc.</EmptyRow>
                )}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination currentPage={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
        </>
      )}
    </div>
  );
};