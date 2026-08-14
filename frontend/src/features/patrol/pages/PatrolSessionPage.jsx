import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import { useBackgroundQueue } from '../hooks/useBackgroundQueue';

import { PatrolHeader } from '../components/PatrolHeader';
import { ElderSection } from '../components/AssetList/ElderSection';
import { MissingReportModal } from '../components/Modals/MissingReportModal';
import { ImagePreviewModal } from '../components/Modals/ImagePreviewModal';
import { groupAssetsByElder } from '../utils/patrolHelpers';

import styles from './PatrolSessionPage.module.css';

export const PatrolSessionPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [roomInfo, setRoomInfo] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missingModal, setMissingModal] = useState({ isOpen: false, assetId: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, logId: null, assetName: '' });

  const { uploadStatus, processUploadInBackground, setUploadStatus } = useBackgroundQueue();

  const fetchRoomAssets = async (isSilent = false) => {
    try {
      const data = await patrolApi.getAssetsForPatrolByRoom(roomId);
      setRoomInfo(data.room_info);
      setAssets(data.assets || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAssets();
    const id = setInterval(() => fetchRoomAssets(true), 5000);
    return () => clearInterval(id);
  }, [roomId]);

  const groupedData = groupAssetsByElder(assets);

  const handleToggleSelect = (assetId) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // 1. Hàm mở Modal xem ảnh (Modal sẽ tự lo việc fetch link 15p)
  const handleOpenPreview = (logId, assetName) => {
    setPreviewModal({ isOpen: true, logId, assetName });
  };

  const handleLaunchCamera = async (e) => {
    const file = e.target.files[0];
    if (!file || selectedAssetIds.length === 0) return;
    try {
      const { nonce } = await patrolApi.requestNonce();
      processUploadInBackground(selectedAssetIds, file, nonce);
      setSelectedAssetIds([]);
    } catch {
      alert('Không thể lấy mã an ninh. Vui lòng thử lại!');
    }
  };

  // 2. Thêm hàm xử lý khi nhân viên submit báo mất đồ
  const handleReportMissingSubmit = async (note) => {
    try {
      await patrolApi.reportMissing(missingModal.assetId, note);
      
      // Update UI ngay lập tức (Optimistic UI)
      setUploadStatus((prev) => ({ ...prev, [missingModal.assetId]: 'Vang' }));
      setMissingModal({ isOpen: false, assetId: null });
      setSelectedAssetIds((prev) => prev.filter((id) => id !== missingModal.assetId));
      
      // Fetch lại để đồng bộ với BE
      fetchRoomAssets(true);
    } catch {
      alert('Lỗi gửi báo cáo mất!');
    }
  };

  if (loading) return <div className={styles.loadingScreen}>Đang tải dữ liệu kiểm kê...</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.stickyTop}>
        <PatrolHeader 
          roomNumber={roomInfo?.room_number} 
          zoneName={roomInfo?.zone_name}
          onBack={() => navigate('/patrol')} 
        />
      </div>

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
              onOpenPreview={handleOpenPreview} // Đã sửa thành handleOpenPreview
            />
          ))
        ) : (
          <div className={styles.emptyState}>Phòng trống hoặc không có tài sản cần kiểm kê.</div>
        )}
      </div>

      {selectedAssetIds.length > 0 && (
        <div className={styles.footerContainer}>
          <div className={styles.footerBar}>
            <span className={styles.footerInfo}>Đang chọn: <b>{selectedAssetIds.length}</b> món</span>
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

      {/* Render đầy đủ các Modals */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        logId={previewModal.logId}
        assetName={previewModal.assetName}
        onClose={() => setPreviewModal({ isOpen: false, logId: null, assetName: '' })}
      />

      <MissingReportModal
        isOpen={missingModal.isOpen}
        onClose={() => setMissingModal({ isOpen: false, assetId: null })}
        onSubmit={handleReportMissingSubmit}
      />
    </div>
  );
};