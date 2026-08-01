import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import { useBackgroundQueue } from '../hooks/useBackgroundQueue';
import { fetchAndBuildImageUrl } from '../../../utils/imageUtils';

import { PatrolHeader }       from '../components/PatrolHeader';
import { ElderSection }       from '../components/ElderSection';
import { MissingReportModal } from '../components/MissingReportModal';
import { ImagePreviewModal }  from '../components/ImagePreviewModal';
import { ProgressSection }    from '../components/ProgressSection';
import { SearchBar }          from '../components/SearchBar';
import { groupAssetsByElder, getFinalStatus, STATUS_SEARCH_KEYWORDS } from '../utils/patrolHelpers';

import styles from './PatrolSessionPage.module.css';

export const PatrolSessionPage = () => {
  const { roomNumber } = useParams();
  const navigate = useNavigate();

  const [assets, setAssets]               = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [rooms, setRooms]                 = useState([]);

  const [missingModal, setMissingModal]   = useState({ isOpen: false, assetId: null });
  const [previewModal, setPreviewModal]   = useState({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('All');

  const { uploadStatus, processUploadInBackground, setUploadStatus } = useBackgroundQueue();

  const fetchRoomAssets = async (isSilent = false) => {
    try {
      const data = await patrolApi.getAssetsByRoom(roomNumber);
      const list = data?.assets ?? (Array.isArray(data) ? data : []);
      setAssets(list);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng:', err);
      setAssets([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAssets();
    const id = setInterval(() => fetchRoomAssets(true), 5000);
    return () => clearInterval(id);
  }, [roomNumber]);

  useEffect(() => {
    patrolApi.getRooms()
      .then((res) => setRooms(Array.isArray(res) ? res : res?.rooms ?? []))
      .catch(console.error);
  }, []);

  const safeAssets = Array.isArray(assets) ? assets : [];

  const completedCount = safeAssets.filter((a) =>
    ['Xanh', 'Success', 'Vang', 'Vàng', 'Missing'].includes(a.current_status) ||
    ['success', 'missing'].includes(uploadStatus[a.asset_id])
  ).length;

  const isFinished = safeAssets.length === 0 || completedCount === safeAssets.length;

  const currentRoomIdx = rooms.findIndex((r) => String(r.room_number) === String(roomNumber));
  const nextRoom = currentRoomIdx !== -1 ? rooms[currentRoomIdx + 1] : undefined;

  const statusCounts = safeAssets.reduce((acc, a) => {
    const s = getFinalStatus(a, uploadStatus);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredAssets = safeAssets.filter((a) => {
    const finalStatus = getFinalStatus(a, uploadStatus);
    if (statusFilter !== 'All' && finalStatus !== statusFilter) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      a.asset_name.toLowerCase().includes(term) ||
      (a.elder_name || '').toLowerCase().includes(term) ||
      (STATUS_SEARCH_KEYWORDS[finalStatus] || []).some((k) => k.includes(term))
    );
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
      const { nonce } = await patrolApi.requestNonce();
      if (!nonce) return alert('Lỗi: Không lấy được mã bảo mật!');
      processUploadInBackground(selectedAssetIds, file, nonce);
      setSelectedAssetIds([]);
    } catch {
      alert('Hệ thống kiểm tra an ninh thất bại!');
    }
  };

  const handleReportMissingSubmit = async (note) => {
    try {
      await patrolApi.reportMissing(missingModal.assetId, note);
      setUploadStatus((prev) => ({ ...prev, [missingModal.assetId]: 'missing' }));
      setMissingModal({ isOpen: false, assetId: null });
      setSelectedAssetIds((prev) => prev.filter((id) => id !== missingModal.assetId));
      fetchRoomAssets(true);
    } catch {
      alert('Lỗi gửi báo cáo mất!');
    }
  };

  const handleFetchAndShowImage = async (logId, assetName) => {
    setPreviewModal({ isOpen: true, imageUrl: '', assetName, isLoading: true });
    try {
      const url = await fetchAndBuildImageUrl(patrolApi.getInspectionImage, logId);
      setPreviewModal({ isOpen: true, imageUrl: url, assetName, isLoading: false });
    } catch (err) {
      alert(`⚠️ Không thể xem ảnh: ${err.response?.data?.detail || 'Hình ảnh đang được xử lý.'}`);
      setPreviewModal({ isOpen: false, imageUrl: '', assetName: '', isLoading: false });
    }
  };

  const handleCopyLink = (url) => {
    if (!url) { alert('Không có liên kết ảnh để sao chép!'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => alert('Đã sao chép liên kết ảnh!'))
        .catch(() => alert('Trình duyệt chặn sao chép.'));
    } else {
      const el = document.createElement('textarea');
      el.value = url;
      Object.assign(el.style, { position: 'fixed', left: '-9999px', top: '0' });
      document.body.appendChild(el);
      el.focus(); el.select();
      document.execCommand('copy') ? alert('Đã sao chép!') : alert('Trình duyệt không hỗ trợ.');
      document.body.removeChild(el);
    }
  };

  if (loading) return <div className={styles.wrapper}><div className={styles.loadingScreen}>Đang đồng bộ dữ liệu phòng...</div></div>;

  return (
    <div className={styles.wrapper}>
      {/* Khu vực cố định đầu trang */}
      <div className={styles.stickyTop}>
        <PatrolHeader roomNumber={roomNumber} onBack={() => navigate('/rooms')} />
        <ProgressSection
          completedCount={completedCount}
          totalCount={safeAssets.length}
          isFinished={isFinished}
          nextRoomName={nextRoom?.room_number}
          onNextRoom={() => (nextRoom ? navigate(`/patrol/${nextRoom.room_number}`) : navigate('/rooms'))}
        />
        <SearchBar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusCounts={statusCounts}
        />
      </div>

      {/* Danh sách tài sản cuộn */}
      <div className={styles.scrollArea}>
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
          <div className={styles.emptyState}>Phòng trống hoặc không có tài sản khớp bộ lọc.</div>
        )}
      </div>

      {/* Thanh thao tác nổi */}
      {selectedAssetIds.length > 0 && (
        <div className={styles.footerContainer}>
          <div className={styles.footerBar}>
            <span className={styles.footerInfo}>Đang chọn: <b>{selectedAssetIds.length}</b> mục</span>
            <label className={styles.cameraTrigger}>
              📸 Chụp ảnh ngay
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleLaunchCamera}
                className={styles.cameraInput}
              />
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