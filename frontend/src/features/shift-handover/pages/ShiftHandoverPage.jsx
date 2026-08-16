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

  // 1. Phân quyền đầy đủ cho các vai trò được phép nhập/sửa đơn
  const canEdit = 
    currentRole.includes('COORDINATOR') || 
    currentRole.includes('ADMIN') || 
    currentRole.includes('MANAGER') ||
    currentRole.includes('DOCTOR');

  const hasSpecificFacility = user?.facility_id !== null && user?.facility_id !== undefined;
  const targetFacilityId = hasSpecificFacility ? Number(user.facility_id) : null;

  // Danh sách cơ sở từ backend & cơ sở đang chọn trên form
  const [facilities, setFacilities] = useState([]);
  const [selectedFormFacilityId, setSelectedFormFacilityId] = useState(targetFacilityId || null);

  // Facility ID dùng để nạp danh sách NCT & cảnh báo vào Form
  const activeDataFacilityId = hasSpecificFacility ? targetFacilityId : (selectedFormFacilityId || null);
  const { eldersList, alerts, loading } = useVitalSignsData(activeDataFacilityId);

  const [reportData, setReportData] = useState([]);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [isPreviousReportShown, setIsPreviousReportShown] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const formRef = useRef(null);

  // 2. Chỉ gọi API facilities nếu người dùng CÓ QUYỀN LÀM ĐƠN
  useEffect(() => {
    const fetchFacilities = async () => {
      if (!canEdit) return;

      try {
        const res = await shiftHandoverApi.getAllFacilities();
        const facList = Array.isArray(res) ? res : (res?.data || []);
        setFacilities(facList);

        if (!hasSpecificFacility && facList.length > 0 && !selectedFormFacilityId) {
          setSelectedFormFacilityId(Number(facList[0].id));
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách cơ sở:', err);
      }
    };
    fetchFacilities();
  }, [canEdit, hasSpecificFacility]);

  // 3. Tải dữ liệu báo cáo giao ca
  const fetchShiftReportData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [todayRes, archiveRes] = await Promise.all([
        shiftHandoverApi.getArchivedShiftReports({
          facility_id: targetFacilityId,
          target_date: todayStr,
        }),
        shiftHandoverApi.getArchivedShiftReports({
          facility_id: targetFacilityId,
          limit_days: 7,
        }),
      ]);

      const todayReports = todayRes?.data || todayRes || [];
      const archiveReports = archiveRes?.data || archiveRes || [];

      if (!hasSpecificFacility) {
        const facilityMap = new Map();

        archiveReports.forEach((report) => {
          const facId = String(report.facility_id);
          if (!facilityMap.has(facId)) {
            facilityMap.set(facId, { ...report, isPrevious: true });
          }
        });

        todayReports.forEach((report) => {
          const facId = String(report.facility_id);
          facilityMap.set(facId, { ...report, isPrevious: false });
        });

        const combinedReports = Array.from(facilityMap.values());
        setReportData(combinedReports);

        const hasFallback = combinedReports.some((r) => r.isPrevious);
        setIsPreviousReportShown(hasFallback);
        setIsReportSubmitted(todayReports.length > 0);
      } else {
        if (todayReports.length > 0) {
          setReportData(todayReports.map((r) => ({ ...r, isPrevious: false })));
          setIsReportSubmitted(true);
          setIsPreviousReportShown(false);
        } else if (archiveReports.length > 0) {
          setReportData([{ ...archiveReports[0], isPrevious: true }]);
          setIsReportSubmitted(false);
          setIsPreviousReportShown(true);
        } else {
          setReportData([]);
          setIsReportSubmitted(false);
          setIsPreviousReportShown(false);
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo giao ca:', err);
    }
  };

  useEffect(() => {
    fetchShiftReportData();
  }, [user?.facility_id, currentRole]);

  const handleStartEditReport = (targetReport) => {
    if (!canEdit) return;
    setEditingReportItem(targetReport);
    if (targetReport.facility_id) {
      setSelectedFormFacilityId(Number(targetReport.facility_id));
    }
    setIsEditingReport(true);
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
      fetchShiftReportData();
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

  if (loading && facilities.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>
        Đang tải dữ liệu bàn giao ca...
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            QUẢN LÝ BÁO CÁO BÀN GIAO CA TRỰC
          </h2>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #0284c7',
              background: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Tra Cứu Lịch Sử Bàn Giao
          </button>
        </div>

        {isPreviousReportShown && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#b45309',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            ℹ️ Một số hoặc tất cả cơ sở chưa có báo cáo ca trực hôm nay. Hệ thống đang hiển thị nội dung giao ca gần nhất trước đó.
          </div>
        )}

        {/* HIỂN THỊ BÁO CÁO GIAO CA */}
        {reportData.length > 0 && !isEditingReport && (
          <ShiftReportView
            reports={reportData}
            alerts={alerts}
            role={currentRole}
            onEditReport={handleStartEditReport}
          />
        )}

        {/* FORM BÁO CÁO GIAO CA */}
        <div ref={formRef}>
          {canEdit && (!isReportSubmitted || isEditingReport) && (
            <HandoverReportForm
              facilitiesList={facilities}
              selectedFacilityId={selectedFormFacilityId}
              onChangeFacility={(newFacId) => setSelectedFormFacilityId(newFacId)}
              eldersList={eldersList}
              existingReport={isEditingReport ? editingReportItem : null}
              onSubmitReport={handleSubmitHandover}
              onCancelEdit={() => {
                setIsEditingReport(false);
                setEditingReportItem(null);
              }}
            />
          )}
        </div>

        <ShiftReportHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          facilityId={targetFacilityId}
          facilitiesList={facilities}
          role={currentRole}
          onFetchArchived={handleFetchArchivedReports}
        />
      </div>
    </Layout>
  );
};

export default ShiftHandoverPage;