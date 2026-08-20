import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { useVitalSignsData } from '../../vital-signs/hooks/useVitalSignsData';
import { shiftHandoverApi } from '../api/shiftHandoverApi';
import { ShiftHandoverWebLayout } from '../layouts/ShiftHandoverWebLayout';
import { ShiftHandoverMobileLayout } from '../layouts/ShiftHandoverMobileLayout';
import { HandoverReportForm } from '../components/HandoverReportForm';
import { ShiftReportView } from '../components/ShiftReportView';
import { ShiftReportHistoryModal } from '../components/ShiftReportHistoryModal';

export const ShiftHandoverPage = () => {
  const { user } = useContext(AuthContext);
  const isDesktop = useIsDesktop();
  const currentRole = (user?.role || '').toUpperCase();

  const canEdit =
    currentRole.includes('COORDINATOR') ||
    currentRole.includes('ADMIN') ||
    currentRole.includes('MANAGER') ||
    currentRole.includes('DOCTOR');

  const hasSpecificFacility = user?.facility_id !== null && user?.facility_id !== undefined;
  const targetFacilityId = hasSpecificFacility ? Number(user.facility_id) : null;

  const [liveShift, setLiveShift] = useState(null);
  const [facilityStatus, setFacilityStatus] = useState(null);
  
  // State điều hướng dữ liệu form
  const [selectedFormFacilityId, setSelectedFormFacilityId] = useState(targetFacilityId || null);

  const activeDataFacilityId = hasSpecificFacility ? targetFacilityId : (selectedFormFacilityId || null);
  const { eldersList, alerts } = useVitalSignsData(activeDataFacilityId);

  const [reportData, setReportData] = useState([]);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const formRef = useRef(null);

  // 1. Tải Ca Trực Live, Trạng thái nộp & Danh sách báo cáo
  const fetchAllData = async () => {
    try {
      const [shiftRes, statusRes, archiveRes] = await Promise.all([
        shiftHandoverApi.getCurrentShift(),
        canEdit ? shiftHandoverApi.getFacilitiesShiftReportStatus({ facility_id: targetFacilityId }) : Promise.resolve(null),
        shiftHandoverApi.getArchivedShiftReports({ facility_id: targetFacilityId, limit_days: 7 })
      ]);
      
      const liveData = shiftRes?.data || shiftRes || null;
      const statusData = statusRes?.data || statusRes || null;
      const archiveReports = archiveRes?.data || archiveRes || [];

      setLiveShift(liveData);
      setFacilityStatus(statusData);

      // Tự động chọn cơ sở đầu tiên chưa nộp vào Form
      if (!hasSpecificFacility && !isEditingReport && statusData?.facilities) {
        const unsubmitted = statusData.facilities.find(f => !f.is_submitted);
        if (unsubmitted) setSelectedFormFacilityId(Number(unsubmitted.facility_id));
      }

      // 🌟 ĐỐI CHIẾU CHÍNH XÁC BẢN CHÍNH THỨC (!isPrevious) VÀ BẢN THAM KHẢO (isPrevious)
      if (statusData && statusData.facilities) {
        const mappedList = [];

        statusData.facilities.forEach((fac) => {
          if (fac.is_submitted && fac.report_id) {
            // Cơ sở ĐÃ NỘP ca này -> Tìm báo cáo chính thức tương ứng
            const officialReport = archiveReports.find(r => r.id === fac.report_id);
            if (officialReport) {
              mappedList.push({ ...officialReport, isPrevious: false });
            } else {
              // Fallback dữ liệu từ status nếu chưa kịp nạp archive
              mappedList.push({
                id: fac.report_id,
                facility_id: fac.facility_id,
                facility_name: fac.facility_name,
                reporter_name: fac.coordinator_name,
                shift_date: statusData.target_date,
                shift_type: statusData.shift_type,
                formatted_elder_descriptions: fac.highlighted_issues || '',
                handover_notes: fac.handover_notes || '',
                isPrevious: false
              });
            }
          } else {
            // Cơ sở CHƯA NỘP ca này -> Lấy báo cáo gần nhất trong quá khứ làm bản tham khảo
            const pastReport = archiveReports.find(r => Number(r.facility_id) === Number(fac.facility_id));
            if (pastReport) {
              mappedList.push({ ...pastReport, isPrevious: true });
            }
          }
        });

        setReportData(mappedList);
      } else {
        // Trường hợp không có statusData (nhân viên thường)
        const facilityMap = new Map();
        archiveReports.forEach((r) => {
          const key = String(r.facility_id);
          if (!facilityMap.has(key)) {
            facilityMap.set(key, { ...r, isPrevious: false });
          }
        });
        setReportData(Array.from(facilityMap.values()));
      }

    } catch (err) {
      console.error('Lỗi tải dữ liệu giao ca:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user?.facility_id, currentRole]);

  const handleStartEditReport = (targetReport) => {
    if (!canEdit || targetReport.isPrevious) return; // 🌟 Chặn không cho chỉnh sửa nếu là bản cũ
    setEditingReportItem(targetReport);
    setIsEditingReport(true);
    if (targetReport.facility_id) {
      setSelectedFormFacilityId(Number(targetReport.facility_id));
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmitHandover = async (payload, reportId = null) => {
    try {
      if (reportId) {
        await shiftHandoverApi.updateShiftReport(reportId, payload);
      } else {
        await shiftHandoverApi.createShiftReport(payload);
      }
      setIsEditingReport(false);
      setEditingReportItem(null);
      
      // Refresh lại toàn bộ dữ liệu
      fetchAllData();
    } catch (err) {
      console.error('Lỗi lưu báo cáo giao ca:', err.response?.data?.detail || err.message);
    }
  };

  const handleFetchArchivedReports = async (params = {}) => {
    try {
      const res = await shiftHandoverApi.getArchivedShiftReports({
        facility_id: targetFacilityId,
        ...params,
      });
      return res?.data || res || [];
    } catch (err) {
      console.error('Lỗi tra cứu lịch sử báo cáo:', err);
      return [];
    }
  };

  const Layout = isDesktop ? ShiftHandoverWebLayout : ShiftHandoverMobileLayout;

  const isLiveActive = Boolean(liveShift?.is_active);
  const shiftText = liveShift?.shift_type === 'Sang' ? 'Ca Sáng' : liveShift?.shift_type === 'Toi' ? 'Ca Tối' : 'Ngoài giờ trực';
  const shiftHours = liveShift?.start_time && liveShift?.end_time ? `(${liveShift.start_time} - ${liveShift.end_time})` : '';

  const allFacilities = facilityStatus?.facilities?.map(f => ({ id: f.facility_id, name: f.facility_name })) || [];
  const unsubmittedFacilities = facilityStatus?.facilities?.filter(f => !f.is_submitted).map(f => ({ id: f.facility_id, name: f.facility_name })) || [];
  const isAllSubmitted = facilityStatus && facilityStatus.unsubmitted_count === 0;
  
  const totalFacs = facilityStatus?.total_facilities || 0;
  const submittedFacs = facilityStatus?.submitted_count || 0;
  const progressPercent = totalFacs > 0 ? (submittedFacs / totalFacs) * 100 : 0;

  return (
    <Layout>
      <div style={{ paddingBottom: '120px' }}>
        
        {/* KHU VỰC 1: BANNER CA TRỰC LIVE & TIẾN ĐỘ */}
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Hệ Thống Quản Lý Ca Trực Y Tế
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>BÀN GIAO CA TRỰC</h2>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  backgroundColor: isLiveActive ? '#065f46' : '#334155', color: isLiveActive ? '#34d399' : '#cbd5e1',
                  padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', border: `1px solid ${isLiveActive ? '#059669' : '#475569'}`
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLiveActive ? '#10b981' : '#94a3b8', display: 'inline-block' }}></span>
                  {shiftText} {shiftHours} • {liveShift?.shift_date || new Date().toISOString().split('T')[0]}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              style={{
                padding: '9px 16px', borderRadius: '10px', border: '1px solid #38bdf8',
                background: '#0284c7', color: '#ffffff', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
              }}
            >
              📚 Tra Cứu Lịch Sử
            </button>
          </div>

          {/* Thanh Tiến Độ Nộp Báo Cáo */}
          {canEdit && facilityStatus && (
             <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                 <span>Tiến độ nộp báo cáo ca này:</span>
                 <span style={{ color: isAllSubmitted ? '#34d399' : '#38bdf8' }}>{submittedFacs} / {totalFacs} Cơ sở</span>
               </div>
               <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                 <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: isAllSubmitted ? '#10b981' : '#0ea5e9', transition: 'width 0.5s ease-in-out' }}></div>
               </div>
             </div>
          )}
        </div>

        {/* KHU VỰC 2: FORM LẬP BÁO CÁO */}
        <div ref={formRef} style={{ marginBottom: '28px' }}>
          {canEdit && (
            isEditingReport ? (
              <HandoverReportForm
                liveShift={liveShift}
                facilitiesList={allFacilities} 
                selectedFacilityId={selectedFormFacilityId}
                onChangeFacility={(newFacId) => setSelectedFormFacilityId(newFacId)}
                eldersList={eldersList}
                existingReport={editingReportItem}
                onSubmitReport={handleSubmitHandover}
                onCancelEdit={() => {
                  setIsEditingReport(false);
                  setEditingReportItem(null);
                  if (unsubmittedFacilities.length > 0) setSelectedFormFacilityId(unsubmittedFacilities[0].id);
                }}
              />
            ) : isAllSubmitted ? (
              <div style={{
                backgroundColor: '#ecfdf5', border: '2px solid #34d399', borderRadius: '16px', padding: '24px',
                textAlign: 'center', color: '#065f46', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.1)'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800' }}>HOÀN TẤT BÀN GIAO CA</h3>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Toàn bộ các cơ sở đã được tạo báo cáo thành công cho ca trực này.</p>
              </div>
            ) : (
              <HandoverReportForm
                liveShift={liveShift}
                facilitiesList={unsubmittedFacilities}
                selectedFacilityId={selectedFormFacilityId}
                onChangeFacility={(newFacId) => setSelectedFormFacilityId(newFacId)}
                eldersList={eldersList}
                existingReport={null}
                onSubmitReport={handleSubmitHandover}
              />
            )
          )}
        </div>

        {/* KHU VỰC 3: BẢNG HIỂN THỊ BÁO CÁO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#334155', margin: 0, textTransform: 'uppercase' }}>
            📋 Danh Sách Báo Cáo Ca Trực
          </h3>
        </div>

        {reportData.length > 0 ? (
          <ShiftReportView
            reports={reportData}
            alerts={alerts}
            role={currentRole}
            onEditReport={handleStartEditReport}
          />
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', color: '#64748b', fontSize: '13px' }}>
            Chưa có báo cáo bàn giao nào.
          </div>
        )}

        {/* MODAL LỊCH SỬ */}
        <ShiftReportHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          facilityId={targetFacilityId}
          facilitiesList={allFacilities}
          role={currentRole}
          onFetchArchived={handleFetchArchivedReports}
        />
      </div>
    </Layout>
  );
};

export default ShiftHandoverPage;