import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import axiosClient from '../../../api/axiosClient';

import { ImagePreviewModal } from '../components/ImagePreviewModal';

export const PatrolHistoryPage = () => {
  const navigate = useNavigate();
  
  const [historyData, setHistoryData] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(true);

  // States cho Bộ lọc
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // State cho Modal xem ảnh
  const [previewModal, setPreviewModal] = useState({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, size: 15 };
      if (filterRoom) params.room_number = filterRoom;
      if (filterStatus) params.status_filter = filterStatus;

      const response = await patrolApi.getInspectionHistory(params);
      setHistoryData(response.history_data);
      setPagination(response.pagination);
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1); // Tải lại trang 1 mỗi khi bộ lọc thay đổi
  }, [filterRoom, filterStatus]);

  // HÀM XEM LẠI ẢNH (Dùng chung logic Fix IP Docker)
  const handleFetchAndShowImage = async (logId, assetName) => {
    setPreviewModal({ isOpen: true, imageUrl: '', assetName: assetName, isLoading: true });
    try {
      const response = await patrolApi.getInspectionImage(logId);
      if (response.shareable_url) {
        const token = response.shareable_url.split('/').pop();
        const configuredBaseUrl = axiosClient.defaults.baseURL || '';
        let absoluteBaseUrl = configuredBaseUrl;
        if (!absoluteBaseUrl.startsWith('http')) {
          absoluteBaseUrl = window.location.origin + (configuredBaseUrl.startsWith('/') ? '' : '/') + configuredBaseUrl;
        }
        const correctImageUrl = `${absoluteBaseUrl.replace(/\/$/, "")}/inspections/public-view/${token}`;
        setPreviewModal({ isOpen: true, imageUrl: correctImageUrl, assetName: assetName, isLoading: false });
      } else throw new Error("Không nhận được URL ảnh.");
    } catch (err) {
      alert(`⚠️ Không thể xem ảnh: ${err.response?.data?.detail || "Lỗi tải ảnh"}`);
      setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });
    }
  };

  // Render màu và icon dựa theo trạng thái BE trả về
  const getStatusConfig = (status) => {
    if (status === 'Xanh' || status === 'Success') return { color: '#15803D', bg: '#DCFCE7', icon: '✓', text: 'Đã nộp ảnh' };
    if (status === 'Vang' || status === 'Missing') return { color: '#B45309', bg: '#FEF3C7', icon: '⚠️', text: 'Báo mất' };
    if (status === 'Dang_Xu_Ly') return { color: '#2563EB', bg: '#DBEAFE', icon: '🔄', text: 'Đang tải lên' };
    if (status === 'Loi_Upload' || status === 'Error') return { color: '#B91C1C', bg: '#FEE2E2', icon: '❌', text: 'Lỗi tải ảnh' };
    return { color: '#64748B', bg: '#F1F5F9', icon: '•', text: 'Không rõ' };
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => navigate('/rooms')} style={styles.backBtn}>‹ Trở về</button>
        <h3 style={styles.title}>Lịch Sử Đi Tuần</h3>
        <div style={{width: '60px'}}></div>
      </header>

      {/* Thanh Công Cụ Lọc */}
      <div style={styles.filterBar}>
        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} style={styles.select}>
          <option value="">Tất cả phòng</option>
          {/* Tuỳ ý thêm các option phòng cứng hoặc render từ API getRooms */}
          <option value="1">Phòng 1</option>
          <option value="2">Phòng 2</option>
          <option value="3">Phòng 3</option>
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.select}>
          <option value="">Mọi trạng thái</option>
          <option value="Xanh">Đã nộp ảnh (Xanh)</option>
          <option value="Vang">Báo mất (Vàng)</option>
          <option value="Loi_Upload">Lỗi tải lên</option>
        </select>
      </div>

      {/* Khu vực Timeline */}
      {loading ? (
        <div style={styles.loading}>Đang tải lịch sử...</div>
      ) : historyData.length === 0 ? (
        <div style={styles.empty}>Chưa có lịch sử kiểm kê nào phù hợp.</div>
      ) : (
        <div style={styles.timelineContainer}>
          {historyData.map((log, index) => {
            const statusCfg = getStatusConfig(log.status);
            const isSuccess = log.status === 'Xanh' || log.status === 'Success';

            return (
              <div key={log.log_id} style={styles.timelineRow}>
                {/* Cột thời gian & Trục chỉ */}
                <div style={styles.timeColumn}>
                  <div style={styles.timeText}>
                    {log.inspected_at ? log.inspected_at.split(' ')[1].slice(0, 5) : '--:--'}
                  </div>
                  <div style={{...styles.timelineDot, backgroundColor: statusCfg.color}}>
                    {statusCfg.icon}
                  </div>
                  {/* Đường kẻ nối dọc (ẩn ở phần tử cuối cùng) */}
                  {index !== historyData.length - 1 && <div style={styles.timelineLine}></div>}
                </div>

                {/* Khối Card nội dung */}
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <span style={styles.assetName}>{log.asset_name}</span>
                    <span style={{...styles.badge, backgroundColor: statusCfg.bg, color: statusCfg.color}}>
                      {statusCfg.text}
                    </span>
                  </div>
                  
                  <div style={styles.cardDetails}>
                    <span>📍 Phòng: {log.room_number}</span>
                    <span>👤 Nhân viên: {log.operator_name}</span>
                    <span>🗓️ {log.shift_date} ({log.shift_type})</span>
                  </div>

                  {log.note && (
                    <div style={styles.noteBox}>📝 Ghi chú: {log.note}</div>
                  )}

                  {/* Hiện nút xem lại ảnh nếu thành công */}
                  {isSuccess && (
                    <button 
                      onClick={() => handleFetchAndShowImage(log.log_id, log.asset_name)}
                      style={styles.viewImgBtn}
                    >
                      🖼️ Xem lại minh chứng
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Điều hướng Phân Trang */}
      {!loading && pagination.total_pages > 1 && (
        <div style={styles.pagination}>
          <button 
            disabled={pagination.current_page === 1}
            onClick={() => fetchHistory(pagination.current_page - 1)}
            style={styles.pageBtn}
          >
            Trang trước
          </button>
          <span style={styles.pageText}>
            {pagination.current_page} / {pagination.total_pages}
          </span>
          <button 
            disabled={pagination.current_page === pagination.total_pages}
            onClick={() => fetchHistory(pagination.current_page + 1)}
            style={styles.pageBtn}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Tái sử dụng Modal xem ảnh */}
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

// CSS Giao diện Timeline chuẩn Mobile
const styles = {
  container: { padding: '12px', backgroundColor: '#F8FAFC', minHeight: '100%', paddingBottom: '30px', fontFamily: '-apple-system, system-ui, sans-serif', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: '14px' },
  backBtn: { background: 'none', border: 'none', color: '#0284C7', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  title: { margin: 0, fontSize: '17px', fontWeight: '700', color: '#1E293B', flex: 1, textAlign: 'center' },
  
  filterBar: { display: 'flex', gap: '10px', marginBottom: '20px' },
  select: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '14px', backgroundColor: '#FFF' },
  
  loading: { textAlign: 'center', marginTop: '60px', color: '#64748B', fontSize: '14px' },
  empty: { textAlign: 'center', marginTop: '60px', color: '#94A3B8', fontSize: '14px' },
  
  timelineContainer: { display: 'flex', flexDirection: 'column', paddingLeft: '8px' },
  timelineRow: { display: 'flex', marginBottom: '16px', position: 'relative' },
  
  timeColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', flexShrink: 0 },
  timeText: { fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '6px' },
  timelineDot: { width: '24px', height: '24px', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', zIndex: 2, border: '2px solid #F8FAFC', boxShadow: '0 0 0 1px #E2E8F0' },
  timelineLine: { width: '2px', backgroundColor: '#E2E8F0', flex: 1, marginTop: '4px' },
  
  cardContent: { flex: 1, backgroundColor: '#FFF', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginLeft: '12px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  assetName: { fontSize: '15px', fontWeight: '700', color: '#1E293B' },
  badge: { fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' },
  
  cardDetails: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748B', marginBottom: '10px' },
  noteBox: { backgroundColor: '#FEFCE8', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#A16207', marginBottom: '10px', borderLeft: '3px solid #EAB308' },
  
  viewImgBtn: { backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', padding: '8px', borderRadius: '8px', width: '100%', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 10px' },
  pageBtn: { padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' },
  pageText: { fontSize: '14px', fontWeight: '600', color: '#64748B' }
};