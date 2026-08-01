import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { RoomFormModal } from './RoomFormModal';
import { TableWrapper, Table, Th, Td, EmptyRow } from '../../../components/table/Table';
import { ActionButton } from '../../../components/table/ActionButton';
import styles from './RoomManagerTab.module.css';

export const RoomManagerTab = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null); // null = Chế độ Thêm mới

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getRooms();
      setRooms(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phòng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (editingRoom) {
        await catalogApi.updateRoom(editingRoom.id, formData);
        alert('Cập nhật phòng thành công!');
      } else {
        await catalogApi.createRoom(formData);
        alert('Tạo phòng mới thành công!');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error) {
      alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu dữ liệu'}`);
    }
  };

  const handleDelete = async (room) => {
    const isConfirm = window.confirm(
      `⚠️ Bạn có chắc chắn muốn xóa Phòng ${room.room_number}? Mọi tài sản thuộc phòng này có thể bị ảnh hưởng!`
    );
    if (!isConfirm) return;

    try {
      await catalogApi.deleteRoom(room.id);
      fetchRooms();
    } catch (error) {
      alert(`Lỗi xóa phòng: ${error.response?.data?.detail || 'Dữ liệu đang bị ràng buộc'}`);
    }
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo số phòng hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.addBtn} onClick={handleOpenAdd}>
          + Thêm Khu Vực / Phòng Mới
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Đang tải cấu trúc phòng ốc...</div>
      ) : (
        <TableWrapper>
          <Table minWidth={640}>
            <thead>
              <tr>
                <Th width="10%">ID</Th>
                <Th width="20%">Số Phòng</Th>
                <Th width="50%">Mô Tả Chức Năng</Th>
                <Th width="20%" align="right">Thao Tác</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <Td mono muted>#{room.id}</Td>
                    <Td bold>Phòng {room.room_number}</Td>
                    <Td>
                      {room.description || <span className={styles.emptyDesc}>Chưa cập nhật mô tả</span>}
                    </Td>
                    <td className={styles.tdActions}>
                      <ActionButton variant="primary" onClick={() => handleOpenEdit(room)}>
                        ✏️ Sửa
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => handleDelete(room)}>
                        🗑️ Xóa
                      </ActionButton>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={4}>Không tìm thấy dữ liệu phòng nào.</EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      <RoomFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingRoom}
      />
    </div>
  );
};