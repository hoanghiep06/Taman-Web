import React, { useState, useEffect, useContext } from 'react';
import { usersApi } from '../api/usersApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { CreateUserModal } from '../components/CreateUserModal';
import { ImportDataModal } from '../../../components/ImportDataModal';
import { UserHistoryModal } from '../components/UserHistoryModal';
import { ROLES } from '../../../utils/constants';
import styles from './UserManagementPage.module.css';

export const UserManagementPage = () => {
  const { user } = useContext(AuthContext);
  const [usersList, setUsersList]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen]   = useState(false);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen]   = useState(false);

  const loadUsers = async () => {
    try {
      setUsersList(await usersApi.getAllUsers());
    } catch (err) {
      console.error('Lỗi lấy danh sách tài khoản:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (data) => {
    try {
      await usersApi.createUser(data);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Khởi tạo tài khoản thất bại!');
    }
  };

  const handleExcelUpload = async (file) => {
    try {
      const { summary } = await usersApi.importUsersExcel(file);
      alert(`✅ Đồng bộ thành công!\n\n- Đã tạo mới: ${summary.total_new_staff_created} tài khoản\n- Đã cập nhật: ${summary.total_existing_staff_updated} nhân sự.`);
      setIsExcelModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(`❌ Lỗi khi tải file: ${err.response?.data?.detail || 'Vui lòng kiểm tra định dạng file!'}`);
    }
  };

  const handleToggleLock = async (targetUser) => {
    if (targetUser.username === 'admin') { alert('Không thể tác động lên tài khoản admin gốc!'); return; }
    try { await usersApi.toggleLockUser(targetUser.id); loadUsers(); }
    catch { alert('Thao tác thất bại!'); }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'admin') { alert('Không thể xóa tài khoản admin gốc!'); return; }
    if (!window.confirm(`Xóa vĩnh viễn tài khoản [${targetUser.username}]?`)) return;
    try { await usersApi.deleteUser(targetUser.id); loadUsers(); }
    catch { alert('Không thể xóa tài khoản này!'); }
  };

  const filteredUsers = usersList.filter(({ full_name, username, role }) => {
    const q = searchQuery.toLowerCase();
    return full_name.toLowerCase().includes(q) || username.toLowerCase().includes(q) || role.toLowerCase().includes(q);
  });

  // Helper: role badge className
  const roleBadgeClass = (role) => {
    if (role === ROLES.ADMIN)   return styles.roleAdmin;
    if (role === ROLES.MANAGER) return styles.roleManager;
    return styles.roleStaff;
  };

  if (loading) return <div className={styles.loadingText}>Đang nạp dữ liệu nhân sự...</div>;

  return (
    <div className={styles.container}>
      {/* Thanh tiêu đề + công cụ */}
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.pageTitle}>Quản Lý Nhân Sự Hệ Thống</h2>
          <p className={styles.pageSubtitle}>Xem danh sách, phân quyền và điều phối tài khoản vận hành</p>
        </div>

        <div className={styles.actionRight}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên, tài khoản, chức vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm nhân sự"
            />
          </div>
          <button onClick={() => setIsExcelModalOpen(true)} className={styles.importBtn}>📥 Import Excel</button>
          <button onClick={() => setIsCreateModalOpen(true)} className={styles.addBtn}>➕ Thêm Nhân Sự</button>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Họ và Tên</th>
                <th className={styles.th}>Tên Đăng Nhập</th>
                <th className={styles.th}>Chức Vụ</th>
                <th className={styles.th}>Trạng Thái</th>
                <th className={styles.thCenter}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((targetUser) => {
                  const isActionBlocked = user?.role === ROLES.MANAGER && targetUser.role === ROLES.ADMIN;

                  return (
                    <tr key={targetUser.id} className={styles.tr}>
                      <td className={styles.tdBold}>{targetUser.full_name}</td>
                      <td className={styles.td}><span className={styles.username}>{targetUser.username}</span></td>
                      <td className={styles.td}>
                        <span className={roleBadgeClass(targetUser.role)}>{targetUser.role}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={targetUser.is_active ? styles.statusActive : styles.statusLocked}>
                          {targetUser.is_active ? '● Đang hoạt động' : '🔒 Đang khóa'}
                        </span>
                      </td>
                      <td className={styles.tdCenter}>
                        {isActionBlocked ? (
                          <span className={styles.blockedBadge}>Khóa chỉnh sửa</span>
                        ) : (
                          <div className={styles.btnGroup}>
                            <button
                              className={styles.btnHistory}
                              onClick={() => { setSelectedHistoryUser(targetUser); setIsHistoryModalOpen(true); }}
                            >🕒 Lịch Sử</button>
                            <button
                              className={targetUser.is_active ? styles.btnLock : styles.btnUnlock}
                              onClick={() => handleToggleLock(targetUser)}
                              disabled={targetUser.username === 'admin'}
                            >
                              {targetUser.is_active ? 'Khóa' : 'Mở'}
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() => handleDeleteUser(targetUser)}
                              disabled={targetUser.username === 'admin'}
                            >Xóa</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Không tìm thấy nhân sự nào khớp với từ khóa "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateUser}
        currentUserRole={user?.role}
      />
      <ImportDataModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onUpload={handleExcelUpload}
        title="📥 Import Danh Sách Nhân Sự (Excel)"
        inputId="user-excel-upload"
        submitLabel="Bắt Đầu Đồng Bộ"
        instructions={
          <>
            <h4>💡 Hướng dẫn định dạng file:</h4>
            <ul>
              <li><b>Cột A (STT):</b> Có thể để trống hoặc đánh số thứ tự.</li>
              <li><b>Cột B (Họ Tên):</b> Nhập đầy đủ họ và tên nhân viên.</li>
              <li><b>Cột C (Số ĐT):</b> Dùng làm <b>tên đăng nhập</b> và <b>mật khẩu mặc định</b>. Chức vụ tự động: <b>Staff</b>.</li>
            </ul>
            <p>* Nếu nhân viên đã tồn tại, hệ thống sẽ cập nhật lại Họ Tên.</p>
          </>
        }
      />
      <UserHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        user={selectedHistoryUser}
      />
    </div>
  );
};