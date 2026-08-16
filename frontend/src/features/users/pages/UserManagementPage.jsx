import React, { useState, useEffect, useContext, useMemo } from 'react';
import { usersApi } from '../api/usersApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserEditModal } from '../components/UserEditModal';
import { ImportDataModal } from '../../../components/ImportDataModal';
import { UserHistoryModal } from '../components/UserHistoryModal';
import { ROLES } from '../../../utils/constants';
import styles from './UserManagementPage.module.css';

export const UserManagementPage = () => {
  const { user } = useContext(AuthContext);
  const [usersList, setUsersList]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [roleFilter, setRoleFilter]     = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [selectedIds, setSelectedIds]   = useState([]);
  const [bulkLoading, setBulkLoading]   = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]     = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen]   = useState(false);
  const [editTargetUser, setEditTargetUser]       = useState(null);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen]   = useState(false);

  const ROLE_FILTER_OPTIONS = [
    { value: 'ALL',              label: 'Tất cả chức vụ' },
    { value: ROLES.ADMIN,        label: 'Quản trị viên (Admin)' },
    { value: ROLES.MANAGER,      label: 'Quản lý (Manager)' },
    { value: ROLES.DOCTOR,       label: 'Bác sĩ (Doctor)' },
    { value: ROLES.COORDINATOR,  label: 'Điều phối viên (Coordinator)' },
    { value: ROLES.CAREGIVER,    label: 'Nhân viên chăm sóc (Caregiver)' },
  ];

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
  useEffect(() => { setSelectedIds([]); }, [searchQuery, roleFilter, facilityFilter]);

  const handleCreateUser = async (data) => {
    try {
      await usersApi.createUser(data);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Khởi tạo tài khoản thất bại!');
    }
  };

  const handleUpdateUser = async (userId, data) => {
    try {
      await usersApi.updateUser(userId, data);
      setIsEditModalOpen(false);
      setEditTargetUser(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Cập nhật thông tin thất bại!');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      await usersApi.resetPassword(userId);
      alert('✅ Đã đặt lại mật khẩu về mặc định thành công!');
      setIsEditModalOpen(false);
      setEditTargetUser(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Đặt lại mật khẩu thất bại!');
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

  // Lọc theo cơ sở: Manager chỉ thấy user cùng facility_id với mình.
  const visibleUsers = user?.role === ROLES.MANAGER
    ? usersList.filter((u) => u.facility_id === user.facility_id)
    : usersList;



  // Danh sách cơ sở duy nhất — chỉ Admin cần, lấy trực tiếp từ dữ liệu user đã tải,
  // tránh phải gọi thêm API facilities riêng.
  const facilityOptions = useMemo(() => {
    if (user?.role !== ROLES.ADMIN) return [];
    const unique = new Map();
    usersList.forEach((u) => {
      if (u.facility_id && u.facility_name && !unique.has(u.facility_id)) {
        unique.set(u.facility_id, u.facility_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [usersList, user?.role]);

  const filteredUsers = visibleUsers.filter(({ full_name, username, role, facility_id }) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      full_name.toLowerCase().includes(q) ||
      username.toLowerCase().includes(q) ||
      role.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || role === roleFilter;
    const matchesFacility = facilityFilter === 'ALL' || String(facility_id) === facilityFilter;
    return matchesSearch && matchesRole && matchesFacility;
  });

  const isSelectable = (targetUser) =>
    targetUser.username !== 'admin' &&
    !(user?.role === ROLES.MANAGER && targetUser.role === ROLES.ADMIN);

  const selectableUsers = filteredUsers.filter(isSelectable);
  const selectableIds = selectableUsers.map((u) => u.id);
  const isAllSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : selectableIds);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkLock = async () => {
    const targets = usersList.filter((u) => selectedIds.includes(u.id) && u.is_active);
    if (targets.length === 0) { alert('Các tài khoản đã chọn đều đang bị khóa sẵn.'); return; }
    if (!window.confirm(`Khóa ${targets.length} tài khoản đã chọn?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((u) => usersApi.toggleLockUser(u.id)));
      setSelectedIds([]);
      await loadUsers();
    } catch {
      alert('Có lỗi xảy ra khi khóa hàng loạt, vui lòng thử lại!');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUnlock = async () => {
    const targets = usersList.filter((u) => selectedIds.includes(u.id) && !u.is_active);
    if (targets.length === 0) { alert('Các tài khoản đã chọn đều đang hoạt động sẵn.'); return; }
    if (!window.confirm(`Mở khóa ${targets.length} tài khoản đã chọn?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((u) => usersApi.toggleLockUser(u.id)));
      setSelectedIds([]);
      await loadUsers();
    } catch {
      alert('Có lỗi xảy ra khi mở khóa hàng loạt, vui lòng thử lại!');
    } finally {
      setBulkLoading(false);
    }
  };

  const roleBadgeClass = (role) => {
    if (role === ROLES.ADMIN)   return styles.roleAdmin;
    if (role === ROLES.MANAGER) return styles.roleManager;
    return styles.roleStaff;
  };

  if (loading) return <div className={styles.loadingText}>Đang nạp dữ liệu nhân sự...</div>;

  const colSpanCount = user?.role === ROLES.ADMIN ? 7 : 6;

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.pageTitle}>Quản Lý Nhân Sự Hệ Thống</h2>
          <p className={styles.pageSubtitle}>
            {user?.role === ROLES.MANAGER
              ? `Xem danh sách, phân quyền và điều phối tài khoản tại ${user?.facility_name || 'cơ sở của bạn'}`
              : 'Xem danh sách, phân quyền và điều phối tài khoản vận hành'}
          </p>
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

          <select
            className={styles.roleFilterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Lọc theo chức vụ"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Chỉ Admin mới thấy — Manager đã tự động giới hạn theo cơ sở của mình rồi */}
          {user?.role === ROLES.ADMIN && facilityOptions.length > 0 && (
            <select
              className={styles.roleFilterSelect}
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              aria-label="Lọc theo cơ sở"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {facilityOptions.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.name}</option>
              ))}
            </select>
          )}

          <button onClick={() => setIsExcelModalOpen(true)} className={styles.importBtn}>📥 Import Excel</button>
          <button onClick={() => setIsCreateModalOpen(true)} className={styles.addBtn}>➕ Thêm Nhân Sự</button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <span className={styles.bulkCount}>Đã chọn {selectedIds.length} tài khoản</span>
          <div className={styles.bulkButtons}>
            <button className={styles.bulkLockBtn} onClick={handleBulkLock} disabled={bulkLoading}>🔒 Khóa hàng loạt</button>
            <button className={styles.bulkUnlockBtn} onClick={handleBulkUnlock} disabled={bulkLoading}>🔓 Mở khóa hàng loạt</button>
            <button className={styles.bulkClearBtn} onClick={() => setSelectedIds([])} disabled={bulkLoading}>Bỏ chọn</button>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.thCheckbox}>
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} disabled={selectableUsers.length === 0} />
                </th>
                <th className={styles.th}>Họ và Tên</th>
                <th className={styles.th}>Tên Đăng Nhập</th>
                <th className={styles.th}>Chức Vụ</th>
                {user?.role === ROLES.ADMIN && <th className={styles.th}>Cơ Sở</th>}
                <th className={styles.th}>Trạng Thái</th>
                <th className={styles.thCenter}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((targetUser) => {
                  const isActionBlocked = !isSelectable(targetUser);

                  return (
                    <tr key={targetUser.id} className={styles.tr}>
                      <td className={styles.tdCheckbox}>
                        {!isActionBlocked && (
                          <input type="checkbox" checked={selectedIds.includes(targetUser.id)} onChange={() => toggleSelectOne(targetUser.id)} />
                        )}
                      </td>
                      <td className={styles.tdBold}>{targetUser.full_name}</td>
                      <td className={styles.td}><span className={styles.username}>{targetUser.username}</span></td>
                      <td className={styles.td}>
                        <span className={roleBadgeClass(targetUser.role)}>{targetUser.role}</span>
                      </td>
                      {user?.role === ROLES.ADMIN && (
                        <td className={styles.td}>{targetUser.facility_name || '—'}</td>
                      )}
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
                              className={styles.btnEdit}
                              onClick={() => { setEditTargetUser(targetUser); setIsEditModalOpen(true); }}
                            >✏️ Sửa</button>
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
                  <td colSpan={colSpanCount} className={styles.emptyState}>
                    Không tìm thấy nhân sự nào khớp với bộ lọc hiện tại
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateUser}
        currentUserRole={user?.role}
        currentUserFacilityId={user?.facility_id}
      />

      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditTargetUser(null); }}
        onSave={handleUpdateUser}
        onResetPassword={handleResetPassword}
        targetUser={editTargetUser}
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
              <li><b>Cột C (Số ĐT):</b> Dùng làm <b>tên đăng nhập</b> và <b>mật khẩu mặc định</b>. Chức vụ tự động: <b>Caregiver</b>.</li>
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