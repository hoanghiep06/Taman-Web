import React, { useState, useMemo, useContext, useRef } from 'react';
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
import { ShiftReportHistoryModal } from '../components/ShiftReportHistoryModal';

export const CareDutyPage = () => {
  const { user } = useContext(AuthContext);
  const isDesktop = useIsDesktop();
  const [testRole, setTestRole] = useState(user?.role || 'CARESTAFF');

  const { eldersList, alerts, reportData, isReportSubmitted, setIsReportSubmitted, refreshData, loading } = useCareDutyData(user?.facility_id);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedElderForModal, setSelectedElderForModal] = useState(null);
  
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const formRef = useRef(null);

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

  const handleStartEditReport = (targetReport) => {
    setEditingReportItem(targetReport);
    setIsEditingReport(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmitHandover = async (payload, reportId = null) => {
    try {
      if (reportId) {
        await careDutyApi.updateShiftReport(reportId, payload);
        alert('✓ Đã cập nhật Báo cáo Giao Ca thành công!');
      } else {
        await careDutyApi.createShiftReport(payload);
        alert('🎉 Đã chốt Báo cáo Ca Trực thành công!');
      }
      setIsEditingReport(false);
      setEditingReportItem(null);
      refreshData();
    } catch (err) {
      alert('Lỗi lưu báo cáo: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFetchArchivedReports = async (params = {}) => {
    try {
      const res = await careDutyApi.getArchivedShiftReports({
        facility_id: user?.facility_id,
        ...params
      });
      return res?.data || res || [];
    } catch (err) {
      return [];
    }
  };

  const handleSaveVital = async (payload) => {
    try {
      const existingVitalId = selectedElderForModal?.vitalData?.id;
      if (existingVitalId) {
        await careDutyApi.updateVitalSigns(existingVitalId, payload);
        alert('✓ Đã cập nhật chỉ số sinh hiệu!');
      } else {
        await careDutyApi.recordVitalSigns(payload);
        alert('✓ Đã ghi nhận sinh hiệu mới!');
      }
      refreshData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSaveWeight = async (payload) => {
    try {
      const existingWeightId = selectedElderForModal?.weightData?.id;
      if (existingWeightId) {
        await careDutyApi.updateElderWeight(existingWeightId, { weight: payload.weight, notes: payload.notes });
        alert('✓ Đã chỉnh sửa cân nặng!');
      } else {
        await careDutyApi.recordElderWeight(payload);
        alert('✓ Đã lưu cân nặng!');
      }
      refreshData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.detail || err.message));
    }
  };

  const Layout = isDesktop ? CareDutyWebLayout : CareDutyMobileLayout;
  const currentRole = (testRole || '').toUpperCase();

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>⏳ Đang kết nối dữ liệu ca trực...</div>;

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        <div style={{ background: '#e2e8f0', padding: '10px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>🛠️ TEST ROLE:</span>
          <button onClick={() => setTestRole('CARESTAFF')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole.includes('STAFF') ? '#059669' : '#fff', color: currentRole.includes('STAFF') ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}>Caregiver</button>
          <button onClick={() => setTestRole('COORDINATOR')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole.includes('COORDINATOR') ? '#059669' : '#fff', color: currentRole.includes('COORDINATOR') ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}>Coordinator</button>
          <button onClick={() => setTestRole('DOCTOR')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole === 'DOCTOR' ? '#059669' : '#fff', color: currentRole === 'DOCTOR' ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}>Doctor</button>
          <button onClick={() => setTestRole('MANAGER')} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currentRole === 'MANAGER' ? '#059669' : '#fff', color: currentRole === 'MANAGER' ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}>Manager / Admin</button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '8px', border: '1px solid #0284c7', background: '#e0f2fe', color: '#0369a1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            📚 Tra Cứu Lịch Sử Giao Ca
          </button>
        </div>

        {/* 1. BÁO CÁO CA TRỰC TẤT CẢ CƠ SỞ (TRUYỀN ALERTS ĐỂ XUẤT ĐỦ CHỈ SỐ BẤT THƯỜNG TRÊN ẢNH) */}
        {isReportSubmitted && !isEditingReport && (
          <ShiftReportView 
            reports={reportData} 
            alerts={alerts}
            role={currentRole}
            onEditReport={handleStartEditReport} 
          />
        )}

        <VitalAlertList 
          alerts={alerts} 
          onOpenModal={(elder) => setSelectedElderForModal(elder)}
        />

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

        <div ref={formRef}>
          {(currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN')) && (!isReportSubmitted || isEditingReport) && (
            <HandoverReportForm
              facilityId={user?.facility_id}
              eldersList={eldersList}
              existingReport={isEditingReport ? editingReportItem : null}
              onSubmitReport={handleSubmitHandover}
              onCancelEdit={() => { setIsEditingReport(false); setEditingReportItem(null); }}
            />
          )}
        </div>

        <VitalModal
          isOpen={!!selectedElderForModal}
          onClose={() => setSelectedElderForModal(null)}
          elder={selectedElderForModal}
          role={currentRole}
          onSaveVital={handleSaveVital}
          onSaveWeight={handleSaveWeight}
          onFetchHistory={(id, d) => careDutyApi.getVitalsHistory({ elder_id: id, limit_days: d })}
          onFetchWeightHistory={(id) => careDutyApi.getElderWeightHistory(id)}
        />

        <ShiftReportHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          facilityId={user?.facility_id}
          role={currentRole}
          onFetchArchived={handleFetchArchivedReports}
        />
      </div>
    </Layout>
  );
};

export default CareDutyPage;