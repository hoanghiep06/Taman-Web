import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';

export const RoomListPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Hàm tải dữ liệu danh sách phòng từ API mới của bạn
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

  // TỰ ĐỘNG CẬP NHẬT NGẦM MỖI 5 GIÂY (Không gây chớp màn hình, nước tự co giãn realtime)
  useEffect(() => {
    fetchRooms(); // Chạy lần đầu hiển thị chữ Đang tải...
    
    const intervalId = setInterval(() => {
      fetchRooms(true); // Chạy ngầm làm mới mực nước liên tục
    }, 5000);

    return () => clearInterval(intervalId); // Giải phóng bộ nhớ khi thoát trang
  }, []);

  if (loading) return <div style={styles.loadingState}>Đang tải khu vực tuần tra...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Khu Vực Tuần Tra</h2>
      <p style={styles.subtitle}>Chọn phòng để bắt đầu kiểm kê ca trực</p>

      <div style={styles.grid}>
        {rooms.map((room) => {
          // ĐỌC THÔNG SỐ ĐÃ ĐƯỢC TÍNH TOÁN TỪ ENDPOINT MỚI BẠN VỪA SỬA
          const total = room.total_assets || 0;
          const inspected = room.inspected_count || 0;
          
          // Tính toán phần trăm để gán chiều cao cho hiệu ứng ngập nước (Tối đa 100%)
          const percent = total > 0 ? Math.min(Math.floor((inspected / total) * 100), 100) : 0;
          
          const isFinished = total > 0 && inspected >= total;
          const isEmpty = total === 0;

          // PHỐI MÀU NỀN NƯỚC: Hoàn tất -> Xanh lá mướt mắt | Chưa xong -> Xanh dương mờ dịu nhẹ
          const waterColor = isFinished ? '#86EFAC' : '#BAE6FD'; 
          const textPrimaryColor = isFinished ? '#14532D' : '#0369A1'; 
          
          return (
            <div 
              key={room.room_id || room.room_number} 
              style={styles.roomCard}
              onClick={() => navigate(`/patrol/${room.room_number}`)}
            >
              {/* LỚP NƯỚC NGẬP DÂNG TỪ ĐÁY LÊN THEO TIẾN ĐỘ % */}
              <div style={{
                ...styles.waterFill,
                height: `${percent}%`,
                backgroundColor: waterColor,
              }}></div>

              {/* LỚP NỘI DUNG CHỮ (Nổi trên mặt nước) */}
              <div style={styles.cardContent}>
                <div style={{...styles.roomBadge, color: textPrimaryColor}}>
                  P.{room.room_number}
                </div>
                <p style={styles.roomDesc}>{room.description || 'Chưa có mô tả'}</p>
                
                {/* NHÃN HIỂN THỊ TIẾN ĐỘ KIỂM KÊ */}
                <div style={styles.progressText}>
                  {isEmpty ? 'Phòng trống' : (
                    isFinished ? '✅ Đã hoàn tất' : `Tiến độ: ${inspected}/${total}`
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', paddingBottom: '90px', fontFamily: "system-ui, -apple-system, sans-serif", boxSizing: 'border-box', width: '100%' },
  title: { margin: '0 0 4px 0', color: '#0F172A', fontSize: '24px', fontWeight: '800' },
  subtitle: { margin: '0 0 24px 0', color: '#64748B', fontSize: '14px' },
  loadingState: { textAlign: 'center', padding: '50px', color: '#64748B', fontWeight: '500', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  
  roomCard: { 
    position: 'relative', 
    backgroundColor: '#FFFFFF', 
    borderRadius: '16px', 
    boxShadow: '0 4px 10px rgba(0,0,0,0.04)', 
    overflow: 'hidden', 
    cursor: 'pointer', 
    border: '1px solid #E2E8F0',
    height: '130px',
    transition: 'transform 0.1s ease'
  },
  waterFill: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    width: '100%',
    // Hiệu ứng dâng nước gia tốc cubic-bezier cực kỳ cao cấp mượt mà
    transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s', 
    zIndex: 1,
    opacity: 0.55
  },
  cardContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    padding: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 2 
  },
  roomBadge: { fontSize: '26px', fontWeight: '900', marginBottom: '4px', transition: 'color 0.3s' },
  roomDesc: { fontSize: '12px', color: '#475569', margin: '0 0 12px 0', textAlign: 'center', lineHeight: '1.3', fontWeight: '600', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  progressText: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px', color: '#0F172A', backdropFilter: 'blur(4px)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
};