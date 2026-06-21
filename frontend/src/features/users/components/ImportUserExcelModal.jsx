import React, { useState } from 'react';

export const ImportUserExcelModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
    } else {
      alert("Vui lòng chọn đúng định dạng file Excel (.xlsx hoặc .xls)");
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
          <h3 style={styles.title}>📥 Import Danh Sách Nhân Sự (Excel)</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.instructionBox}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1F4E78' }}>💡 Hướng dẫn định dạng file:</h4>
            <ul style={styles.list}>
              <li><b>Cột A (STT):</b> Có thể để trống hoặc đánh số thứ tự.</li>
              <li><b>Cột B (Họ Tên):</b> Nhập đầy đủ họ và tên nhân viên.</li>
              <li><b>Cột C (Số Điện Thoại):</b> Hệ thống sẽ dùng số này làm <b>Tên đăng nhập</b> và <b>Mật khẩu mặc định</b>. Chức vụ tự động gán là <b>Staff</b>.</li>
            </ul>
            <p style={{ margin: 0, color: '#E67E22', fontSize: '13px', fontStyle: 'italic' }}>
              * Nếu nhân viên đã tồn tại trong hệ thống, hệ thống sẽ tự động cập nhật lại Họ Tên.
            </p>
          </div>

          <div style={styles.uploadBox}>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
              style={styles.fileInput}
              id="user-excel-upload"
            />
            <label htmlFor="user-excel-upload" style={styles.uploadLabel}>
              {selectedFile ? `📄 Đã chọn: ${selectedFile.name}` : '📁 Bấm vào đây để chọn file Excel'}
            </label>
          </div>
        </div>

        <div style={styles.footerActions}>
          <button onClick={onClose} style={styles.cancelBtn}>Hủy Bỏ</button>
          <button 
            onClick={handleUpload} 
            style={selectedFile ? styles.submitBtn : styles.disabledBtn} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Đang xử lý...' : 'Bắt Đầu Đồng Bộ'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#FFF', width: '100%', maxWidth: '550px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #EAECEE', backgroundColor: '#F8F9F9' },
  title: { margin: 0, fontSize: '18px', color: '#1F4E78', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#7F8C8D' },
  body: { padding: '20px' },
  instructionBox: { backgroundColor: '#F0F8FF', padding: '15px', borderRadius: '8px', border: '1px solid #D6EAF8', marginBottom: '20px' },
  list: { paddingLeft: '20px', margin: '0 0 10px 0', fontSize: '14px', color: '#34495E', lineHeight: '1.6' },
  fileInput: { display: 'none' },
  uploadLabel: { display: 'block', padding: '20px', border: '2px dashed #3498DB', borderRadius: '8px', textAlign: 'center', backgroundColor: '#EBF5FB', color: '#2980B9', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #EAECEE', backgroundColor: '#F8F9F9' },
  cancelBtn: { padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#BDC3C7', color: '#FFF', fontWeight: 'bold' },
  submitBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#1F4E78', color: '#FFF', fontWeight: 'bold' },
  disabledBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#95A5A6', color: '#FFF', fontWeight: 'bold', cursor: 'not-allowed' }
};