import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';

export const RoomListPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await patrolApi.getRooms();
        
        // 💡 ĐỂ HIỆU ỨNG CHẠY THẬT: API /assets/rooms của bạn chỉ cần trả về thêm 
        // 2 trường số nguyên là 'total_assets' (tổng đồ) và 'inspected_count' (đồ đã quét) của mỗi phòng.
        // Đoạn map dưới đây bọc thêm logic fallback an toàn để không bị lỗi giao diện nếu BE chưa kịp truyền.
        const processedRooms = data.map(room => ({
          ...room,
          total_assets: room.total_assets || 0,
          inspected_count: room.inspected_count || 0
          
          // 🧪 Muốn test thử hiệu ứng nước dâng ngẫu nhiên trước khi code BE, hãy mở comment dòng dưới:
          // total_assets: 4, inspected_count: Math.floor(Math.random() * 5)
        }));
        
        setRooms(processedRooms);
      } catch (err) {
        console.error('Không thể tải danh sách phòng', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) return <div style={styles.loadingState}>Đang tải khu vực tuần tra...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Khu Vực Tuần Tra</h2>
      <p style={styles.subtitle}>Chọn phòng để bắt đầu kiểm kê ca trực</p>

      <div style={styles.grid}>
        {rooms.map((room) => {
          // 1. TÌM TIẾN ĐỘ % ĐỂ ĐẨY CHIỀU CAO NƯỚC DÂNG
          const total = room.total_assets;
          const inspected = room.inspected_count;
          const percent = total > 0 ? Math.floor((inspected / total) * 100) : 0;
          
          const isFinished = total > 0 && inspected >= total;
          const isEmpty = total === 0;

          // 2. PHỐI MÀU NƯỚC: Xong rồi -> Xanh lá nhạt | Đang làm dở -> Xanh dương mờ
          const waterColor = isFinished ? '#86EFAC' : '#BAE6FD'; 
          const textPrimaryColor = isFinished ? '#14532D' : '#0369A1'; 
          
          return (
            <div 
              key={room.room_id || room.room_number} 
              style={styles.roomCard}
              // GIỮ NGUYÊN: Điều hướng bằng room_number chuẩn theo cấu trúc cũ của bạn
              onClick={() => navigate(`/patrol/${room.room_number}`)}
            >
              {/* LỚP NƯỚC NGẬP DÂNG TỪ ĐÁY LÊN */}
              <div style={{
                ...styles.waterFill,
                height: `${percent}%`,
                backgroundColor: waterColor,
              }}></div>

              {/* LỚP CHỮ NỔI (zIndex cao hơn nước) */}
              <div style={styles.cardContent}>
                <div style={{...styles.roomBadge, color: textPrimaryColor}}>
                  P.{room.room_number}
                </div>
                <p style={styles.roomDesc}>{room.description || 'Chưa có mô tả'}</p>
                
                {/* NHÃN TIẾN ĐỘ LỌC ĐẸP MẮT */}
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
  loadingState: { textAlign: 'center', padding: '50px', color: '#64748B', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  
  roomCard: { 
    position: 'relative', 
    backgroundColor: '#FFFFFF', 
    borderRadius: '16px', 
    boxShadow: '0 4px 10px rgba(0,0,0,0.04)', 
    overflow: 'hidden', 
    cursor: 'pointer', 
    border: '1px solid #E2E8F0',
    height: '130px' 
  },
  waterFill: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    width: '100%',
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
  progressText: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: '12px', color: '#0F172A', backdropFilter: 'blur(4px)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
};