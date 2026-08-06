import React, { useState } from 'react';
import styles from './HandoverReportForm.module.css';

// Component Con: Dòng chọn Cụ có tích hợp ô gõ tìm kiếm bên trong Dropdown
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
        {selectedElder ? `P.${selectedElder.roomNumber} - ${selectedElder.fullName}` : '🔍 Chọn Cụ...'}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <input
            type="text"
            placeholder="Gõ tên/phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInputInside}
            autoFocus
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
                  P.{elder.roomNumber} - {elder.fullName}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const HandoverReportForm = ({ facilityId, eldersList = [], onSubmitReport }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elderEvents, setElderEvents] = useState([{ elder_id: '', note: '' }]);
  const [handoverNotes, setHandoverNotes] = useState('');

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
    const validEvents = elderEvents.filter((item) => item.elder_id && item.note.trim());
    
    if (validEvents.length === 0) {
      return alert('Vui lòng chọn ít nhất 1 Cụ và điền diễn biến!');
    }

    onSubmitReport({
      facility_id: facilityId || 1,
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: "Sang",
      elder_events: validEvents,
      handover_notes: handoverNotes,
    });
  };

  return (
    <div className={styles.box}>
      <div className={styles.headerToggle} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 className={styles.title}>📋 BÁO CÁO GIAO CA (ĐIỀU PHỐI)</h2>
        <button type="button" style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 'bold' }}>
          {isCollapsed ? '➕ Mở rộng' : '➖ Thu gọn'}
        </button>
      </div>

      {!isCollapsed && (
        <form onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
            1. Các diễn biến/sự cố của từng Cụ trong ca:
          </label>

          {elderEvents.map((item, idx) => (
            <div key={idx} className={styles.eventRow}>
              {/* Nút Xóa bên TRÁI */}
              {elderEvents.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(idx)}
                  className={styles.btnRemoveLeft}
                >
                  ✕
                </button>
              )}

              {/* Khối Custom Search-Select Đã Gộp Liền Khối */}
              <SearchableElderSelect
                eldersList={eldersList}
                selectedElderId={item.elder_id}
                onSelect={(id) => handleEventChange(idx, 'elder_id', id)}
              />

              {/* Ô Nhập diễn biến */}
              <input
                type="text"
                placeholder="Mô tả diễn biến trong ca..."
                value={item.note}
                onChange={(e) => handleEventChange(idx, 'note', e.target.value)}
                className={styles.inputNote}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddEvent}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 'bold', fontSize: '12px', marginTop: '4px', cursor: 'pointer' }}
          >
            + Thêm dòng ghi chú Cụ tiếp theo
          </button>

          <div style={{ marginTop: '14px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              2. Hướng xử lý / Lưu ý cho ca tiếp theo:
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú chung cho ca sau..."
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', backgroundColor: '#047857', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: 'none', marginTop: '12px', cursor: 'pointer' }}
          >
            🔒 CHỐT & GỬI BÁO CÁO GIAO CA
          </button>
        </form>
      )}
    </div>
  );
};