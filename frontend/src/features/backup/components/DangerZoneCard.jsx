import React, { useState } from 'react';

export const DangerZoneCard = ({ onHardReset }) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    const confirm1 = window.confirm("🚨 CẢNH BÁO MỨC ĐỘ CAO NHẤT 🚨\nHành động này sẽ XÓA TRẮNG toàn bộ Database hiện hành và đưa hệ thống về trạng thái mới tinh. Bạn có chắc chắn?");
    if (!confirm1) return;

    const confirm2 = window.prompt("Gõ chữ 'XOA_DU_LIEU' để xác nhận thực thi lệnh Hard Reset:");
    if (confirm2 !== 'XOA_DU_LIEU') {
      alert("Đã hủy lệnh do mã xác nhận không khớp.");
      return;
    }

    setIsResetting(true);
    await onHardReset();
    setIsResetting(false);
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>⚠️ Khu Vực Nguy Hiểm (Danger Zone)</h3>
      <p style={styles.desc}>
        Các thao tác dưới đây có tính hủy diệt dữ liệu diện rộng. Chỉ sử dụng khi hệ thống bị lỗi không thể cứu vãn hoặc cần bàn giao cơ sở mới.
      </p>
      
      <div style={styles.actionRow}>
        <div>
          <h4 style={styles.actionTitle}>Xóa Trắng Hệ Thống (Hard Reset)</h4>
          <p style={styles.actionDesc}>Xóa mọi dữ liệu, khởi tạo lại cấu trúc bảng và khôi phục tài khoản <code>admin</code>.</p>
        </div>
        <button 
          style={styles.dangerBtn} 
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? 'ĐANG PHÁ HỦY & TÁI TẠO...' : '☠️ KÍCH HOẠT HARD RESET'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  card: { border: '1px solid #FECACA', backgroundColor: '#FEF2F2', borderRadius: '12px', padding: '24px', marginTop: '30px' },
  title: { margin: '0 0 10px 0', color: '#B91C1C', fontSize: '18px', fontWeight: '800' },
  desc: { margin: '0 0 20px 0', color: '#991B1B', fontSize: '14px' },
  actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #FCA5A5', paddingTop: '16px', flexWrap: 'wrap', gap: '16px' },
  actionTitle: { margin: '0 0 4px 0', color: '#7F1D1D', fontWeight: 'bold' },
  actionDesc: { margin: 0, color: '#991B1B', fontSize: '13px' },
  dangerBtn: { padding: '12px 20px', backgroundColor: '#DC2626', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)' }
};