import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import styles from './RoomListPage.module.css';

export const RoomListPage = () => {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRooms = async (isSilent = false) => {
    try {
      const data = await patrolApi.getRooms();
      setRooms(data);
    } catch (err) {
      console.error('Không thể tải danh sách phòng', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const id = setInterval(() => fetchRooms(true), 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Đang tải khu vực tuần tra...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Khu Vực Tuần Tra</h2>
        <p className={styles.subtitle}>Chọn phòng để bắt đầu kiểm kê ca trực</p>
      </div>

      <div className={styles.scrollArea}>
        {rooms.length === 0 ? (
          <div className={styles.emptyState}>Chưa có phòng nào được thiết lập.</div>
        ) : (
          <div className={styles.grid}>
            {rooms.map((room) => {
              const total     = room.total_assets || 0;
              const inspected = room.inspected_count || 0;
              const percent   = total > 0 ? Math.min(Math.floor((inspected / total) * 100), 100) : 100;
              const isFinished = total === 0 || inspected >= total;
              const isEmpty    = total === 0;

              // Màu nước: hoàn tất → xanh lá | chưa xong → xanh dương
              const waterColor      = isFinished ? '#86EFAC' : '#BAE6FD';
              const textPrimaryColor = isFinished ? '#14532D' : '#0369A1';

              return (
                <div
                  key={room.room_id || room.room_number}
                  className={styles.roomCard}
                  onClick={() => navigate(`/patrol/${room.room_number}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/patrol/${room.room_number}`)}
                  aria-label={`Phòng ${room.room_number}, tiến độ ${inspected}/${total}`}
                >
                  {/* Lớp nước ngập từ đáy */}
                  <div
                    className={styles.waterFill}
                    style={{ height: `${percent}%`, backgroundColor: waterColor }}
                  />

                  {/* Nội dung nổi trên mặt nước */}
                  <div className={styles.cardContent}>
                    <div className={styles.roomBadge} style={{ color: textPrimaryColor }}>
                      P.{room.room_number}
                    </div>
                    <p className={styles.roomDesc}>{room.description || 'Chưa có mô tả'}</p>
                    <div className={styles.progressText}>
                      {isEmpty ? 'Phòng trống' : (isFinished ? '✅ Đã hoàn tất' : `${inspected}/${total} tài sản`)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};