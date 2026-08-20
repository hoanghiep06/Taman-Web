import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/Modal';
import styles from './ElderFormModal.module.css';

const buildEmptyForm = () => ({
  full_name: '',
  facility_id: '',
  zone_id: '',
  room_id: '',
  gender: '',
  date_of_birth: '',
  admission_date: '',
  manager_notes: '',
  photo_url: '',
});

export const ElderFormModal = ({ isOpen, onClose, onSave, editingElder, rooms, elders }) => {
  const [formData, setFormData] = useState(buildEmptyForm());
  const isEditMode = Boolean(editingElder);

  // Map ngược room_id -> room object, dùng để suy ra facility_id/zone_id khi mở form Sửa
  const roomMap = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Danh sách phòng đang bị chiếm — loại trừ chính elder đang sửa, để phòng hiện tại
  // của cụ đó vẫn hiện lên được trong dropdown khi Sửa (không tự bị coi là "đã có người khác").
  const occupiedRoomIds = useMemo(() => {
    const set = new Set();
    elders.forEach((e) => {
      if (e.room_id && e.id !== editingElder?.id) set.add(e.room_id);
    });
    return set;
  }, [elders, editingElder]);

  useEffect(() => {
    if (isOpen) {
      if (editingElder) {
        const currentRoom = roomMap.get(editingElder.room_id);
        setFormData({
          full_name: editingElder.full_name || '',
          facility_id: currentRoom?.facility_id ?? '',
          zone_id: currentRoom?.zone_id ?? '',
          room_id: editingElder.room_id ?? '',
          gender: editingElder.gender || '',
          date_of_birth: editingElder.date_of_birth || '',
          admission_date: editingElder.admission_date || '',
          manager_notes: editingElder.manager_notes || '',
          photo_url: editingElder.photo_url || '',
        });
      } else {
        setFormData(buildEmptyForm());
      }
    }
  }, [isOpen, editingElder, roomMap]);

  // Danh sách cơ sở duy nhất, suy ra từ dữ liệu phòng
  const facilityOptions = useMemo(() => {
    const unique = new Map();
    rooms.forEach((r) => {
      if (r.facility_id && r.facility_name && !unique.has(r.facility_id)) {
        unique.set(r.facility_id, r.facility_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [rooms]);

  // Danh sách khu — chỉ hiện khu thuộc cơ sở đã chọn
  const zoneOptions = useMemo(() => {
    if (!formData.facility_id) return [];
    const unique = new Map();
    rooms.forEach((r) => {
      if (r.facility_id !== formData.facility_id || !r.zone_id) return;
      if (!unique.has(r.zone_id)) unique.set(r.zone_id, r.zone_name);
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [rooms, formData.facility_id]);

  // Danh sách phòng — thuộc đúng khu đã chọn VÀ đang trống (hoặc là phòng hiện tại của elder đang sửa)
  const availableRoomOptions = useMemo(() => {
    if (!formData.zone_id) return [];
    return rooms.filter(
      (r) => r.zone_id === formData.zone_id && !occupiedRoomIds.has(r.id)
    );
  }, [rooms, formData.zone_id, occupiedRoomIds]);

  const handleFacilityChange = (value) => {
    // Đổi cơ sở thì phải reset khu + phòng đã chọn, vì chúng thuộc cơ sở cũ
    setFormData({ ...formData, facility_id: value ? Number(value) : '', zone_id: '', room_id: '' });
  };

  const handleZoneChange = (value) => {
    // Đổi khu thì phải reset phòng đã chọn, vì nó thuộc khu cũ
    setFormData({ ...formData, zone_id: value ? Number(value) : '', room_id: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      alert('Vui lòng nhập họ tên cụ!');
      return;
    }
    const payload = {
      full_name: formData.full_name,
      room_id: formData.room_id ? Number(formData.room_id) : null,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth || null,
      admission_date: formData.admission_date || null,
      manager_notes: formData.manager_notes,
      photo_url: formData.photo_url,
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

        <div className={styles.inputGroup}>
          <label className={styles.label}>Cơ Sở</label>
          <select
            className={styles.select}
            value={formData.facility_id}
            onChange={(e) => handleFacilityChange(e.target.value)}
          >
            <option value="">-- Chọn cơ sở --</option>
            {facilityOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Khu</label>
            <select
              className={styles.select}
              value={formData.zone_id}
              onChange={(e) => handleZoneChange(e.target.value)}
              disabled={!formData.facility_id}
            >
              <option value="">
                {formData.facility_id ? '-- Chọn khu --' : 'Chọn cơ sở trước'}
              </option>
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Phòng (chỉ hiện phòng trống)</label>
            <select
              className={styles.select}
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value ? Number(e.target.value) : '' })}
              disabled={!formData.zone_id}
            >
              <option value="">
                {!formData.zone_id
                  ? 'Chọn khu trước'
                  : availableRoomOptions.length === 0
                    ? 'Không còn phòng trống'
                    : '-- Chưa xếp phòng --'}
              </option>
              {availableRoomOptions.map((r) => (
                <option key={r.id} value={r.id}>Phòng {r.room_number}</option>
              ))}
            </select>
          </div>
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
            <label className={styles.label}>Ngày Sinh</label>
            <input
              type="date"
              className={styles.input}
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>
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