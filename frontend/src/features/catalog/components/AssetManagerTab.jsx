import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { AssetFormModal } from './AssetFormModal';

export const AssetManagerTab = ({ refreshTrigger }) => {
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [elders, setElders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsData, roomsData, eldersData] = await Promise.all([
        catalogApi.getAssets(), catalogApi.getRooms(), catalogApi.getElders()
      ]);
      setAssets(assetsData); setRooms(roomsData); setElders(eldersData);
      setSelectedIds([]); 
    } catch (err) { console.error("Lỗi:", err); } 
    finally { setLoading(false); }
  };

  // Nạp lại data khi trang khởi tạo HOẶC khi Admin vừa upload file Excel xong
  useEffect(() => { fetchData(); }, [refreshTrigger]);

  // --- LOGIC XÓA HÀNG LOẠT ---
  const handleToggleCheck = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`⚠️ Xác nhận xóa vĩnh viễn ${selectedIds.length} tài sản đã chọn?`)) return;
    let successCount = 0, failCount = 0;

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await catalogApi.deleteAsset(id);
            successCount++;
          } catch (error) { failCount++; }
        })
      );
      if (failCount > 0) alert(`Đã xóa ${successCount} mục. \n❌ ${failCount} mục không thể xóa do kẹt lịch sử tuần tra.`);
      else alert(`Đã xóa thành công toàn bộ ${successCount} mục!`);
      
      setSelectedIds([]); fetchData();
    } catch (err) { alert('Có lỗi hệ thống xảy ra trong quá trình xóa.'); }
  };

  const handleOpenAdd = () => { setEditingAsset(null); setIsModalOpen(true); };
  const handleOpenEdit = (asset) => { setEditingAsset(asset); setIsModalOpen(true); };
  const handleSubmitForm = async (formData) => {
    try {
      if (editingAsset) await catalogApi.updateAsset(editingAsset.id, formData);
      else await catalogApi.createAsset(formData);
      setIsModalOpen(false); fetchData();
    } catch (error) { alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu'}`); }
  };
  const handleDelete = async (asset) => {
    if (!window.confirm(`⚠️ Xác nhận xóa: ${asset.asset_name}?`)) return;
    try { await catalogApi.deleteAsset(asset.id); fetchData(); } 
    catch (error) { alert('Tài sản đang kẹt trong lịch sử đi tuần!'); }
  };

  const filteredAssets = assets.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchName = a.asset_name.toLowerCase().includes(term);
    const elderOwner = elders.find(e => e.id === a.elder_id);
    const elderName = elderOwner ? elderOwner.full_name.toLowerCase() : "";
    return matchName || elderName.includes(term);
  });

  const groupedAssets = {};
  filteredAssets.forEach(asset => {
    const roomInfo = rooms.find(r => r.id === asset.room_id);
    const roomName = roomInfo ? `Phòng ${roomInfo.room_number}` : 'Lưu kho';
    if (!groupedAssets[roomName]) groupedAssets[roomName] = [];
    groupedAssets[roomName].push(asset);
  });

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Tìm tài sản hoặc Tên cụ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
        </div>
        {/* NÚT EXCEL ĐÃ ĐƯỢC CHUYỂN RA TRANG TỔNG */}
        <button style={styles.addBtn} onClick={handleOpenAdd}>+ Thêm Tài Sản Thủ Công</button>
      </div>

      {selectedIds.length > 0 && (
        <div style={styles.bulkActionRow}>
          <span>Đã chọn <b>{selectedIds.length}</b> tài sản</span>
          <button style={styles.bulkDeleteBtn} onClick={handleBulkDelete}>🗑️ Xóa Mục Đã Chọn</button>
        </div>
      )}

      {loading ? <div style={styles.loadingState}>Đang đồng bộ...</div> : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{...styles.th, width: '40px', textAlign: 'center'}}>#</th>
                <th style={styles.th}>Mã TS</th>
                <th style={styles.th}>Tên Tài Sản / Đặc điểm</th>
                <th style={styles.th}>Phân Bổ Sở Hữu</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedAssets).length > 0 ? (
                Object.keys(groupedAssets).sort().map(roomName => (
                  <React.Fragment key={roomName}>
                    <tr style={styles.groupHeaderRow}>
                      <td colSpan="5" style={styles.groupHeaderCell}>
                        🏠 {roomName} <span style={styles.countBadge}>{groupedAssets[roomName].length} món</span>
                      </td>
                    </tr>
                    {groupedAssets[roomName].map(asset => {
                      const elderOwner = elders.find(e => e.id === asset.elder_id);
                      const isChecked = selectedIds.includes(asset.id);
                      const isMismatch = elderOwner && elderOwner.room_id !== asset.room_id;
                      const correctRoom = isMismatch ? rooms.find(r => r.id === elderOwner.room_id) : null;

                      return (
                        <tr key={asset.id} style={isMismatch ? styles.trRowError : (isChecked ? styles.trRowSelected : styles.trRow)}>
                          <td style={styles.tdCheckbox}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheck(asset.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          </td>
                          <td style={styles.tdId}>TA-{asset.id}</td>
                          <td>
                            <div style={styles.tdBold}>{asset.asset_name}</div>
                            {isMismatch && <div style={styles.mismatchAlert}>⚠️ Cụ đã sang P.{correctRoom?.room_number || 'khác'}. Bấm Sửa để dời đồ theo!</div>}
                          </td>
                          <td style={styles.td}>
                            {elderOwner ? <span style={styles.ownerBadgePersonal}>👤 {elderOwner.full_name}</span> : <span style={styles.ownerBadgeShared}>🏢 Tài sản chung</span>}
                          </td>
                          <td style={styles.tdActions}>
                            <button style={styles.editBtn} onClick={() => handleOpenEdit(asset)}>✏️</button>
                            <button style={styles.deleteBtn} onClick={() => handleDelete(asset)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : <tr><td colSpan="5" style={styles.emptyState}>Không tìm thấy tài sản.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <AssetFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmitForm} initialData={editingAsset} rooms={rooms} elders={elders} />
    </div>
  );
};

// ... Các style giống hệt bên ElderManagerTab
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #94A3B8', borderRadius: '8px', padding: '0 12px', flex: 1, minWidth: '250px' },
  searchIcon: { fontSize: '14px', color: '#64748B', marginRight: '8px' },
  searchInput: { padding: '10px 0', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px', color: '#0F172A', width: '100%' },
  addBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  bulkActionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', padding: '10px 16px', borderRadius: '8px', border: '1px solid #BFDBFE' },
  bulkDeleteBtn: { padding: '8px 16px', backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '14px 16px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' },
  trRowSelected: { backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0' },
  trRowError: { borderBottom: '1px solid #FEE2E2', backgroundColor: '#FEF2F2' },
  tdCheckbox: { textAlign: 'center', verticalAlign: 'middle', padding: '14px 10px' },
  groupHeaderRow: { backgroundColor: '#EFF6FF' },
  groupHeaderCell: { padding: '10px 16px', fontWeight: '800', color: '#1E3A8A', borderBottom: '1px solid #BFDBFE' },
  countBadge: { backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', marginLeft: '8px' },
  tdId: { padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' },
  tdBold: { color: '#0F172A', fontWeight: '700', fontSize: '14px' },
  mismatchAlert: { marginTop: '6px', color: '#DC2626', fontSize: '11px', fontWeight: '700', backgroundColor: '#FEE2E2', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' },
  td: { padding: '14px 16px' },
  ownerBadgePersonal: { backgroundColor: '#FEFCE8', color: '#A16207', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #FEF08A' },
  ownerBadgeShared: { backgroundColor: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid #E2E8F0' },
  tdActions: { padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  editBtn: { padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  loadingState: { textAlign: 'center', padding: '60px', color: '#64748B' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic' }
};