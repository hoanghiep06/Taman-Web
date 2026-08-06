import React from 'react';
import { TableWrapper, Table, Th, Td, EmptyRow } from '../../../components/table/Table';
import styles from './SecurityLogsTab.module.css';

export const SecurityLogsTab = ({ loginLogs, loadingLogs }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.headerIcon}>🔒</span>
        <h3 className={styles.cardTitleInner}>Nhật Ký Xác Thực Hệ Thống &amp; Giám Sát Thiết Bị Đầu Cuối</h3>
      </div>

      {loadingLogs ? (
        <div className={styles.loading}>Đang rà soát lịch sử bảo mật cổng mạng LAN...</div>
      ) : (
        <TableWrapper>
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th width="20%">Thời Gian Ghi Nhận</Th>
                <Th width="15%">Mã Tài Khoản</Th>
                <Th width="20%">Họ Và Tên Nhân Sự</Th>
                <Th width="15%">Địa Chỉ IP Client</Th>
                <Th width="30%">Thông Số Thiết Bị / Cấu Hình Trình Duyệt (User-Agent)</Th>
              </tr>
            </thead>
            <tbody>
              {loginLogs.length > 0 ? (
                loginLogs.map((log) => (
                  <tr key={log.id}>
                    <Td mono muted><code>{log.login_time}</code></Td>
                    <Td>
                      <span className={styles.accountTag}>{log.username}</span>
                    </Td>
                    <Td bold>{log.full_name}</Td>
                    <Td>
                      <span className={styles.ipBadge}>{log.ip_address}</span>
                    </Td>
                    <td className={styles.tdUA}>{log.user_agent || 'Không bóc tách được thông số'}</td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={5}>Hệ thống an toàn. Chưa ghi nhận phiên hoạt động đăng nhập nào mới.</EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
};