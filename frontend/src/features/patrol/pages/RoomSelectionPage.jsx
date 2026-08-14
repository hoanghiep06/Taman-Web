
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


  const isAdminOrManager = ['Admin', 'Manager'].includes(user?.role);

  const [activeFacilityId, setActiveFacilityId] = useState(user?.facility_id || null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchRooms = useCallback(async (isSilent = false) => {
    try {
      const data = await patrolApi.getRooms({ facility_id: activeFacilityId });
      setRooms(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách phòng', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeFacilityId]);

  useEffect(() => {
    setLoading(true);
    fetchRooms();
    const id = setInterval(() => fetchRooms(true), 5000);
    return () => clearInterval(id);
  }, [fetchRooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchSearch = 
        (room.room_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const isFinished = Boolean(room.is_completed);

      let matchStatus = true;
      if (filterStatus === 'Pending') matchStatus = !isFinished;
      if (filterStatus === 'Completed') matchStatus = isFinished;

      return matchSearch && matchStatus;
    });
  }, [rooms, searchTerm, filterStatus]);

  const groupedRooms = useMemo(() => {
    return filteredRooms.reduce((acc, room) => {
      const facName = room.facility_name || 'Chưa xác định Cơ sở';
      if (!acc[facName]) acc[facName] = [];
      acc[facName].push(room);
      return acc;
    }, {});
  }, [filteredRooms]);

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
          {/* NÚT QUAY LẠI BẢNG GIÁM SÁT DÀNH CHO ADMIN / MANAGER */}
          {isAdminOrManager && (
            <button
              onClick={() => navigate('/patrol')}
              style={{
                marginBottom: '10px', padding: '6px 12px', background: '#F1F5F9',
                border: '1.5px solid #CBD5E1', borderRadius: '8px', color: '#1F6F78',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', gap: '4px'
              }}
            >
              ‹ Quay lại Bảng Giám Sát
            </button>
          )}

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
            <button className={styles.resetFilterBtn} onClick={() => { setSearchTerm(''); setFilterStatus('All'); }}>
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
                    // CÚ PHÁP PHÒNG: Tên Khu + Số phòng (VD: A101, B201)
                    const zoneLetter = room.zone_name ? room.zone_name.replace(/Khu\s*/i, '').trim() : '';
                    const roomDisplayName = `${zoneLetter}${room.room_number}`; 

                    const totalRequired = room.total_required_inspection ?? 0;
                    const inspected = room.inspected_count ?? 0;
                    const isFinished = Boolean(room.is_completed);

                    let percent = 0;
                    if (isFinished || totalRequired === 0) {
                      percent = 100;
                    } else if (totalRequired > 0) {
                      percent = Math.min(Math.floor((inspected / totalRequired) * 100), 100);
                    }
                    
                    const waterColor = isFinished ? '#86EFAC' : '#BAE6FD';
                    const textPrimaryColor = isFinished ? '#14532D' : '#0369A1';
                    const currentRoomId = room.room_id || room.id;

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
                          
                          <div className={styles.progressText}>
                            {totalRequired === 0 
                              ? 'Không có đồ' 
                              : (isFinished ? '✅ Hoàn tất' : `${inspected}/${totalRequired} đồ`)
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