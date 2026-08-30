import { useState, useEffect, useCallback } from 'react';
import { vitalSignsApi } from '../api/vitalSignsApi';
import { VITAL_LIMITS } from '../../../utils/constants';

const formatRoomSyntax = (zoneName, roomNumber) => {
  if (!roomNumber) return 'Chưa xếp phòng';
  const cleanZone = String(zoneName || '').replace(/^(Khu|Zone|\s)+/i, '').trim();
  const cleanRoom = String(roomNumber).replace(/^(Phòng|P\.?|\s)+/i, '').trim();
  if (!cleanZone) return cleanRoom || String(roomNumber);
  if (cleanRoom.toUpperCase().startsWith(cleanZone.toUpperCase())) return cleanRoom;
  return `${cleanZone}${cleanRoom}`;
};

export const useVitalSignsData = (facilityId = null) => {
  const [eldersList, setEldersList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [weightDueList, setWeightDueList] = useState([]);
  const [activeShift, setActiveShift] = useState("Sang");
  const [loading, setLoading] = useState(true);

  const targetFacilityId = facilityId ? Number(facilityId) : null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, weightDueRes] = await Promise.all([
        vitalSignsApi.getLiveShiftDashboard(targetFacilityId),
        vitalSignsApi.getEldersDueForWeight().catch(() => null)
      ]);

      const dashboardData = dashboardRes?.data || dashboardRes || [];
      const weightDueData = weightDueRes?.data || weightDueRes || [];

      // Map đúng 100% định dạng ElderWeightDueResponse từ FastAPI
      const formattedWeightDue = (Array.isArray(weightDueData) ? weightDueData : []).map((item) => ({
        id: item.elder_id,
        elder_id: item.elder_id,
        elderName: item.elder_name || 'Người cao tuổi',
        roomNumber: item.room_number || 'Chưa xếp phòng',
        lastWeightDate: item.last_weight_date,
        daysSinceLastWeight: item.days_since_last_weight,
        daysRemaining: item.days_remaining ?? 0,
        statusFlag: item.status_flag || 'NORMAL', // 'OVERDUE' | 'WARNING'
        isOverdue: Boolean(item.is_overdue),
      }));

      const dueElderIds = new Set(formattedWeightDue.map((item) => item.elder_id));
      setWeightDueList(formattedWeightDue);

      if (Array.isArray(dashboardData)) {

        if (dashboardData.length > 0 && dashboardData[0].active_shift_type) {
          setActiveShift(dashboardData[0].active_shift_type);
        }

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
                const cleanFullName = String(elder.full_name || '').replace(/^Cụ\s+/i, '').trim() || 'Chưa cập nhật';

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

                // Khung cảnh báo chỉ gom Sinh hiệu bất thường + Ghi chú ca trực
                if (hasAbnormal || hasNote) {
                  const issueText = [];
                  if (vital?.spo2 && vital.spo2 < VITAL_LIMITS.SPO2_WARNING) issueText.push(`SpO2 thấp (${vital.spo2}%)`);
                  if (vital?.temperature && vital.temperature >= VITAL_LIMITS.TEMP_FEVER) issueText.push(`Sốt (${vital.temperature}°C)`);
                  if (bpSys && bpSys > VITAL_LIMITS.BP_SYSTOLIC_HIGH) {
                    issueText.push(`Huyết áp cao (${vital.bp})`);
                  } else if (bpSys && bpSys < VITAL_LIMITS.BP_SYSTOLIC_LOW) {
                    issueText.push(`Huyết áp thấp (${vital.bp})`);
                  } else if (bpDia && bpDia > VITAL_LIMITS.BP_DIASTOLIC_HIGH) {
                    issueText.push(`HA tâm trương cao (${vital.bp})`);
                  } else if (bpDia && bpDia < VITAL_LIMITS.BP_DIASTOLIC_LOW) {
                    issueText.push(`HA tâm trương thấp (${vital.bp})`);
                  }
                  if (vital?.pulse && (vital.pulse > VITAL_LIMITS.PULSE_FAST || vital.pulse < VITAL_LIMITS.PULSE_SLOW)) issueText.push(`Mạch (${vital.pulse} bpm)`);

                  let alertType = 'NOTE_ONLY';
                  if (hasAbnormal && hasNote) alertType = 'BOTH';
                  else if (hasAbnormal) alertType = 'DANGER';

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
    } catch (error) {
      console.error('Lỗi lấy dữ liệu sinh hiệu & cân nặng:', error);
    } finally {
      setLoading(false);
    }
  }, [targetFacilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    eldersList: eldersList || [],
    alerts: alerts || [],
    weightDueList: weightDueList || [],
    weightDueCount: weightDueList?.length || 0,
    activeShift,
    refreshData: fetchData,
    loading
  };
};