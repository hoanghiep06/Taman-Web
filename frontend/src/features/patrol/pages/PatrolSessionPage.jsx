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

  const [allRooms, setAllRooms] = useState([]); // Danh sách toàn bộ phòng để điều hướng
  const [roomInfo, setRoomInfo] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [missingModal, setMissingModal] = useState({ isOpen: false, assetId: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, logId: null, assetName: '' });

  const { uploadStatus, processUploadInBackground, setUploadStatus } = useBackgroundQueue();

  // 1. Tải danh sách phòng để phục vụ nút Chuyển phòng
  useEffect(() => {
    patrolApi.getRooms()
      .then((data) => setAllRooms(data || []))
      .catch(console.error);
  }, []);

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

  // 2. Tính toán vị trí phòng hiện tại, phòng trước và phòng tiếp theo
  const currentRoomIndex = allRooms.findIndex((r) => String(r.room_id || r.id) === String(roomId));
  const hasPrev = currentRoomIndex > 0;
  const hasNext = currentRoomIndex >= 0 && currentRoomIndex < allRooms.length - 1;

  const handlePrevRoom = () => {
    if (hasPrev) {
      const prevId = allRooms[currentRoomIndex - 1].room_id || allRooms[currentRoomIndex - 1].id;
      navigate(`/patrol/room/${prevId}`);
    }
  };

  const handleNextRoom = () => {
    if (hasNext) {
      const nextId = allRooms[currentRoomIndex + 1].room_id || allRooms[currentRoomIndex + 1].id;
      navigate(`/patrol/room/${nextId}`);
    }
  };

  const handleToggleSelect = (assetId) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

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

  const handleReportMissingSubmit = async (note) => {
    try {
      await patrolApi.reportMissing(missingModal.assetId, note);
      setUploadStatus((prev) => ({ ...prev, [missingModal.assetId]: 'Vang' }));
      setMissingModal({ isOpen: false, assetId: null });
      setSelectedAssetIds((prev) => prev.filter((id) => id !== missingModal.assetId));
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
          onBack={() => navigate('/patrol')}
          onPrevRoom={handlePrevRoom}
          onNextRoom={handleNextRoom}
          hasPrev={hasPrev}
          hasNext={hasNext}
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
              onOpenPreview={handleOpenPreview}
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