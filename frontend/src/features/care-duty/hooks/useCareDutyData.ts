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
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Gọi API lấy dashboard live
      const dashboardRes = await careDutyApi.getLiveShiftDashboard(facilityId);
      const dashboardData = dashboardRes?.data || dashboardRes || [];

      if (Array.isArray(dashboardData)) {
        const mappedElders = dashboardData.map((item) => {
          const vital = item.latest_vital_signs;
          
          // Kiểm tra xem chỉ số có được đo trong ngày hôm nay hay không
          let isMeasuredToday = false;
          if (vital && vital.measured_at) {
            const measuredDateStr = new Date(vital.measured_at).toISOString().split('T')[0];
            isMeasuredToday = (measuredDateStr === todayStr);
          }

          return {
            id: item.elder_id,
            fullName: item.elder_name,
            roomNumber: item.room_number,
            // Chỉ bật cờ bất thường nếu bản ghi đo thuộc NGÀY HÔM NAY
            hasAbnormal: isMeasuredToday && item.has_abnormal_vital,
            isMeasured: isMeasuredToday,
            isEdited: vital?.is_edited || false,
            isWeightDue: false,
            vitalData: isMeasuredToday ? vital : null,
            weightData: item.weight_data ? {
              id: item.weight_data.id,
              weight: item.weight_data.weight,
              recorded_at: item.weight_data.recorded_at,
              notes: item.weight_data.notes
            } : null,
            handoverNote: Array.isArray(item.recent_diary_events) ? item.recent_diary_events.join(' | ') : ''
          };
        });

        setEldersList(mappedElders);

        // Lọc danh sách cảnh báo (Chỉ cảnh báo các Cụ có sinh hiệu bất thường TRONG NGÀY)
        const abnormalAlerts = mappedElders
          .filter((e) => e.hasAbnormal)
          .map((e) => ({
            roomNumber: e.roomNumber,
            elderName: e.fullName,
            issueDetail: 'Sinh hiệu bất thường trong ca hôm nay'
          }));

        setAlerts(abnormalAlerts);
      }

      // 2. Lấy Báo cáo giao ca quá khứ/ngày hôm nay
      try {
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
      console.error('Lỗi tải dữ liệu ca trực:', error);
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
    setIsReportSubmitted,
    refreshData: fetchData,
    loading
  };
};