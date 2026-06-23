import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import axiosClient from '../../../api/axiosClient';

import { OverviewTab } from '../components/OverviewTab';
import { RoomMatrixTab } from '../components/RoomMatrixTab';
import { GlobalHistoryTab } from '../components/GlobalHistoryTab';
import { SecurityLogsTab } from '../components/SecurityLogsTab';
import { ShiftHistoryTab } from '../components/ShiftHistoryTab';

export const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔴 BỔ SUNG STATE: Lưu trữ danh sách bóc tách chi tiết đồ vật live cho Tab Tổng Quan
  const [shiftProgressLive, setShiftProgressLive] = useState(null);

  // 1. Phân hệ Ma Trận Phòng Ốc States
  const [rooms, setRooms] = useState([]);
  const [elders, setElders] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [assetStatuses, setAssetStatuses] = useState({});
  const [loadingAssets, setLoadingAssets] = useState(false);

  // 2. Phân hệ Nhật Ký Tuần Tra States
  const [historyLogs, setHistoryData] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [searchOperator, setSearchOperator] = useState('');
  const [filterRoomNum, setFilterRoomNum] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 3. Phân hệ Nhật Ký Xác Thực States
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 4. Phân hệ Nhật Ký Ca Trực
  const [shiftHistoryList, setShiftHistoryList] = useState([]);
  const [shiftPagination, setShiftPagination] = useState({ total_records: 0, total_pages: 1 });
  const [shiftCurrentPage, setShiftCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState(''); 
  const [loadingShiftHistory, setLoadingShiftHistory] = useState(false);
  const [filterShiftType, setFilterShiftType] = useState('');
  
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [activeAnomalyReport, setActiveAnomalyReport] = useState(null);
  const [loadingAnomalyReport, setLoadingAnomalyReport] = useState(false);
  
  const [imageModal, setImageModal] = useState({ isOpen: false, url: '', assetName: '', isLoading: false });

  // 🔴 ĐÃ CẢI TIẾN LUỒNG POLLING: Kéo song song cả thông số tổng và danh sách chi tiết live mỗi 5s
  const fetchDashboardRealtime = async (isSilent = false) => {
    try {
      const [data, progress] = await Promise.all([
        dashboardApi.getDashboardData(),
        dashboardApi.getShiftProgress() // Chọc thẳng dependency lấy dữ liệu chi tiết
      ]);
      setDashboardData(data);
      setShiftProgressLive(progress);
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

  useEffect(() => {
    if (activeTab === 'overview') return;
    
    if (activeTab === 'room_details') {
      setLoadingAssets(true);
      Promise.all([dashboardApi.getRooms(), dashboardApi.getElders(), dashboardApi.getAssets()])
        .then(([rRes, eRes, aRes]) => {
          setRooms(rRes);
          setElders(eRes);
          setAllAssets(aRes);
          if (rRes.length > 0 && !selectedRoomId) setSelectedRoomId(rRes[0].id);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingAssets(false));
    }
    
    if (activeTab === 'global_history') {
      loadTimelineHistory(historyPage);
    }
    
    if (activeTab === 'security_logs') {
      setLoadingLogs(true);
      dashboardApi.getLoginLogs({ page: 1, size: 30 })
        .then(res => setLoginLogs(res.login_logs || res || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingLogs(false));
    }
    
    if (activeTab === 'shift_history') {
      loadShiftHistoryModule(shiftCurrentPage);
    }
  }, [activeTab, selectedRoomId, historyPage, shiftCurrentPage]);

  const loadTimelineHistory = async (page) => {
    setLoadingHistory(true);
    try {
      const params = { page, size: 15 };
      if (filterRoomNum) params.room_number = filterRoomNum;
      if (filterStatus) params.status_filter = filterStatus;
      const res = await dashboardApi.getInspectionHistory(params);
      
      let data = res.history_data || [];
      if (searchOperator.trim()) {
        data = data.filter(log => log.operator_name.toLowerCase().includes(searchOperator.toLowerCase()));
      }
      setHistoryData(data);
      setHistoryTotalPages(res.pagination?.total_pages || 1);
    } catch (err) { console.error(err); }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activeTab === 'global_history') loadTimelineHistory(1);
  }, [filterRoomNum, filterStatus]);

  useEffect(() => {
    if (selectedRoomId) {
      dashboardApi.getShiftProgress().then(progressData => {
        const statusMap = {};
        if (progressData) {
          progressData.checked?.forEach(item => statusMap[item.asset_id] = { status: 'Checked', log_id: item.log_id, time: item.inspected_at });
          progressData.reported_missing?.forEach(item => statusMap[item.asset_id] = { status: 'Missing', log_id: item.log_id, note: item.note, time: item.inspected_at });
          progressData.processing?.forEach(item => statusMap[item.asset_id] = { status: 'Processing', log_id: item.log_id, text: item.status_text });
          progressData.failed_upload?.forEach(item => statusMap[item.asset_id] = { status: 'Error', log_id: item.log_id, text: item.status_text });
        }
        setAssetStatuses(statusMap);
      });
    }
  }, [selectedRoomId]);

  const loadShiftHistoryModule = async (page) => {
    setLoadingShiftHistory(true);
    try {
      const params = { page, size: 10 };
      if (filterDate) params.target_date = filterDate; 
      if (filterShiftType) params.shift_type = filterShiftType;
      const res = await dashboardApi.getHistoricalShifts(params);
      setShiftHistoryList(res.shifts_data || []);
      setShiftPagination(res.pagination || { total_records: 0, total_pages: 1 });
    } catch (err) { console.error(err); }
    setLoadingShiftHistory(false);
  };

  const handleSelectShiftAndLoadReport = async (shiftId) => {
    setSelectedShiftId(shiftId);
    setLoadingAnomalyReport(true);
    try {
      const res = await dashboardApi.getShiftAnomalyReport({ shift_id: shiftId });
      setActiveAnomalyReport(res);
    } catch (err) {
      console.error(err);
      alert("Hệ thống không thể kết xuất báo cáo bất thường.");
    }
    setLoadingAnomalyReport(false);
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
        
        setImageModal({ isOpen: true, url: `${absoluteBaseUrl.replace(/\/$/, "")}/inspections/public-view/${token}`, assetName, isLoading: false });
      }
    } catch (err) { 
      alert("Không thể giải mã luồng ảnh Drive.");
      setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false }); 
    }
  };

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
          <button style={activeTab === 'shift_history' ? styles.tabActive : styles.tabInactive} onClick={() => { setActiveTab('shift_history'); setShiftCurrentPage(1); }}>📋 Lịch Sử Ca Trực</button>
          <button style={activeTab === 'global_history' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('global_history')}>Nhật Ký Quét Ảnh</button>
          <button style={activeTab === 'security_logs' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('security_logs')}>Bảo Mật & Thiết Bị</button>
        </div>
      </div>

      {/* RENDER KHU VỰC CÁC PHÂN HỆ TÍNH NĂNG CON BIỆT LẬP */}
      {/* 🔴 ĐÃ CHUYỂN PHÁT: Truyền thêm data bóc tách chi tiết live vào OverviewTab */}
      {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} shiftProgressLive={shiftProgressLive} />}
      
      {activeTab === 'room_details' && (
        <RoomMatrixTab 
          rooms={rooms} selectedRoomId={selectedRoomId} onSelectRoom={setSelectedRoomId} 
          loadingAssets={loadingAssets} groupedAssets={groupedAssets} 
          assetStatuses={assetStatuses} onViewImage={handleViewImage} 
        />
      )}

      {activeTab === 'shift_history' && (
        <ShiftHistoryTab 
          shifts={shiftHistoryList} pagination={shiftPagination} loadingHistory={loadingShiftHistory}
          currentPage={shiftCurrentPage} onPageChange={(p) => setShiftCurrentPage(p)}
          filterDate={filterDate} onDateChange={setFilterDate} onTriggerFilter={() => loadShiftHistoryModule(1)}
          filterShiftType={filterShiftType} onShiftTypeChange={setFilterShiftType} 
          selectedShiftId={selectedShiftId} activeReport={activeAnomalyReport} loadingReport={loadingAnomalyReport}
          onSelectShift={handleSelectShiftAndLoadReport}
        />
      )}
      
      {activeTab === 'global_history' && (
        <GlobalHistoryTab 
          historyLogs={historyLogs} loadingHistory={loadingHistory} 
          historyPage={historyPage} historyTotalPages={historyTotalPages} setHistoryPage={setHistoryPage} 
          searchOperator={searchOperator} setSearchOperator={setSearchOperator} 
          filterRoomNum={filterRoomNum} setFilterRoomNum={setFilterRoomNum} 
          filterStatus={filterStatus} setFilterStatus={setFilterStatus} 
          onTriggerFilter={() => loadTimelineHistory(1)} onViewImage={handleViewImage}
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