import React, { useState, useMemo } from 'react';

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
    ...(anomalyItems || []).map(a => [
      a.asset_name,
      a.anomaly_type,
      a.room_number,
      a.elder_name,
      a.note,
      a.inspected_at ? `${a.inspected_at} bởi ${a.reporter_name}` : '',
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoCaoCa_${shift.shift_date?.replace(/\//g, '-')}_${shift.shift_type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── SUB-COMPONENT: Badge phiên ca ─────────────────────────────────────────
const ShiftTypeBadge = ({ type }) =>
  type === 'Sang'
    ? <span style={S.badgeMorning}>☀ Sáng</span>
    : <span style={S.badgeNight}>🌙 Tối</span>;

// ─── SUB-COMPONENT: Badge email ────────────────────────────────────────────
const EmailBadge = ({ sent }) =>
  sent
    ? <span style={S.badgeEmailSent} title="Báo cáo đã được gửi email cho quản lý">✉ Đã gửi</span>
    : <span style={S.badgeEmailPending} title="Chưa gửi báo cáo email">✉ Chưa gửi</span>;

// ─── SUB-COMPONENT: Ô số thống kê ──────────────────────────────────────────
const StatCell = ({ value, color }) => (
  <span style={{ color, fontWeight: 600, fontSize: 13 }}>{value}</span>
);

// ─── SUB-COMPONENT: Thanh progress mini ────────────────────────────────────
const MiniProgress = ({ checked, total }) => {
  if (!total) return <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>;
  const pct = Math.round((checked / total) * 100);
  const color = pct === 100 ? '#16A34A' : pct >= 70 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', minWidth: 48 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 32 }}>{pct}%</span>
    </div>
  );
};

// ─── SUB-COMPONENT: Anomaly card ───────────────────────────────────────────
const AnomalyCard = ({ item }) => {
  const isMissing = item.anomaly_type?.includes('Báo Mất') || item.anomaly_type?.includes('Vắng');
  return (
    <div style={{
      ...S.anomalyCard,
      borderLeft: `3px solid ${isMissing ? '#D97706' : '#DC2626'}`,
      background: isMissing ? '#FFFBEB' : '#FEF2F2',
    }}>
      <div style={S.anomalyTop}>
        <strong style={{ fontSize: 13, color: '#0F172A' }}>{item.asset_name}</strong>
        <span style={isMissing ? S.badgeTextMissing : S.badgeTextSkipped}>
          {isMissing ? 'Báo mất' : 'Bỏ sót'}
        </span>
      </div>
      <div style={S.anomalyMeta}>
        <span>📍 Phòng <b>{item.room_number}</b></span>
        <span>👤 {item.elder_name}</span>
      </div>
      {item.note && (
        <div style={S.anomalyNote}>💬 {item.note}</div>
      )}
      {item.inspected_at && (
        <div style={S.anomalyTime}>⏱ {item.inspected_at} · {item.reporter_name}</div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export const ShiftHistoryTab = ({
  shifts = [],
  pagination = {},
  loadingHistory,
  currentPage,
  onPageChange,
  filterDate,
  onDateChange,
  onTriggerFilter,
  filterShiftType,         // NEW prop: '' | 'Sang' | 'Toi'
  onShiftTypeChange,       // NEW prop
  selectedShiftId,
  activeReport,
  loadingReport,
  onSelectShift,
}) => {
  const [anomalyFilter, setAnomalyFilter] = useState('all'); // 'all' | 'miss' | 'skip'
  const [exportSuccess, setExportSuccess] = useState(false);

  // ── Tính aggregate summary bar từ danh sách ca đang hiển thị ──────────────
  const aggregate = useMemo(() => {
    return shifts.reduce(
      (acc, s) => ({
        totalShifts: acc.totalShifts + 1,
        checked: acc.checked + (s.statistics?.checked_count ?? 0),
        missing: acc.missing + (s.statistics?.reported_missing_count ?? 0),
        skipped: acc.skipped + (s.statistics?.unchecked_count ?? 0),
        emailSent: acc.emailSent + (s.statistics?.is_email_sent ? 1 : 0),
      }),
      { totalShifts: 0, checked: 0, missing: 0, skipped: 0, emailSent: 0 }
    );
  }, [shifts]);

  // ── Lọc anomaly items theo tab ─────────────────────────────────────────────
  const filteredAnomalies = useMemo(() => {
    if (!activeReport?.anomaly_items) return [];
    if (anomalyFilter === 'all') return activeReport.anomaly_items;
    if (anomalyFilter === 'miss')
      return activeReport.anomaly_items.filter(i => i.anomaly_type?.includes('Báo Mất') || i.anomaly_type?.includes('Vắng'));
    return activeReport.anomaly_items.filter(i => i.anomaly_type?.includes('Bỏ Sót') || i.anomaly_type?.includes('Chưa kiểm'));
  }, [activeReport, anomalyFilter]);

  const missCount = activeReport?.anomaly_items?.filter(i => i.anomaly_type?.includes('Báo Mất') || i.anomaly_type?.includes('Vắng')).length ?? 0;
  const skipCount = activeReport?.anomaly_items?.filter(i => i.anomaly_type?.includes('Bỏ Sót') || i.anomaly_type?.includes('Chưa kiểm')).length ?? 0;

  const handleExport = () => {
    if (!activeReport || !selectedShiftId) return;
    const shift = shifts.find(s => s.shift_id === selectedShiftId);
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
    <div style={S.root}>

      {/* ══════════════════════════════════════════════════════════
          KHỐI TRÁI — DANH SÁCH CA TRỰC
      ══════════════════════════════════════════════════════════ */}
      <div style={S.leftPane}>

        {/* Header + Filter */}
        <div style={S.paneHeader}>
          <div style={S.paneTitle}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>📋 Lịch sử ca trực</span>
            {pagination.total_records != null && (
              <span style={S.totalBadge}>{pagination.total_records} ca</span>
            )}
          </div>

          <div style={S.filterRow}>
            <input
              type="date"
              value={filterDate}
              onChange={e => onDateChange(e.target.value)}
              style={S.dateInput}
            />
            {onShiftTypeChange && (
              <select
                value={filterShiftType || ''}
                onChange={e => onShiftTypeChange(e.target.value)}
                style={S.selectInput}
              >
                <option value="">Cả 2 phiên</option>
                <option value="Sang">☀ Sáng</option>
                <option value="Toi">🌙 Tối</option>
              </select>
            )}
            <button onClick={onTriggerFilter} style={S.btnPrimary}>🔍 Lọc</button>
            {(filterDate || filterShiftType) && (
              <button onClick={handleClearFilter} style={S.btnGhost}>✕</button>
            )}
          </div>
        </div>

        {/* Aggregate summary bar */}
        {shifts.length > 0 && (
          <div style={S.summaryBar}>
            <div style={S.summaryChip}>
              <span style={S.chipLabel}>Trang này</span>
              <span style={S.chipVal}>{aggregate.totalShifts} ca</span>
            </div>
            <div style={S.summaryChip}>
              <span style={S.chipLabel}>Đã quét</span>
              <span style={{ ...S.chipVal, color: '#16A34A' }}>{aggregate.checked}</span>
            </div>
            <div style={S.summaryChip}>
              <span style={S.chipLabel}>Báo mất</span>
              <span style={{ ...S.chipVal, color: '#D97706' }}>{aggregate.missing}</span>
            </div>
            <div style={S.summaryChip}>
              <span style={S.chipLabel}>Bỏ sót</span>
              <span style={{ ...S.chipVal, color: '#DC2626' }}>{aggregate.skipped}</span>
            </div>
            <div style={S.summaryChip}>
              <span style={S.chipLabel}>Email</span>
              <span style={{ ...S.chipVal, color: '#6366F1' }}>{aggregate.emailSent}/{aggregate.totalShifts}</span>
            </div>
          </div>
        )}

        {/* Table */}
        {loadingHistory ? (
          <div style={S.centerMsg}>⏳ Đang tải danh sách ca trực...</div>
        ) : (
          <div style={S.tableWrapper}>
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  <th style={S.th}>Ngày ca</th>
                  <th style={S.th}>Phiên</th>
                  <th style={S.th} title="Số tài sản đã được quét qua">Quét</th>
                  <th style={S.th} title="Số tài sản nhân viên báo mất (Vàng)">Mất</th>
                  <th style={S.th} title="Số tài sản bị bỏ sót, không quét">Sót</th>
                  <th style={S.th}>Tiến độ</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Chốt lúc</th>
                  <th style={{ ...S.th, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {shifts.length > 0 ? (
                  shifts.map(shift => {
                    const isSelected = selectedShiftId === shift.shift_id;
                    const hasAnomaly = (shift.statistics?.reported_missing_count ?? 0) + (shift.statistics?.unchecked_count ?? 0) > 0;
                    const total = shift.statistics?.total_assets ?? 0;
                    return (
                      <tr
                        key={shift.shift_id}
                        style={{
                          ...S.tr,
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          outline: isSelected ? '1.5px solid #93C5FD' : 'none',
                          outlineOffset: -1,
                        }}
                      >
                        <td style={S.tdDate}>{shift.shift_date}</td>
                        <td style={S.td}><ShiftTypeBadge type={shift.shift_type} /></td>
                        <td style={S.td}><StatCell value={shift.statistics?.checked_count ?? 0} color="#16A34A" /></td>
                        <td style={S.td}><StatCell value={shift.statistics?.reported_missing_count ?? 0} color={shift.statistics?.reported_missing_count > 0 ? '#D97706' : '#94A3B8'} /></td>
                        <td style={S.td}><StatCell value={shift.statistics?.unchecked_count ?? 0} color={shift.statistics?.unchecked_count > 0 ? '#DC2626' : '#94A3B8'} /></td>
                        <td style={{ ...S.td, minWidth: 90 }}>
                          <MiniProgress checked={shift.statistics?.checked_count ?? 0} total={total} />
                        </td>
                        <td style={S.td}>
                          <EmailBadge sent={shift.statistics?.is_email_sent} />
                        </td>
                        <td style={{ ...S.td, fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {shift.created_at ? shift.created_at.slice(11, 16) : '—'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <button
                            onClick={() => onSelectShift(shift.shift_id)}
                            style={isSelected ? S.btnDetailActive : S.btnDetail}
                            title={hasAnomaly ? 'Ca này có bất thường — xem chi tiết' : 'Xem chi tiết ca'}
                          >
                            {hasAnomaly
                              ? <><span style={{ color: isSelected ? '#FFF' : '#DC2626' }}>⚠</span> Xem</>
                              : '✔ Xem'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" style={S.emptyCell}>
                      Không có ca trực nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(pagination.total_pages ?? 1) > 1 && (
          <div style={S.pager}>
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              style={currentPage === 1 ? S.pageBtnOff : S.pageBtn}
            >❮ Trước</button>
            <span style={S.pagerInfo}>
              Trang <b>{currentPage}</b> / {pagination.total_pages}
              <span style={{ color: '#94A3B8', marginLeft: 6 }}>
                ({pagination.total_records} ca)
              </span>
            </span>
            <button
              disabled={currentPage === pagination.total_pages}
              onClick={() => onPageChange(currentPage + 1)}
              style={currentPage === pagination.total_pages ? S.pageBtnOff : S.pageBtn}
            >Sau ❯</button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          KHỐI PHẢI — CHI TIẾT BẤT THƯỜNG
      ══════════════════════════════════════════════════════════ */}
      <div style={S.rightPane}>
        {!selectedShiftId ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 38 }}>🕵️</span>
            <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#475569', fontSize: 14 }}>Chưa chọn ca trực</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, maxWidth: 220 }}>
              Bấm nút <b>Xem</b> ở một ca trực bên trái để rà soát chi tiết bất thường.
            </p>
          </div>
        ) : loadingReport ? (
          <div style={S.centerMsg}>⏳ Đang tải báo cáo bất thường...</div>
        ) : activeReport ? (
          <>
            {/* Report header */}
            <div style={S.reportHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
                    📍 {activeReport.shift_info?.shift_date} · {activeReport.shift_info?.shift_type === 'Sang' ? 'Buổi sáng' : 'Buổi tối'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                    {activeReport.shift_info?.status === 'Submitted' ? '✔ Đã chốt sổ' : '🟡 ' + (activeReport.shift_info?.status ?? '')}
                  </div>
                </div>
                {/* Export button */}
                <button onClick={handleExport} style={exportSuccess ? S.btnExportDone : S.btnExport}>
                  {exportSuccess ? '✔ Đã xuất' : '↓ Xuất CSV'}
                </button>
              </div>

              {/* Stats row */}
              <div style={S.reportStats}>
                <div style={S.reportStatChip}>
                  <span style={{ color: '#16A34A', fontSize: 16, fontWeight: 700 }}>{activeReport.statistics?.checked_count ?? 0}</span>
                  <span style={S.reportStatLabel}>Đã quét</span>
                </div>
                <div style={S.reportStatChip}>
                  <span style={{ color: '#D97706', fontSize: 16, fontWeight: 700 }}>{activeReport.statistics?.reported_missing_count ?? 0}</span>
                  <span style={S.reportStatLabel}>Báo mất</span>
                </div>
                <div style={S.reportStatChip}>
                  <span style={{ color: '#DC2626', fontSize: 16, fontWeight: 700 }}>{activeReport.statistics?.unchecked_count ?? 0}</span>
                  <span style={S.reportStatLabel}>Bỏ sót</span>
                </div>
                <div style={S.reportStatChip}>
                  <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>{activeReport.statistics?.total_assets ?? 0}</span>
                  <span style={S.reportStatLabel}>Tổng TS</span>
                </div>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={S.tabs}>
              {[
                { key: 'all', label: 'Tất cả', count: activeReport.anomaly_items?.length ?? 0 },
                { key: 'miss', label: '⚠ Báo mất', count: missCount },
                { key: 'skip', label: '✕ Bỏ sót', count: skipCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAnomalyFilter(tab.key)}
                  style={anomalyFilter === tab.key ? S.tabActive : S.tabInactive}
                >
                  {tab.label}
                  <span style={anomalyFilter === tab.key ? S.tabCountActive : S.tabCount}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Anomaly list */}
            <div style={S.anomalyScroll}>
              {filteredAnomalies.length > 0 ? (
                filteredAnomalies.map((item, idx) => <AnomalyCard key={idx} item={item} />)
              ) : activeReport.anomaly_items?.length === 0 ? (
                <div style={S.cleanState}>
                  ✨ Ca trực hoàn hảo! Không ghi nhận bất thường nào.
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>
                  Không có mục nào thuộc loại này.
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: 'flex', gap: 16,
    height: 'calc(100vh - 190px)', minHeight: 520,
    width: '100%', boxSizing: 'border-box',
  },

  // ── Left pane ──
  leftPane: {
    flex: '0 0 62%', display: 'flex', flexDirection: 'column',
    background: '#FFF', borderRadius: 14,
    border: '1px solid #E2E8F0', overflow: 'hidden',
    boxSizing: 'border-box',
  },
  paneHeader: {
    padding: '14px 18px 12px', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
  },
  paneTitle: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  totalBadge: {
    background: '#F1F5F9', color: '#64748B', fontSize: 11,
    fontWeight: 600, padding: '2px 8px', borderRadius: 99,
  },
  filterRow: {
    display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
  },
  dateInput: {
    padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 8,
    fontSize: 12.5, color: '#334155', outline: 'none',
    background: '#F8FAFC', flex: '1 1 120px', minWidth: 120,
  },
  selectInput: {
    padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 8,
    fontSize: 12.5, color: '#334155', outline: 'none',
    background: '#F8FAFC', cursor: 'pointer',
  },
  btnPrimary: {
    padding: '6px 14px', background: '#0F172A', color: '#FFF',
    border: 'none', borderRadius: 8, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnGhost: {
    padding: '6px 10px', background: 'transparent', color: '#94A3B8',
    border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12,
    cursor: 'pointer',
  },

  // ── Summary bar ──
  summaryBar: {
    display: 'flex', gap: 0, borderBottom: '1px solid #F1F5F9',
    flexShrink: 0,
  },
  summaryChip: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 4px', borderRight: '1px solid #F1F5F9', gap: 2,
  },
  chipLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 500 },
  chipVal: { fontSize: 15, fontWeight: 700, color: '#1E293B' },

  // ── Table ──
  tableWrapper: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 12.5, textAlign: 'left', tableLayout: 'auto',
  },
  thead: { background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 },
  th: {
    padding: '9px 12px', color: '#64748B', fontWeight: 600,
    fontSize: 11, borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  tr: {
    borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s',
    cursor: 'default',
  },
  td: { padding: '9px 12px', verticalAlign: 'middle', color: '#334155' },
  tdDate: { padding: '9px 12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' },
  emptyCell: {
    textAlign: 'center', padding: '36px 20px',
    color: '#94A3B8', fontStyle: 'italic', fontSize: 13,
  },

  // ── Badges ──
  badgeMorning: {
    background: '#FEF3C7', color: '#92400E', fontSize: 11,
    fontWeight: 600, padding: '3px 9px', borderRadius: 99,
    display: 'inline-block',
  },
  badgeNight: {
    background: '#EEF2FF', color: '#3730A3', fontSize: 11,
    fontWeight: 600, padding: '3px 9px', borderRadius: 99,
    display: 'inline-block',
  },
  badgeEmailSent: {
    background: '#DCFCE7', color: '#166534', fontSize: 10.5,
    fontWeight: 600, padding: '2px 7px', borderRadius: 99,
    display: 'inline-block', whiteSpace: 'nowrap',
  },
  badgeEmailPending: {
    background: '#F1F5F9', color: '#94A3B8', fontSize: 10.5,
    fontWeight: 500, padding: '2px 7px', borderRadius: 99,
    display: 'inline-block', whiteSpace: 'nowrap',
  },

  // ── Detail buttons ──
  btnDetail: {
    padding: '4px 10px', background: '#FFF', color: '#475569',
    border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 11.5,
    fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: 4, transition: 'all 0.1s', whiteSpace: 'nowrap',
  },
  btnDetailActive: {
    padding: '4px 10px', background: '#0284C7', color: '#FFF',
    border: '1px solid #0284C7', borderRadius: 7, fontSize: 11.5,
    fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  },

  // ── Pagination ──
  pager: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px', borderTop: '1px solid #F1F5F9', flexShrink: 0,
  },
  pageBtn: {
    padding: '5px 12px', background: '#FFF', border: '1px solid #CBD5E1',
    borderRadius: 7, color: '#334155', fontWeight: 600, fontSize: 12, cursor: 'pointer',
  },
  pageBtnOff: {
    padding: '5px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRadius: 7, color: '#CBD5E1', fontSize: 12, cursor: 'not-allowed',
  },
  pagerInfo: { fontSize: 12, color: '#475569' },

  centerMsg: {
    display: 'flex', flex: 1, alignItems: 'center',
    justifyContent: 'center', color: '#94A3B8', fontSize: 13,
  },

  // ── Right pane ──
  rightPane: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: '#FFF', borderRadius: 14,
    border: '1px solid #E2E8F0', overflow: 'hidden',
    boxSizing: 'border-box', minWidth: 0,
  },
  emptyState: {
    display: 'flex', flex: 1, flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  reportHeader: {
    padding: '14px 16px 10px', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
  },
  reportStats: {
    display: 'flex', gap: 0, marginTop: 10,
    background: '#F8FAFC', borderRadius: 10, overflow: 'hidden',
    border: '1px solid #F1F5F9',
  },
  reportStatChip: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '8px 4px', gap: 2,
    borderRight: '1px solid #F1F5F9',
  },
  reportStatLabel: { fontSize: 10, color: '#94A3B8' },

  btnExport: {
    padding: '5px 12px', background: '#FFF', color: '#475569',
    border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 11.5,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },
  btnExportDone: {
    padding: '5px 12px', background: '#DCFCE7', color: '#166534',
    border: '1px solid #BBF7D0', borderRadius: 7, fontSize: 11.5,
    fontWeight: 600, cursor: 'default', whiteSpace: 'nowrap', flexShrink: 0,
  },

  // ── Filter tabs ──
  tabs: {
    display: 'flex', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
  },
  tabActive: {
    flex: 1, padding: '9px 4px', background: 'none',
    border: 'none', borderBottom: '2px solid #0284C7',
    color: '#0284C7', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  tabInactive: {
    flex: 1, padding: '9px 4px', background: 'none',
    border: 'none', borderBottom: '2px solid transparent',
    color: '#94A3B8', fontSize: 12, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  tabCount: {
    background: '#F1F5F9', color: '#94A3B8',
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
  },
  tabCountActive: {
    background: '#E0F2FE', color: '#0284C7',
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
  },

  // ── Anomaly list ──
  anomalyScroll: {
    flex: 1, overflowY: 'auto', padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  anomalyCard: {
    padding: '10px 12px', borderRadius: 8,
    display: 'flex', flexDirection: 'column', gap: 5,
    boxSizing: 'border-box',
  },
  anomalyTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 8,
  },
  badgeTextMissing: {
    background: '#FEF3C7', color: '#92400E', fontSize: 10,
    fontWeight: 700, padding: '2px 7px', borderRadius: 99,
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  badgeTextSkipped: {
    background: '#FEF2F2', color: '#991B1B', fontSize: 10,
    fontWeight: 700, padding: '2px 7px', borderRadius: 99,
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  anomalyMeta: {
    display: 'flex', gap: 12, fontSize: 11.5, color: '#475569',
  },
  anomalyNote: {
    fontSize: 11.5, color: '#64748B', fontStyle: 'italic',
    background: 'rgba(255,255,255,0.6)', padding: '5px 8px',
    borderRadius: 6,
  },
  anomalyTime: {
    fontSize: 10.5, color: '#94A3B8', textAlign: 'right',
  },
  cleanState: {
    textAlign: 'center', padding: '28px 20px',
    color: '#16A34A', background: '#DCFCE7',
    borderRadius: 10, fontSize: 12.5, fontWeight: 600,
    margin: '8px 0',
  },
};