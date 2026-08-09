import React, { useState, useEffect } from 'react';
import styles from './VitalModal.module.css';
import { VITAL_LIMITS } from '../../../utils/constants';

// --- ICON CÂN ĐIỆN TỬ (Tự thiết kế bằng SVG để nổi bật) ---
const DigitalScaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <rect x="9" y="6" width="6" height="3" rx="1" fill="#fff" stroke="currentColor" />
  </svg>
);

// --- ICON ĐO NHỊP TIM/SINH HIỆU ---
const VitalsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const formatDateString = (rawDate) => {
  if (!rawDate) return 'N/A';
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return rawDate;
  }
};

export const VitalModal = ({ 
  isOpen, 
  onClose, 
  elder, 
  role = 'CAREGIVER', 
  defaultTab = 'VITALS',
  onSaveVital,
  onSaveWeight,
  onFetchHistory,
  onFetchWeightHistory
}) => {
  if (!isOpen || !elder) return null;

  const rawBpSys = elder.vitalData?.bp_systolic;
  const rawBpDia = elder.vitalData?.bp_diastolic;
  const rawPulse = elder.vitalData?.pulse;
  const rawSpo2 = elder.vitalData?.spo2;
  const rawTemp = elder.vitalData?.temperature;

  const isBpAbnormal = Boolean(
    (rawBpSys && (rawBpSys > VITAL_LIMITS.BP_SYSTOLIC_HIGH || rawBpSys < VITAL_LIMITS.BP_SYSTOLIC_LOW)) ||
    (rawBpDia && (rawBpDia > VITAL_LIMITS.BP_DIASTOLIC_HIGH || rawBpDia < VITAL_LIMITS.BP_DIASTOLIC_LOW))
  );
  const isSpo2Abnormal = Boolean(rawSpo2 && rawSpo2 < VITAL_LIMITS.SPO2_WARNING);
  const isPulseAbnormal = Boolean(rawPulse && (rawPulse > VITAL_LIMITS.PULSE_FAST || rawPulse < VITAL_LIMITS.PULSE_SLOW));
  const isTempAbnormal = Boolean(rawTemp && rawTemp >= VITAL_LIMITS.TEMP_FEVER);

  const currentRole = role.toUpperCase();
  const canEdit = currentRole.includes('CAREGIVER') || currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN');
  const canViewHistory = currentRole.includes('COORDINATOR') || currentRole.includes('DOCTOR') || currentRole.includes('MANAGER') || currentRole.includes('ADMIN');
  const isCoordinator = currentRole.includes('COORDINATOR');
  const isDoctor = currentRole.includes('DOCTOR');

  // Đã gộp và xóa phần khai báo biến activeTab bị lặp
  const [activeTab, setActiveTab] = useState(defaultTab); 
  const [isEditMode, setIsEditMode] = useState(!elder.isMeasured && canEdit);

  const [bpSystolic, setBpSystolic] = useState(elder.vitalData?.bp_systolic || '');
  const [bpDiastolic, setBpDiastolic] = useState(elder.vitalData?.bp_diastolic || '');
  const [pulse, setPulse] = useState(elder.vitalData?.pulse || '');
  const [spo2, setSpo2] = useState(elder.vitalData?.spo2 || '');
  const [temperature, setTemperature] = useState(elder.vitalData?.temperature || '');
  const [notes, setNotes] = useState(elder.vitalData?.notes || '');

  const [weight, setWeight] = useState(elder.weightData?.weight || '');
  const [weightNotes, setWeightNotes] = useState(elder.weightData?.notes || '');

  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [daysFilter, setDaysFilter] = useState(3);

  const latestWeightRecord = elder.weightData?.weight 
    ? elder.weightData 
    : (historyData.length > 0 && activeTab === 'WEIGHT' ? historyData[0] : null);

  useEffect(() => {
    if (activeTab === 'WEIGHT' && onFetchWeightHistory) {
      onFetchWeightHistory(elder.id).then((res) => {
        if (Array.isArray(res)) setHistoryData(res);
      });
    }
  }, [activeTab, elder.id, onFetchWeightHistory]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setShowHistory(false);
    }
  }, [isOpen, defaultTab]);

  const handleSubmitVital = (e) => {
    e.preventDefault();
    onSaveVital({
      elder_id: elder.id,
      shift_type: "Sang",
      bp_systolic: bpSystolic ? Number(bpSystolic) : null,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : null,
      pulse: pulse ? Number(pulse) : null,
      spo2: spo2 ? Number(spo2) : null,
      temperature: temperature ? Number(temperature) : null,
      notes,
      is_edited: elder.isMeasured,
    });
    onClose();
  };

  const handleSubmitWeight = (e) => {
    e.preventDefault();
    if (!weight) return alert('Vui lòng nhập cân nặng!');
    onSaveWeight({
      elder_id: elder.id,
      weight: Number(weight),
      notes: weightNotes,
    });
    onClose();
  };

  const handleFetchHistoryData = async (days) => {
    setLoadingHistory(true);
    try {
      if (activeTab === 'VITALS') {
        const res = await onFetchHistory(elder.id, days);
        setHistoryData(res || []);
      } else {
        const res = await onFetchWeightHistory(elder.id);
        setHistoryData(res || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory) {
      handleFetchHistoryData(daysFilter);
    }
    setShowHistory(!showHistory);
  };
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
              PHÒNG {elder.roomNumber} {elder.facilityName ? `• ${elder.facilityName}` : ''}
            </span>
            <h3 className={styles.modalTitle}>{elder.fullName}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          
          {/* CẬP NHẬT 2 ICON MỚI VÀO NÚT BẤM CHUYỂN TAB */}
          <div className={styles.segmentedControl}>
            <button
              type="button"
              onClick={() => { setActiveTab('VITALS'); setShowHistory(false); }}
              className={`${styles.segmentBtn} ${activeTab === 'VITALS' ? styles.segmentActiveVital : ''}`}
            >
              <VitalsIcon /> Sinh Hiệu
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('WEIGHT'); setShowHistory(false); }}
              className={`${styles.segmentBtn} ${activeTab === 'WEIGHT' ? styles.segmentActiveWeight : ''}`}
            >
              <DigitalScaleIcon /> Cân Nặng
            </button>
          </div>

          {!isEditMode ? (
            <div>
              {activeTab === 'VITALS' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    
                    {/* HUYẾT ÁP */}
                    <div style={{ background: isBpAbnormal ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center', border: isBpAbnormal ? '1.5px solid #fecdd3' : '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isBpAbnormal ? '#be123c' : '#64748b' }}>
                        HUYẾT ÁP {isBpAbnormal && '⚠️'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: isBpAbnormal ? '#dc2626' : '#0f172a' }}>
                        {rawBpSys ? `${rawBpSys}/${rawBpDia}` : '--/--'}
                      </div>
                    </div>

                    {/* SPO2 */}
                    <div style={{ background: isSpo2Abnormal ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center', border: isSpo2Abnormal ? '1.5px solid #fecdd3' : '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isSpo2Abnormal ? '#be123c' : '#64748b' }}>
                        SPO2 {isSpo2Abnormal && '⚠️'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: isSpo2Abnormal ? '#dc2626' : '#0f172a' }}>
                        {rawSpo2 ? `${rawSpo2}%` : '--'}
                      </div>
                    </div>

                    {/* NHỊP TIM */}
                    <div style={{ background: isPulseAbnormal ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center', border: isPulseAbnormal ? '1.5px solid #fecdd3' : '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isPulseAbnormal ? '#be123c' : '#64748b' }}>
                        NHỊP TIM {isPulseAbnormal && '⚠️'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: isPulseAbnormal ? '#dc2626' : '#0f172a' }}>
                        {rawPulse ? `${rawPulse} bpm` : '--'}
                      </div>
                    </div>

                    {/* NHIỆT ĐỘ */}
                    <div style={{ background: isTempAbnormal ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center', border: isTempAbnormal ? '1.5px solid #fecdd3' : '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isTempAbnormal ? '#be123c' : '#64748b' }}>
                        NHIỆT ĐỘ {isTempAbnormal && '⚠️'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: isTempAbnormal ? '#dc2626' : '#0f172a' }}>
                        {rawTemp ? `${rawTemp} °C` : '--'}
                      </div>
                    </div>

                  </div>

                  {elder.vitalData?.notes && (
                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '14px', border: '1px solid #cbd5e1', color: '#334155' }}>
                      <b>📝 Ghi chú ca trực:</b> {elder.vitalData.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fef3c7', padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309' }}>CÂN NẶNG GẦN NHẤT</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#78350f', margin: '4px 0' }}>
                    {latestWeightRecord?.weight ? `${latestWeightRecord.weight} kg` : 'Chưa đo'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 'bold' }}>
                    Ngày đo: {formatDateString(latestWeightRecord?.recorded_at || latestWeightRecord?.measured_at || latestWeightRecord?.created_at)}
                  </div>
                  {latestWeightRecord?.notes && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fde68a', fontSize: '12px', color: '#78350f', fontWeight: '600' }}>
                      <b>Ghi chú:</b> {latestWeightRecord.notes}
                    </div>
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: elder.isMeasured ? '#d97706' : '#059669', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}
                >
                  {elder.isMeasured ? '✏️ Cập nhật / Chỉnh sửa chỉ số ca này' : '➕ Đo chỉ số ca này'}
                </button>
              )}

              {canViewHistory && (
                <div>
                  <button type="button" onClick={handleToggleHistory} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 'bold', cursor: 'pointer' }}>
                    {showHistory ? 'Ẩn Lịch Sử' : `📜 Xem Lịch Sử ${activeTab === 'VITALS' ? 'Sinh Hiệu' : 'Cân Nặng'}`}
                  </button>

                  {showHistory && (
                    <div style={{ marginTop: '12px' }}>
                      {activeTab === 'VITALS' && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          {(isCoordinator ? [1, 3, 7] : [1, 3, 7, 30]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { setDaysFilter(d); handleFetchHistoryData(d); }}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: daysFilter === d ? '#0f172a' : '#fff', color: daysFilter === d ? '#fff' : '#333', fontSize: '11px', fontWeight: 'bold' }}
                            >
                              {d} ngày qua
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {loadingHistory ? (
                          <div style={{ textAlign: 'center', padding: '10px' }}>Đang tải...</div>
                        ) : historyData.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>Chưa có lịch sử.</div>
                        ) : (
                          historyData.map((item, idx) => {
                            const rawDate = item.measured_at || item.shift_date || item.created_at || item.record_date || item.recorded_at;
                            const formattedDate = formatDateString(rawDate);
                            const shiftStr = item.shift_type || 'Trực';
                            const staffStr = item.recorded_by_name || item.recorded_by || 'Nhân viên';
                            return (
                              <div key={idx} className={styles.historyCard}>
                                <div className={styles.historyTopRow}>
                                  <span>📅 Ca {shiftStr} - {formattedDate}</span>
                                  <span>👤 {staffStr}</span>
                                </div>
                                <div className={styles.historyValueRow}>
                                  {activeTab === 'VITALS'
                                    ? `HA: ${item.bp_systolic}/${item.bp_diastolic} mmHg | SpO2: ${item.spo2}% | Tim: ${item.pulse} bpm | Nhiệt: ${item.temperature}°C`
                                    : `Cân nặng: ${item.weight} kg ${item.notes ? `(${item.notes})` : ''}`}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {activeTab === 'VITALS' ? (
                <form onSubmit={handleSubmitVital}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>HA Tâm thu</label>
                      <input type="number" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>HA Tâm trương</label>
                      <input type="number" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nhịp tim (bpm)</label>
                      <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>SpO2 (%)</label>
                      <input type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nhiệt độ (°C)</label>
                    <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ghi chú ca trực</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sốt nhẹ, uống thuốc..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setIsEditMode(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 'bold', cursor: 'pointer' }}>
                      Quay lại
                    </button>
                    <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: elder.isMeasured ? '#d97706' : '#059669', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                      {elder.isMeasured ? 'CẬP NHẬT' : 'LƯU CHỈ SỐ'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmitWeight}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Cân nặng (kg)</label>
                    <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="VD: 54.5" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #f59e0b', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', backgroundColor: '#fffbeb', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ghi chú cân nặng</label>
                    <input type="text" value={weightNotes} onChange={(e) => setWeightNotes(e.target.value)} placeholder="VD: Cân định kỳ đầu tháng..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setIsEditMode(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 'bold', cursor: 'pointer' }}>
                      Quay lại
                    </button>
                    <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                      LƯU CÂN NẶNG
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};