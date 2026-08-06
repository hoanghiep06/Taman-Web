import React, { useState } from 'react';
import { StatChip } from '../../../components/StatChip';
import { SearchInput } from '../../../components/SearchInput';
import styles from './OverviewTab.module.css';

export const OverviewTab = ({ dashboardData, shiftProgressLive, onOpenAudit }) => {
  const [searchAsset, setSearchAsset] = useState('');
  const [searchElder, setSearchElder] = useState('');
  const [selectRoom, setSelectRoom] = useState('');

  if (!dashboardData) return null;

  const { current_shift } = dashboardData;

  const reportedMissingItems = shiftProgressLive?.reported_missing || [];
  const uncheckedItems = shiftProgressLive?.unchecked || [];

  const dynamicRoomsWithAnomalies = Array.from(
    new Set([
      ...reportedMissingItems.map((item) => String(item.room_number)),
      ...uncheckedItems.map((item) => String(item.room_number)),
    ])
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const executeFilter = (item) => {
    const matchAsset = item.asset_name.toLowerCase().includes(searchAsset.toLowerCase().trim());
    const matchElder = (item.elder_name || '').toLowerCase().includes(searchElder.toLowerCase().trim());
    const matchRoom = selectRoom === '' || String(item.room_number) === String(selectRoom);
    return matchAsset && matchElder && matchRoom;
  };

  const filteredMissing = reportedMissingItems.filter(executeFilter);
  const filteredUnchecked = uncheckedItems.filter(executeFilter);
  const isInProgress = current_shift.status === 'In Progress';

  return (
    <div className={styles.container}>
      {/* KHỐI CHỈ SỐ TIẾN ĐỘ TỔNG QUAN */}
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <div className={styles.titleBox}>
            <span className={styles.headerIcon}>⏱️</span>
            <h3 className={styles.cardTitle}>
              Ca Trực Hiện Tại: <span className={styles.shiftHighlight}>{current_shift.shift_type || 'Chưa mở ca'}</span>
            </h3>
          </div>

          {isInProgress && (
            <div className={styles.headerRightActions}>
              <button
                onClick={() => onOpenAudit && onOpenAudit()}
                className={styles.auditTriggerBtn}
                title="Bốc mẫu ngẫu nhiên ảnh nhân viên chụp để kiểm tra chống gian lận"
              >
                🕵️‍♂️ Thanh Tra Ảnh Ngẫu Nhiên
              </button>
              <span className={styles.livePulse}>● ĐANG DIỄN RA</span>
            </div>
          )}
        </div>

        {isInProgress ? (
          <>
            <div className={styles.statsGrid}>
              <StatChip label="Tổng tài sản ca trực" value={current_shift.total_assets} variant="primary" />
              <StatChip label="Đã quét thành công" value={current_shift.inspected_count} variant="success" />
              <StatChip label="Phát hiện thất thoát" value={current_shift.lost_items_count} variant="danger" />
              <StatChip label="Chưa kiểm tra" value={current_shift.missing_items_count} variant="neutral" />
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressInfo}>
                <span className={styles.progressLabel}>Tổng tiến độ hoàn thành khu vực</span>
                <strong className={styles.progressValue}>{current_shift.progress_percentage}%</strong>
              </div>
              <div className={styles.barBg}>
                <div
                  className={`${styles.barFill} ${current_shift.progress_percentage === 100 ? styles.barDone : styles.barActive}`}
                  style={{ width: `${current_shift.progress_percentage}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>Hệ thống đang trống. Hiện tại không có ca trực nào đang mở.</div>
        )}
      </div>

      {/* THANH LỌC SỰ CỐ NHANH */}
      {isInProgress && (
        <div className={styles.filterConsoleCard}>
          <div className={styles.consoleTitle}>🔍 Bộ Lọc Rà Soát Sự Cố Nhanh</div>

          <div className={styles.filterInputsRow}>
            <div className={styles.searchCol}>
              <SearchInput
                value={searchAsset}
                onChange={setSearchAsset}
                onClear={() => setSearchAsset('')}
                placeholder="Tìm tên thiết bị, đồ đạc..."
              />
            </div>
            <div className={styles.searchCol}>
              <SearchInput
                value={searchElder}
                onChange={setSearchElder}
                onClear={() => setSearchElder('')}
                placeholder="Tìm theo tên NCT sở hữu..."
              />
            </div>
            <div className={styles.selectWrapper}>
              <select value={selectRoom} onChange={(e) => setSelectRoom(e.target.value)} className={styles.selectInput}>
                <option value="">Tất cả phòng dính lỗi</option>
                {dynamicRoomsWithAnomalies.map((roomNum) => (
                  <option key={roomNum} value={roomNum}>Phòng {roomNum}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CHI TIẾT SỰ CỐ */}
      {isInProgress && (
        <div className={styles.detailGrid}>
          <div className={styles.detailCard}>
            <div className={styles.detailCardHeader}>
              <div className={styles.boxTitleRow}>
                <span className={styles.titleMissing}>⚠️ Tài Sản Báo Thất Thoát Khẩn Cấp</span>
                <span className={styles.countTagWarning}>
                  Tìm thấy: {filteredMissing.length}/{reportedMissingItems.length}
                </span>
              </div>
            </div>
            <div className={styles.listScrollBox}>
              {filteredMissing.length > 0 ? (
                filteredMissing.map((item, idx) => (
                  <div key={idx} className={styles.anomalyCardWarning}>
                    <div className={styles.anomalyLine1}>
                      <strong className={styles.assetNameText}>{item.asset_name}</strong>
                      <span className={styles.roomBadgeWarning}>Phòng {item.room_number}</span>
                    </div>
                    <div className={styles.anomalyLine2}>
                      <span className={styles.subTextOwner}>
                        👤 Sở hữu: <b className={styles.ownerHighlightWarning}>{item.elder_name || 'Tài sản chung của phòng'}</b>
                      </span>
                      <span>⏱️ Báo lúc: <b>{item.inspected_at}</b></span>
                      {item.note && <p className={styles.noteReportText}>💬 Lý do: {item.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptySearchBox}>Không tìm thấy món đồ báo mất nào khớp với từ khóa.</div>
              )}
            </div>
          </div>

          <div className={styles.detailCard}>
            <div className={styles.detailCardHeader}>
              <div className={styles.boxTitleRow}>
                <span className={styles.titleUnchecked}>🚨 Danh Mục Bỏ Sót Chưa Từng Quét Ảnh</span>
                <span className={styles.countTagNeutral}>
                  Tìm thấy: {filteredUnchecked.length}/{uncheckedItems.length}
                </span>
              </div>
            </div>
            <div className={styles.listScrollBox}>
              {filteredUnchecked.length > 0 ? (
                filteredUnchecked.map((item, idx) => (
                  <div key={idx} className={styles.anomalyCardNeutral}>
                    <div className={styles.anomalyLine1}>
                      <strong className={styles.assetNameText}>{item.asset_name}</strong>
                      <span className={styles.roomBadgeNeutral}>Phòng {item.room_number}</span>
                    </div>
                    <p className={styles.subTextOwner}>
                      👤 Sở hữu: <b className={styles.ownerHighlightNeutral}>{item.elder_name || 'Tài sản chung của phòng'}</b>
                    </p>
                  </div>
                ))
              ) : (
                <div className={styles.emptySearchBox}>Không tìm thấy món đồ bỏ sót nào khớp với từ khóa.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};