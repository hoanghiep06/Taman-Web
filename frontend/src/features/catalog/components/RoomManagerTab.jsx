import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { RoomFormModal } from './RoomFormModal'; // Import Modal Form

export const RoomManagerTab = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // States quản lý Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null); // null = Chế độ Thêm mới

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getRooms();
      setRooms(data);
    } catch (err) {
      console.error("Lỗi tải danh sách phòng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // ──── HÀM XỬ LÝ: MỞ MODAL ────
  const handleOpenAdd = () => {
    setEditingRoom(null); // Xóa dữ liệu cũ để chuyển sang Thêm Mới
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room); // Truyền dữ liệu phòng vào Modal để Cập Nhật
    setIsModalOpen(true);
  };

  // ──── HÀM XỬ LÝ: LƯU FORM (THÊM / SỬA) ────
  const handleSubmitForm = async (formData) => {
    try {
      if (editingRoom) {
        await catalogApi.updateRoom(editingRoom.id, formData);
        alert('Cập nhật phòng thành công!');
      } else {
        await catalogApi.createRoom(formData);
        alert('Tạo phòng mới thành công!');
      }
      setIsModalOpen(false); // Đóng Modal
      fetchRooms(); // Tự động load lại bảng ngay lập tức
    } catch (error) {
      alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu dữ liệu'}`);
    }
  };

  // ──── HÀM XỬ LÝ: XÓA PHÒNG ────
  const handleDelete = async (room) => {
    const isConfirm = window.confirm(`⚠️ Bạn có chắc chắn muốn xóa Phòng ${room.room_number}? Mọi tài sản thuộc phòng này có thể bị ảnh hưởng!`);
    if (!isConfirm) return;

    try {
      await catalogApi.deleteRoom(room.id);
      fetchRooms(); // Load lại bảng
    } catch (error) {
      alert(`Lỗi xóa phòng: ${error.response?.data?.detail || 'Dữ liệu đang bị ràng buộc'}`);
    }
  };

  // Lọc dữ liệu theo thanh tìm kiếm
  const filteredRooms = rooms.filter(room => 
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      {/* THANH CÔNG CỤ: Tìm kiếm & Nút Thêm mới */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm theo số phòng hoặc mô tả..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <button style={styles.addBtn} onClick={handleOpenAdd}>
          + Thêm Khu Vực / Phòng Mới
        </button>
      </div>

      {/* BẢNG DỮ LIỆU CHÍNH */}
      {loading ? (
        <div style={styles.loadingState}>Đang tải cấu trúc phòng ốc...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, width: '10%' }}>ID</th>
                <th style={{ ...styles.th, width: '20%' }}>Số Phòng</th>
                <th style={{ ...styles.th, width: '50%' }}>Mô Tả Chức Năng</th>
                <th style={{ ...styles.th, width: '20%', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <tr key={room.id} style={styles.trRow}>
                    <td style={styles.tdId}>#{room.id}</td>
                    <td style={styles.tdBold}>Phòng {room.room_number}</td>
                    <td style={styles.tdDesc}>{room.description || <span style={{color: '#CBD5E1'}}>Chưa cập nhật mô tả</span>}</td>
                    <td style={styles.tdActions}>
                      <button style={styles.editBtn} onClick={() => handleOpenEdit(room)}>
                        ✏️ Sửa
                      </button>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(room)}>
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                 <tr><td colSpan="4" style={styles.emptyState}>Không tìm thấy dữ liệu phòng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* NHÚNG COMPONENT MODAL (Chỉ hiển thị khi isModalOpen === true) */}
      <RoomFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingRoom}
      />
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  
  searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', flex: 1, minWidth: '250px' },
  searchIcon: { fontSize: '14px', color: '#94A3B8', marginRight: '8px' },
  searchInput: { padding: '10px 0', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px', color: '#1E293B', width: '100%' },
  
  addBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  
  tableWrapper: { overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '14px 16px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s', backgroundColor: '#FFFFFF' },
  
  tdId: { padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' },
  tdBold: { padding: '14px 16px', color: '#0F172A', fontWeight: '700', fontSize: '14px' },
  tdDesc: { padding: '14px 16px', color: '#475569' },
  
  tdActions: { padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  editBtn: { padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  
  loadingState: { textAlign: 'center', padding: '60px', color: '#64748B', fontSize: '14px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic' }
};