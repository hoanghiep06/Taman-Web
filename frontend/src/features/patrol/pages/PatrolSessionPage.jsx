import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import { useBackgroundQueue } from '../hooks/useBackgroundQueue';

import { PatrolHeader } from '../components/PatrolHeader';
import { ElderSection } from '../components/ElderSection';
import { MissingReportModal } from '../components/MissingReportModal';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ProgressSection } from '../components/ProgressSection';
import { SearchBar } from '../components/SearchBar';
import { groupAssetsByElder, getFinalStatus, STATUS_SEARCH_KEYWORDS } from '../utils/patrolHelpers';

import { theme } from '../utils/theme';
import axiosClient from '../../../api/axiosClient';

export const PatrolSessionPage = () => {
  const { roomNumber } = useParams();
  const navigate = useNavigate();
  
  const [assets, setAssets] = useState([]); 
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missingModal, setMissingModal] = useState({ isOpen: false, assetId: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rooms, setRooms] = useState([]);

  const { uploadStatus, processUploadInBackground, setUploadStatus } = useBackgroundQueue();

  const fetchRoomAssets = async (isSilent = false) => {
    try {
      const assetsData = await patrolApi.getAssetsByRoom(roomNumber);
      if (assetsData && assetsData.assets && Array.isArray(assetsData.assets)) {
        setAssets(assetsData.assets); 
      } else if (Array.isArray(assetsData)) {
        setAssets(assetsData); 
      } else {
        setAssets([]); 
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng:', err);
      setAssets([]); 
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAssets(); 
    const intervalId = setInterval(() => fetchRoomAssets(true), 5000); 
    return () => clearInterval(intervalId); 
  }, [roomNumber]);

  useEffect(() => { 
    patrolApi.getRooms()
      .then(res => {
        if (Array.isArray(res)) setRooms(res);
        else if (res && res.rooms) setRooms(res.rooms);
      })
      .catch(err => console.error(err));
  }, []);
  
  const safeAssets = Array.isArray(assets) ? assets : [];

  const completedCount = safeAssets.filter(a => 
    a.current_status === 'Xanh' || a.current_status === 'Success' || 
    a.current_status === 'Vang' || a.current_status === 'Vàng' || a.current_status === 'Missing' ||
    uploadStatus[a.asset_id] === 'success' || uploadStatus[a.asset_id] === 'missing'
  ).length;
  
  const isFinished = safeAssets.length === 0 || completedCount === safeAssets.length;
  
  const currentRoomIdx = rooms.findIndex(r => String(r.room_number) === String(roomNumber));
  const nextRoom = currentRoomIdx !== -1 ? rooms[currentRoomIdx + 1] : undefined;

  const statusCounts = safeAssets.reduce((acc, a) => {
    const s = getFinalStatus(a, uploadStatus);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredAssets = safeAssets.filter(a => {
    const finalStatus = getFinalStatus(a, uploadStatus);
    if (statusFilter !== 'All' && finalStatus !== statusFilter) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const matchName = a.asset_name.toLowerCase().includes(term);
    const matchElder = (a.elder_name || '').toLowerCase().includes(term);
    const matchStatusKeyword = (STATUS_SEARCH_KEYWORDS[finalStatus] || []).some(k => k.includes(term));

    return matchName || matchElder || matchStatusKeyword;
  });
  const groupedData = groupAssetsByElder(filteredAssets);

  const handleToggleSelect = (assetId) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const handleLaunchCamera = async (e) => {
    const file = e.target.files[0];
    if (!file || selectedAssetIds.length === 0) return;

    try {
      const nonceResponse = await patrolApi.requestNonce();
      const secureNonce = nonceResponse.nonce; 
      if (!secureNonce) return alert("Lỗi: Không lấy được mã bảo mật bảo vệ ảnh!");

      processUploadInBackground(selectedAssetIds, file, secureNonce);
      setSelectedAssetIds([]); 
    } catch (err) {
      alert('Hệ thống kiểm tra an ninh thất bại!');
    }
  };

  const handleReportMissingSubmit = async (note) => {
    try {
      await patrolApi.reportMissing(missingModal.assetId, note);
      setUploadStatus(prev => ({ ...prev, [missingModal.assetId]: 'missing' }));
      setMissingModal({ isOpen: false, assetId: null });
      setSelectedAssetIds(prev => prev.filter(id => id !== missingModal.assetId));
      fetchRoomAssets(true); 
    } catch (err) {
      alert('Lỗi gửi báo cáo mất!');
    }
  };

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
      } else {
        throw new Error("Không nhận được dữ liệu ảnh từ Server.");
      }
    } catch (err) {
      alert(`⚠️ Không thể xem ảnh: ${err.response?.data?.detail || "Hình ảnh đang được xử lý."}`);
      setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });
    }
  };

  const handleCopyLink = (url) => {
    if (!url) return alert("Không có liên kết ảnh để sao chép!");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => alert('Đã sao chép liên kết ảnh bảo mật công khai!'))
        .catch(() => alert('Trình duyệt chặn sao chép. Vui lòng thử lại!'));
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        if (successful) alert('Đã sao chép liên kết ảnh bảo mật công khai!');
        else alert('Trình duyệt điện thoại không hỗ trợ.');
        document.body.removeChild(textArea);
      } catch (err) {
        alert('Lỗi quyền sao chép trên điện thoại.');
      }
    }
  };

  if (loading) return <div style={styles.loadingScreen}>Đang đồng bộ dữ liệu phòng...</div>;

  return (
    <div style={styles.wrapperContainer}>
      {/* KHU VỰC ĐẦU TRANG CỐ ĐỊNH PHẦN TRĂM */}
      <div style={styles.stickyTopArea}>
        <PatrolHeader roomNumber={roomNumber} onBack={() => navigate('/rooms')} />
        <ProgressSection 
          completedCount={completedCount} 
          totalCount={safeAssets.length} 
          isFinished={isFinished}
          nextRoomName={nextRoom?.room_number}
          onNextRoom={() => nextRoom ? navigate(`/patrol/${nextRoom.room_number}`) : navigate('/rooms')}
        />
        <SearchBar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange => setStatusFilter(onStatusFilterChange)}
          statusCounts={statusCounts}
        />
      </div>
      
      {/* KHU VỰC CUỘN DANH SÁCH ĐỒ ĐẠC TỰ LỌC THEO KHUNG CÒN LẠI */}
      <div style={styles.scrollListArea}>
        {groupedData.length > 0 ? (
          groupedData.map((group, index) => (
            <ElderSection
              key={index}
              group={group}
              selectedAssetIds={selectedAssetIds}
              uploadStatus={uploadStatus}
              onToggleSelect={handleToggleSelect}
              onOpenMissing={(assetId) => setMissingModal({ isOpen: true, assetId })}
              onOpenPreview={handleFetchAndShowImage} 
            />
          ))
        ) : (
          <div style={styles.emptyState}>Phòng trống hoặc chưa có đồ đạc nào phù hợp bộ lọc.</div>
        )}
      </div>

      {/* THANH THAO TÁC NỔI CHỮA BIÊN AN TOÀN CALC DÀNH RIÊNG CHO IPHONE */}
      {selectedAssetIds.length > 0 && (
        <div style={styles.stickyFooterContainer}>
          <div style={styles.stickyFooter}>
            <span style={styles.footerInfo}>Đang chọn: <b>{selectedAssetIds.length}</b> mục</span>
            <label style={styles.cameraTrigger}>
              📸 Chụp ảnh ngay
              <input type="file" accept="image/*" capture="environment" onChange={handleLaunchCamera} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      <MissingReportModal
        isOpen={missingModal.isOpen}
        onClose={() => setMissingModal({ isOpen: false, assetId: null })}
        onSubmit={handleReportMissingSubmit}
      />

      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        imageUrl={previewModal.imageUrl}
        assetName={previewModal.assetName}
        isLoading={previewModal.isLoading}
        onClose={() => setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false })}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
};

