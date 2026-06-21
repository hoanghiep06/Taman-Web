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
  
  const [assets, setAssets] = useState([]); // Luôn mặc định là mảng sạch
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missingModal, setMissingModal] = useState({ isOpen: false, assetId: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rooms, setRooms] = useState([]);

  const { uploadStatus, processUploadInBackground, setUploadStatus } = useBackgroundQueue();

  // 🔴 HÀM TẢI DỮ LIỆU ĐÃ ĐƯỢC BỌC GIÁP CHỐNG SẬP TUYỆT ĐỐI
  const fetchRoomAssets = async (isSilent = false) => {
    try {
      const assetsData = await patrolApi.getAssetsByRoom(roomNumber);
      
      // Kiểm tra mọi tình huống dữ liệu để ép buộc assets luôn là mảng chuẩn
      if (assetsData && assetsData.assets && Array.isArray(assetsData.assets)) {
        setAssets(assetsData.assets); // Tình huống BE mới: Object bọc tệp con
      } else if (Array.isArray(assetsData)) {
        setAssets(assetsData); // Tình huống fallback: BE trả về mảng thẳng tuột
      } else {
        setAssets([]); // Tình huống khẩn cấp: Trả về mảng rỗng để UI không crash
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng:', err);
      setAssets([]); // Lỗi mạng giữ nguyên mảng rỗng
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // CƠ CHẾ AUTO-REFRESH (POLLING) NGẦM MỖI 5 GIÂY ĐỂ ĐỒNG BỘ TIẾN ĐỘ WORKER
  useEffect(() => {
    fetchRoomAssets(); // Chạy có Loading lần đầu tiên
    
    const intervalId = setInterval(() => {
      fetchRoomAssets(true); 
    }, 5000); 

    return () => clearInterval(intervalId); // Hủy vòng lặp khi thoát phòng
  }, [roomNumber]);


  // Tải danh sách phòng để lấy logic nút "Qua phòng kế"
  useEffect(() => { 
    patrolApi.getRooms()
      .then(res => {
        // Hỗ trợ phòng thủ nếu API getRooms trả về object thay vì mảng
        if (Array.isArray(res)) setRooms(res);
        else if (res && res.rooms) setRooms(res.rooms);
      })
      .catch(err => console.error(err));
  }, []);
  

  // Đảm bảo an toàn khi gọi .filter bằng toán tử điều kiện an toàn Array.isArray
  const safeAssets = Array.isArray(assets) ? assets : [];

  const completedCount = safeAssets.filter(a => 
    a.current_status === 'Xanh' || a.current_status === 'Success' || 
    a.current_status === 'Vang' || a.current_status === 'Vàng' || a.current_status === 'Missing' ||
    uploadStatus[a.asset_id] === 'success' || uploadStatus[a.asset_id] === 'missing'
  ).length;
  
  const isFinished = safeAssets.length > 0 && completedCount === safeAssets.length;
  
  const currentRoomIdx = rooms.findIndex(r => String(r.room_number) === String(roomNumber));
  const nextRoom = currentRoomIdx !== -1 ? rooms[currentRoomIdx + 1] : undefined;

  const statusCounts = safeAssets.reduce((acc, a) => {
    const s = getFinalStatus(a, uploadStatus);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Lọc assets theo search
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
    <div style={styles.container}>
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
      
      <div style={styles.listContainer}>
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
          <div style={styles.emptyState}>Phòng trống hoặc chưa có đồ đạc nào.</div>
        )}
      </div>

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
  container: { padding: '12px', backgroundColor: theme.color.bg, minHeight: '100%', paddingBottom: '120px', fontFamily: '-apple-system, system-ui, sans-serif', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  loadingScreen: { textAlign: 'center', marginTop: '80px', color: theme.color.inkTertiary, fontSize: '14px' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '22px' },
  emptyState: { textAlign: 'center', padding: '40px 0', color: theme.color.inkMuted, fontSize: '13px' },
  stickyFooterContainer: { position: 'fixed', bottom: 16, left: 12, right: 12, zIndex: 999 },
  stickyFooter: { backgroundColor: theme.color.ink, padding: '12px 16px', borderRadius: theme.radius.xl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: theme.shadow.lg },
  footerInfo: { color: '#E2E8F0', fontSize: '13px' },
  cameraTrigger: { backgroundColor: theme.color.primary, color: '#FFF', padding: '10px 18px', borderRadius: theme.radius.md, fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};