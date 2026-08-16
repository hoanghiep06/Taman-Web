import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import styles from './HandoverReportForm.module.css';

const SearchableElderSelect = ({ eldersList, selectedElderId, selectedElderIds = [], onSelect, hasError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedElder = eldersList.find((e) => e.id === selectedElderId);

  const filteredElders = eldersList.filter((e) => {
    const isAlreadySelectedInOtherRow = selectedElderIds.includes(e.id) && e.id !== selectedElderId;
    if (isAlreadySelectedInOtherRow) return false;

    const kw = searchTerm.toLowerCase().trim();
    return (e.fullName?.toLowerCase() || '').includes(kw) || (e.roomNumber?.toString() || '').includes(kw);
  });

  return (
    <div className={styles.customSelectContainer}>
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: hasError ? '2px solid #ef4444' : '1px solid #cbd5e1',
          backgroundColor: hasError ? '#fef2f2' : '#ffffff',
        }}
      >
        {selectedElder ? `${selectedElder.roomNumber} - ${selectedElder.fullName}` : 'Chọn người...'}
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <input
            type="text"
            placeholder="Tên/Phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInputInside}
          />
          <div className={styles.optionsList}>
            {filteredElders.length === 0 ? (
              <div style={{ padding: '6px', fontSize: '11px', color: '#94a3b8' }}>
                {eldersList.length > 0 && selectedElderIds.length >= eldersList.length
                  ? 'Đã chọn hết tất cả NCT'
                  : 'Không tìm thấy'}
              </div>
            ) : (
              filteredElders.map((elder) => (
                <div
                  key={elder.id}
                  className={styles.optionItem}
                  onClick={() => {
                    onSelect(elder.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {elder.roomNumber} - {elder.fullName}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const HandoverReportForm = ({
  facilitiesList = [],
  selectedFacilityId,
  onChangeFacility,
  eldersList = [],
  existingReport = null,
  onSubmitReport,
  onCancelEdit
}) => {
  const { user } = useContext(AuthContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elderEvents, setElderEvents] = useState([{ elder_id: '', note: '' }]);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [recordingIndex, setRecordingIndex] = useState(null);
  const [isRecordingHandover, setIsRecordingHandover] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);

  // Tự động xác định ca trực hiện tại theo khung giờ thực tế
  const getCurrentShiftType = () => {
    const hours = new Date().getHours();
    return (hours >= 6 && hours < 18) ? 'Sang' : 'Toi';
  };
  const [shiftType, setShiftType] = useState(existingReport?.shift_type || getCurrentShiftType());

  const isMultiFacility = user?.facility_id === null || user?.facility_id === undefined;
  
  // Khởi tạo ID cơ sở từ props hoặc API list, không fallback hằng số
  const [currentFacId, setCurrentFacId] = useState(
    existingReport?.facility_id || selectedFacilityId || user?.facility_id || facilitiesList[0]?.id || ''
  );

  const recognitionRef = useRef(null);
  const allSelectedElderIds = elderEvents.map((item) => item.elder_id).filter(Boolean);

  useEffect(() => {
    if (selectedFacilityId) {
      setCurrentFacId(selectedFacilityId);
    } else if (facilitiesList.length > 0 && !currentFacId) {
      setCurrentFacId(facilitiesList[0].id);
    }
  }, [selectedFacilityId, facilitiesList]);

  useEffect(() => {
    if (existingReport) {
      if (existingReport.facility_id) {
        setCurrentFacId(existingReport.facility_id);
      }
      if (existingReport.shift_type) {
        setShiftType(existingReport.shift_type);
      }
      setHandoverNotes(existingReport.handover_notes || '');
      if (existingReport.formatted_elder_descriptions) {
        const lines = existingReport.formatted_elder_descriptions.split('\n');
        const parsed = lines.map((line) => {
          const match = line.match(/^\d+\.\s*(.*?):\s*(.*)$/);
          if (match) {
            const rawName = match[1].replace(/^Cụ\s+/i, '').trim();
            const noteText = match[2].trim();
            const matchedElder = eldersList.find(
              (e) => e.fullName.toLowerCase() === rawName.toLowerCase() || rawName.includes(e.fullName)
            );
            return {
              elder_id: matchedElder ? matchedElder.id : '',
              note: noteText,
            };
          }
          return { elder_id: '', note: line };
        });
        if (parsed.length > 0) setElderEvents(parsed);
      }
    }
  }, [existingReport, eldersList]);

  const handleFacilitySelect = (newId) => {
    const numericId = Number(newId);
    setCurrentFacId(numericId);
    setElderEvents([{ elder_id: '', note: '' }]);
    setFieldErrors([{ elder_id: false, note: false }]);
    if (onChangeFacility) {
      onChangeFacility(numericId);
    }
  };

  const toggleVoiceRecording = (targetType, index = null) => {
    setErrorMessage('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Trình duyệt không hỗ trợ nhận diện giọng nói.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setRecordingIndex(null);
      setIsRecordingHandover(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        if (targetType === 'EVENT') setRecordingIndex(index);
        if (targetType === 'HANDOVER') setIsRecordingHandover(true);
      };

      recognition.onend = () => {
        setRecordingIndex(null);
        setIsRecordingHandover(false);
        recognitionRef.current = null;
      };

      recognition.onerror = (event) => {
        console.error('Microphone Error:', event.error);
        setErrorMessage('Không thể thu âm voice, hãy kiểm tra quyền Micro.');
        setRecordingIndex(null);
        setIsRecordingHandover(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (targetType === 'EVENT' && index !== null) {
            handleEventChange(index, 'note', elderEvents[index].note ? `${elderEvents[index].note} ${transcript}` : transcript);
          } else if (targetType === 'HANDOVER') {
            setHandoverNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setErrorMessage('Lỗi khởi chạy Microphone.');
    }
  };

  const handleAddEvent = () => {
    setElderEvents([...elderEvents, { elder_id: '', note: '' }]);
    setFieldErrors([...fieldErrors, { elder_id: false, note: false }]);
  };

  const handleRemoveEvent = (index) => {
    setElderEvents(elderEvents.filter((_, i) => i !== index));
    setFieldErrors(fieldErrors.filter((_, i) => i !== index));
  };

  const handleEventChange = (index, field, value) => {
    const updated = [...elderEvents];
    updated[index][field] = value;
    setElderEvents(updated);

    if (fieldErrors[index] && fieldErrors[index][field]) {
      const updatedErrors = [...fieldErrors];
      updatedErrors[index] = { ...updatedErrors[index], [field]: false };
      setFieldErrors(updatedErrors);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentFacId) {
      setErrorMessage('Vui lòng chọn cơ sở để thực hiện báo cáo!');
      return;
    }

    let hasValidationError = false;
    const errorsList = elderEvents.map((item) => {
      const isElderMissing = !item.elder_id;
      const isNoteMissing = !item.note.trim();

      if (isElderMissing || isNoteMissing) {
        hasValidationError = true;
      }

      return {
        elder_id: isElderMissing,
        note: isNoteMissing,
      };
    });

    if (hasValidationError) {
      setFieldErrors(errorsList);
      setErrorMessage('Vui lòng chọn tên NCT và nhập mô tả đầy đủ cho tất cả các dòng!');
      return;
    }

    setFieldErrors([]);

    onSubmitReport(
      {
        facility_id: Number(currentFacId),
        shift_date: new Date().toISOString().split('T')[0],
        shift_type: shiftType,
        elder_events: elderEvents,
        handover_notes: handoverNotes,
      },
      existingReport?.id
    );
  };

  const currentFacilityObj = facilitiesList.find((f) => Number(f.id) === Number(currentFacId));
  const currentFacilityName = currentFacilityObj?.name || (currentFacId ? `Cơ sở ID: ${currentFacId}` : 'Đang tải cơ sở...');

  return (
    <div className={styles.box} style={{ position: 'relative', border: existingReport ? '2px solid #d97706' : '2px solid #10b981' }}>
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '-16px',
            right: '16px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '800',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', marginLeft: '6px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER FORM */}
      <div className={styles.headerToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 className={styles.title} style={{ color: existingReport ? '#b45309' : '#065f46' }}>
            {existingReport ? 'HIỆU CHỈNH BÁO CÁO GIAO CA' : 'TẠO BÁO CÁO GIAO CA (ĐIỀU PHỐI)'}
          </h2>

          {/* VÙNG CHỌN / HIỂN THỊ CƠ SỞ */}
          {isMultiFacility ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>🏢 Cơ sở:</label>
              <select
                value={currentFacId || ''}
                onChange={(e) => handleFacilitySelect(e.target.value)}
                disabled={Boolean(existingReport) || facilitiesList.length === 0}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #0284c7',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  fontWeight: '800',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: existingReport ? 'not-allowed' : 'pointer',
                  opacity: existingReport ? 0.7 : 1,
                }}
              >
                {facilitiesList.length === 0 ? (
                  <option value="">Đang tải danh sách cơ sở...</option>
                ) : (
                  facilitiesList.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      🏢 {fac.name} {fac.total_elders ? `(${fac.total_elders} Cụ)` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '800',
              }}
            >
              🏢 {currentFacilityName}
            </span>
          )}

          {/* CHỌN CA TRỰC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>⏰ Ca:</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontWeight: '700',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="Sang">Ca Sáng</option>
              <option value="Toi">Ca Tối</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}
        >
          {isCollapsed ? 'Mở' : 'Thu gọn'}
        </button>
      </div>

      {!isCollapsed && (
        <form onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
            1. Các diễn biến trong ca:
          </label>
          
          {elderEvents.map((item, idx) => {
            const rowError = fieldErrors[idx] || {};

            return (
              <div key={idx} className={styles.eventRow}>
                {elderEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEvent(idx)}
                    className={styles.btnRemoveLeft}
                  >
                    ✕
                  </button>
                )}

                <SearchableElderSelect
                  eldersList={eldersList}
                  selectedElderId={item.elder_id}
                  selectedElderIds={allSelectedElderIds}
                  onSelect={(id) => handleEventChange(idx, 'elder_id', id)}
                  hasError={rowError.elder_id}
                />

                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={rowError.note ? '⚠️ Bắt buộc nhập diễn biến tại đây...' : 'Diễn biến trong ca...'}
                    value={item.note}
                    onChange={(e) => handleEventChange(idx, 'note', e.target.value)}
                    className={styles.inputNote}
                    style={{
                      paddingRight: '42px',
                      border: rowError.note ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: rowError.note ? '#fef2f2' : '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVoiceRecording('EVENT', idx)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: recordingIndex === idx ? '#ffe4e6' : '#f1f5f9',
                      border: recordingIndex === idx ? '1px solid #f43f5e' : '1px solid #cbd5e1',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '15px',
                      zIndex: 2,
                    }}
                  >
                    🎙️
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddEvent}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 'bold', fontSize: '12px', marginTop: '4px', cursor: 'pointer' }}
          >
            + Thêm ghi chú tiếp theo
          </button>

          <div style={{ marginTop: '14px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              2. Hướng xử lý / Lưu ý cho ca tiếp theo:
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                rows={3}
                placeholder="Ghi chú chung cho ca sau..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 44px 10px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => toggleVoiceRecording('HANDOVER')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  bottom: '12px',
                  background: isRecordingHandover ? '#ffe4e6' : '#f1f5f9',
                  border: isRecordingHandover ? '1px solid #f43f5e' : '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  zIndex: 2,
                }}
              >
                🎙️
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {existingReport && (
              <button
                type="button"
                onClick={onCancelEdit}
                style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              style={{ flex: 2, backgroundColor: existingReport ? '#d97706' : '#047857', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              {existingReport ? 'CẬP NHẬT CHỈNH SỬA' : 'HOÀN TẤT & GIAO CA'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};