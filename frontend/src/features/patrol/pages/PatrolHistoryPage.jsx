import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import { fetchAndBuildImageUrl } from '../../../utils/imageUtils';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { StatusBadge } from '../../../components/StatusBadge';
import styles from './PatrolHistoryPage.module.css';

// Map trạng thái backend -> variant StatusBadge dùng chung + icon riêng cho timeline dot
const STATUS_CONFIG = {
  Xanh: { variant: 'success', icon: '✓', text: 'Đã nộp ảnh' },
  Success: { variant: 'success', icon: '✓', text: 'Đã nộp ảnh' },
  Vang: { variant: 'warning', icon: '⚠️', text: 'Báo mất' },
  Missing: { variant: 'warning', icon: '⚠️', text: 'Báo mất' },
  Dang_Xu_Ly: { variant: 'info', icon: '🔄', text: 'Đang tải lên' },
  Loi_Upload: { variant: 'danger', icon: '❌', text: 'Lỗi tải ảnh' },
  Error: { variant: 'danger', icon: '❌', text: 'Lỗi tải ảnh' },
};
// Map variant StatusBadge -> biến màu token dùng cho chấm tròn timeline (style inline, không cần sửa CSS Module gốc)
const VARIANT_DOT_COLOR = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-text-muted)',
};
const DEFAULT_STATUS = { variant: 'neutral', icon: '•', text: 'Không rõ' };

export const PatrolHistoryPage = () => {
  const navigate = useNavigate();

  const [historyData, setHistoryData] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [previewModal, setPreviewModal] = useState({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, size: 15 };
      if (filterRoom) params.room_number = filterRoom;
      if (filterStatus) params.status_filter = filterStatus;
      const res = await patrolApi.getInspectionHistory(params);
      setHistoryData(res.history_data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRoom, filterStatus]);

  const handleFetchAndShowImage = async (logId, assetName) => {
    setPreviewModal({ isOpen: true, imageUrl: '', assetName, isLoading: true });
    try {
      const url = await fetchAndBuildImageUrl(patrolApi.getInspectionImage, logId);
      setPreviewModal({ isOpen: true, imageUrl: url, assetName, isLoading: false });
    } catch (err) {
      alert(`⚠️ Không thể xem ảnh: ${err.response?.data?.detail || 'Lỗi tải ảnh'}`);
      setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/rooms')} className={styles.backBtn}>‹ Trở về</button>
        <h1 className={styles.title}>Lịch Sử Đi Tuần</h1>
        <div className={styles.headerSpacer} />
      </header>

      <div className={styles.filterBar}>
        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className={styles.select}>
          <option value="">Tất cả phòng</option>
          <option value="1">Phòng 1</option>
          <option value="2">Phòng 2</option>
          <option value="3">Phòng 3</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.select}>
          <option value="">Mọi trạng thái</option>
          <option value="Xanh">Đã nộp ảnh</option>
          <option value="Vang">Báo mất</option>
          <option value="Loi_Upload">Lỗi tải lên</option>
        </select>
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}>Đang tải lịch sử...</div>
        ) : historyData.length === 0 ? (
          <div className={styles.empty}>Chưa có lịch sử kiểm kê nào phù hợp.</div>
        ) : (
          <div className={styles.timeline}>
            {historyData.map((log, index) => {
              const cfg = STATUS_CONFIG[log.status] ?? DEFAULT_STATUS;
              const isSuccess = log.status === 'Xanh' || log.status === 'Success';

              return (
                <div key={log.log_id} className={styles.timelineRow}>
                  <div className={styles.timeColumn}>
                    <div className={styles.timeText}>
                      {log.inspected_at ? log.inspected_at.split(' ')[1]?.slice(0, 5) ?? '--:--' : '--:--'}
                    </div>
                    <div className={styles.timelineDot} style={{ backgroundColor: VARIANT_DOT_COLOR[cfg.variant] }}>{cfg.icon}</div>
                    {index !== historyData.length - 1 && <div className={styles.timelineLine} />}
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <span className={styles.assetName}>{log.asset_name}</span>
                      <StatusBadge variant={cfg.variant}>{cfg.text}</StatusBadge>
                    </div>

                    <div className={styles.cardDetails}>
                      <span>📍 Phòng: {log.room_number}</span>
                      <span>👤 Nhân viên: {log.operator_name}</span>
                      <span>🗓️ {log.shift_date} ({log.shift_type})</span>
                    </div>

                    {log.note && <div className={styles.noteBox}>📝 Ghi chú: {log.note}</div>}

                    {isSuccess && (
                      <button className={styles.viewImgBtn} onClick={() => handleFetchAndShowImage(log.log_id, log.asset_name)}>
                        🖼️ Xem lại minh chứng
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && pagination.total_pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={pagination.current_page === 1}
            onClick={() => fetchHistory(pagination.current_page - 1)}
          >
            ← Trang trước
          </button>
          <span className={styles.pageText}>{pagination.current_page} / {pagination.total_pages}</span>
          <button
            className={styles.pageBtn}
            disabled={pagination.current_page === pagination.total_pages}
            onClick={() => fetchHistory(pagination.current_page + 1)}
          >
            Trang sau →
          </button>
        </div>
      )}

      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        imageUrl={previewModal.imageUrl}
        assetName={previewModal.assetName}
        isLoading={previewModal.isLoading}
        onClose={() => setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false })}
        onCopyLink={(url) => navigator.clipboard.writeText(url).then(() => alert('Đã chép link!'))}
      />
    </div>
  );
};