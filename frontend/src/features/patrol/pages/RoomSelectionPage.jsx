import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { patrolApi } from '../api/patrolApi';

import { FacilitySelector } from '../components/FacilitySelector/FacilitySelector';
import { FacilityHeader } from '../components/FacilityHeader/FacilityHeader';
import styles from './RoomSelectionPage.module.css';

export const RoomSelectionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeFacilityId, setActiveFacilityId] = useState(user?.facility_id || null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending', 'Completed'

  // Sử dụng useCallback để đóng gói hàm fetch, tránh tạo lại hàm vô ích
  const fetchRooms = useCallback(async (isSilent = false) => {
    try {
      const data = await patrolApi.getRooms({ facility_id: activeFacilityId });
      setRooms(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phòng', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeFacilityId]);

  // Quản lý cơ chế gọi API tự động (Polling) 5 giây/lần an toàn
  useEffect(() => {
    setLoading(true);
    fetchRooms(); // Gọi lần đầu khi activeFacilityId thay đổi

    const id = setInterval(() => {
      fetchRooms(true); // Tự động cập nhật ngầm (silent)
    }, 5000);

    return () => clearInterval(id); // Dọn dẹp interval cũ khi unmount hoặc đổi Id cơ sở
  }, [fetchRooms]);

  // TỐI ƯU: Sử dụng useMemo để chỉ tính toán lại bộ lọc khi dữ liệu thực sự thay đổi
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchSearch = 
        room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const total = room.total_assets || 0;
      const inspected = room.inspected_count || 0;
      const isFinished = total === 0 || inspected >= total;

      let matchStatus = true;
      if (filterStatus === 'Pending') matchStatus = !isFinished;
      if (filterStatus === 'Completed') matchStatus = isFinished;

      return matchSearch && matchStatus;
    });
  }, [rooms, searchTerm, filterStatus]);

  // TỐI ƯU: Nhóm phòng theo Cơ sở bằng useMemo
  const groupedRooms = useMemo(() => {
    return filteredRooms.reduce((acc, room) => {
      const facName = room.facility_name || 'Chưa xác định Cơ sở';
      if (!acc[facName]) acc[facName] = [];
      acc[facName].push(room);
      return acc;
    }, {});
  }, [filteredRooms]);

  // Hàm tiện ích để xóa nhanh bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
  };

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
          <h2 className={styles.title}>Khu Vực Tuần Tra</h2>
          <p className={styles.subtitle}>Kiểm kê tư trang và tài sản cố định</p>
          
          {user?.facility_id === null && (
            <FacilitySelector 
              selectedId={activeFacilityId} 
              onChange={(newId) => setActiveFacilityId(newId)} 
            />
          )}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo số phòng, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>

          <div className={styles.filterPills}>
            <button 
              className={`${styles.pill} ${filterStatus === 'All' ? styles.pillActive : ''}`}
              onClick={() => setFilterStatus('All')}
            >
              Tất cả
            </button>
            <button 
              className={`${styles.pill} ${filterStatus === 'Pending' ? styles.pillPending : ''}`}
              onClick={() => setFilterStatus('Pending')}
            >
              Chưa xong
            </button>
            <button 
              className={`${styles.pill} ${filterStatus === 'Completed' ? styles.pillCompleted : ''}`}
              onClick={() => setFilterStatus('Completed')}
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.loadingState}>Đang tải khu vực...</div>
        ) : filteredRooms.length === 0 ? (
          <div className={styles.emptyState}>
            <span>📭</span>
            <p>Không có phòng nào khớp với tìm kiếm.</p>
            <button className={styles.resetFilterBtn} onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          Object.entries(groupedRooms).map(([facilityName, facRooms]) => {
            const facId = facRooms[0]?.facility_id;

            return (
              <div key={facilityName} className={styles.facilityGroup}>
                <FacilityHeader facilityId={facId} facilityName={facilityName} />
                
                <div className={styles.grid}>
                  {facRooms.map((room) => {
                    const zoneLetter = room.zone_name ? room.zone_name.replace(/Khu\s*/i, '').trim() : '';
                    const roomDisplayName = `${zoneLetter}${room.room_number}`; 

                    // 1. Hứng trực tiếp data cực xịn từ Backend
                    const total = room.total_required_inspection;
                    const inspected = room.inspected_count;
                    const percent = room.progress_percentage;
                    const isFinished = room.is_completed;
                    
                    // 2. Logic màu sắc
                    const waterColor = isFinished ? '#86EFAC' : '#BAE6FD';
                    const textPrimaryColor = isFinished ? '#14532D' : '#0369A1';
                    
                    const currentRoomId = room.room_id;

                    return (
                      <div
                        key={currentRoomId}
                        className={styles.roomCard}
                        onClick={() => navigate(`/patrol/room/${currentRoomId}`)}
                      >
                        <div 
                          className={styles.waterFill} 
                          style={{ height: `${percent}%`, backgroundColor: waterColor }} 
                        />
                        
                        <div className={styles.cardContent}>
                          <div className={styles.roomBadge} style={{ color: textPrimaryColor }}>
                            {roomDisplayName}
                          </div>
                          <p className={styles.roomDesc} title={room.description}>
                            {room.description || 'Chưa có mô tả'}
                          </p>
                          
                          {/* 3. Render Text trực tiếp không cần check undefined nữa */}
                          <div className={styles.progressText}>
                            {total === 0 
                              ? 'Không có đồ' 
                              : (isFinished ? '✅ Hoàn tất' : `${inspected}/${total} đồ`)
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