const styles = {
  wrapperContainer: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', boxSizing: 'border-box' },
  stickyTopArea: { padding: '4px 12px 0 12px', flexShrink: 0, backgroundColor: theme.color.bg, zIndex: 10 },
  
  // 🔴 SỬA CHÍ MẠNG: Độc lập vùng cuộn danh sách, chừa khế ước đáy 100px để không bao giờ bị thanh chụp đè nghẹt chữ
  scrollListArea: { flex: 1, overflowY: 'auto', padding: '4px 12px 100px 12px', WebkitOverflowScrolling: 'touch' },
  
  loadingScreen: { textAlign: 'center', marginTop: '80px', color: theme.color.inkTertiary, fontSize: '14px' },
  emptyState: { textAlign: 'center', padding: '40px 0', color: theme.color.inkMuted, fontSize: '13px' },
  
  // 🔴 ĐỊNH VỊ PHAO NỔI THÔNG MINH CHỐNG CHU KỲ SAFARI TÀI THỎ
  stickyFooterContainer: { 
    position: 'fixed', 
    bottom: 'calc(60px + 12px + env(safe-area-inset-bottom))', // Neo chuẩn xác lơ lửng phía trên BottomNav 12px
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 24px)',
    maxWidth: '456px',
    zIndex: 999 
  },
  stickyFooter: { backgroundColor: theme.color.ink, padding: '12px 16px', borderRadius: theme.radius.xl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(15,23,42,0.25)' },
  footerInfo: { color: '#E2E8F0', fontSize: '13px' },
  cameraTrigger: { backgroundColor: theme.color.primary, color: '#FFF', padding: '10px 18px', borderRadius: theme.radius.md, fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};