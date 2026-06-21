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
  container: { padding: '20px', paddingBottom: '80px', fontFamily: "system-ui, -apple-system, sans-serif", boxSizing: 'border-box', width: '100%' },
  title: { margin: '0 0 4px 0', color: '#0F172A', fontSize: '22px', fontWeight: '800' },
  subtitle: { margin: '0 0 24px 0', color: '#64748B', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  roomCard: { backgroundColor: '#FFFFFF', padding: '24px 16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: '1px solid #F1F5F9', transition: 'transform 0.1s' },
  roomBadge: { fontSize: '24px', fontWeight: '800', color: '#0284C7', marginBottom: '8px' },
  roomDesc: { fontSize: '12px', color: '#64748B', margin: 0, textAlign: 'center', lineHeight: '1.4', fontWeight: '500' }
};