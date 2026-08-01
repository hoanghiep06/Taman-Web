import { useState } from 'react';
import { Modal } from './Modal';
import { FileUploadBox } from './FileUploadBox';
import styles from './ImportDataModal.module.css';

const isExcelFile = (file) =>
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.name.endsWith('.xlsx') ||
  file.name.endsWith('.xls');

/**
 * Modal nhập dữ liệu từ Excel — dùng chung cho mọi nơi cần import (Danh mục, Nhân sự...).
 * Thay thế cho ImportExcelModal.jsx + ImportUserExcelModal.jsx (2 bản gần như giống hệt nhau).
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {(file: File) => Promise<void>} onUpload
 * @param {string} title
 * @param {React.ReactNode} [instructions] - Nội dung hướng dẫn định dạng file, tùy biến theo nơi dùng
 * @param {string} [accept='.xlsx, .xls']
 * @param {string} inputId - id duy nhất cho input file (bắt buộc để không đụng nhau khi có nhiều modal)
 * @param {string} [submitLabel='Tải Lên Hệ Thống']
 * @param {string} [uploadPlaceholder]
 */
export const ImportDataModal = ({
  isOpen,
  onClose,
  onUpload,
  title,
  instructions,
  accept = '.xlsx, .xls',
  inputId,
  submitLabel = 'Tải Lên Hệ Thống',
  uploadPlaceholder,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isUploading}>
            Hủy Bỏ
          </button>
          <button
            onClick={handleUpload}
            className={selectedFile ? styles.submitBtn : styles.disabledBtn}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Đang xử lý...' : submitLabel}
          </button>
        </>
      }
    >
      {instructions && <div className={styles.instructionBox}>{instructions}</div>}
      <FileUploadBox
        id={inputId}
        accept={accept}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        validate={isExcelFile}
        invalidMessage={`Vui lòng chọn đúng định dạng file Excel (${accept})`}
        placeholder={uploadPlaceholder || `📁 Bấm vào đây để chọn file ${accept.split(',')[0].trim()}`}
      />
    </Modal>
  );
};