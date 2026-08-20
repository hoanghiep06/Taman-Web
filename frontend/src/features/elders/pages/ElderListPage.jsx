import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { eldersApi } from '../api/eldersApi';
import { roomsApi } from '../../catalog/api/roomsApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { ElderFormModal } from '../components/ElderFormModal';
import { ElderHealthModal } from '../components/ElderHealthModal';
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

const UNASSIGNED_KEY = '__unassigned__';

export const ElderListPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [eldersList, setEldersList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  // Mỗi cơ sở tự lọc khu riêng của mình — key là facility_id, value là zone_id đang chọn ('ALL' = không lọc)
  const [zoneFilterMap, setZoneFilterMap] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingElder, setEditingElder] = useState(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthTargetElder, setHealthTargetElder] = useState(null);

  const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;
  const isDoctor = user?.role === ROLES.DOCTOR;
  const canViewPersonalInfo = !isDoctor;

  const getZoneFilterFor = (facilityId) => zoneFilterMap[facilityId] ?? 'ALL';
  const setZoneFilterFor = (facilityId, zoneId) => {
    setZoneFilterMap((prev) => ({ ...prev, [facilityId]: zoneId }));
  };

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

  const roomMap = useMemo(() => {
    const map = new Map();
    roomsList.forEach((r) => map.set(r.id, r));
    return map;
  }, [roomsList]);

  // Danh sách cơ sở duy nhất, lấy từ dữ liệu phòng đã tải — không cần gọi thêm API facilities riêng.
  const facilityOptions = useMemo(() => {
    const unique = new Map();
    roomsList.forEach((r) => {
      if (r.facility_id && r.facility_name && !unique.has(r.facility_id)) {
        unique.set(r.facility_id, r.facility_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [roomsList]);

  const handleOpenCreate = () => {
    setEditingElder(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (elder) => {
    setEditingElder(elder);
    setIsFormOpen(true);
  };

  const handleOpenHealth = (elder) => {
    setHealthTargetElder(elder);
    setIsHealthModalOpen(true);
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

  const goToPrescriptions = (elder) => navigate(`/prescriptions?elderId=${elder.id}`);

  // Lọc theo tên + cơ sở, sau đó nhóm phân cấp: Cơ sở -> Khu -> danh sách cụ (sắp xếp theo tên).
  // Lọc theo khu diễn ra riêng ở bước render, vì mỗi cơ sở có bộ lọc khu độc lập của nó.
  const groupedByFacility = useMemo(() => {
    const filtered = eldersList.filter((elder) => {
      const matchesSearch = elder.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const room = roomMap.get(elder.room_id);
      if (facilityFilter !== 'ALL') {
        if (!room || String(room.facility_id) !== facilityFilter) return false;
      }
      return true;
    });

    // facilityMap: facility_id -> { name, zones: Map<zone_id, { name, elders: [] }> }
    const facilityMap = new Map();

    filtered.forEach((elder) => {
      const room = roomMap.get(elder.room_id);
      const facilityKey = room?.facility_id ?? UNASSIGNED_KEY;
      const facilityName = room?.facility_name ?? 'Chưa xếp cơ sở';
      const zoneKey = room?.zone_id ?? UNASSIGNED_KEY;
      const zoneName = room?.zone_name ?? 'Chưa xếp khu';

      if (!facilityMap.has(facilityKey)) {
        facilityMap.set(facilityKey, { name: facilityName, zones: new Map() });
      }
      const facilityEntry = facilityMap.get(facilityKey);

      if (!facilityEntry.zones.has(zoneKey)) {
        facilityEntry.zones.set(zoneKey, { name: zoneName, elders: [] });
      }
      facilityEntry.zones.get(zoneKey).elders.push(elder);
    });

    // Sắp xếp: cơ sở theo tên (chưa xếp luôn xuống cuối), khu theo tên, cụ theo tên
    const facilitiesArr = Array.from(facilityMap, ([id, val]) => ({ id, ...val }));
    facilitiesArr.sort((a, b) => {
      if (a.id === UNASSIGNED_KEY) return 1;
      if (b.id === UNASSIGNED_KEY) return -1;
      return a.name.localeCompare(b.name, 'vi');
    });

    facilitiesArr.forEach((facility) => {
      const zonesArr = Array.from(facility.zones, ([id, val]) => ({ id, ...val }));
      zonesArr.sort((a, b) => {
        if (a.id === UNASSIGNED_KEY) return 1;
        if (b.id === UNASSIGNED_KEY) return -1;
        return a.name.localeCompare(b.name, 'vi');
      });
      zonesArr.forEach((zone) => {
        zone.elders.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'));
      });
      facility.zones = zonesArr;
    });

    return facilitiesArr;
  }, [eldersList, searchQuery, facilityFilter, roomMap]);

  const totalMatched = groupedByFacility.reduce(
    (sum, f) => sum + f.zones.reduce((zSum, z) => zSum + z.elders.length, 0),
    0
  );

  if (loading) return <div className={styles.loadingText}>Đang tải danh sách...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.pageTitle}>Danh Sách Người Cao Tuổi</h2>
          <p className={styles.pageSubtitle}>
            {totalMatched} / {eldersList.length} cụ đang được theo dõi
            {isDoctor && ' · Chế độ Bác sĩ: chỉ hiển thị thông tin y tế'}
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

          <select
            className={styles.filterSelect}
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            aria-label="Lọc theo cơ sở"
          >
            <option value="ALL">Tất cả cơ sở</option>
            {facilityOptions.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.name}</option>
            ))}
          </select>

          {canManage && (
            <button className={styles.addBtn} onClick={handleOpenCreate}>➕ Thêm Cụ</button>
          )}
        </div>
      </div>

      {groupedByFacility.length === 0 ? (
        <div className={styles.emptyState}>
          Không tìm thấy người cao tuổi nào khớp với bộ lọc hiện tại
        </div>
      ) : (
        <div className={styles.groupedContainer}>
          {groupedByFacility.map((facility) => {
            const selectedZone = getZoneFilterFor(facility.id);
            const visibleZones = selectedZone === 'ALL'
              ? facility.zones
              : facility.zones.filter((z) => String(z.id) === selectedZone);

            return (
              <div key={facility.id} className={styles.facilityGroup}>
                <div className={styles.facilityHeader}>
                  <span className={styles.facilityIcon}>🏥</span>
                  <h3 className={styles.facilityTitle}>{facility.name}</h3>

                  {/* Bộ lọc khu riêng của cơ sở này — chỉ liệt kê khu thuộc đúng cơ sở, không lẫn với cơ sở khác */}
                  {facility.id !== UNASSIGNED_KEY && facility.zones.some((z) => z.id !== UNASSIGNED_KEY) && (
                    <select
                      className={styles.zoneFilterSelect}
                      value={selectedZone}
                      onChange={(e) => setZoneFilterFor(facility.id, e.target.value)}
                      aria-label={`Lọc theo khu trong ${facility.name}`}
                    >
                      <option value="ALL">Tất cả khu</option>
                      {facility.zones
                        .filter((z) => z.id !== UNASSIGNED_KEY)
                        .map((z) => (
                          <option key={z.id} value={String(z.id)}>Khu {z.name}</option>
                        ))}
                    </select>
                  )}

                  <span className={styles.facilityCount}>
                    {visibleZones.reduce((sum, z) => sum + z.elders.length, 0)} cụ
                  </span>
                </div>

                {visibleZones.map((zone) => (
                  <div key={zone.id} className={styles.zoneGroup}>
                    <div className={styles.zoneHeader}>
                      <span className={styles.zoneIcon}>📍Khu </span>
                      <h4 className={styles.zoneTitle}>{zone.name}</h4>
                      <span className={styles.zoneCount}>{zone.elders.length} cụ</span>
                    </div>

                    <div className={styles.grid}>
                      {zone.elders.map((elder) => {
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

                                {canViewPersonalInfo && (
                                  <p className={styles.elderMeta}>
                                    {elder.gender || 'Chưa rõ giới tính'}
                                    {age !== null && ` · ${age} tuổi`}
                                  </p>
                                )}

                                <p className={styles.elderRoom}>
                                  {room ? `Phòng ${room.room_number}` : 'Chưa xếp phòng'}
                                </p>
                              </div>
                            </div>

                            {canViewPersonalInfo && elder.manager_notes && (
                              <p className={styles.notes}>{elder.manager_notes}</p>
                            )}

                            <div className={styles.cardActions}>
                              <button className={styles.btnPrimary} onClick={() => handleOpenHealth(elder)}>
                                ❤️ Sức Khỏe
                              </button>

                              {isDoctor && (
                                <button className={styles.btnSecondary} onClick={() => goToPrescriptions(elder)}>
                                  💊 Đơn Thuốc
                                </button>
                              )}

                              {canManage && (
                                <>
                                  <button className={styles.btnSecondary} onClick={() => handleOpenEdit(elder)}>✏️ Sửa</button>
                                  <button className={styles.btnDelete} onClick={() => handleDeleteElder(elder)}>🗑️</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
        rooms={roomsList}
        elders={eldersList}
      />

      <ElderHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => { setIsHealthModalOpen(false); setHealthTargetElder(null); }}
        elder={healthTargetElder}
      />
    </div>
  );
};