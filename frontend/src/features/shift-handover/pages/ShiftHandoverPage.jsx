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

  const { eldersList, alerts, loading } = useVitalSignsData(user?.facility_id);

  const [reportData, setReportData] = useState([]);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const formRef = useRef(null);

  const fetchTodayReport = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const archivedRes = await shiftHandoverApi.getArchivedShiftReports({
        facility_id: user?.facility_id,
        target_date: todayStr,
      });
      const reports = archivedRes?.data || archivedRes;
      if (Array.isArray(reports) && reports.length > 0) {
        setReportData(reports);
        setIsReportSubmitted(true);
      } else {
        setReportData([]);
        setIsReportSubmitted(false);
      }
    } catch (err) {
      console.error('Lỗi lấy báo cáo giao ca:', err);
    }
  };

  useEffect(() => {
    fetchTodayReport();
  }, [user?.facility_id]);

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
        await shiftHandoverApi.updateShiftReport(reportId, payload);
      } else {
        await shiftHandoverApi.createShiftReport(payload);
      }
      setIsEditingReport(false);
      setEditingReportItem(null);
      fetchTodayReport();
    } catch (err) {
      console.error('Lỗi cập nhật giao ca:', err.response?.data?.detail || err.message);
    }
  };

  const handleFetchArchivedReports = async (params = {}) => {
    try {
      const res = await shiftHandoverApi.getArchivedShiftReports({
        facility_id: user?.facility_id,
        ...params,
      });
      return res?.data || res || [];
    } catch (err) {
      console.error('Lỗi tra cứu kho giao ca:', err);
      return [];
    }
  };

  const Layout = isDesktop ? ShiftHandoverWebLayout : ShiftHandoverMobileLayout;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>
        Đang tải dữ liệu bàn giao ca...
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ paddingBottom: '140px' }}>
        {/* Header trang Giao ca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

        {/* 1. HIỂN THỊ BÁO CÁO CỦA CA TRỰC HIỆN TẠI */}
        {isReportSubmitted && !isEditingReport && (
          <ShiftReportView
            reports={reportData}
            alerts={alerts}
            role={currentRole}
            onEditReport={handleStartEditReport}
          />
        )}

        {/* 2. FORM TẠO/SỬA BÁO CÁO GIAO CA (COORDINATOR HOẶC ADMIN) */}
        <div ref={formRef}>
          {(currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN')) && (!isReportSubmitted || isEditingReport) && (
            <HandoverReportForm
              facilityId={user?.facility_id}
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

        {/* MODAL TRA CỨU LỊCH SỬ BÁN GIAO CA QUÁ KHỨ */}
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

export default ShiftHandoverPage;