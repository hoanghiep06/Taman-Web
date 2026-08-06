import React, { useState, useMemo, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { useCareDutyData } from '../hooks/useCareDutyData';
import { careDutyApi } from '../api/careDutyApi';

import { CareDutyWebLayout } from '../layouts/CareDutyWebLayout';
import { CareDutyMobileLayout } from '../layouts/CareDutyMobileLayout';

import { VitalAlertList } from '../components/VitalAlertList';
import { ElderSearchFilter } from '../components/ElderSearchFilter';
import { ElderGridSelect } from '../components/ElderGridSelect';
import { VitalModal } from '../components/VitalModal';
import { HandoverReportForm } from '../components/HandoverReportForm';
import { ShiftReportView } from '../components/ShiftReportView';

export const CareDutyPage = () => {
  const { user } = useContext(AuthContext);
  const isDesktop = useIsDesktop();
  const [testRole, setTestRole] = useState(user?.role || 'CARESTAFF');

  const { eldersList, alerts, reportData, isReportSubmitted, refreshData, loading } = useCareDutyData(user?.facility_id);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedElderForModal, setSelectedElderForModal] = useState(null);

  const filteredElders = useMemo(() => {
    if (!eldersList) return [];
    return eldersList.filter((elder) => {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const matchSearch = 
        elder.fullName.toLowerCase().includes(normalizedSearch) ||
        elder.roomNumber.toString().includes(normalizedSearch);

      if (!matchSearch) return false;
      if (activeFilter === 'WARNING') return elder.hasAbnormal;
      if (activeFilter === 'WEIGHT_DUE') return elder.isWeightDue;

      return true;
    });
  }, [eldersList, searchTerm, activeFilter]);

  // TÍCH HỢP LƯU / SỬA SINH HIỆU
  const handleSaveVital = async (payload) => {
    try {
      const existingVitalId = selectedElderForModal?.vitalData?.id;
      if (existingVitalId) {
        // Nếu đã có ID thì gọi API PUT sửa đổi[cite: 16]
        await careDutyApi.updateVitalSigns(existingVitalId, payload);
        alert('✓ Đã cập nhật lại chỉ số sinh hiệu!');
      } else {
        // Chưa có ID thì gọi API POST thêm mới[cite: 16]
        await careDutyApi.recordVitalSigns(payload);
        alert('✓ Đã ghi nhận chỉ số sinh hiệu mới!');
      }
      refreshData();
    } catch (err) {
      alert('Lỗi lưu sinh hiệu: ' + (err.response?.data?.detail || err.message));
    }
  };

  // TÍCH HỢP LƯU / SỬA CÂN NẶNG
  const handleSaveWeight = async (payload) => {
    try {
      const existingWeightId = selectedElderForModal?.weightData?.id;
      if (existingWeightId) {
        // Nếu đã có ID thì gọi API PUT sửa cân nặng[cite: 16]
        await careDutyApi.updateElderWeight(existingWeightId, {
          weight: payload.weight,
          notes: payload.notes
        });
        alert('✓ Đã chỉnh sửa chỉ số cân nặng!');
      } else {
        // Chưa có ID thì gọi API POST tạo mới[cite: 16]
        await careDutyApi.recordElderWeight(payload);
        alert('✓ Đã lưu chỉ số cân nặng!');
      }
      refreshData();
    } catch (err) {
      alert('Lỗi lưu cân nặng: ' + (err.response?.data?.detail || err.message));
    }
  };

  // TÍCH HỢP LẤY LỊCH SỬ SINH HIỆU
  const handleFetchHistory = async (elderId, days = 3) => {
    try {
      const res = await careDutyApi.getVitalsHistory({
        elder_id: elderId,
        limit_days: days,
        facility_id: user?.facility_id
      });
      return res?.data || res || [];
    } catch (err) {
      console.error('Lỗi lấy lịch sử sinh hiệu:', err);
      return [];
    }
  };

  // TÍCH HỢP LẤY LỊCH SỬ CÂN NẶNG
  const handleFetchWeightHistory = async (elderId) => {
    try {
      const res = await careDutyApi.getElderWeightHistory(elderId);
      return res?.data || res || [];
    } catch (err) {
      console.error('Lỗi lấy lịch sử cân nặng:', err);
      return [];
    }
  };

  // TÍCH HỢP CHỐT BÁO CÁO GIAO CA
  const handleSubmitHandover = async (payload) => {
    try {
      await careDutyApi.createShiftReport(payload);
      alert('🎉 Đã chốt và gửi Báo cáo Ca Trực thành công!');
      refreshData();
    } catch (err) {
      alert('Lỗi chốt báo cáo: ' + (err.response?.data?.detail || err.message));
    }
  };

  const Layout = isDesktop ? CareDutyWebLayout : CareDutyMobileLayout;
  const currentRole = (testRole || '').toUpperCase();

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>⏳ Đang kết nối dữ liệu ca trực...</div>;

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        {/* THANH SIMULATE ROLE KHI DEV */}
        <div style={{ background: '#e2e8f0', padding: '10px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', alignSelf: 'center' }}>🛠️ TEST ROLE:</span>
          <button onClick={() => setTestRole('CARESTAFF')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole.includes('STAFF') ? '#059669' : '#fff', color: currentRole.includes('STAFF') ? '#fff' : '#000', fontWeight: 'bold' }}>Caregiver</button>
          <button onClick={() => setTestRole('COORDINATOR')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole.includes('COORDINATOR') ? '#059669' : '#fff', color: currentRole.includes('COORDINATOR') ? '#fff' : '#000', fontWeight: 'bold' }}>Coordinator</button>
          <button onClick={() => setTestRole('DOCTOR')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole.includes('DOCTOR') ? '#059669' : '#fff', color: currentRole.includes('DOCTOR') ? '#fff' : '#000', fontWeight: 'bold' }}>Doctor / Manager</button>
        </div>

        {/* 1. HIỂN THỊ BÁO CÁO ĐÃ CHỐT TRÊN CÙNG (NẾU CÓ) */}
        {isReportSubmitted && <ShiftReportView report={reportData} />}

        {/* 2. CẢNH BÁO CẦN CHÚ Ý */}
        <VitalAlertList alerts={alerts} />

        {/* 3. LỌC & DANH SÁCH THẺ CỤ */}
        <ElderSearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={{ all: eldersList.length, warning: alerts.length, weightDue: eldersList.filter(e => e.isWeightDue).length }}
        />

        <ElderGridSelect
          elders={filteredElders}
          role={currentRole}
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

        {/* 4. FORM BÁO CÁO GIAO CA DÀNH CHO COORDINATOR */}
        {(currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN')) && !isReportSubmitted && (
          <HandoverReportForm
            facilityId={user?.facility_id}
            eldersList={eldersList}
            onSubmitReport={handleSubmitHandover}
          />
        )}

        {/* MODAL SOI & CẬP NHẬT CHỈ SỐ */}
        <VitalModal
          isOpen={!!selectedElderForModal}
          onClose={() => setSelectedElderForModal(null)}
          elder={selectedElderForModal}
          role={currentRole}
          onSaveVital={handleSaveVital}
          onSaveWeight={handleSaveWeight}
          onFetchHistory={handleFetchHistory}
          onFetchWeightHistory={handleFetchWeightHistory}
        />
      </div>
    </Layout>
  );
};

export default CareDutyPage;