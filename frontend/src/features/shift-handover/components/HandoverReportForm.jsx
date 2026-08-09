import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import styles from './HandoverReportForm.module.css';

const SearchableElderSelect = ({ eldersList, selectedElderId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedElder = eldersList.find((e) => e.id === selectedElderId);
  const filteredElders = eldersList.filter((e) => {
    const kw = searchTerm.toLowerCase().trim();
    return e.fullName.toLowerCase().includes(kw) || e.roomNumber.toString().includes(kw);
  });

  return (
    <div className={styles.customSelectContainer}>
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => setIsOpen(!isOpen)}
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
              <div style={{ padding: '6px', fontSize: '11px', color: '#94a3b8' }}>Không thấy</div>
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

export const HandoverReportForm = ({ facilityId, eldersList = [], existingReport = null, onSubmitReport, onCancelEdit }) => {
  const { user } = useContext(AuthContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elderEvents, setElderEvents] = useState([{ elder_id: '', note: '' }]);
  const [handoverNotes, setHandoverNotes] = useState('');
  
  const [recordingIndex, setRecordingIndex] = useState(null);
  const [isRecordingHandover, setIsRecordingHandover] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (existingReport) {
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
              note: noteText
            };
          }
          return { elder_id: '', note: line };
        });
        if (parsed.length > 0) setElderEvents(parsed);
      }
    }
  }, [existingReport, eldersList]);

  const toggleVoiceRecording = (targetType, index = null) => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      alert('⚠️ Trình duyệt di động bắt buộc kết nối HTTPS mới cho phép bật Micro!');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return alert('Trình duyệt trên điện thoại này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Google Chrome hoặc Safari mới nhất.');
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
        console.error('Lỗi Micro:', event.error);
        if (event.error === 'not-allowed') {
          alert('Bạn cần cấp quyền truy cập Micro cho ứng dụng trên điện thoại!');
        }
        setRecordingIndex(null);
        setIsRecordingHandover(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (targetType === 'EVENT' && index !== null) {
            setElderEvents((prev) => {
              const updated = [...prev];
              const oldText = updated[index].note || '';
              updated[index].note = oldText ? `${oldText} ${transcript}` : transcript;
              return updated;
            });
          } else if (targetType === 'HANDOVER') {
            setHandoverNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      alert('Không thể khởi động Micro, vui lòng thử lại!');
    }
  };

  const handleAddEvent = () => {
    setElderEvents([...elderEvents, { elder_id: '', note: '' }]);
  };

  const handleRemoveEvent = (index) => {
    setElderEvents(elderEvents.filter((_, i) => i !== index));
  };

  const handleEventChange = (index, field, value) => {
    const updated = [...elderEvents];
    updated[index][field] = value;
    setElderEvents(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validEvents = elderEvents.filter((item) => item.note.trim());
    
    if (validEvents.length === 0) {
      return alert('Vui lòng nhập nội dung diễn biến!');
    }

    // LẤY CƠ SỞ CHUẨN ĐA TẦNG (TỰ ĐỘNG LẤY THEO CỤ ĐƯỢC CHỌN NẾU THIẾU TÀI KHOẢN)
    const firstSelectedElder = eldersList.find(e => e.id === validEvents[0]?.elder_id);

    const rawFacilityId = 
      existingReport?.facility_id || 
      facilityId || 
      user?.facility_id || 
      user?.facilityId || 
      user?.facility?.id ||
      firstSelectedElder?.facilityId ||
      1; // Fallback an toàn về CS1 nếu hoàn toàn không tìm thấy

    const targetFacilityId = Number(rawFacilityId);

    onSubmitReport({
      facility_id: targetFacilityId,
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: "Sang",
      elder_events: validEvents,
      handover_notes: handoverNotes,
    }, existingReport?.id);
  };

  return (
    <div className={styles.box} style={{ border: existingReport ? '2px solid #d97706' : '2px solid #10b981' }}>
      <div className={styles.headerToggle} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 className={styles.title} style={{ color: existingReport ? '#b45309' : '#065f46' }}>
          {existingReport ? '✏️ HIỆU CHỈNH BÁO CÁO GIAO CA' : '📝 BÁO CÁO GIAO CA (ĐIỀU PHỐI)'}
        </h2>
        <button type="button" style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 'bold' }}>
          {isCollapsed ? 'Mở' : 'Thu gọn'}
        </button>
      </div>

      {!isCollapsed && (
        <form onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
            1. Các diễn biến trong ca:
          </label>
          {elderEvents.map((item, idx) => (
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
                onSelect={(id) => handleEventChange(idx, 'elder_id', id)}
              />

              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Diễn biến trong ca..."
                  value={item.note}
                  onChange={(e) => handleEventChange(idx, 'note', e.target.value)}
                  className={styles.inputNote}
                  style={{ paddingRight: '42px' }}
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
                    touchAction: 'manipulation'
                  }}
                >
                  {recordingIndex === idx ? '🔴' : '🎙️'}
                </button>
              </div>
            </div>
          ))}

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
                  touchAction: 'manipulation'
                }}
              >
                {isRecordingHandover ? '🔴' : '🎙️'}
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