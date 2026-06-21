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
        setRooms(data);
      } catch (err) {
        console.error('Không thể tải phòng', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) return <div style={{textAlign: 'center', padding: '50px'}}>Đang tải danh sách phòng...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Khu Vực Tuần Tra</h2>
      <p style={styles.subtitle}>Chọn phòng để bắt đầu kiểm kê</p>

      <div style={styles.grid}>
        {rooms.map((room) => (
          <div 
            key={room.room_id} 
            style={styles.roomCard}
            onClick={() => navigate(`/patrol/${room.room_number}`)}
          >
            <div style={styles.roomBadge}>P.{room.room_number}</div>
            <p style={styles.roomDesc}>{room.description || 'Không có mô tả'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', fontFamily: "'Segoe UI', sans-serif" },
  title: { margin: '0 0 5px 0', color: '#1F4E78', fontSize: '22px', fontWeight: 'bold' },
  subtitle: { margin: '0 0 20px 0', color: '#7F8C8D', fontSize: '13px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' },
  roomCard: { backgroundColor: '#FFF', padding: '20px 15px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: '1px solid #EAECEE' },
  roomBadge: { fontSize: '22px', fontWeight: 'bold', color: '#3498DB', marginBottom: '8px' },
  roomDesc: { fontSize: '12px', color: '#95A5A6', margin: 0, textAlign: 'center', lineHeight: '1.4' }
};