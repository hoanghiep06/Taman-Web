import React, { useState, useEffect, useContext, useMemo } from 'react';
import { usersApi } from '../api/usersApi';
import { AuthContext } from '../../../contexts/AuthContext';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserEditModal } from '../components/UserEditModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
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

  // Modal xác nhận xóa — dùng chung cho xóa đơn lẻ và xóa hàng loạt
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single', user } | { type: 'bulk', ids }
  const isDeleteModalOpen = Boolean(deleteTarget);

  const isManagerWithoutFixedFacility = user?.role === ROLES.MANAGER && !user?.facility_id;

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

  // ── Xóa đơn lẻ: mở modal xác nhận thay vì window.confirm ──
  const requestDeleteSingle = (targetUser) => {
    if (targetUser.username === 'admin') { alert('Không thể xóa tài khoản admin gốc!'); return; }
    setDeleteTarget({ type: 'single', user: targetUser });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'single') {
        await usersApi.deleteUser(deleteTarget.user.id);
      } else {
        await usersApi.bulkDeleteUsers(deleteTarget.ids);
        setSelectedIds([]);
      }
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể xóa tài khoản này!');
      setDeleteTarget(null);
    }
  };

  const visibleUsers = useMemo(() => {
    if (user?.role !== ROLES.MANAGER) return usersList;
    if (isManagerWithoutFixedFacility) {
      return usersList.filter((u) => u.role !== ROLES.ADMIN);
    }
    return usersList.filter((u) => u.facility_id === user.facility_id);
  }, [usersList, user, isManagerWithoutFixedFacility]);

  const showFacilityFilter = user?.role === ROLES.ADMIN || isManagerWithoutFixedFacility;

  const facilityOptions = useMemo(() => {
    if (!showFacilityFilter) return [];
    const unique = new Map();
    usersList.forEach((u) => {
      if (u.facility_id && u.facility_name && !unique.has(u.facility_id)) {
        unique.set(u.facility_id, u.facility_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [usersList, showFacilityFilter]);

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

  // ── Chế độ chọn: xác định từ trạng thái is_active của người ĐẦU TIÊN được chọn.
  // Khi đã có chế độ, chỉ cho chọn thêm người CÙNG trạng thái (đều active, hoặc đều đã khóa) —
  // không cho trộn lẫn, để nút bulk action (Khóa/Mở khóa) luôn rõ ràng chỉ 1 hành động duy nhất.
  const selectionMode = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const first = usersList.find((u) => u.id === selectedIds[0]);
    if (!first) return null;
    return first.is_active ? 'active' : 'locked';
  }, [selectedIds, usersList]);

  const matchesSelectionMode = (targetUser) => {
    if (selectionMode === null) return true;
    return selectionMode === 'active' ? targetUser.is_active : !targetUser.is_active;
  };

  const selectableUsers = filteredUsers.filter(isSelectable);
  const hasMixedStatuses =
    selectableUsers.some((u) => u.is_active) && selectableUsers.some((u) => !u.is_active);

  // Danh sách ID hợp lệ để "chọn tất cả" — chỉ tính người cùng chế độ hiện tại (nếu đã có chế độ)
  const selectAllTargetIds = selectableUsers.filter(matchesSelectionMode).map((u) => u.id);
  const isAllSelected = selectAllTargetIds.length > 0 && selectAllTargetIds.every((id) => selectedIds.includes(id));

  // Vô hiệu hóa checkbox "chọn tất cả" nếu chưa xác định chế độ VÀ danh sách đang lẫn cả 2 trạng thái
  // (tránh chọn tất cả sẽ trộn active + locked ngay từ đầu, phá vỡ quy tắc chỉ 1 hành động).
  const isSelectAllDisabled = selectableUsers.length === 0 || (selectionMode === null && hasMixedStatuses);

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : selectAllTargetIds);
  };

  const toggleSelectOne = (targetUser) => {
    if (!isSelectable(targetUser)) return;

    if (selectionMode !== null && !matchesSelectionMode(targetUser)) {
      alert(
        selectionMode === 'active'
          ? 'Bạn đang chọn nhóm tài khoản đang hoạt động. Vui lòng bỏ chọn hết trước khi chọn tài khoản đã khóa.'
          : 'Bạn đang chọn nhóm tài khoản đã khóa. Vui lòng bỏ chọn hết trước khi chọn tài khoản đang hoạt động.'
      );
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(targetUser.id) ? prev.filter((x) => x !== targetUser.id) : [...prev, targetUser.id]
    );
  };

  // ── Bulk lock/unlock: dùng đúng 1 lệnh gọi API bulk-lock thật, không lặp gọi từng người ──
  const handleBulkToggleLock = async () => {
    if (selectedIds.length === 0 || selectionMode === null) return;
    const nextIsActive = selectionMode === 'locked'; // đang chọn nhóm đã khóa -> hành động là MỞ KHÓA (is_active=true)
    const actionLabel = nextIsActive ? 'Mở khóa' : 'Khóa';

    setBulkLoading(true);
    try {
      await usersApi.bulkLockUsers(selectedIds, nextIsActive);
      setSelectedIds([]);
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || `Có lỗi xảy ra khi ${actionLabel.toLowerCase()} hàng loạt!`);
    } finally {
      setBulkLoading(false);
    }
  };

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget({ type: 'bulk', ids: selectedIds });
  };

  const roleBadgeClass = (role) => {
    if (role === ROLES.ADMIN)   return styles.roleAdmin;
    if (role === ROLES.MANAGER) return styles.roleManager;
    return styles.roleStaff;
  };

  if (loading) return <div className={styles.loadingText}>Đang nạp dữ liệu nhân sự...</div>;

  const showFacilityColumn = user?.role === ROLES.ADMIN || isManagerWithoutFixedFacility;
  const colSpanCount = showFacilityColumn ? 7 : 6;

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.pageTitle}>Quản Lý Nhân Sự Hệ Thống</h2>
          <p className={styles.pageSubtitle}>
            {user?.role === ROLES.MANAGER && !isManagerWithoutFixedFacility
              ? `Xem danh sách, phân quyền và điều phối tài khoản tại ${user?.facility_name || 'cơ sở của bạn'}`
              : isManagerWithoutFixedFacility
                ? 'Xem danh sách, phân quyền và điều phối tài khoản tại mọi cơ sở'
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

          {showFacilityFilter && facilityOptions.length > 0 && (
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
          <span className={styles.bulkCount}>
            Đã chọn {selectedIds.length} tài khoản
            {selectionMode && (
              <span className={styles.bulkModeTag}>
                {selectionMode === 'active' ? '(đang hoạt động)' : '(đã khóa)'}
              </span>
            )}
          </span>
          <div className={styles.bulkButtons}>
            {/* Chỉ 1 trong 2 nút hiện ra tùy chế độ đang chọn — không bao giờ hiện cả 2 cùng lúc */}
            {selectionMode === 'active' && (
              <button className={styles.bulkLockBtn} onClick={handleBulkToggleLock} disabled={bulkLoading}>
                🔒 Khóa hàng loạt
              </button>
            )}
            {selectionMode === 'locked' && (
              <button className={styles.bulkUnlockBtn} onClick={handleBulkToggleLock} disabled={bulkLoading}>
                🔓 Mở khóa hàng loạt
              </button>
            )}
            <button className={styles.bulkDeleteBtn} onClick={requestBulkDelete} disabled={bulkLoading}>
              🗑️ Xóa hàng loạt
            </button>
            <button className={styles.bulkClearBtn} onClick={() => setSelectedIds([])} disabled={bulkLoading}>
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.thCheckbox}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={isSelectAllDisabled}
                    title={
                      isSelectAllDisabled && !isAllSelected
                        ? 'Danh sách đang lẫn cả tài khoản hoạt động và đã khóa — chọn từng người trước để xác định loại thao tác'
                        : undefined
                    }
                  />
                </th>
                <th className={styles.th}>Họ và Tên</th>
                <th className={styles.th}>Tên Đăng Nhập</th>
                <th className={styles.th}>Chức Vụ</th>
                {showFacilityColumn && <th className={styles.th}>Cơ Sở</th>}
                <th className={styles.th}>Trạng Thái</th>
                <th className={styles.thCenter}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((targetUser) => {
                  const isActionBlocked = !isSelectable(targetUser);
                  const isCheckboxDisabled =
                    isActionBlocked || (selectionMode !== null && !matchesSelectionMode(targetUser));

                  return (
                    <tr key={targetUser.id} className={styles.tr}>
                      <td className={styles.tdCheckbox}>
                        {!isActionBlocked && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(targetUser.id)}
                            onChange={() => toggleSelectOne(targetUser)}
                            disabled={isCheckboxDisabled}
                            title={
                              isCheckboxDisabled
                                ? 'Không cùng trạng thái với các tài khoản đang chọn'
                                : undefined
                            }
                          />
                        )}
                      </td>
                      <td className={styles.tdBold}>{targetUser.full_name}</td>
                      <td className={styles.td}><span className={styles.username}>{targetUser.username}</span></td>
                      <td className={styles.td}>
                        <span className={roleBadgeClass(targetUser.role)}>{targetUser.role}</span>
                      </td>
                      {showFacilityColumn && (
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
                              onClick={() => requestDeleteSingle(targetUser)}
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
        currentUserFacilityId={user?.facility_id}
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

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'bulk' ? '⚠️ Xác Nhận Xóa Hàng Loạt' : '⚠️ Xác Nhận Xóa Tài Khoản'}
        message={
          deleteTarget?.type === 'bulk'
            ? `Bạn sắp xóa vĩnh viễn ${deleteTarget.ids.length} tài khoản đã chọn.`
            : `Bạn sắp xóa vĩnh viễn tài khoản [${deleteTarget?.user?.username}].`
        }
      />
    </div>
  );
};