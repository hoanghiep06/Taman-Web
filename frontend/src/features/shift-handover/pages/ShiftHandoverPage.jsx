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
  
  // State để điều hướng dữ liệu form
  const [selectedFormFacilityId, setSelectedFormFacilityId] = useState(targetFacilityId || null);

  const activeDataFacilityId = hasSpecificFacility ? targetFacilityId : (selectedFormFacilityId || null);
  const { eldersList, alerts } = useVitalSignsData(activeDataFacilityId);

  const [reportData, setReportData] = useState([]);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const formRef = useRef(null);

  // 1. Tải Ca Trực Live & Trạng thái nộp của các cơ sở
  const fetchShiftAndStatus = async () => {
    try {
      // Gọi song song để tối ưu tốc độ
      const [shiftRes, statusRes] = await Promise.all([
        shiftHandoverApi.getCurrentShift(),
        canEdit ? shiftHandoverApi.getFacilitiesShiftReportStatus({ facility_id: targetFacilityId }) : Promise.resolve(null)
      ]);
      
      setLiveShift(shiftRes?.data || shiftRes || null);
      
      if (statusRes) {
        const statusData = statusRes?.data || statusRes;
        setFacilityStatus(statusData);

        // Tự động chọn cơ sở ĐẦU TIÊN CHƯA NỘP vào Form
        if (!hasSpecificFacility && !isEditingReport) {
          const unsubmitted = statusData.facilities?.find(f => !f.is_submitted);
          if (unsubmitted) setSelectedFormFacilityId(Number(unsubmitted.facility_id));
        }
      }
    } catch (err) {
      console.error('Lỗi lấy thông tin ca/trạng thái:', err);
    }
  };

  // 2. Tải danh sách báo cáo chi tiết
  const fetchShiftReportData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [todayRes, archiveRes] = await Promise.all([
        shiftHandoverApi.getArchivedShiftReports({ facility_id: targetFacilityId, target_date: todayStr }),
        shiftHandoverApi.getArchivedShiftReports({ facility_id: targetFacilityId, limit_days: 7 }),
      ]);

      const todayReports = todayRes?.data || todayRes || [];
      const archiveReports = archiveRes?.data || archiveRes || [];

      if (!hasSpecificFacility) {
        const facilityMap = new Map();
        archiveReports.forEach((report) => {
          if (!facilityMap.has(String(report.facility_id))) facilityMap.set(String(report.facility_id), { ...report, isPrevious: true });
        });
        todayReports.forEach((report) => {
          facilityMap.set(String(report.facility_id), { ...report, isPrevious: false });
        });
        setReportData(Array.from(facilityMap.values()));
      } else {
        if (todayReports.length > 0) {
          setReportData(todayReports.map((r) => ({ ...r, isPrevious: false })));
        } else if (archiveReports.length > 0) {
          setReportData([{ ...archiveReports[0], isPrevious: true }]);
        } else {
          setReportData([]);
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo:', err);
    }
  };

  useEffect(() => {
    fetchShiftAndStatus();
    fetchShiftReportData();
  }, [user?.facility_id, currentRole]);

  const handleStartEditReport = (targetReport) => {
    if (!canEdit) return;
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
      
      // Refresh lại toàn bộ Data và Status
      fetchShiftAndStatus();
      fetchShiftReportData();
    } catch (err) {
      console.error('Lỗi lưu báo cáo giao ca:', err.response?.data?.detail || err.message);
    }
  };

  // KHÔI PHỤC LẠI HÀM NÀY ĐỂ TRUYỀN CHO MODAL LỊCH SỬ
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

  // Xử lý dữ liệu UI
  const isLiveActive = Boolean(liveShift?.is_active);
  const shiftText = liveShift?.shift_type === 'Sang' ? 'Ca Sáng' : liveShift?.shift_type === 'Toi' ? 'Ca Tối' : 'Ngoài giờ trực';
  const shiftHours = liveShift?.start_time && liveShift?.end_time ? `(${liveShift.start_time} - ${liveShift.end_time})` : '';

  // Phân loại danh sách cơ sở truyền vào Form
  const allFacilities = facilityStatus?.facilities?.map(f => ({ id: f.facility_id, name: f.facility_name })) || [];
  const unsubmittedFacilities = facilityStatus?.facilities?.filter(f => !f.is_submitted).map(f => ({ id: f.facility_id, name: f.facility_name })) || [];
  const isAllSubmitted = facilityStatus && facilityStatus.unsubmitted_count === 0;
  
  // UX Progress Bar
  const totalFacs = facilityStatus?.total_facilities || 0;
  const submittedFacs = facilityStatus?.submitted_count || 0;
  const progressPercent = totalFacs > 0 ? (submittedFacs / totalFacs) * 100 : 0;

  return (
    <Layout>
      <div style={{ paddingBottom: '120px' }}>
        
        {/* ========================================================================= */}
        {/* KHU VỰC 1: BANNER CA TRỰC LIVE & TIẾN ĐỘ                                */}
        {/* ========================================================================= */}
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

          {/* UX Tăng cường: Thanh Tiến Độ Nộp Báo Cáo */}
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

        {/* ========================================================================= */}
        {/* KHU VỰC 2: FORM LẬP BÁO CÁO (Tự ẩn cơ sở đã nộp)                        */}
        {/* ========================================================================= */}
        <div ref={formRef} style={{ marginBottom: '28px' }}>
          {canEdit && (
            isEditingReport ? (
              // Trạng thái: Đang hiệu chỉnh báo cáo cũ -> Hiển thị form, truyền vào toàn bộ cơ sở để khoá select đúng ID
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
                  // Khi huỷ edit, tự quay về cơ sở chưa nộp
                  if (unsubmittedFacilities.length > 0) setSelectedFormFacilityId(unsubmittedFacilities[0].id);
                }}
              />
            ) : isAllSubmitted ? (
              // Trạng thái: Đã nộp xong hết -> Ẩn form, hiển thị thông báo thành công
              <div style={{
                backgroundColor: '#ecfdf5', border: '2px solid #34d399', borderRadius: '16px', padding: '24px',
                textAlign: 'center', color: '#065f46', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.1)'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800' }}>HOÀN TẤT BÀN GIAO CA</h3>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Toàn bộ các cơ sở đã được tạo báo cáo thành công cho ca trực này.</p>
              </div>
            ) : (
              // Trạng thái: Đang tạo mới -> Chỉ truyền vào các cơ sở chưa nộp (is_submitted = false)
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

        {/* ========================================================================= */}
        {/* KHU VỰC 3: BẢNG HIỂN THỊ BÁO CÁO                                        */}
        {/* ========================================================================= */}
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