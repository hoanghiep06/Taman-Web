import React, { useState, useMemo } from 'react';
import { StatusBadge } from '../../../components/StatusBadge';
import { Pagination } from '../../../components/Pagination';
import styles from './ShiftHistoryTab.module.css';

// ─── UTILITY: Xuất CSV với BOM UTF-8 ───────────────────────────────────────
const exportToCSV = (shift, anomalyItems) => {
  const typeTxt = shift.shift_type === 'Sang' ? 'Buổi sáng' : 'Buổi tối';
  const rows = [
    ['BÁO CÁO CA TRỰC', '', '', '', '', ''],
    ['Ngày ca', shift.shift_date, 'Phiên', typeTxt, '', ''],
    ['Đã quét', shift.statistics.checked_count, 'Báo mất', shift.statistics.reported_missing_count, 'Bỏ sót', shift.statistics.unchecked_count],
    ['Chốt lúc', shift.created_at || '', 'Gửi email', shift.statistics.is_email_sent ? 'Đã gửi' : 'Chưa gửi', '', ''],
    ['', '', '', '', '', ''],
    ['Tên tài sản', 'Loại bất thường', 'Phòng', 'Thuộc cụ', 'Ghi chú', 'Thời gian báo'],
    ...(anomalyItems || []).map((a) => [
      a.asset_name,
      a.anomaly_type,
      a.room_number,
      a.elder_name,
      a.note,
      a.inspected_at ? `${a.inspected_at} bởi ${a.reporter_name}` : '',
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoCaoCa_${shift.shift_date?.replace(/\//g, '-')}_${shift.shift_type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const ShiftTypeBadge = ({ type }) =>
  type === 'Sang' ? <StatusBadge variant="warning">☀ Sáng</StatusBadge> : <StatusBadge variant="info">🌙 Tối</StatusBadge>;

const EmailBadge = ({ sent }) =>
  sent ? (
    <StatusBadge variant="success">✉ Đã gửi</StatusBadge>
  ) : (
    <StatusBadge variant="neutral">✉ Chưa gửi</StatusBadge>
  );

const StatCell = ({ value, className }) => <span className={`${styles.statCell} ${className || ''}`}>{value}</span>;

const MiniProgress = ({ checked, total }) => {
  if (!total) return <span className={styles.miniProgressEmpty}>—</span>;
  const pct = Math.round((checked / total) * 100);
  const barClass = pct === 100 ? styles.progressFull : pct >= 70 ? styles.progressMid : styles.progressLow;
  return (
    <div className={styles.miniProgressWrap}>
      <div className={styles.miniProgressTrack}>
        <div className={`${styles.miniProgressBar} ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${styles.miniProgressLabel} ${barClass}`}>{pct}%</span>
    </div>
  );
};

const AnomalyCard = ({ item }) => {
  const isMissing = item.anomaly_type?.includes('Báo Mất') || item.anomaly_type?.includes('Vắng');
  return (
    <div className={`${styles.anomalyCard} ${isMissing ? styles.anomalyCardMissing : styles.anomalyCardSkipped}`}>
      <div className={styles.anomalyTop}>
        <strong className={styles.anomalyName}>{item.asset_name}</strong>
        <span className={isMissing ? styles.badgeTextMissing : styles.badgeTextSkipped}>
          {isMissing ? 'Báo mất' : 'Bỏ sót'}
        </span>
      </div>
      <div className={styles.anomalyMeta}>
        <span>📍 Phòng <b>{item.room_number}</b></span>
        <span>👤 {item.elder_name}</span>
      </div>
      {item.note && <div className={styles.anomalyNote}>💬 {item.note}</div>}
      {item.inspected_at && (
        <div className={styles.anomalyTime}>
          ⏱ {item.inspected_at} · {item.reporter_name}
        </div>
      )}
    </div>
  );
};

export const ShiftHistoryTab = ({
  shifts = [],
  pagination = {},
  loadingHistory,
  currentPage,
  onPageChange,
  filterDate,
  onDateChange,
  onTriggerFilter,
  filterShiftType,
  onShiftTypeChange,
  selectedShiftId,
  activeReport,
  loadingReport,
  onSelectShift,
}) => {
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [exportSuccess, setExportSuccess] = useState(false);

  const aggregate = useMemo(
    () =>
      shifts.reduce(
        (acc, s) => ({
          totalShifts: acc.totalShifts + 1,
          checked: acc.checked + (s.statistics?.checked_count ?? 0),
          missing: acc.missing + (s.statistics?.reported_missing_count ?? 0),
          skipped: acc.skipped + (s.statistics?.unchecked_count ?? 0),
          emailSent: acc.emailSent + (s.statistics?.is_email_sent ? 1 : 0),
        }),
        { totalShifts: 0, checked: 0, missing: 0, skipped: 0, emailSent: 0 }
      ),
    [shifts]
  );

  const filteredAnomalies = useMemo(() => {
    if (!activeReport?.anomaly_items) return [];
    if (anomalyFilter === 'all') return activeReport.anomaly_items;
    if (anomalyFilter === 'miss')
      return activeReport.anomaly_items.filter((i) => i.anomaly_type?.includes('Báo Mất') || i.anomaly_type?.includes('Vắng'));
    return activeReport.anomaly_items.filter((i) => i.anomaly_type?.includes('Bỏ Sót') || i.anomaly_type?.includes('Chưa kiểm'));
  }, [activeReport, anomalyFilter]);

  const missCount =
    activeReport?.anomaly_items?.filter((i) => i.anomaly_type?.includes('Báo Mất') || i.anomaly_type?.includes('Vắng')).length ?? 0;
  const skipCount =
    activeReport?.anomaly_items?.filter((i) => i.anomaly_type?.includes('Bỏ Sót') || i.anomaly_type?.includes('Chưa kiểm')).length ?? 0;

  const handleExport = () => {
    if (!activeReport || !selectedShiftId) return;
    const shift = shifts.find((s) => s.shift_id === selectedShiftId);
    if (!shift) return;
    exportToCSV({ ...shift, ...activeReport.shift_info, statistics: shift.statistics }, activeReport.anomaly_items);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleClearFilter = () => {
    onDateChange('');
    if (onShiftTypeChange) onShiftTypeChange('');
    setTimeout(() => onTriggerFilter(), 0);
  };

  return (
    <div className={styles.root}>
      {/* KHỐI TRÁI — DANH SÁCH CA TRỰC */}
      <div className={styles.leftPane}>
        <div className={styles.paneHeader}>
          <div className={styles.paneTitle}>
            <span className={styles.paneTitleText}>📋 Lịch sử ca trực</span>
            {pagination.total_records != null && <span className={styles.totalBadge}>{pagination.total_records} ca</span>}
          </div>

          <div className={styles.filterRow}>
            <input type="date" value={filterDate} onChange={(e) => onDateChange(e.target.value)} className={styles.dateInput} />
            {onShiftTypeChange && (
              <select value={filterShiftType || ''} onChange={(e) => onShiftTypeChange(e.target.value)} className={styles.selectInput}>
                <option value="">Cả 2 phiên</option>
                <option value="Sang">☀ Sáng</option>
                <option value="Toi">🌙 Tối</option>
              </select>
            )}
            <button onClick={onTriggerFilter} className={styles.btnPrimary}>🔍 Lọc</button>
            {(filterDate || filterShiftType) && (
              <button onClick={handleClearFilter} className={styles.btnGhost}>✕</button>
            )}
          </div>
        </div>

        {shifts.length > 0 && (
          <div className={styles.summaryBar}>
            <div className={styles.summaryChip}>
              <span className={styles.chipLabel}>Trang này</span>
              <span className={styles.chipVal}>{aggregate.totalShifts} ca</span>
            </div>
            <div className={styles.summaryChip}>
              <span className={styles.chipLabel}>Đã quét</span>
              <span className={`${styles.chipVal} ${styles.chipSuccess}`}>{aggregate.checked}</span>
            </div>
            <div className={styles.summaryChip}>
              <span className={styles.chipLabel}>Báo mất</span>
              <span className={`${styles.chipVal} ${styles.chipWarning}`}>{aggregate.missing}</span>
            </div>
            <div className={styles.summaryChip}>
              <span className={styles.chipLabel}>Bỏ sót</span>
              <span className={`${styles.chipVal} ${styles.chipDanger}`}>{aggregate.skipped}</span>
            </div>
            <div className={styles.summaryChip}>
              <span className={styles.chipLabel}>Email</span>
              <span className={`${styles.chipVal} ${styles.chipInfo}`}>
                {aggregate.emailSent}/{aggregate.totalShifts}
              </span>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className={styles.centerMsg}>⏳ Đang tải danh sách ca trực...</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.thead}>
                  <th className={styles.th}>Ngày ca</th>
                  <th className={styles.th}>Phiên</th>
                  <th className={styles.th} title="Số tài sản đã được quét qua">Quét</th>
                  <th className={styles.th} title="Số tài sản nhân viên báo mất (Vàng)">Mất</th>
                  <th className={styles.th} title="Số tài sản bị bỏ sót, không quét">Sót</th>
                  <th className={styles.th}>Tiến độ</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Chốt lúc</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {shifts.length > 0 ? (
                  shifts.map((shift) => {
                    const isSelected = selectedShiftId === shift.shift_id;
                    const hasAnomaly = (shift.statistics?.reported_missing_count ?? 0) + (shift.statistics?.unchecked_count ?? 0) > 0;
                    const total = shift.statistics?.total_assets ?? 0;
                    return (
                      <tr key={shift.shift_id} className={isSelected ? styles.trSelected : styles.tr}>
                        <td className={styles.tdDate}>{shift.shift_date}</td>
                        <td className={styles.td}><ShiftTypeBadge type={shift.shift_type} /></td>
                        <td className={styles.td}><StatCell value={shift.statistics?.checked_count ?? 0} className={styles.statSuccess} /></td>
                        <td className={styles.td}>
                          <StatCell
                            value={shift.statistics?.reported_missing_count ?? 0}
                            className={shift.statistics?.reported_missing_count > 0 ? styles.statWarning : styles.statMuted}
                          />
                        </td>
                        <td className={styles.td}>
                          <StatCell
                            value={shift.statistics?.unchecked_count ?? 0}
                            className={shift.statistics?.unchecked_count > 0 ? styles.statDanger : styles.statMuted}
                          />
                        </td>
                        <td className={styles.tdProgress}>
                          <MiniProgress checked={shift.statistics?.checked_count ?? 0} total={total} />
                        </td>
                        <td className={styles.td}>
                          <EmailBadge sent={shift.statistics?.is_email_sent} />
                        </td>
                        <td className={styles.tdTime}>{shift.created_at ? shift.created_at.slice(11, 16) : '—'}</td>
                        <td className={styles.tdCenter}>
                          <button
                            onClick={() => onSelectShift(shift.shift_id)}
                            className={isSelected ? styles.btnDetailActive : styles.btnDetail}
                            title={hasAnomaly ? 'Ca này có bất thường — xem chi tiết' : 'Xem chi tiết ca'}
                          >
                            {hasAnomaly ? (
                              <>
                                <span className={isSelected ? styles.warnIconActive : styles.warnIcon}>⚠</span> Xem
                              </>
                            ) : (
                              '✔ Xem'
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className={styles.emptyCell}>
                      Không có ca trực nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={pagination.total_pages}
          onPageChange={onPageChange}
          totalRecords={pagination.total_records}
        />
      </div>

      {/* KHỐI PHẢI — CHI TIẾT BẤT THƯỜNG */}
      <div className={styles.rightPane}>
        {!selectedShiftId ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🕵️</span>
            <p className={styles.emptyTitle}>Chưa chọn ca trực</p>
            <p className={styles.emptyDesc}>
              Bấm nút <b>Xem</b> ở một ca trực bên trái để rà soát chi tiết bất thường.
            </p>
          </div>
        ) : loadingReport ? (
          <div className={styles.centerMsg}>⏳ Đang tải báo cáo bất thường...</div>
        ) : activeReport ? (
          <>
            <div className={styles.reportHeader}>
              <div className={styles.reportHeaderTop}>
                <div>
                  <div className={styles.reportHeaderDate}>
                    📍 {activeReport.shift_info?.shift_date} · {activeReport.shift_info?.shift_type === 'Sang' ? 'Buổi sáng' : 'Buổi tối'}
                  </div>
                  <div className={styles.reportHeaderStatus}>
                    {activeReport.shift_info?.status === 'Submitted' ? '✔ Đã chốt sổ' : '🟡 ' + (activeReport.shift_info?.status ?? '')}
                  </div>
                </div>
                <button onClick={handleExport} className={exportSuccess ? styles.btnExportDone : styles.btnExport}>
                  {exportSuccess ? '✔ Đã xuất' : '↓ Xuất CSV'}
                </button>
              </div>

              <div className={styles.reportStats}>
                <div className={styles.reportStatChip}>
                  <span className={`${styles.reportStatValue} ${styles.chipSuccess}`}>{activeReport.statistics?.checked_count ?? 0}</span>
                  <span className={styles.reportStatLabel}>Đã quét</span>
                </div>
                <div className={styles.reportStatChip}>
                  <span className={`${styles.reportStatValue} ${styles.chipWarning}`}>{activeReport.statistics?.reported_missing_count ?? 0}</span>
                  <span className={styles.reportStatLabel}>Báo mất</span>
                </div>
                <div className={styles.reportStatChip}>
                  <span className={`${styles.reportStatValue} ${styles.chipDanger}`}>{activeReport.statistics?.unchecked_count ?? 0}</span>
                  <span className={styles.reportStatLabel}>Bỏ sót</span>
                </div>
                <div className={styles.reportStatChip}>
                  <span className={styles.reportStatValue}>{activeReport.statistics?.total_assets ?? 0}</span>
                  <span className={styles.reportStatLabel}>Tổng TS</span>
                </div>
              </div>
            </div>

            <div className={styles.tabs}>
              {[
                { key: 'all', label: 'Tất cả', count: activeReport.anomaly_items?.length ?? 0 },
                { key: 'miss', label: '⚠ Báo mất', count: missCount },
                { key: 'skip', label: '✕ Bỏ sót', count: skipCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAnomalyFilter(tab.key)}
                  className={anomalyFilter === tab.key ? styles.tabActive : styles.tabInactive}
                >
                  {tab.label}
                  <span className={anomalyFilter === tab.key ? styles.tabCountActive : styles.tabCount}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div className={styles.anomalyScroll}>
              {filteredAnomalies.length > 0 ? (
                filteredAnomalies.map((item, idx) => <AnomalyCard key={idx} item={item} />)
              ) : activeReport.anomaly_items?.length === 0 ? (
                <div className={styles.cleanState}>✨ Ca trực hoàn hảo! Không ghi nhận bất thường nào.</div>
              ) : (
                <div className={styles.noMatch}>Không có mục nào thuộc loại này.</div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};