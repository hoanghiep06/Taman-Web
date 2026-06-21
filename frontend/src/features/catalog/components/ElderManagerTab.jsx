import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { ElderFormModal } from './ElderFormModal';

export const ElderManagerTab = ({ refreshTrigger }) => {
  const [elders, setElders] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElder, setEditingElder] = useState(null);
  
  // STATE CHO CHECKBOX XÓA NHIỀU
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eldersData, roomsData] = await Promise.all([catalogApi.getElders(), catalogApi.getRooms()]);
      setElders(eldersData); setRooms(roomsData);
      setSelectedIds([]); // Reset select khi reload
    } catch (err) { console.error("Lỗi tải dữ liệu Hồ sơ:", err); } 
    finally { setLoading(false); }
  };

  // Nạp lại data khi trang khởi tạo HOẶC khi Admin vừa upload file Excel xong
  useEffect(() => { fetchData(); }, [refreshTrigger]);

  // --- LOGIC XÓA HÀNG LOẠT ---
  const handleToggleCheck = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`⚠️ Xác nhận xóa ${selectedIds.length} hồ sơ Cụ? Đồ đạc của Cụ có thể bị ảnh hưởng.`)) return;
    
    let successCount = 0, failCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await catalogApi.deleteElder(id);
            successCount++;
          } catch (error) { failCount++; }
        })
      );
      if (failCount > 0) alert(`Xóa thành công ${successCount} cụ. \n❌ Có ${failCount} cụ không thể xóa do đang kẹt ca trực.`);
      else alert(`Đã xóa thành công ${successCount} cụ!`);
      
      setSelectedIds([]); fetchData();
    } catch (err) { alert('Có lỗi hệ thống xảy ra trong quá trình xóa.'); }
  };

  // --- CRUD LẺ MỘT MỤC ---
  const handleOpenAdd = () => { setEditingElder(null); setIsModalOpen(true); };
  const handleOpenEdit = (elder) => { setEditingElder(elder); setIsModalOpen(true); };
  
  const handleSubmitForm = async (formData) => {
    try {
      if (editingElder) await catalogApi.updateElder(editingElder.id, formData);
      else await catalogApi.createElder(formData);
      setIsModalOpen(false); fetchData();
    } catch (error) { alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu'}`); }
  };

  const handleDelete = async (elder) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa hồ sơ Cụ ${elder.full_name}?`)) return;
    try { await catalogApi.deleteElder(elder.id); fetchData(); } 
    catch (error) { alert('Không thể xóa: Hồ sơ đang bị ràng buộc với các ca tuần tra!'); }
  };

  const filteredElders = elders.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedElders = {};
  filteredElders.forEach(elder => {
    const roomInfo = rooms.find(r => r.id === elder.room_id);
    const groupName = roomInfo ? `Phòng ${roomInfo.room_number}` : 'Khu vực chờ xếp phòng';
    if (!groupedElders[groupName]) groupedElders[groupName] = [];
    groupedElders[groupName].push(elder);
  });

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Tìm kiếm theo Tên cụ hoặc ghi chú..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
        </div>
        <button style={styles.addBtn} onClick={handleOpenAdd}>+ Thêm Hồ Sơ Cụ Mới</button>
      </div>

      {/* THANH ACTION XÓA NHIỀU */}
      {selectedIds.length > 0 && (
        <div style={styles.bulkActionRow}>
          <span>Đã chọn <b>{selectedIds.length}</b> hồ sơ cụ</span>
          <button style={styles.bulkDeleteBtn} onClick={handleBulkDelete}>🗑️ Xóa Các Hồ Sơ Đã Chọn</button>
        </div>
      )}

      {loading ? <div style={styles.loadingState}>Đang đồng bộ hồ sơ lưu trú...</div> : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: '10%' }}>ID</th>
                <th style={{ ...styles.th, width: '30%' }}>Họ và Tên Cụ</th>
                <th style={{ ...styles.th, width: '35%' }}>Ghi Chú Đặc Biệt</th>
                <th style={{ ...styles.th, width: '20%', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedElders).length > 0 ? (
                Object.keys(groupedElders).sort().map(roomName => (
                  <React.Fragment key={roomName}>
                    <tr style={styles.groupHeaderRow}>
                      <td colSpan="5" style={styles.groupHeaderCell}>
                        🏠 {roomName} <span style={styles.countBadge}>{groupedElders[roomName].length} Cụ</span>
                      </td>
                    </tr>
                    {groupedElders[roomName].map(elder => {
                      const isChecked = selectedIds.includes(elder.id);
                      return (
                        <tr key={elder.id} style={isChecked ? styles.trRowSelected : styles.trRow}>
                          <td style={styles.tdCheckbox}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheck(elder.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          </td>
                          <td style={styles.tdId}>#{elder.id}</td>
                          <td style={styles.tdBold}>👵 {elder.full_name}</td>
                          <td style={styles.tdDesc}>{elder.notes || '-'}</td>
                          <td style={styles.tdActions}>
                            <button style={styles.editBtn} onClick={() => handleOpenEdit(elder)}>✏️</button>
                            <button style={styles.deleteBtn} onClick={() => handleDelete(elder)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : <tr><td colSpan="5" style={styles.emptyState}>Không tìm thấy hồ sơ Cụ nào.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <ElderFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmitForm} initialData={editingElder} rooms={rooms} />
    </div>
  );
};

// ... Các style giống hệt bên tab Assets
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
  tdCheckbox: { textAlign: 'center', verticalAlign: 'middle', padding: '14px 10px' },
  groupHeaderRow: { backgroundColor: '#EFF6FF' },
  groupHeaderCell: { padding: '10px 16px', fontWeight: '800', color: '#1E3A8A', borderBottom: '1px solid #BFDBFE' },
  countBadge: { backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', marginLeft: '8px' },
  tdId: { padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' },
  tdBold: { padding: '14px 16px', color: '#0F172A', fontWeight: '700', fontSize: '14px' },
  tdDesc: { padding: '14px 16px', color: '#475569', fontStyle: 'italic' },
  tdActions: { padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  editBtn: { padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  loadingState: { textAlign: 'center', padding: '60px', color: '#64748B', fontSize: '14px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic' }
};