import { useState, useEffect, useCallback } from 'react';
import { careDutyApi } from '../api/careDutyApi';

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

const formatRoomSyntax = (zoneName, roomNumber) => {
  if (!roomNumber) return 'Chưa xếp phòng';
  
  const cleanZone = String(zoneName || '')
    .replace(/^(Khu|Zone|\s)+/i, '')
    .trim();
    
  const cleanRoom = String(roomNumber)
    .replace(/^(Phòng|P\.?|\s)+/i, '')
    .trim();

  if (!cleanZone) return cleanRoom || String(roomNumber);
  if (cleanRoom.toUpperCase().startsWith(cleanZone.toUpperCase())) {
    return cleanRoom;
  }
  return `${cleanZone}${cleanRoom}`;
};

export const useCareDutyData = (facilityId = null) => {
  const [eldersList, setEldersList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [weightDueCount, setWeightDueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const targetFacilityId = facilityId ? Number(facilityId) : null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      const [dashboardRes, weightDueRes] = await Promise.all([
        careDutyApi.getLiveShiftDashboard(targetFacilityId),
        careDutyApi.getEldersDueForWeight().catch(() => null)
      ]);

      const dashboardData = dashboardRes?.data || dashboardRes || [];
      const weightDueData = weightDueRes?.data || weightDueRes || [];

      const dueElderIds = new Set((Array.isArray(weightDueData) ? weightDueData : []).map(item => item.elder_id));
      setWeightDueCount(dueElderIds.size);

      if (Array.isArray(dashboardData)) {
        const mappedElders = [];
        const abnormalAlertsList = [];

        dashboardData.forEach((facility) => {
          const facName = facility.facility_name || `CS ${facility.facility_id}`;
          const facId = facility.facility_id;

          (facility.zones || []).forEach((zone) => {
            const zoneName = zone.zone_name || '';

            (zone.rooms || []).forEach((room) => {
              const rawRoomNumber = room.room_number || '';
              const formattedRoom = formatRoomSyntax(zoneName, rawRoomNumber);

              (room.elders || []).forEach((elder) => {
                const isMeasured = elder.status_tag !== 'NOT_MEASURED';
                const hasAbnormal = Boolean(elder.is_abnormal);
                const vital = elder.latest_vital;
                const staffNote = vital?.notes?.trim() || '';
                const hasNote = Boolean(staffNote);

                const cleanFullName = String(elder.full_name || '')
                  .replace(/^Cụ\s+/i, '')
                  .trim() || 'Chưa cập nhật tên';

                let bpSys = null;
                let bpDia = null;
                if (vital && vital.bp) {
                  const parts = vital.bp.split('/');
                  bpSys = Number(parts[0]) || null;
                  bpDia = Number(parts[1]) || null;
                }

                const elderObj = {
                  id: elder.elder_id,
                  fullName: cleanFullName,
                  roomNumber: formattedRoom,
                  facilityId: facId,
                  facilityName: facName,
                  hasAbnormal: hasAbnormal,
                  isMeasured: isMeasured,
                  isEdited: Boolean(elder.is_edited),
                  isWeightDue: dueElderIds.has(elder.elder_id),
                  vitalData: isMeasured && vital ? {
                    id: vital.vital_id,
                    bp_systolic: bpSys,
                    bp_diastolic: bpDia,
                    spo2: vital.spo2,
                    temperature: vital.temperature,
                    pulse: vital.pulse,
                    notes: staffNote,
                    measured_at: vital.measured_at
                  } : null,
                  weightData: null
                };

                mappedElders.push(elderObj);

                // PHÂN LOẠI: DANGER (Chỉ số bất thường), NOTE_ONLY (Có note), BOTH (Cả hai)
                if (hasAbnormal || hasNote) {
                  const issueText = [];
                  if (vital?.spo2 && vital.spo2 < VITAL_LIMITS.SPO2_WARNING) issueText.push(`SpO2 thấp (${vital.spo2}%)`);
                  if (vital?.temperature && vital.temperature >= VITAL_LIMITS.TEMP_FEVER) issueText.push(`Sốt (${vital.temperature}°C)`);
                  if (bpSys && bpSys > VITAL_LIMITS.BP_SYSTOLIC_HIGH) issueText.push(`Huyết áp cao (${vital.bp})`);
                  if (vital?.pulse && (vital.pulse > VITAL_LIMITS.PULSE_FAST || vital.pulse < VITAL_LIMITS.PULSE_SLOW)) issueText.push(`Mạch (${vital.pulse} bpm)`);

                  let alertType = 'NOTE_ONLY';
                  if (hasAbnormal && hasNote) {
                    alertType = 'BOTH';
                  } else if (hasAbnormal) {
                    alertType = 'DANGER';
                  }

                  abnormalAlertsList.push({
                    id: elder.elder_id,
                    roomNumber: formattedRoom,
                    elderName: cleanFullName,
                    facilityName: facName,
                    facilityId: facId,
                    alertType: alertType,
                    issueDetail: issueText.join(' • '),
                    staffNote: staffNote,
                    elder: elderObj
                  });
                }
              });
            });
          });
        });

        setEldersList(mappedElders);
        setAlerts(abnormalAlertsList);
      }

      try {
        const archivedRes = await careDutyApi.getArchivedShiftReports({
          facility_id: targetFacilityId,
          target_date: todayStr
        });
        const reports = archivedRes?.data || archivedRes;
        
        if (Array.isArray(reports) && reports.length > 0) {
          const matchedReports = targetFacilityId 
            ? reports.filter(r => Number(r.facility_id) === targetFacilityId)
            : reports;

          setReportData(matchedReports);
          setIsReportSubmitted(matchedReports.length > 0);
        } else {
          setReportData([]);
          setIsReportSubmitted(false);
        }
      } catch (err) {
        setReportData([]);
        setIsReportSubmitted(false);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu ca trực:', error);
    } finally {
      setLoading(false);
    }
  }, [targetFacilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    eldersList,
    alerts,
    reportData,
    isReportSubmitted,
    weightDueCount,
    setIsReportSubmitted,
    refreshData: fetchData,
    loading
  };
};