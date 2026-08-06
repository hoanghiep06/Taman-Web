import React from 'react';
import { Table, Th, EmptyRow } from '../../../components/table/Table';
import { StatusBadge } from '../../../components/StatusBadge';
import styles from './RoomMatrixTab.module.css';

const STATUS_MAP = {
  Checked: (time) => ({ variant: 'success', text: `🟢 Đã kiểm kê (${time})`, canViewImage: true }),
  Missing: (time) => ({ variant: 'warning', text: `🟡 Báo thất thoát (${time})`, canViewImage: true }),
  Processing: () => ({ variant: 'info', text: '⚪ Đang tải lên Drive...', canViewImage: false }),
  Error: () => ({ variant: 'danger', text: '🔴 Ảnh lỗi, cần quét lại', canViewImage: false }),
};

export const RoomMatrixTab = ({ rooms, selectedRoomId, onSelectRoom, loadingAssets, groupedAssets, assetStatuses, onViewImage }) => {
  return (
    <div className={styles.splitLayout}>
      <div className={styles.roomSidebar}>
        <div className={styles.sidebarHeader}>📍 Danh Sách Khu Vực</div>
        <div className={styles.roomList}>
          {rooms.map((room) => {
            const isSelected = selectedRoomId === room.id;
            return (
              <div
                key={room.id}
                className={isSelected ? styles.roomItemActive : styles.roomItem}
                onClick={() => onSelectRoom(room.id)}
              >
                <div className={styles.roomMainLine}>
                  <span className={isSelected ? styles.roomNumActive : styles.roomNum}>Phòng {room.room_number}</span>
                </div>
                <span className={styles.roomDesc}>{room.description || 'Không có mô tả chi tiết'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.roomContent}>
        {loadingAssets ? (
          <div className={styles.loadingWrapper}>
            <span className={styles.loadingText}>Đang bóc tách trạng thái phòng dữ liệu...</span>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <Table minWidth={640}>
              <thead>
                <tr>
                  <Th width="35%">Tên Vật Tư / Tài Sản</Th>
                  <Th width="25%">Trạng Thái Tuần Tra</Th>
                  <Th width="25%">Ghi Chú Lý Do Giải Trình</Th>
                  <Th width="15%" align="center">Hành Thao Tác</Th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedAssets).length > 0 ? (
                  Object.keys(groupedAssets).map((elderName, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <tr className={styles.elderGroupRow}>
                        <td colSpan="4" className={styles.elderGroupName}>
                          <span className={styles.elderIcon}>👤</span> {elderName}
                        </td>
                      </tr>

                      {groupedAssets[elderName].map((asset) => {
                        const current = assetStatuses[asset.id] || { status: 'Unchecked' };
                        const resolver = STATUS_MAP[current.status];
                        const status = resolver ? resolver(current.time) : { variant: 'danger', text: '🚨 Chưa sờ tới', canViewImage: false };

                        return (
                          <tr key={asset.id}>
                            <td className={styles.tdAssetName}>
                              <span className={styles.treeLine}>↳</span> {asset.asset_name}
                            </td>
                            <td className={styles.td}>
                              <StatusBadge variant={status.variant}>{status.text}</StatusBadge>
                            </td>
                            <td className={styles.tdNote}>{current.note || '-'}</td>
                            <td className={styles.tdCenter}>
                              {status.canViewImage && current.log_id ? (
                                <button onClick={() => onViewImage(current.log_id, asset.asset_name)} className={styles.actionTableBtn}>
                                  🖼️ Xem Ảnh
                                </button>
                              ) : (
                                <span className={styles.disabledText}>Không có file</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  <EmptyRow colSpan={4}>Khu vực này hiện chưa được cấu hình danh mục vật tư tài sản.</EmptyRow>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};