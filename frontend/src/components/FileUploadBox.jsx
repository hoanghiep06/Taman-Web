import styles from './FileUploadBox.module.css';

/**
 * Ô upload file kiểu "bấm để chọn", dùng chung cho ImportDataModal, RestoreModal...
 *
 * @param {string} id - id duy nhất cho input (bắt buộc, dùng để label liên kết đúng input)
 * @param {string} accept - vd: ".xlsx, .xls" hoặc ".sql"
 * @param {File|null} selectedFile
 * @param {(file: File) => void} onFileSelect
 * @param {(file: File) => boolean} [validate] - trả về false nếu file không hợp lệ
 * @param {string} [invalidMessage]
 * @param {string} [placeholder]
 */
export const FileUploadBox = ({
  id,
  accept,
  selectedFile,
  onFileSelect,
  validate,
  invalidMessage = 'Định dạng file không hợp lệ.',
  placeholder = '📁 Bấm vào đây để chọn file',
}) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (validate && !validate(file)) {
      alert(`⚠️ ${invalidMessage}`);
      e.target.value = null;
      return;
    }
    onFileSelect(file);
  };

  return (
    <div>
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className={styles.fileInput}
        id={id}
      />
      <label htmlFor={id} className={styles.uploadLabel}>
        {selectedFile ? `📄 Đã chọn: ${selectedFile.name}` : placeholder}
      </label>
    </div>
  );
};