import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/Modal';
import styles from './ElderFormModal.module.css';

const buildEmptyForm = () => ({
  // Bước 1
  full_name: '',
  gender: '',
  date_of_birth: '',
  admission_date: '',
  photo_url: '',
  // Bước 2
  facility_id: '',
  zone_id: '',
  room_id: '',
  manager_notes: '',
  // MỚI — chưa có field tương ứng ở backend (ElderBase chỉ có manager_notes).
  // Cần backend bổ sung field "relative_notes" vào bảng Elder + schema ElderCreate/ElderResponse,
  // nếu không dữ liệu nhập ở đây sẽ không được lưu lại khi gửi lên server.
  relative_notes: '',
});

const TOTAL_STEPS = 2;

export const ElderFormModal = ({ isOpen, onClose, onSave, editingElder, rooms, elders }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(buildEmptyForm());
  const isEditMode = Boolean(editingElder);

  const roomMap = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  const occupiedRoomIds = useMemo(() => {
    const set = new Set();
    elders.forEach((e) => {
      if (e.room_id && e.id !== editingElder?.id) set.add(e.room_id);
    });
    return set;
  }, [elders, editingElder]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (editingElder) {
        const currentRoom = roomMap.get(editingElder.room_id);
        setFormData({
          full_name: editingElder.full_name || '',
          gender: editingElder.gender || '',
          date_of_birth: editingElder.date_of_birth || '',
          admission_date: editingElder.admission_date || '',
          photo_url: editingElder.photo_url || '',
          facility_id: currentRoom?.facility_id ?? '',
          zone_id: currentRoom?.zone_id ?? '',
          room_id: editingElder.room_id ?? '',
          manager_notes: editingElder.manager_notes || '',
          relative_notes: editingElder.relative_notes || '',
        });
      } else {
        setFormData(buildEmptyForm());
      }
    }
  }, [isOpen, editingElder, roomMap]);

  const facilityOptions = useMemo(() => {
    const unique = new Map();
    rooms.forEach((r) => {
      if (r.facility_id && r.facility_name && !unique.has(r.facility_id)) {
        unique.set(r.facility_id, r.facility_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [rooms]);

  const zoneOptions = useMemo(() => {
    if (!formData.facility_id) return [];
    const unique = new Map();
    rooms.forEach((r) => {
      if (r.facility_id !== formData.facility_id || !r.zone_id) return;
      if (!unique.has(r.zone_id)) unique.set(r.zone_id, r.zone_name);
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [rooms, formData.facility_id]);

  const availableRoomOptions = useMemo(() => {
    if (!formData.zone_id) return [];
    return rooms.filter(
      (r) => r.zone_id === formData.zone_id && !occupiedRoomIds.has(r.id)
    );
  }, [rooms, formData.zone_id, occupiedRoomIds]);

  const handleFacilityChange = (value) => {
    setFormData({ ...formData, facility_id: value ? Number(value) : '', zone_id: '', room_id: '' });
  };

  const handleZoneChange = (value) => {
    setFormData({ ...formData, zone_id: value ? Number(value) : '', room_id: '' });
  };

  const handleNext = () => {
    if (!formData.full_name.trim()) {
      alert('Vui lòng nhập họ tên cụ trước khi tiếp tục!');
      return;
    }
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      alert('Vui lòng nhập họ tên cụ!');
      setStep(1);
      return;
    }

    const payload = {
      full_name: formData.full_name,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth || null,
      admission_date: formData.admission_date || null,
      photo_url: formData.photo_url,
      room_id: formData.room_id ? Number(formData.room_id) : null,
      manager_notes: formData.manager_notes,
      // NOTE: field mới, backend cần bổ sung mới lưu được — xem ghi chú ở buildEmptyForm().
      relative_notes: formData.relative_notes,
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
      {/* Thanh tiến độ 2 bước kiểu Google Form */}
      <div className={styles.stepBar}>
        <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`}>
        </div>
        <div className={styles.stepLine} />
        <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`}>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className={styles.stepPanel}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Họ và Tên *</label>
              <input
                type="text"
                className={styles.input}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                autoFocus
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
              {formData.photo_url && (
                <img src={formData.photo_url} alt="Xem trước" className={styles.photoPreview} />
              )}
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
              <button type="button" onClick={handleNext} className={styles.saveBtn}>Tiếp Theo →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepPanel}>
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

            <div className={styles.inputGroup}>
              <label className={styles.label}>Ghi Chú Của Người Thân</label>
              <textarea
                className={styles.textarea}
                value={formData.relative_notes}
                onChange={(e) => setFormData({ ...formData, relative_notes: e.target.value })}
                rows={3}
                placeholder="Nguyện vọng, lưu ý từ gia đình..."
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={handleBack} className={styles.cancelBtn}>← Quay Lại</button>
              <button type="submit" className={styles.saveBtn}>
                {isEditMode ? 'Lưu Thay Đổi' : 'Thêm Mới'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};