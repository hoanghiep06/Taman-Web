import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { UI_COLORS } from '../../../utils/constants';
import axiosClient from '../../../api/axiosClient';

// ĐÃ SỬA: Đường dẫn import chính xác theo cấu trúc cây thư mục thực tế của bạn
import { OverviewTab } from '../components/OverviewTab';
import { RoomMatrixTab } from '../components/RoomMatrixTab';
import { GlobalHistoryTab } from '../components/GlobalHistoryTab';
import { SecurityLogsTab } from '../components/SecurityLogsTab';

export const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phân hệ Ma Trận Phòng Ốc States
  const [rooms, setRooms] = useState([]);
  const [elders, setElders] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [assetStatuses, setAssetStatuses] = useState({});
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Phân hệ Nhật Ký Tuần Tra States
  const [historyLogs, setHistoryData] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [searchOperator, setSearchOperator] = useState('');
  const [filterRoomNum, setFilterRoomNum] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Phân hệ Nhật Ký Xác Thực States
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Lightbox Modal hiển thị ảnh
  const [imageModal, setImageModal] = useState({ isOpen: false, url: '', assetName: '', isLoading: false });

  // REALTIME POLLING: Tự động cập nhật ngầm luồng dữ liệu tổng quan mỗi 5 giây
  const fetchDashboardRealtime = async (isSilent = false) => {
    try {
      const data = await dashboardApi.getDashboardData();
      setDashboardData(data);
    } catch (err) { 
      console.error("Lỗi đồng bộ dữ liệu Realtime:", err); 
    } finally { 
      if (!isSilent) setLoading(false); 
    }
  };

  useEffect(() => {
    fetchDashboardRealtime();
    const intervalId = setInterval(() => fetchDashboardRealtime(true), 5000); 
    return () => clearInterval(intervalId);
  }, []);

  // Điều phối nạp dữ liệu lazy-loading theo Tab hoạt động
  useEffect(() => {
    if (activeTab === 'room_details' && rooms.length === 0) loadRoomDetailsModule();
    else if (activeTab === 'global_history') loadHistoryModule(historyPage);
    else if (activeTab === 'security_logs') loadSecurityModule();
  }, [activeTab, historyPage, filterRoomNum, filterStatus]);

  const loadRoomDetailsModule = async () => {
    setLoadingAssets(true);
    try {
      const [roomsData, eldersData, assetsData, progressData] = await Promise.all([
        dashboardApi.getRooms(),
        dashboardApi.getElders(),
        dashboardApi.getAssets(),
        dashboardApi.getShiftProgress()
      ]);
      setRooms(roomsData); 
      setElders(eldersData); 
      setAllAssets(assetsData);
      if (roomsData.length > 0) setSelectedRoomId(roomsData[0].id);

      const statusMap = {};
      if (progressData) {
        progressData.checked?.forEach(item => statusMap[item.asset_id] = { status: 'Checked', log_id: item.log_id, time: item.inspected_at });
        progressData.reported_missing?.forEach(item => statusMap[item.asset_id] = { status: 'Missing', log_id: item.log_id, note: item.note, time: item.inspected_at });
        progressData.processing?.forEach(item => statusMap[item.asset_id] = { status: 'Processing', log_id: item.log_id, text: item.status_text });
        progressData.failed_upload?.forEach(item => statusMap[item.asset_id] = { status: 'Error', log_id: item.log_id, text: item.status_text });
      }
      setAssetStatuses(statusMap);
    } catch (err) { 
      console.error("Lỗi nạp thực thể phòng ốc:", err); 
    }
    setLoadingAssets(false);
  };

  const loadHistoryModule = async (page) => {
    setLoadingHistory(true);
    try {
      const params = { page, size: 12 };
      if (filterRoomNum) params.room_number = filterRoomNum;
      if (filterStatus) params.status_filter = filterStatus;
      
      const res = await dashboardApi.getInspectionHistory(params);
      let data = res.history_data;
      if (searchOperator.trim()) {
        data = data.filter(log => log.operator_name.toLowerCase().includes(searchOperator.toLowerCase()));
      }
      setHistoryData(data); 
      setHistoryTotalPages(res.pagination.total_pages);
    } catch (err) { 
      console.error("Lỗi trích xuất kho nhật ký:", err); 
    }
    setLoadingHistory(false);
  };

  const loadSecurityModule = async () => {
    setLoadingLogs(true);
    try {
      // Truyền tham số limit phân trang chuẩn theo Backend quy định
      const params = { limit: 30, skip: 0 }; 
      
      const res = await dashboardApi.getLoginLogs(params);
      
      // Backend trả về dạng mảng List[LoginLogResponse] trực tiếp nên gán thẳng luôn
      if (Array.isArray(res)) {
        setLoginLogs(res);
      } else if (res && res.history_data) {
        setLoginLogs(res.history_data);
      } else {
        setLoginLogs([]);
      }
    } catch (err) { 
      console.error("Lỗi kết nối cổng dữ liệu an ninh kiểm toán:", err);
      alert("Hệ thống không thể trích xuất nhật ký xác thực thiết bị đầu cuối.");
      setLoginLogs([]);
    }
    setLoadingLogs(false);
  };

  const handleViewImage = async (logId, assetName) => {
    setImageModal({ isOpen: true, url: '', assetName, isLoading: true });
    try {
      const response = await dashboardApi.getInspectionImage(logId);
      if (response.shareable_url) {
        const token = response.shareable_url.split('/').pop();
        const configuredBaseUrl = axiosClient.defaults.baseURL || '';
        let absoluteBaseUrl = configuredBaseUrl.startsWith('http') 
          ? configuredBaseUrl 
          : `${window.location.origin}${configuredBaseUrl.startsWith('/') ? '' : '/'}${configuredBaseUrl}`;
        
        setImageModal({ 
          isOpen: true, 
          url: `${absoluteBaseUrl.replace(/\/$/, "")}/inspections/public-view/${token}`, 
          assetName, 
          isLoading: false 
        });
      }
    } catch (err) { 
      alert("Không thể giải mã luồng ảnh Drive.");
      setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false }); 
    }
  };

  // Cấu trúc cây thư mục tài sản cục bộ gán theo phòng
  const groupedAssets = {};
  if (selectedRoomId && allAssets.length > 0) {
    allAssets.filter(a => a.room_id === selectedRoomId).forEach(asset => {
      const elderInfo = elders.find(e => e.id === asset.elder_id);
      const groupName = elderInfo ? `Cụm của ${elderInfo.full_name}` : "Tài sản chung của phòng";
      if (!groupedAssets[groupName]) groupedAssets[groupName] = [];
      groupedAssets[groupName].push(asset);
    });
  }

  if (loading) return <div style={styles.loading}>Đang thiết lập cổng giám sát trung tâm...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerArea}>
        <div>
          <h2 style={styles.pageTitle}>📊 Hệ Thống Giám Sát Trung Tâm (Tâm An)</h2>
          <p style={styles.pageSubtitle}>Dữ liệu đồng bộ trực tiếp từ thiết bị di động của nhân viên đi tuần</p>
        </div>
        <div style={styles.tabContainer}>
          <button style={activeTab === 'overview' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('overview')}>Ca Trực Hiện Tại</button>
          <button style={activeTab === 'room_details' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('room_details')}>Ma Trận Phòng Ốc</button>
          <button style={activeTab === 'global_history' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('global_history')}>Kho Nhật Ký Đi Tuần</button>
          <button style={activeTab === 'security_logs' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('security_logs')}>Bảo Mật & Thiết Bị</button>
        </div>
      </div>

      {/* RENDER CÁC PHÂN HỆ TÍNH NĂNG CON */}
      {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} />}
      
      {activeTab === 'room_details' && (
        <RoomMatrixTab 
          rooms={rooms} selectedRoomId={selectedRoomId} onSelectRoom={setSelectedRoomId} 
          loadingAssets={loadingAssets} groupedAssets={groupedAssets} 
          assetStatuses={assetStatuses} onViewImage={handleViewImage} 
        />
      )}
      
      {activeTab === 'global_history' && (
        <GlobalHistoryTab 
          historyLogs={historyLogs} loadingHistory={loadingHistory} 
          historyPage={historyPage} historyTotalPages={historyTotalPages} setHistoryPage={setHistoryPage} 
          searchOperator={searchOperator} setSearchOperator={setSearchOperator} 
          filterRoomNum={filterRoomNum} setFilterRoomNum={setFilterRoomNum} 
          filterStatus={filterStatus} setFilterStatus={setFilterStatus} 
          onTriggerFilter={() => loadHistoryModule(1)} 
          onViewImage={handleViewImage}
        />
      )}
      
      {activeTab === 'security_logs' && <SecurityLogsTab loginLogs={loginLogs} loadingLogs={loadingLogs} />}

      {/* Lightbox hiển thị file gốc */}
      {imageModal.isOpen && (
        <div style={styles.overlay} onClick={() => setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false })}>
          <div style={styles.lightbox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <h4 style={{ margin: 0, color: '#1E293B' }}>📷 Minh Chứng File Gốc: {imageModal.assetName}</h4>
              <button onClick={() => setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false })} style={styles.closeBtn}>✖</button>
            </div>
            <div style={styles.imageContainer}>
              {imageModal.isLoading ? <div style={{ color: '#64748B' }}>Đang giải mã dữ liệu Drive...</div> : <img src={imageModal.url} alt="Minh chứng" style={styles.previewImage} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: '10px' },
  headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '15px' },
  pageTitle: { margin: '0 0 4px 0', color: '#0F172A', fontSize: '22px', fontWeight: '800' },
  pageSubtitle: { margin: 0, color: '#64748B', fontSize: '13px' },
  tabContainer: { display: 'flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' },
  tabActive: { padding: '8px 16px', backgroundColor: '#FFF', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: '700', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' },
  tabInactive: { padding: '8px 16px', backgroundColor: 'transparent', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  lightbox: { backgroundColor: '#FFF', borderRadius: '16px', width: '90%', maxWidth: '480px', overflow: 'hidden' },
  lightboxHeader: { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', fontSize: '14px', color: '#94A3B8', cursor: 'pointer' },
  imageContainer: { padding: '16px', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'center', minHeight: '260px' },
  previewImage: { maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px' }
};