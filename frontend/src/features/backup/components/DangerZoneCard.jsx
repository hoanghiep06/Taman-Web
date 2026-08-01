import React, { useState } from 'react';
import styles from './DangerZoneCard.module.css';

export const DangerZoneCard = ({ onHardReset }) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    const confirm1 = window.confirm(
      '🚨 CẢNH BÁO MỨC ĐỘ CAO NHẤT 🚨\nHành động này sẽ XÓA TRẮNG toàn bộ Database hiện hành và đưa hệ thống về trạng thái mới tinh. Bạn có chắc chắn?'
    );
    if (!confirm1) return;

    const confirm2 = window.prompt("Gõ chữ 'XOA_DU_LIEU' để xác nhận thực thi lệnh Hard Reset:");
    if (confirm2 !== 'XOA_DU_LIEU') {
      alert('Đã hủy lệnh do mã xác nhận không khớp.');
      return;
    }

    setIsResetting(true);
    await onHardReset();
    setIsResetting(false);
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>⚠️ Khu Vực Nguy Hiểm (Danger Zone)</h3>
      <p className={styles.desc}>
        Các thao tác dưới đây có tính hủy diệt dữ liệu diện rộng. Chỉ sử dụng khi hệ thống bị lỗi không thể cứu vãn
        hoặc cần bàn giao cơ sở mới.
      </p>

      <div className={styles.actionRow}>
        <div>
          <h4 className={styles.actionTitle}>Xóa Trắng Hệ Thống (Hard Reset)</h4>
          <p className={styles.actionDesc}>
            Xóa mọi dữ liệu, khởi tạo lại cấu trúc bảng và khôi phục tài khoản <code>admin</code>.
          </p>
        </div>
        <button className={styles.dangerBtn} onClick={handleReset} disabled={isResetting}>
          {isResetting ? 'ĐANG PHÁ HỦY & TÁI TẠO...' : '☠️ KÍCH HOẠT HARD RESET'}
        </button>
      </div>
    </div>
  );
};