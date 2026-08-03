import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { healthApi } from '../api/healthApi';
import { computeElderFlag } from '../utils/healthThresholds';
import { hasPermission, FEATURES, ACCESS } from '../../../utils/permissions';
import { ElderHealthCard } from '../components/ElderHealthCard';
import { SearchInput } from '../../../components/SearchInput';
import styles from './HealthDashboardPage.module.css';

const FLAG_ORDER = { red: 0, yellow: 1, green: 2 }; // Đẩy Cụ bất thường lên đầu bảng

export const HealthDashboardPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [elders, setElders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState('Sang');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin/Manager/Bác sĩ thấy toàn bộ cơ sở (facility_id null) -> cần bộ lọc cơ sở.
  // Điều Phối/NVCS bị khoá cứng vào facility của họ -> ẩn bộ lọc.
  const canFilterFacility = user?.facilityId == null;
  const canSeeDeepDive = hasPermission(user?.role, FEATURES.DASHBOARD_HEALTH, ACCESS.EXECUTE);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = {
        date: selectedDate,
        shift: selectedShift,
        facility_id: selectedFacility || undefined,
      };
      // Bác sĩ/Manager/Admin xem bản chuyên sâu (kèm toa thuốc); Điều Phối/NVCS xem bản live cơ bản.
      const fetcher = canSeeDeepDive ? healthApi.getDashboardDoctor : healthApi.getDashboardLive;
      const res = await fetcher(params);
      setElders(res.elders || []);
      if (res.facilities) setFacilities(res.facilities);
    } catch (err) {
      console.error('Lỗi tải Dashboard Ca Live:', err);
      setElders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedShift, selectedFacility]);

  const processedElders = useMemo(() => {
    return elders
      .map((e) => ({
        ...e,
        flag: computeElderFlag({
          latestVitals: e.latestVitals,
          lastWeighInDate: e.lastWeighInDate,
          hasHandoverNote: e.hasHandoverNote,
        }),
      }))
      .filter((e) => !onlyUrgent || e.flag !== 'green')
      .filter((e) => e.fullName.toLowerCase().includes(searchTerm.toLowerCase().trim()))
      .sort((a, b) => FLAG_ORDER[a.flag] - FLAG_ORDER[b.flag]);
  }, [elders, onlyUrgent, searchTerm]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>🩺 Dashboard Ca Live</h2>
        <p className={styles.subtitle}>Tổng quan sức khỏe toàn bộ Cụ trong ca trực hiện tại</p>
      </div>

      {/* BỘ FILTER TOP-BAR */}
      <div className={styles.filterBar}>
        {canFilterFacility && (
          <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)} className={styles.select}>
            <option value="">Tất cả cơ sở</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={styles.dateInput} />

        <div className={styles.shiftToggle}>
          <button
            className={selectedShift === 'Sang' ? styles.shiftActive : styles.shiftInactive}
            onClick={() => setSelectedShift('Sang')}
          >
            ☀ Ca Sáng
          </button>
          <button
            className={selectedShift === 'Toi' ? styles.shiftActive : styles.shiftInactive}
            onClick={() => setSelectedShift('Toi')}
          >
            🌙 Ca Tối
          </button>
        </div>

        <label className={styles.urgentToggle}>
          <input type="checkbox" checked={onlyUrgent} onChange={(e) => setOnlyUrgent(e.target.checked)} />
          Chỉ hiện Cụ cần chú ý khẩn cấp
        </label>

        <div className={styles.searchCol}>
          <SearchInput value={searchTerm} onChange={setSearchTerm} onClear={() => setSearchTerm('')} placeholder="Tìm tên Cụ..." />
        </div>
      </div>

      {/* LƯỚI THẺ SỨC KHỎE */}
      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu ca trực...</div>
      ) : processedElders.length > 0 ? (
        <div className={styles.grid}>
          {processedElders.map((elder) => (
            <ElderHealthCard key={elder.elderId} elder={elder} onOpenDeepDive={(id) => navigate(`/health/elder/${id}`)} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Không có Cụ nào khớp bộ lọc hiện tại.</div>
      )}
    </div>
  );
};