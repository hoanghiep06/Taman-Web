import React, { useState } from 'react';

export const ImportExcelModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      alert("Vui lòng chọn đúng định dạng file Excel (.xlsx)");
      e.target.value = null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    await onUpload(selectedFile);
    setIsUploading(false);
    setSelectedFile(null);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>📥 Nhập Dữ Liệu Bằng Excel</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.instruction}>
            Chuẩn bị file Excel theo định dạng ma trận (đánh TRUE/FALSE) để nạp dữ liệu nhanh chóng.
          </p>
          <div style={styles.uploadBox}>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} style={styles.fileInput} id="excel-upload" />
            <label htmlFor="excel-upload" style={styles.uploadLabel}>
              {selectedFile ? `📄 Đã chọn: ${selectedFile.name}` : '📁 Bấm vào đây để chọn file .xlsx'}
            </label>
          </div>
        </div>

        <div style={styles.footerActions}>
          <button onClick={onClose} style={styles.cancelBtn}>Hủy Bỏ</button>
          <button onClick={handleUpload} style={selectedFile ? styles.submitBtn : styles.disabledBtn} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Đang xử lý...' : 'Tải Lên Hệ Thống'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' },
  title: { margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' },
  body: { padding: '20px' },
  instruction: { fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' },
  fileInput: { display: 'none' },
  uploadLabel: { display: 'block', padding: '20px', border: '2px dashed #3B82F6', borderRadius: '8px', textAlign: 'center', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '600', cursor: 'pointer' },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #E2E8F0' },
  cancelBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 'bold' },
  submitBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#10B981', color: '#FFF', fontWeight: 'bold' },
  disabledBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#94A3B8', color: '#FFF', fontWeight: 'bold', cursor: 'not-allowed' }
};