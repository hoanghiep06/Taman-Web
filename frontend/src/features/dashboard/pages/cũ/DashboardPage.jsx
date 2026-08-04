import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { buildImageUrl } from '../../../utils/imageUtils';

import { OverviewTab } from '../components/OverviewTab';
import { RoomMatrixTab } from '../components/RoomMatrixTab';
import { GlobalHistoryTab } from '../components/GlobalHistoryTab';
import { SecurityLogsTab } from '../components/SecurityLogsTab';
import { ShiftHistoryTab } from '../components/ShiftHistoryTab';
import { AuditGalleryModal } from '../components/AuditGalleryModal';

import { TabBar } from '../../../components/TabBar';
import { Modal } from '../../../components/Modal';
import styles from './DashboardPage.module.css';

const TABS = [
  { key: 'overview', label: 'Ca Trực Hiện Tại' },
  { key: 'room_details', label: 'Ma Trận Phòng Ốc' },
  { key: 'shift_history', label: '📋 Lịch Sử Ca Trực' },
  { key: 'global_history', label: 'Nhật Ký Quét Ảnh' },
  { key: 'security_logs', label: 'Bảo Mật & Thiết Bị' },
];

export const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const [auditModal, setAuditModal] = useState({
    isOpen: false,
    shiftInfo: null,
    samples: [],
    totalFound: 0,
    isLoading: false,
    currentLimit: 6,
  });

  const fetchDashboardRealtime = async (isSilent = false) => {
    try {
      const [data, progress] = await Promise.all([dashboardApi.getDashboardData(), dashboardApi.getShiftProgress()]);
      setDashboardData(data);
      setShiftProgressLive(progress);
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu Realtime:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardRealtime();
    const intervalId = setInterval(() => fetchDashboardRealtime(true), 5000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .catch((err) => console.error(err))
        .finally(() => setLoadingAssets(false));
    }

    if (activeTab === 'global_history') {
      loadTimelineHistory(historyPage);
    }

    if (activeTab === 'security_logs') {
      setLoadingLogs(true);
      dashboardApi
        .getLoginLogs({ page: 1, size: 30 })
        .then((res) => setLoginLogs(res.login_logs || res || []))
        .catch((err) => console.error(err))
        .finally(() => setLoadingLogs(false));
    }

    if (activeTab === 'shift_history') {
      loadShiftHistoryModule(shiftCurrentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        data = data.filter((log) => log.operator_name.toLowerCase().includes(searchOperator.toLowerCase()));
      }
      setHistoryData(data);
      setHistoryTotalPages(res.pagination?.total_pages || 1);
    } catch (err) {
      console.error(err);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activeTab === 'global_history') loadTimelineHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRoomNum, filterStatus]);

  useEffect(() => {
    if (selectedRoomId) {
      dashboardApi.getShiftProgress().then((progressData) => {
        const statusMap = {};
        if (progressData) {
          progressData.checked?.forEach((item) => (statusMap[item.asset_id] = { status: 'Checked', log_id: item.log_id, time: item.inspected_at }));
          progressData.reported_missing?.forEach(
            (item) => (statusMap[item.asset_id] = { status: 'Missing', log_id: item.log_id, note: item.note, time: item.inspected_at })
          );
          progressData.processing?.forEach((item) => (statusMap[item.asset_id] = { status: 'Processing', log_id: item.log_id, text: item.status_text }));
          progressData.failed_upload?.forEach((item) => (statusMap[item.asset_id] = { status: 'Error', log_id: item.log_id, text: item.status_text }));
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
    } catch (err) {
      console.error(err);
    }
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
      alert('Hệ thống không thể kết xuất báo cáo bất thường.');
    }
    setLoadingAnomalyReport(false);
  };

  const handleTriggerShiftAudit = async (customLimit = 4) => {
    setAuditModal((prev) => ({ ...prev, isOpen: true, isLoading: true, currentLimit: customLimit }));
    try {
      const response = await dashboardApi.getRandomAudit({ limit: customLimit });

      const sanitizedSamples = (response.audit_samples || []).map((sample) => {
        if (sample.temporary_shareable_url) {
          sample.temporary_shareable_url = buildImageUrl(sample.temporary_shareable_url);
        }
        return sample;
      });

      setAuditModal((prev) => ({
        ...prev,
        shiftInfo: response.shift_info,
        samples: sanitizedSamples,
        totalFound: response.total_unique_images_found || 0,
        isLoading: false,
      }));
    } catch (err) {
      console.error('Lỗi trích xuất kho ảnh kiểm tra:', err);
      alert('⚠️ Không thể tải kho ảnh thanh tra ngẫu nhiên.');
      setAuditModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const handleViewImage = async (logId, assetName) => {
    setImageModal({ isOpen: true, url: '', assetName, isLoading: true });
    try {
      const response = await dashboardApi.getInspectionImage(logId);
      if (response.shareable_url) {
        setImageModal({ isOpen: true, url: buildImageUrl(response.shareable_url), assetName, isLoading: false });
      }
    } catch (err) {
      alert('Không thể giải mã luồng ảnh Drive.');
      setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false });
    }
  };

  const groupedAssets = {};
  if (selectedRoomId && allAssets.length > 0) {
    allAssets
      .filter((a) => a.room_id === selectedRoomId)
      .forEach((asset) => {
        const elderInfo = elders.find((e) => e.id === asset.elder_id);
        const groupName = elderInfo ? `Cụm của ${elderInfo.full_name}` : 'Tài sản chung của phòng';
        if (!groupedAssets[groupName]) groupedAssets[groupName] = [];
        groupedAssets[groupName].push(asset);
      });
  }

  if (loading) return <div className={styles.loading}>Đang thiết lập cổng giám sát trung tâm...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div>
          <h2 className={styles.pageTitle}>📊 Hệ Thống Giám Sát Trung Tâm (Tâm An)</h2>
          <p className={styles.pageSubtitle}>Dữ liệu đồng bộ trực tiếp từ thiết bị di động của nhân viên đi tuần</p>
        </div>

        <TabBar
          tabs={TABS}
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'shift_history') setShiftCurrentPage(1);
          }}
          variant="segmented"
        />
      </div>

      {activeTab === 'overview' && (
        <OverviewTab dashboardData={dashboardData} shiftProgressLive={shiftProgressLive} onOpenAudit={() => handleTriggerShiftAudit(4)} />
      )}

      {activeTab === 'room_details' && (
        <RoomMatrixTab
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          loadingAssets={loadingAssets}
          groupedAssets={groupedAssets}
          assetStatuses={assetStatuses}
          onViewImage={handleViewImage}
        />
      )}

      {activeTab === 'shift_history' && (
        <ShiftHistoryTab
          shifts={shiftHistoryList}
          pagination={shiftPagination}
          loadingHistory={loadingShiftHistory}
          currentPage={shiftCurrentPage}
          onPageChange={(p) => setShiftCurrentPage(p)}
          filterDate={filterDate}
          onDateChange={setFilterDate}
          onTriggerFilter={() => loadShiftHistoryModule(1)}
          filterShiftType={filterShiftType}
          onShiftTypeChange={setFilterShiftType}
          selectedShiftId={selectedShiftId}
          activeReport={activeAnomalyReport}
          loadingReport={loadingAnomalyReport}
          onSelectShift={handleSelectShiftAndLoadReport}
        />
      )}

      {activeTab === 'global_history' && (
        <GlobalHistoryTab
          historyLogs={historyLogs}
          loadingHistory={loadingHistory}
          historyPage={historyPage}
          historyTotalPages={historyTotalPages}
          setHistoryPage={setHistoryPage}
          searchOperator={searchOperator}
          setSearchOperator={setSearchOperator}
          filterRoomNum={filterRoomNum}
          setFilterRoomNum={setFilterRoomNum}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onTriggerFilter={() => loadTimelineHistory(1)}
          onViewImage={handleViewImage}
        />
      )}

      {activeTab === 'security_logs' && <SecurityLogsTab loginLogs={loginLogs} loadingLogs={loadingLogs} />}

      <AuditGalleryModal
        isOpen={auditModal.isOpen}
        onClose={() => setAuditModal((prev) => ({ ...prev, isOpen: false, samples: [] }))}
        shiftInfo={auditModal.shiftInfo}
        auditSamples={auditModal.samples}
        totalFound={auditModal.totalFound}
        onRefreshRandom={() => handleTriggerShiftAudit(auditModal.currentLimit)}
        isLoading={auditModal.isLoading}
      />

      {/* Lightbox ảnh gốc — dùng Modal chung thay vì tự viết overlay riêng */}
      <Modal
        isOpen={imageModal.isOpen}
        onClose={() => setImageModal({ isOpen: false, url: '', assetName: '', isLoading: false })}
        title={`📷 Minh Chứng File Gốc: ${imageModal.assetName}`}
        size="sm"
      >
        <div className={styles.imageContainer}>
          {imageModal.isLoading ? (
            <div className={styles.imageLoadingText}>Đang giải mã dữ liệu Drive...</div>
          ) : (
            <img src={imageModal.url} alt="Minh chứng" className={styles.previewImage} />
          )}
        </div>
      </Modal>
    </div>
  );
};