/**
 * healthThresholds.js
 * Ngưỡng cảnh báo sinh hiệu — 1 NGUỒN DUY NHẤT cho toàn bộ module Sức Khỏe.
 * Khi Bác sĩ cần "ngưỡng riêng theo từng Cụ" (đề xuất mục IV), sửa DUY NHẤT ở đây:
 * đổi các hàm bên dưới để nhận thêm tham số `customThresholds` (ưu tiên hơn ngưỡng chung).
 */

export const DEFAULT_THRESHOLDS = {
  spo2Low: 95, // SpO2 < 95 → bất thường
  bpSystolicHigh: 150, // Huyết áp cao > 150/90
  bpDiastolicHigh: 90,
  bpSystolicLow: 90, // Huyết áp thấp < 90/60
  bpDiastolicLow: 60,
  tempFever: 37.5, // Sốt >= 37.5
  tempCritical: 38.5, // Báo động >= 38.5
  pulseFast: 100, // Mạch nhanh > 100
  pulseSlow: 60, // Mạch chậm < 60
  weightDueDays: 30, // Trễ lịch cân >= 30 ngày
};

/**
 * Kiểm tra 1 bộ chỉ số sinh hiệu có bất thường không.
 * @param {{spo2?, systolic?, diastolic?, temperature?, pulse?}} vitals
 * @param {typeof DEFAULT_THRESHOLDS} [thresholds] - cho phép ghi đè ngưỡng riêng theo Cụ (custom threshold)
 * @returns {{isAbnormal: boolean, isCritical: boolean, reasons: string[]}}
 */
export const evaluateVitals = (vitals = {}, thresholds = DEFAULT_THRESHOLDS) => {
  const reasons = [];
  let isCritical = false;

  if (vitals.spo2 != null && vitals.spo2 < thresholds.spo2Low) {
    reasons.push(`SpO2 thấp (${vitals.spo2}%)`);
  }
  if (vitals.systolic != null && vitals.diastolic != null) {
    if (vitals.systolic > thresholds.bpSystolicHigh || vitals.diastolic > thresholds.bpDiastolicHigh) {
      reasons.push(`Huyết áp cao (${vitals.systolic}/${vitals.diastolic})`);
    } else if (vitals.systolic < thresholds.bpSystolicLow || vitals.diastolic < thresholds.bpDiastolicLow) {
      reasons.push(`Huyết áp thấp (${vitals.systolic}/${vitals.diastolic})`);
    }
  }
  if (vitals.temperature != null && vitals.temperature >= thresholds.tempFever) {
    reasons.push(`Sốt ${vitals.temperature}°C`);
    if (vitals.temperature >= thresholds.tempCritical) isCritical = true;
  }
  if (vitals.pulse != null) {
    if (vitals.pulse > thresholds.pulseFast) reasons.push(`Mạch nhanh (${vitals.pulse})`);
    else if (vitals.pulse < thresholds.pulseSlow) reasons.push(`Mạch chậm (${vitals.pulse})`);
  }

  return { isAbnormal: reasons.length > 0, isCritical, reasons };
};

/**
 * Tính số ngày kể từ lần cân gần nhất, xác định có trễ lịch cân không.
 */
export const isWeightOverdue = (lastWeighInDate, thresholds = DEFAULT_THRESHOLDS) => {
  if (!lastWeighInDate) return true;
  const days = Math.floor((Date.now() - new Date(lastWeighInDate).getTime()) / 86400000);
  return days >= thresholds.weightDueDays;
};

/**
 * Cờ tổng hợp cho 1 Cụ, dùng cho ElderHealthCard ở Dashboard Ca Live.
 * @returns {'red'|'yellow'|'green'}
 */
export const computeElderFlag = ({ latestVitals, lastWeighInDate, hasHandoverNote, thresholds }) => {
  const { isAbnormal } = evaluateVitals(latestVitals || {}, thresholds || DEFAULT_THRESHOLDS);
  if (isAbnormal) return 'red';
  if (hasHandoverNote || isWeightOverdue(lastWeighInDate, thresholds)) return 'yellow';
  return 'green';
};