import React from 'react';
import { TableWrapper, Table, Th, Td, EmptyRow } from '../../../components/table/Table';
import { ActionButton } from '../../../components/table/ActionButton';
import styles from './BackupList.module.css';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024,
    sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const BackupList = ({ backups, loading, onOpenRestoreModalWithId }) => {
  if (loading) return <div className={styles.loading}>Đang kết nối với Google Drive...</div>;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>☁️ Các Bản Sao Lưu Đám Mây (Google Drive)</h3>
      <TableWrapper>
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th>Tên Tệp Tin</Th>
              <Th>Kích Thước</Th>
              <Th>Google Drive ID</Th>
              <Th align="right">Hành Động</Th>
            </tr>
          </thead>
          <tbody>
            {backups.length > 0 ? (
              backups.map((bk, idx) => (
                <tr key={idx}>
                  <Td bold>📄 {bk.name}</Td>
                  <Td>
                    <span className={styles.sizeText}>{formatBytes(bk.size)}</span>
                  </Td>
                  <Td mono muted>
                    <code>{bk.id}</code>
                  </Td>
                  <td className={styles.tdActions}>
                    <ActionButton variant="primary" onClick={() => onOpenRestoreModalWithId(bk.id)}>
                      ⚡ Chọn bản này
                    </ActionButton>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>Không tìm thấy bản sao lưu nào trên hệ thống.</EmptyRow>
            )}
          </tbody>
        </Table>
      </TableWrapper>
    </div>
  );
};