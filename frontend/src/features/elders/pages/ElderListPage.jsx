import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { eldersApi } from '../api/eldersApi';
import { roomsApi } from '../../catalog/api/roomsApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { ElderFormModal } from '../components/ElderFormModal';
import { ROLES } from '../../../utils/constants';
import styles from './ElderListPage.module.css';

const calculateAge = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const getInitials = (name) => {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1]?.charAt(0).toUpperCase() || '?';
};

export const ElderListPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [eldersList, setEldersList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingElder, setEditingElder] = useState(null);

  const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;
  const isDoctor = user?.role === ROLES.DOCTOR;

  const loadAll = async () => {
    try {
      const [elders, rooms] = await Promise.all([
        eldersApi.getAllElders(),
        roomsApi.getAllRooms(),
      ]);
      setEldersList(elders);
      setRoomsList(rooms);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Tra cứu nhanh room_id -> tên phòng hiển thị, tránh loop tìm kiếm lặp lại trong mỗi lần render card
  const roomMap = useMemo(() => {
    const map = new Map();
    roomsList.forEach((r) => map.set(r.id, r));
    return map;
  }, [roomsList]);

  const handleOpenCreate = () => {
    setEditingElder(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (elder) => {
    setEditingElder(elder);
    setIsFormOpen(true);
  };

  const handleSaveElder = async (payload, elderId) => {
    try {
      if (elderId) {
        await eldersApi.updateElder(elderId, payload);
      } else {
        await eldersApi.createElder(payload);
      }
      setIsFormOpen(false);
      setEditingElder(null);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lưu thông tin thất bại!');
    }
  };

  const handleDeleteElder = async (elder) => {
    if (!window.confirm(`Xóa vĩnh viễn hồ sơ của [${elder.full_name}]? Hành động này không thể hoàn tác.`)) return;
    try {
      await eldersApi.deleteElder(elder.id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể xóa hồ sơ này!');
    }
  };

  const goToMedicalRecord = (elder) => navigate(`/medical-record?elderId=${elder.id}`);
  const goToPrescriptions = (elder) => navigate(`/prescriptions?elderId=${elder.id}`);
  const goToVitals = (elder) => navigate(`/vitals?elderId=${elder.id}`);

  const filteredElders = eldersList.filter(({ full_name }) =>
    full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className={styles.loadingText}>Đang tải danh sách...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.pageTitle}>Danh Sách Người Cao Tuổi</h2>
          <p className={styles.pageSubtitle}>
            {eldersList.length} cụ đang được theo dõi
          </p>
        </div>

        <div className={styles.actionRight}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {canManage && (
            <button className={styles.addBtn} onClick={handleOpenCreate}>➕ Thêm Cụ</button>
          )}
        </div>
      </div>

      {filteredElders.length === 0 ? (
        <div className={styles.emptyState}>
          Không tìm thấy người cao tuổi nào khớp với từ khóa "{searchQuery}"
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredElders.map((elder) => {
            const age = calculateAge(elder.date_of_birth);
            const room = roomMap.get(elder.room_id);

            return (
              <div key={elder.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {elder.photo_url ? (
                      <img src={elder.photo_url} alt={elder.full_name} className={styles.avatarImg} />
                    ) : (
                      getInitials(elder.full_name)
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <p className={styles.elderName}>{elder.full_name}</p>
                    <p className={styles.elderMeta}>
                      {elder.gender || 'Chưa rõ giới tính'}
                      {age !== null && ` · ${age} tuổi`}
                    </p>
                    <p className={styles.elderRoom}>
                      {room ? `Phòng ${room.room_number}${room.zone_name ? ` · ${room.zone_name}` : ''}` : 'Chưa xếp phòng'}
                    </p>
                  </div>
                </div>

                {elder.manager_notes && (
                  <p className={styles.notes}>{elder.manager_notes}</p>
                )}

                <div className={styles.cardActions}>
                  {isDoctor && (
                    <>
                      <button className={styles.btnPrimary} onClick={() => goToMedicalRecord(elder)}>🩺 Hồ Sơ Bệnh Án</button>
                      <button className={styles.btnSecondary} onClick={() => goToPrescriptions(elder)}>💊 Đơn Thuốc</button>
                    </>
                  )}

                  {user?.role === ROLES.CAREGIVER && (
                    <>
                      <button className={styles.btnPrimary} onClick={() => goToMedicalRecord(elder)}>👁️ Xem Hồ Sơ</button>
                      <button className={styles.btnSecondary} onClick={() => goToVitals(elder)}>❤️ Đo Sinh Hiệu</button>
                    </>
                  )}

                  {user?.role === ROLES.COORDINATOR && (
                    <button className={styles.btnPrimary} onClick={() => goToMedicalRecord(elder)}>👁️ Xem Hồ Sơ</button>
                  )}

                  {canManage && (
                    <>
                      <button className={styles.btnPrimary} onClick={() => handleOpenEdit(elder)}>✏️ Sửa</button>
                      <button className={styles.btnDelete} onClick={() => handleDeleteElder(elder)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ElderFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingElder(null); }}
        onSave={handleSaveElder}
        editingElder={editingElder}
      />
    </div>
  );
};