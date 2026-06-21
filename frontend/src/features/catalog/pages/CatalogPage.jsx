import React, { useState } from 'react';
import { catalogApi } from '../api/catalogApi';

import { RoomManagerTab } from '../components/RoomManagerTab';
import { ElderManagerTab } from '../components/ElderManagerTab';
import { AssetManagerTab } from '../components/AssetManagerTab';
import { ImportExcelModal } from '../components/ImportExcelModal';

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
      setRefreshTrigger(prev => prev + 1); // Báo hiệu cho các tab bên dưới reload
    } catch (err) {
      alert(`Lỗi khi đọc Excel: ${err.response?.data?.detail || 'Vui lòng kiểm tra lại định dạng file'}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerArea}>
        <div>
          <h2 style={styles.pageTitle}>🗂️ Quản Lý Danh Mục (Catalog)</h2>
          <p style={styles.pageSubtitle}>Thiết lập và quản lý hạ tầng phòng ốc, hồ sơ lưu trú và danh mục vật tư</p>
        </div>
        
        {/* ĐÃ CHỈNH SỬA LẠI LAYOUT GÓC PHẢI THEO HÌNH BẠN VẼ */}
        <div style={styles.headerRight}>
          <div style={styles.tabContainer}>
            <button style={activeTab === 'rooms' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('rooms')}>
              🏠 Khu Vực & Phòng
            </button>
            <button style={activeTab === 'elders' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('elders')}>
              👵 Hồ Sơ Lưu Trú
            </button>
            <button style={activeTab === 'assets' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('assets')}>
              📦 Danh Mục Vật Tư
            </button>
          </div>
          
          {/* NÚT IMPORT EXCEL ĐẶT CẠNH TABS (TOÀN CỤC) */}
          <button style={styles.globalImportBtn} onClick={() => setIsExcelModalOpen(true)}>
            📥 Import Excel (NCT & Vật Tư)
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'rooms' && <RoomManagerTab />}
        {activeTab === 'elders' && <ElderManagerTab refreshTrigger={refreshTrigger} />}
        {activeTab === 'assets' && <AssetManagerTab refreshTrigger={refreshTrigger} />}
      </div>

      {/* MODAL IMPORT EXCEL ĐƯỢC CHUYỂN RA NGOÀI CÙNG */}
      <ImportExcelModal 
        isOpen={isExcelModalOpen} 
        onClose={() => setIsExcelModalOpen(false)} 
        onUpload={handleExcelUpload} 
      />
    </div>
  );
};

const styles = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: '10px' },
  headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '15px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { margin: '0 0 6px 0', color: '#0F172A', fontSize: '24px', fontWeight: '800' },
  pageSubtitle: { margin: 0, color: '#64748B', fontSize: '14px' },
  
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' },
  tabContainer: { display: 'flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' },
  tabActive: { padding: '10px 18px', backgroundColor: '#FFFFFF', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: '700', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: '14px' },
  tabInactive: { padding: '10px 18px', backgroundColor: 'transparent', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  
  globalImportBtn: { padding: '10px 16px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' },
  contentArea: { backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', minHeight: '65vh', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }
};  