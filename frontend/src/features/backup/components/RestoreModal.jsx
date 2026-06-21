import React, { useState, useEffect } from 'react';

export const RestoreModal = ({ isOpen, onClose, onRestoreFile, onRestoreDrive, backups = [], initialDriveId = null }) => {
  const [method, setMethod] = useState('file'); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [driveId, setDriveId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialDriveId) {
        setMethod('drive');
        setDriveId(initialDriveId);
      } else {
        setMethod('file');
        setDriveId('');
      }
      setSelectedFile(null);
      setIsProcessing(false);
    }
  }, [isOpen, initialDriveId]);

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

  const handleSubmit = async () => {
    if (method === 'file' && !selectedFile) return;
    if (method === 'drive' && !driveId.trim()) return;
    
    if (!window.confirm("⚠️ CẢNH BÁO TIỀN KHÔI PHỤC:\nHành động này sẽ ghi đè toàn bộ dữ liệu hiện hành. Hệ thống sẽ tự động tạo một bản sao lưu an toàn trước khi ghi đè, tuy nhiên quá trình này sẽ làm gián đoạn hệ thống vài giây. Bạn có chắc chắn muốn tiếp tục?")) return;

    setIsProcessing(true);
    if (method === 'file') {
      await onRestoreFile(selectedFile);
    } else {
      await onRestoreDrive(driveId);
    }
    setIsProcessing(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>⚡ Khôi Phục Dữ Liệu Hệ Thống</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.methodToggle}>
            <button 
              style={method === 'file' ? styles.tabActive : styles.tabInactive}
              onClick={() => setMethod('file')}
            >
              📁 Tải File Từ Máy (.sql)
            </button>
            <button 
              style={method === 'drive' ? styles.tabActive : styles.tabInactive}
              onClick={() => setMethod('drive')}
            >
              ☁️ Dùng Google Drive ID
            </button>
          </div>

          <div style={styles.contentArea}>
            {method === 'file' && (
              <div style={styles.fadeAnim}>
                <p style={styles.instruction}>Vui lòng chọn file sao lưu định dạng <b>.sql</b> từ máy tính của bạn.</p>
                <input type="file" accept=".sql" onChange={handleFileChange} style={styles.fileInput} id="sql-upload" />
                <label htmlFor="sql-upload" style={styles.uploadLabel}>
                  {selectedFile ? `📄 Đã chọn: ${selectedFile.name}` : '📥 Bấm vào đây để chọn file .sql'}
                </label>
              </div>
            )}

            {method === 'drive' && (
              <div style={styles.fadeAnim}>
                <p style={styles.instruction}>Chọn một bản sao lưu từ danh sách hoặc dán trực tiếp File ID trên Drive vào đây.</p>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Chọn từ danh sách có sẵn:</label>
                  
                  {/* Ô SELECT ĐÃ ĐƯỢC ÉP STYLE CHỐNG MỜ */}
                  <select 
                    value={driveId} 
                    onChange={(e) => setDriveId(e.target.value)} 
                    style={styles.select}
                  >
                    <option value="" style={styles.placeholderOption}>-- Bấm vào đây để chọn bản sao lưu --</option>
                    {backups.map(b => (
                      <option key={b.id} value={b.id} style={styles.itemOption}>
                        {b.name} ({formatBytes(b.size)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Hoặc dán thủ công File ID:</label>
                  <input 
                    type="text" 
                    value={driveId} 
                    onChange={(e) => setDriveId(e.target.value)} 
                    placeholder="VD: 1BvX_9A4kLmN0pQ..." 
                    style={styles.input} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.footerActions}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={isProcessing}>Hủy Bỏ</button>
          <button 
            onClick={handleSubmit} 
            style={(method === 'file' && selectedFile) || (method === 'drive' && driveId) ? styles.submitBtn : styles.disabledBtn} 
            disabled={isProcessing || (method === 'file' && !selectedFile) || (method === 'drive' && !driveId.trim())}
          >
            {isProcessing ? '⏳ Đang xử lý khôi phục...' : '⚡ Bắt Đầu Khôi Phục'}
          </button>
        </div>
      </div>
    </div>
  );
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '550px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  title: { margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8', fontWeight: 'bold' },
  body: { padding: '24px' },
  
  methodToggle: { display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '4px', marginBottom: '20px' },
  tabActive: { flex: 1, padding: '10px', backgroundColor: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'all 0.2s' },
  tabInactive: { flex: 1, padding: '10px', backgroundColor: 'transparent', border: 'none', fontWeight: '600', color: '#64748B', cursor: 'pointer', transition: 'all 0.2s' },
  
  contentArea: { minHeight: '160px' },
  instruction: { fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' },
  fileInput: { display: 'none' },
  uploadLabel: { display: 'block', padding: '30px 20px', border: '2px dashed #0284C7', borderRadius: '8px', textAlign: 'center', backgroundColor: '#F0F9FF', color: '#0369A1', fontWeight: '600', cursor: 'pointer' },
  
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' },

  // 🔴 ĐÃ FIX BỘ STYLE CHỐNG MỜ CHÓI CHO INPUT & SELECT:
  select: { 
    width: '100%', 
    padding: '11px 14px', 
    borderRadius: '8px', 
    border: '1px solid #64748B', // Viền xám đậm rõ ràng
    fontSize: '14px', 
    fontWeight: '700', // Chữ bên trong select hiển thị in đậm
    color: '#0F172A',  // Màu đen tuyền xám chì
    backgroundColor: '#FFFFFF', 
    outline: 'none', 
    cursor: 'pointer' 
  },
  placeholderOption: { color: '#64748B', fontWeight: 'normal' },
  itemOption: { color: '#0F172A', fontWeight: '600', padding: '6px 0' },

  input: { 
    width: '100%', 
    padding: '11px 14px', 
    borderRadius: '8px', 
    border: '1px solid #64748B', 
    fontSize: '14px', 
    fontWeight: '600', 
    color: '#0F172A', 
    backgroundColor: '#FFFFFF', 
    outline: 'none', 
    boxSizing: 'border-box',
    fontFamily: 'monospace' // Phông chữ chuyên biệt để soi ID mã vạch
  },
  
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' },
  cancelBtn: { padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#E2E8F0', color: '#475569', fontWeight: 'bold' },
  submitBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#0284C7', color: '#FFF', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' },
  disabledBtn: { padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#94A3B8', color: '#FFF', fontWeight: 'bold', cursor: 'not-allowed' },
  fadeAnim: { animation: 'fadeIn 0.2s ease-in-out' }
};