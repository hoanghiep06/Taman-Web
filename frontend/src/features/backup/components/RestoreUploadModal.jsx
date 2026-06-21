import React, { useState } from 'react';

export const RestoreUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.sql')) {
      setSelectedFile(file);
    } else {
      alert("⚠️ Lỗi: Hệ thống chỉ chấp nhận tệp tin khôi phục định dạng .sql");
      e.target.value = null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    if (!window.confirm("⚠️ CẢNH BÁO TIỀN KHÔI PHỤC:\nHành động này sẽ ghi đè toàn bộ dữ liệu hiện tại bằng file bạn vừa tải lên. Hệ thống sẽ bị gián đoạn vài giây. Bạn chắc chắn chứ?")) return;

    setIsUploading(true);
    await onUpload(selectedFile);
    setIsUploading(false);
    setSelectedFile(null);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>📤 Tải Lên File Khôi Phục (.SQL)</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.instruction}>
            Vui lòng chọn file sao lưu định dạng <b>.sql</b> từ máy tính của bạn. Dữ liệu hiện tại sẽ được tự động snapshot bảo vệ trước khi ghi đè.
          </p>
          <div style={styles.uploadBox}>
            <input type="file" accept=".sql" onChange={handleFileChange} style={styles.fileInput} id="sql-upload" />
            <label htmlFor="sql-upload" style={styles.uploadLabel}>
              {selectedFile ? `📄 Đã chọn: ${selectedFile.name}` : '📁 Bấm vào đây để chọn file .sql'}
            </label>
          </div>
        </div>

        <div style={styles.footerActions}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={isUploading}>Hủy Bỏ</button>
          <button onClick={handleUpload} style={selectedFile ? styles.submitBtn : styles.disabledBtn} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Đang nạp dữ liệu...' : '⚡ Bắt Đầu Khôi Phục'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  title: { margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' },
  body: { padding: '24px' },
  instruction: { fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' },
  fileInput: { display: 'none' },
  uploadLabel: { display: 'block', padding: '20px', border: '2px dashed #0284C7', borderRadius: '8px', textAlign: 'center', backgroundColor: '#F0F9FF', color: '#0369A1', fontWeight: '600', cursor: 'pointer' },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #E2E8F0' },
  cancelBtn: { padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#F1F5F9', fontWeight: 'bold' },
  submitBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#0284C7', color: '#FFF', fontWeight: 'bold' },
  disabledBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#94A3B8', color: '#FFF', fontWeight: 'bold', cursor: 'not-allowed' }
};