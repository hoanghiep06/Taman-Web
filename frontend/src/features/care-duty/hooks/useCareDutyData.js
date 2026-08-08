import { useState, useEffect, useCallback } from 'react';
import { careDutyApi } from '../api/careDutyApi';

// BẢNG HẰNG SỐ CHUẨN ĐỐI CHIẾU SINH HIỆU BẤT THƯỜNG
const VITAL_LIMITS = {
  SPO2_WARNING: 95.0,
  BP_SYSTOLIC_HIGH: 150,
  BP_DIASTOLIC_HIGH: 90,
  BP_SYSTOLIC_LOW: 90,
  BP_DIASTOLIC_LOW: 60,
  TEMP_FEVER: 37.5,
  TEMP_ALARM: 38.5,
  PULSE_FAST: 100,
  PULSE_SLOW: 60,
};

// Hàm phân tích chi tiết lý do bất thường
const getVitalWarningReasons = (vital) => {
  if (!vital) return [];
  const reasons = [];

  if (vital.spo2 && vital.spo2 < VITAL_LIMITS.SPO2_WARNING) {
    reasons.push(`SpO2 thấp (${vital.spo2}%)`);
  }
  if (vital.temperature) {
    if (vital.temperature >= VITAL_LIMITS.TEMP_ALARM) {
      reasons.push(`Sốt cao khẩn cấp (${vital.temperature}°C)`);
    } else if (vital.temperature >= VITAL_LIMITS.TEMP_FEVER) {
      reasons.push(`Sốt nhẹ (${vital.temperature}°C)`);
    }
  }
  if (vital.bp_systolic || vital.bp_diastolic) {
    if (vital.bp_systolic > VITAL_LIMITS.BP_SYSTOLIC_HIGH || vital.bp_diastolic > VITAL_LIMITS.BP_DIASTOLIC_HIGH) {
      reasons.push(`Huyết áp cao (${vital.bp_systolic}/${vital.bp_diastolic})`);
    } else if (vital.bp_systolic < VITAL_LIMITS.BP_SYSTOLIC_LOW || vital.bp_diastolic < VITAL_LIMITS.BP_DIASTOLIC_LOW) {
      reasons.push(`Huyết áp thấp (${vital.bp_systolic}/${vital.bp_diastolic})`);
    }
  }
  if (vital.pulse) {
    if (vital.pulse > VITAL_LIMITS.PULSE_FAST) {
      reasons.push(`Mạch nhanh (${vital.pulse} bpm)`);
    } else if (vital.pulse < VITAL_LIMITS.PULSE_SLOW) {
      reasons.push(`Mạch chậm (${vital.pulse} bpm)`);
    }
  }

  return reasons;
};

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

      const dashboardRes = await careDutyApi.getLiveShiftDashboard(facilityId);
      const dashboardData = dashboardRes?.data || dashboardRes || [];

      if (Array.isArray(dashboardData)) {
        const abnormalAlertsList = [];

        const mappedElders = dashboardData.map((item) => {
          const vital = item.latest_vital_signs;
          
          let isMeasuredToday = false;
          if (vital && vital.measured_at) {
            const measuredDateStr = new Date(vital.measured_at).toISOString().split('T')[0];
            isMeasuredToday = (measuredDateStr === todayStr);
          }

          // Phân tích chi tiết cảnh báo theo hằng số y tế
          const detailedReasons = isMeasuredToday ? getVitalWarningReasons(vital) : [];
          const hasAbnormal = detailedReasons.length > 0;

          if (hasAbnormal) {
            abnormalAlertsList.push({
              roomNumber: item.room_number,
              elderName: item.elder_name,
              issueDetail: detailedReasons.join(' • ')
            });
          }

          return {
            id: item.elder_id,
            fullName: item.elder_name,
            roomNumber: item.room_number,
            hasAbnormal: hasAbnormal,
            isMeasured: isMeasuredToday,
            isEdited: vital?.is_edited || false,
            isWeightDue: item.is_weight_due || false,
            vitalData: isMeasuredToday ? vital : null,
            // Map chuẩn chỉ số cân nặng gần nhất
            weightData: item.weight_data || item.latest_weight_record ? {
              id: (item.weight_data || item.latest_weight_record).id,
              weight: (item.weight_data || item.latest_weight_record).weight,
              recorded_at: (item.weight_data || item.latest_weight_record).recorded_at || (item.weight_data || item.latest_weight_record).created_at,
              notes: (item.weight_data || item.latest_weight_record).notes
            } : null,
            handoverNote: Array.isArray(item.recent_diary_events) ? item.recent_diary_events.join(' | ') : ''
          };
        });

        setEldersList(mappedElders);
        setAlerts(abnormalAlertsList);
      }

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