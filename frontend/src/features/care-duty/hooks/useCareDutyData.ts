import { useState, useEffect, useCallback } from 'react';
import { careDutyApi } from '../api/careDutyApi';

export const useCareDutyData = (facilityId = null) => {
  const [eldersList, setEldersList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Gọi API lấy thông tin dashboard ca trực live
      const dashboardRes = await careDutyApi.getLiveShiftDashboard(facilityId);
      const dashboardData = dashboardRes?.data || dashboardRes || [];

      if (Array.isArray(dashboardData)) {
        const mappedElders = dashboardData.map((item) => ({
          id: item.elder_id,
          fullName: item.elder_name,
          roomNumber: item.room_number,
          hasAbnormal: item.has_abnormal_vital,
          isMeasured: item.is_measured,
          isEdited: item.is_edited,
          isWeightDue: item.is_weight_due || false,
          vitalData: item.vital_data ? {
            id: item.vital_data.id,
            bp_systolic: item.vital_data.bp_systolic,
            bp_diastolic: item.vital_data.bp_diastolic,
            pulse: item.vital_data.pulse,
            spo2: item.vital_data.spo2,
            temperature: item.vital_data.temperature,
            notes: item.vital_data.notes
          } : null,
          weightData: item.weight_data ? {
            id: item.weight_data.id,
            weight: item.weight_data.weight,
            recorded_at: item.weight_data.recorded_at,
            notes: item.weight_data.notes
          } : null,
          handoverNote: item.handover_note || ''
        }));
        setEldersList(mappedElders);

        // Lọc danh sách Cảnh báo đỏ
        const abnormalAlerts = dashboardData
          .filter((item) => item.has_abnormal_vital)
          .map((item) => ({
            roomNumber: item.room_number,
            elderName: item.elder_name,
            issueDetail: Array.isArray(item.doctor_attention_reasons) 
              ? item.doctor_attention_reasons.join(', ') 
              : 'Dấu hiệu sinh hiệu bất thường'
          }));
        setAlerts(abnormalAlerts);
      }

      // 2. Gọi API kiểm tra Báo cáo giao ca trong ngày
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const archivedRes = await careDutyApi.getArchivedShiftReports({
          facility_id: facilityId,
          target_date: todayStr
        });
        const reports = archivedRes?.data || archivedRes;

        if (Array.isArray(reports) && reports.length > 0) {
          setReportData(reports[0]);
          setIsReportSubmitted(true);
        } else {
          setReportData(null);
          setIsReportSubmitted(false);
        }
      } catch (err) {
        setIsReportSubmitted(false);
      }

    } catch (error) {
      console.error('Lỗi khi tải dữ liệu ca trực:', error);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    eldersList,
    alerts,
    reportData,
    isReportSubmitted,
    refreshData: fetchData,
    loading
  };
};