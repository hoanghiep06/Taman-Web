import React, { useState, useEffect, useContext } from 'react';
import { usersApi } from '../api/usersApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { CreateUserModal } from '../components/CreateUserModal';
import { ImportUserExcelModal } from '../components/ImportUserExcelModal'; // <-- IMPORT MODAL MỚI
import { ROLES } from '../../../utils/constants';
import { UserHistoryModal } from '../components/UserHistoryModal';

export const UserManagementPage = () => {
  const { user } = useContext(AuthContext);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quản lý trạng thái 2 Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const loadUsers = async () => {
    try {
      const data = await usersApi.getAllUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Lỗi lấy danh sách tài khoản:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (newUserData) => {
    try {
      await usersApi.createUser(newUserData);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Khởi tạo tài khoản thất bại!');
    }
  };

  // ──── HÀM XỬ LÝ IMPORT EXCEL ────
  const handleExcelUpload = async (file) => {
    try {
      const response = await usersApi.importUsersExcel(file);
      // Backend của bạn trả về object có chứa summary
      const summary = response.summary;
      alert(`✅ Đồng bộ thành công!\n\n- Đã tạo mới: ${summary.total_new_staff_created} tài khoản\n- Đã cập nhật: ${summary.total_existing_staff_updated} nhân sự.`);
      setIsExcelModalOpen(false);
      loadUsers(); // Tải lại danh sách nhân sự ngay lập tức
    } catch (err) {
      alert(`❌ Lỗi khi tải file: ${err.response?.data?.detail || 'Vui lòng kiểm tra định dạng file!'}`);
    }
  };

  const handleToggleLock = async (targetUser) => {
    if (targetUser.username === 'admin') {
      alert('Không thể tác động lên tài khoản admin gốc tối cao!');
      return;
    }
    try {
      await usersApi.toggleLockUser(targetUser.id);
      loadUsers();
    } catch (err) {
      alert('Thao tác thất bại!');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'admin') {
      alert('Không thể xóa tài khoản biệt lập admin gốc!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản [${targetUser.username}]?`)) {
      try {
        await usersApi.deleteUser(targetUser.id);
        loadUsers();
      } catch (err) {
        alert('Không thể xóa tài khoản này!');
      }
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
  });

  if (loading) return <div style={styles.loadingText}>Đang nạp dữ liệu nhân sự cơ sở...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.actionBar}>
        <div>
          <h2 style={styles.pageTitle}>Quản Lý Nhân Sự Hệ Thống</h2>
          <p style={styles.pageSubtitle}>Xem danh sách, phân quyền và điều phối tài khoản vận hành</p>
        </div>
        
        <div style={styles.actionRight}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên, tài khoản, chức vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          {/* NÚT IMPORT EXCEL */}
          <button onClick={() => setIsExcelModalOpen(true)} style={styles.importBtn}>
            📥 Import Excel
          </button>
          
          {/* NÚT THÊM THỦ CÔNG */}
          <button onClick={() => setIsCreateModalOpen(true)} style={styles.addBtn}>
            ➕ Thêm Nhân Sự
          </button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Họ và Tên</th>
              <th style={styles.th}>Tên Đăng Nhập</th>
              <th style={styles.th}>Chức Vụ</th>
              <th style={styles.th}>Trạng Thái</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Hành Động Độc Quyền</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((targetUser) => {
                const isTargetAdmin = targetUser.role === ROLES.ADMIN;
                const isCurrentManager = user?.role === ROLES.MANAGER;
                const isActionBlocked = isCurrentManager && isTargetAdmin;

                return (
                  <tr key={targetUser.id} style={styles.trRow}>
                    <td style={styles.tdBold}>{targetUser.full_name}</td>
                    <td style={styles.td}><code>{targetUser.username}</code></td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        backgroundColor: targetUser.role === ROLES.ADMIN ? '#E74C3C' : targetUser.role === ROLES.MANAGER ? '#3498DB' : '#2ECC71'
                      }}>
                        {targetUser.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: targetUser.is_active ? '#27AE60' : '#95A5A6', fontWeight: 'bold' }}>
                        {targetUser.is_active ? '● Đang hoạt động' : '🔒 Đang khóa'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {isActionBlocked ? (
                        <span style={styles.blockedBadge}>Khóa chỉnh sửa</span>
                      ) : (
                        <div style={styles.btnGroup}>
                          {/* NÚT XEM LỊCH SỬ MỚI THÊM */}
                          <button 
                            onClick={() => {
                              setSelectedHistoryUser(targetUser);
                              setIsHistoryModalOpen(true);
                            }} 
                            style={{ ...styles.actionBtn, backgroundColor: '#3498DB' }}
                          >
                            🕒 Lịch Sử
                          </button>

                          <button 
                            onClick={() => handleToggleLock(targetUser)} 
                            style={{ ...styles.actionBtn, backgroundColor: targetUser.is_active ? '#F39C12' : '#27AE60' }}
                            disabled={targetUser.username === 'admin'}
                          >
                            {targetUser.is_active ? 'Khóa' : 'Mở'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(targetUser)} 
                            style={{ ...styles.actionBtn, backgroundColor: '#E74C3C' }}
                            disabled={targetUser.username === 'admin'}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={styles.emptyState}>
                  Không tìm thấy nhân sự nào khớp với từ khóa "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NHÚNG 2 MODALS */}
      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSave={handleCreateUser}
        currentUserRole={user?.role}
      />
      
      <ImportUserExcelModal 
        isOpen={isExcelModalOpen} 
        onClose={() => setIsExcelModalOpen(false)} 
        onUpload={handleExcelUpload} 
      />

      <UserHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        user={selectedHistoryUser} 
      />
      
    </div>
  );
};

// Đã bổ sung style cho nút import
const styles = {
  container: { padding: '30px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  loadingText: { textAlign: 'center', marginTop: '50px', color: '#7F8C8D', fontWeight: '500' },
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
  pageTitle: { margin: 0, color: '#1F4E78', fontSize: '24px', fontWeight: '800' },
  pageSubtitle: { margin: '5px 0 0 0', color: '#7F8C8D', fontSize: '14px' },
  actionRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '12px', color: '#95A5A6', fontSize: '14px' },
  searchInput: { padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #BDC3C7', fontSize: '14px', width: '250px', outline: 'none', transition: 'border 0.3s' },
  
  importBtn: { padding: '10px 18px', backgroundColor: '#27AE60', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.3s' },
  addBtn: { padding: '10px 18px', backgroundColor: '#1F4E78', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.3s' },
  
  tableWrapper: { backgroundColor: '#FFF', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { backgroundColor: '#F8F9F9', borderBottom: '2px solid #EAECEE' },
  th: { padding: '15px 20px', color: '#34495E', textAlign: 'left', fontSize: '14px', fontWeight: '700' },
  trRow: { borderBottom: '1px solid #F2F4F4', transition: 'background-color 0.2s' },
  td: { padding: '15px 20px', fontSize: '14px', color: '#2C3E50' },
  tdBold: { padding: '15px 20px', fontSize: '14px', color: '#1A252F', fontWeight: '600' },
  roleBadge: { color: '#FFF', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  btnGroup: { display: 'flex', justifyContent: 'center', gap: '8px' },
  actionBtn: { padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#FFF' },
  blockedBadge: { backgroundColor: '#F4F6F6', color: '#7F8C8D', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #D5D8DC', fontStyle: 'italic' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#95A5A6', fontStyle: 'italic', fontSize: '15px' }
};