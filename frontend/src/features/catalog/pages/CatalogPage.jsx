import React, { useState } from 'react';
import { catalogApi } from '../api/catalogApi';

import { RoomManagerTab } from '../components/RoomManagerTab';
import { ElderManagerTab } from '../components/ElderManagerTab';
import { AssetManagerTab } from '../components/AssetManagerTab';
import { ImportDataModal } from '../../../components/ImportDataModal'; // <-- DÙNG COMPONENT CHUNG
import { TabBar } from '../../../components/TabBar'; // <-- DÙNG COMPONENT CHUNG
import styles from './CatalogPage.module.css';

const TABS = [
  { key: 'rooms', label: '🏠 Khu Vực & Phòng' },
  { key: 'elders', label: '👵 Hồ Sơ Lưu Trú' },
  { key: 'assets', label: '📦 Danh Mục Vật Tư' },
];

export const CatalogPage = () => {
  const [activeTab, setActiveTab] = useState('rooms');

  // States cho tính năng Import Excel toàn cục
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Dùng để ép các Tab con tải lại data

  const handleExcelUpload = async (file) => {
    try {
      await catalogApi.importExcel(file);
      alert('Đã xử lý xong file Excel và cập nhật dữ liệu toàn hệ thống!');
      setIsExcelModalOpen(false);
      setRefreshTrigger((prev) => prev + 1); // Báo hiệu cho các tab bên dưới reload
    } catch (err) {
      alert(`Lỗi khi đọc Excel: ${err.response?.data?.detail || 'Vui lòng kiểm tra lại định dạng file'}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div>
          <h2 className={styles.pageTitle}>🗂️ Quản Lý Danh Mục (Catalog)</h2>
          <p className={styles.pageSubtitle}>
            Thiết lập và quản lý hạ tầng phòng ốc, hồ sơ lưu trú và danh mục vật tư
          </p>
        </div>

        <div className={styles.headerRight}>
          <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} variant="segmented" />

          {/* NÚT IMPORT EXCEL ĐẶT CẠNH TABS (TOÀN CỤC) */}
          <button className={styles.globalImportBtn} onClick={() => setIsExcelModalOpen(true)}>
            📥 Import Excel (NCT & Vật Tư)
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'rooms' && <RoomManagerTab />}
        {activeTab === 'elders' && <ElderManagerTab refreshTrigger={refreshTrigger} />}
        {activeTab === 'assets' && <AssetManagerTab refreshTrigger={refreshTrigger} />}
      </div>

      {/* MODAL IMPORT EXCEL DÙNG COMPONENT CHUNG, THAY CHO ImportExcelModal RIÊNG (ĐÃ XÓA) */}
      <ImportDataModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onUpload={handleExcelUpload}
        title="📥 Nhập Dữ Liệu Bằng Excel"
        inputId="catalog-excel-upload"
        submitLabel="Tải Lên Hệ Thống"
        instructions={
          <p>Chuẩn bị file Excel theo định dạng ma trận (đánh TRUE/FALSE) để nạp dữ liệu nhanh chóng.</p>
        }
      />
    </div>
  );
};