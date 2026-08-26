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

  // Phân quyền: Bác sĩ không có quyền quản lý lịch cân tới hạn
  const isDoctor = currentRole.includes('DOCTOR');
  const canManageWeightDue = !isDoctor && (
    currentRole.includes('STAFF') ||
    currentRole.includes('CAREGIVER') ||
    currentRole.includes('COORDINATOR') ||
    currentRole.includes('MANAGER') ||
    currentRole.includes('ADMIN')
  );

  const { 
    eldersList = [], 
    alerts = [], 
    weightDueList = [], 
    activeShift,
    refreshData, 
    loading 
  } = useVitalSignsData(user?.facility_id);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('VITALS'); // 'VITALS' | 'WEIGHT'
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'WARNING' | 'WEIGHT_DUE'
  const [selectedElderForModal, setSelectedElderForModal] = useState(null);

  // Lọc danh sách cụ theo từ khóa & chế độ xem
  const filteredElders = useMemo(() => {
    if (!eldersList) return [];
    return eldersList.filter((elder) => {
      const kw = searchTerm.toLowerCase().trim();
      const nameMatch = (elder.fullName || '').toLowerCase().includes(kw);
      const roomMatch = (elder.roomNumber || '').toString().toLowerCase().includes(kw);

      if (!nameMatch && !roomMatch) return false;

      // Nếu đang ở chế độ xem Cân nặng hoặc lọc WEIGHT_DUE
      if (viewMode === 'WEIGHT' || activeFilter === 'WEIGHT_DUE') {
        return elder.isWeightDue;
      }

      if (activeFilter === 'WARNING') {
        const hasNote = Boolean(elder.vitalData?.notes?.trim());
        return elder.hasAbnormal || hasNote;
      }

      return true;
    });
  }, [eldersList, searchTerm, activeFilter, viewMode]);

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
      console.error('Lỗi cân nặng:', err.response?.data?.detail || err.message);
    }
  };

  const Layout = isDesktop ? VitalSignsWebLayout : VitalSignsMobileLayout;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>
        Đang tải thông tin sinh hiệu & cân nặng...
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        {/* 1. KHUNG CẢNH BÁO NGUY HIỂM CHỈ DÀNH CHO SINH HIỆU BẤT THƯỜNG */}
        <VitalAlertList
          alerts={alerts}
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

        {/* 2. BỘ LỌC VÀ CHUYỂN ĐỔI CHẾ ĐỘ XEM (SINH HIỆU / CÂN NẶNG) */}
        <ElderSearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          viewMode={viewMode}
          onViewModeChange={(mode) => {
            setViewMode(mode);
            if (mode === 'WEIGHT') setActiveFilter('WEIGHT_DUE');
            else if (activeFilter === 'WEIGHT_DUE') setActiveFilter('ALL');
          }}
          canManageWeightDue={canManageWeightDue}
          counts={{
            all: eldersList?.length || 0,
            warning: alerts?.length || 0,
            weightDue: weightDueList?.length || 0,
          }}
        />

        {/* 3. LƯỚI DANH SÁCH - TÁCH BIỆT MÀU SẮC VÀ DỮ LIỆU THEO VIEW MODE */}
        <ElderGridSelect
          elders={filteredElders}
          weightDueList={weightDueList}
          viewMode={viewMode}
          role={currentRole}
          canManageWeightDue={canManageWeightDue}
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

        {/* 4. MODAL BÁO CÁO / ĐO LƯỜNG */}
        <VitalModal
          isOpen={!!selectedElderForModal}
          onClose={() => setSelectedElderForModal(null)}
          elder={selectedElderForModal}
          role={currentRole}
          defaultTab={viewMode}
          activeShift={activeShift}
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