import React, { useState, useMemo, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { useVitalSignsData } from '../hooks/useVitalSignsData';
import { vitalSignsApi } from '../api/vitalSignsApi';
import { VitalSignsWebLayout } from '../layouts/VitalSignsWebLayout';
import { VitalSignsMobileLayout } from '../layouts/VitalSignsMobileLayout';
import { VitalAlertList } from '../components/VitalAlertList';
import { ElderSearchFilter } from '../components/ElderSearchFilter';
import { ElderGridSelect } from '../components/ElderGridSelect';
import { VitalModal } from '../components/VitalModal';

export const VitalSignsPage = () => {
  const { user } = useContext(AuthContext);
  const isDesktop = useIsDesktop();
  const currentRole = (user?.role || '').toUpperCase();

  const { eldersList, alerts, refreshData, loading } = useVitalSignsData(user?.facility_id);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedElderForModal, setSelectedElderForModal] = useState(null);

  const filteredElders = useMemo(() => {
    if (!eldersList) return [];
    return eldersList.filter((elder) => {
      const kw = searchTerm.toLowerCase().trim();
      const nameMatch = (elder.fullName || '').toLowerCase().includes(kw);
      const roomMatch = (elder.roomNumber || '').toString().toLowerCase().includes(kw);
      if (!nameMatch && !roomMatch) return false;
      if (activeFilter === 'WARNING') return elder.hasAbnormal;
      if (activeFilter === 'WEIGHT_DUE') return elder.isWeightDue;
      return true;
    });
  }, [eldersList, searchTerm, activeFilter]);

  const handleSaveVital = async (payload) => {
    try {
      const existingVitalId = selectedElderForModal?.vitalData?.id;
      if (existingVitalId) {
        await vitalSignsApi.updateVitalSigns(existingVitalId, payload);
      } else {
        await vitalSignsApi.recordVitalSigns(payload);
      }
      refreshData();
    } catch (err) {
      console.error('Lỗi lưu sinh hiệu:', err.response?.data?.detail || err.message);
    }
  };

  const handleSaveWeight = async (payload) => {
    try {
      const existingWeightId = selectedElderForModal?.weightData?.id;
      if (existingWeightId) {
        await vitalSignsApi.updateElderWeight(existingWeightId, { weight: payload.weight, notes: payload.notes });
      } else {
        await vitalSignsApi.recordElderWeight(payload);
      }
      refreshData();
    } catch (err) {
      console.error('Lỗi lưu cân nặng:', err.response?.data?.detail || err.message);
    }
  };

  const Layout = isDesktop ? VitalSignsWebLayout : VitalSignsMobileLayout;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>
        Đang tải dữ liệu theo dõi sinh hiệu...
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        {/* Danh sách Cảnh báo chỉ số sinh hiệu bất thường */}
        <VitalAlertList
          alerts={alerts}
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

        {/* Tìm kiếm & Lọc người cao tuổi */}
        <ElderSearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={{
            all: eldersList.length,
            warning: alerts.length,
            weightDue: eldersList.filter((e) => e.isWeightDue).length,
          }}
        />

        {/* Sơ đồ phòng & Danh sách người cao tuổi */}
        <ElderGridSelect
          elders={filteredElders}
          role={currentRole}
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

        {/* Modal nhập / cập nhật sinh hiệu & cân nặng */}
        <VitalModal
          isOpen={!!selectedElderForModal}
          onClose={() => setSelectedElderForModal(null)}
          elder={selectedElderForModal}
          role={currentRole}
          onSaveVital={handleSaveVital}
          onSaveWeight={handleSaveWeight}
          onFetchHistory={(id, d) => vitalSignsApi.getVitalsHistory({ elder_id: id, limit_days: d })}
          onFetchWeightHistory={(id) => vitalSignsApi.getElderWeightHistory(id)}
        />
      </div>
    </Layout>
  );
};

export default VitalSignsPage;