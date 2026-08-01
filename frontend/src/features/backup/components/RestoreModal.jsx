import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { TabBar } from '../../../components/TabBar';
import { FileUploadBox } from '../../../components/FileUploadBox';
import styles from './RestoreModal.module.css';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024,
    sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isSqlFile = (file) => file.name.endsWith('.sql');

const METHOD_TABS = [
  { key: 'file', label: '📁 Tải File Từ Máy (.sql)' },
  { key: 'drive', label: '☁️ Dùng Google Drive ID' },
];

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

  const handleSubmit = async () => {
    if (method === 'file' && !selectedFile) return;
    if (method === 'drive' && !driveId.trim()) return;

    if (
      !window.confirm(
        '⚠️ CẢNH BÁO TIỀN KHÔI PHỤC:\nHành động này sẽ ghi đè toàn bộ dữ liệu hiện hành. Hệ thống sẽ tự động tạo một bản sao lưu an toàn trước khi ghi đè, tuy nhiên quá trình này sẽ làm gián đoạn hệ thống vài giây. Bạn có chắc chắn muốn tiếp tục?'
      )
    )
      return;

    setIsProcessing(true);
    try {
      if (method === 'file') {
        await onRestoreFile(selectedFile);
      } else {
        await onRestoreDrive(driveId);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit = (method === 'file' && selectedFile) || (method === 'drive' && driveId.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ Khôi Phục Dữ Liệu Hệ Thống"
      footer={
        <>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isProcessing}>
            Hủy Bỏ
          </button>
          <button
            onClick={handleSubmit}
            className={canSubmit ? styles.submitBtn : styles.disabledBtn}
            disabled={isProcessing || !canSubmit}
          >
            {isProcessing ? '⏳ Đang xử lý khôi phục...' : '⚡ Bắt Đầu Khôi Phục'}
          </button>
        </>
      }
    >
      <TabBar tabs={METHOD_TABS} activeKey={method} onChange={setMethod} variant="segmented" />

      <div className={styles.contentArea}>
        {method === 'file' && (
          <div>
            <p className={styles.instruction}>
              Vui lòng chọn file sao lưu định dạng <b>.sql</b> từ máy tính của bạn.
            </p>
            <FileUploadBox
              id="sql-upload"
              accept=".sql"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              validate={isSqlFile}
              invalidMessage="Hệ thống chỉ chấp nhận tệp tin khôi phục định dạng .sql"
              placeholder="📥 Bấm vào đây để chọn file .sql"
            />
          </div>
        )}

        {method === 'drive' && (
          <div>
            <p className={styles.instruction}>
              Chọn một bản sao lưu từ danh sách hoặc dán trực tiếp File ID trên Drive vào đây.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Chọn từ danh sách có sẵn:</label>
              <select value={driveId} onChange={(e) => setDriveId(e.target.value)} className={styles.select}>
                <option value="">-- Bấm vào đây để chọn bản sao lưu --</option>
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatBytes(b.size)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Hoặc dán thủ công File ID:</label>
              <input
                type="text"
                value={driveId}
                onChange={(e) => setDriveId(e.target.value)}
                placeholder="VD: 1BvX_9A4kLmN0pQ..."
                className={styles.input}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};