import React, { useState, useRef } from 'react';
import styles from './VitalAndWeightForm.module.css';

export const VitalAndWeightForm = ({ selectedElder, onSaveVital, onSaveWeight }) => {
  const [activeTab, setActiveTab] = useState('VITALS');

  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [vitalNotes, setVitalNotes] = useState('');

  const [weight, setWeight] = useState('');
  const [weightNotes, setWeightNotes] = useState('');

  const diastolicRef = useRef(null);
  const pulseRef = useRef(null);

  const handleSystolicChange = (e) => {
    const val = e.target.value;
    setBpSystolic(val);
    if (val.length === 3 && diastolicRef.current) {
      diastolicRef.current.focus();
    }
  };

  const handleDiastolicChange = (e) => {
    const val = e.target.value;
    setBpDiastolic(val);
    if (val.length === 2 && pulseRef.current) {
      pulseRef.current.focus();
    }
  };

  const handleSubmitVital = (e) => {
    e.preventDefault();
    if (!selectedElder) return alert('Vui lòng chọn Cụ!');

    onSaveVital({
      elder_id: selectedElder.id,
      shift_type: "Sang",
      bp_systolic: bpSystolic ? Number(bpSystolic) : null,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : null,
      pulse: pulse ? Number(pulse) : null,
      spo2: spo2 ? Number(spo2) : null,
      temperature: temperature ? Number(temperature) : null,
      notes: vitalNotes,
    });

    setBpSystolic('');
    setBpDiastolic('');
    setPulse('');
    setSpo2('');
    setTemperature('');
    setVitalNotes('');
  };

  const handleSubmitWeight = (e) => {
    e.preventDefault();
    if (!selectedElder) return alert('Vui lòng chọn Cụ!');
    if (!weight) return alert('Vui lòng nhập số cân nặng!');

    onSaveWeight({
      elder_id: selectedElder.id,
      weight: Number(weight),
      notes: weightNotes,
    });

    setWeight('');
    setWeightNotes('');
  };

  if (!selectedElder) {
    return (
      <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '16px', textAlign: 'center', color: '#92400e', fontWeight: 'bold' }}>
        👈 Vui lòng chọn một Cụ ở bảng trên để bắt đầu nhập chỉ số!
      </div>
    );
  }

  return (
    <div className={styles.formBox}>
      <div className={styles.formHeader}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>ĐANG CHỌN:</span>
          <div className={styles.elderTitle}>
            Phòng {selectedElder.roomNumber} - {selectedElder.fullName}
          </div>
        </div>

        <div className={styles.tabSwitch}>
          <button
            type="button"
            onClick={() => setActiveTab('VITALS')}
            className={`${styles.tabBtn} ${activeTab === 'VITALS' ? styles.tabBtnActiveVital : ''}`}
          >
            🩺 Đo Sinh Hiệu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WEIGHT')}
            className={`${styles.tabBtn} ${activeTab === 'WEIGHT' ? styles.tabBtnActiveWeight : ''}`}
          >
            ⚖️ Cân Nặng Tháng
          </button>
        </div>
      </div>

      {activeTab === 'VITALS' && (
        <form onSubmit={handleSubmitVital}>
          <div className={styles.inputGrid4}>
            <div>
              <label className={styles.fieldLabel}>HA Tâm thu</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="120"
                value={bpSystolic}
                onChange={handleSystolicChange}
                className={styles.inputControl}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>HA Tâm trương</label>
              <input
                ref={diastolicRef}
                type="number"
                inputMode="numeric"
                placeholder="80"
                value={bpDiastolic}
                onChange={handleDiastolicChange}
                className={styles.inputControl}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Nhịp tim</label>
              <input
                ref={pulseRef}
                type="number"
                inputMode="numeric"
                placeholder="75"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className={styles.inputControl}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>SpO2 (%)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="98"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className={styles.inputControl}
              />
            </div>
          </div>

          <div className={styles.inputGrid2}>
            <div>
              <label className={styles.fieldLabel}>Nhiệt độ (°C)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="36.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className={styles.inputControl}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Ghi chú nhanh</label>
              <input
                type="text"
                placeholder="Sốt nhẹ, đã lau mát..."
                value={vitalNotes}
                onChange={(e) => setVitalNotes(e.target.value)}
                className={styles.inputControl}
                style={{ textAlign: 'left' }}
              />
            </div>
          </div>

          <button type="submit" className={styles.btnSubmitVital}>
            ✓ LƯU SINH HIỆU CA TRỰC
          </button>
        </form>
      )}

      {activeTab === 'WEIGHT' && (
        <form onSubmit={handleSubmitWeight}>
          <div className={styles.inputGrid2}>
            <div>
              <label className={styles.fieldLabel}>Cân Nặng (kg)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="54.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={styles.inputControl}
                style={{ fontSize: '22px', backgroundColor: '#fffbeb', color: '#92400e' }}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Ghi chú cân nặng</label>
              <input
                type="text"
                placeholder="Cân định kỳ tháng này..."
                value={weightNotes}
                onChange={(e) => setWeightNotes(e.target.value)}
                className={styles.inputControl}
                style={{ textAlign: 'left' }}
              />
            </div>
          </div>

          <button type="submit" className={styles.btnSubmitWeight}>
            ⚖️ LƯU CÂN NẶNG ĐỊNH KỲ
          </button>
        </form>
      )}
    </div>
  );
};