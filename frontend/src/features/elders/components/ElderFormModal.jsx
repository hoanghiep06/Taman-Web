import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { roomsApi } from '../../catalog/api/roomsApi';
import styles from './ElderFormModal.module.css';

const buildEmptyForm = () => ({
  full_name: '',
  room_id: '',
  gender: '',
  date_of_birth: '',
  admission_date: '',
  manager_notes: '',
  photo_url: '',
});

export const ElderFormModal = ({ isOpen, onClose, onSave, editingElder }) => {
  const [formData, setFormData] = useState(buildEmptyForm());
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const isEditMode = Boolean(editingElder);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        editingElder
          ? {
              full_name: editingElder.full_name || '',
              room_id: editingElder.room_id ?? '',
              gender: editingElder.gender || '',
              date_of_birth: editingElder.date_of_birth || '',
              admission_date: editingElder.admission_date || '',
              manager_notes: editingElder.manager_notes || '',
              photo_url: editingElder.photo_url || '',
            }
          : buildEmptyForm()
      );

      // Nạp danh sách phòng mỗi lần mở modal — đủ nhẹ để không cần cache riêng
      setLoadingRooms(true);
      roomsApi.getAllRooms()
        .then((data) => setRooms(data))
        .catch((err) => {
          console.error('Lỗi tải danh sách phòng:', err);
          setRooms([]);
        })
        .finally(() => setLoadingRooms(false));
    }
  }, [isOpen, editingElder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      alert('Vui lòng nhập họ tên cụ!');
      return;
    }
    const payload = {
      ...formData,
      room_id: formData.room_id ? Number(formData.room_id) : null,
      date_of_birth: formData.date_of_birth || null,
      admission_date: formData.admission_date || null,
    };
    onSave(payload, editingElder?.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={isEditMode ? `✏️ Sửa Thông Tin: ${editingElder.full_name}` : '➕ Thêm Người Cao Tuổi Mới'}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Họ và Tên *</label>
          <input
            type="text"
            className={styles.input}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Giới Tính</label>
            <select
              className={styles.select}
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Chưa rõ</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Phòng</label>
            <select
              className={styles.select}
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
              disabled={loadingRooms}
            >
              <option value="">
                {loadingRooms ? 'Đang tải...' : '-- Chưa xếp phòng --'}
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Phòng {room.room_number}
                  {room.zone_name ? ` · ${room.zone_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Ngày Sinh</label>
            <input
              type="date"
              className={styles.input}
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Ngày Nhập Viện</label>
            <input
              type="date"
              className={styles.input}
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Ảnh Đại Diện (URL)</label>
          <input
            type="text"
            className={styles.input}
            value={formData.photo_url}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Ghi Chú Của Quản Lý</label>
          <textarea
            className={styles.textarea}
            value={formData.manager_notes}
            onChange={(e) => setFormData({ ...formData, manager_notes: e.target.value })}
            rows={3}
            placeholder="Lưu ý đặc biệt về cụ..."
          />
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
          <button type="submit" className={styles.saveBtn}>
            {isEditMode ? 'Lưu Thay Đổi' : 'Thêm Mới'}
          </button>
        </div>
      </form>
    </Modal>
  );
};