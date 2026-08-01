import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { ElderFormModal } from './ElderFormModal';
import { TableWrapper, Table, Th, EmptyRow } from '../../../components/table/Table';
import { ActionButton } from '../../../components/table/ActionButton';
import { BulkActionBar } from '../../../components/table/BulkActionBar';
import { GroupHeaderRow } from '../../../components/table/GroupHeaderRow';
import styles from './ElderManagerTab.module.css';

export const ElderManagerTab = ({ refreshTrigger }) => {
  const [elders, setElders] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElder, setEditingElder] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eldersData, roomsData] = await Promise.all([catalogApi.getElders(), catalogApi.getRooms()]);
      setElders(eldersData);
      setRooms(roomsData);
      setSelectedIds([]);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Hồ sơ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleToggleCheck = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`⚠️ Xác nhận xóa ${selectedIds.length} hồ sơ Cụ? Đồ đạc của Cụ có thể bị ảnh hưởng.`)) return;

    let successCount = 0,
      failCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await catalogApi.deleteElder(id);
            successCount++;
          } catch (error) {
            failCount++;
          }
        })
      );
      if (failCount > 0)
        alert(`Xóa thành công ${successCount} cụ. \n❌ Có ${failCount} cụ không thể xóa do đang kẹt ca trực.`);
      else alert(`Đã xóa thành công ${successCount} cụ!`);

      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Có lỗi hệ thống xảy ra trong quá trình xóa.');
    }
  };

  const handleOpenAdd = () => {
    setEditingElder(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (elder) => {
    setEditingElder(elder);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (editingElder) await catalogApi.updateElder(editingElder.id, formData);
      else await catalogApi.createElder(formData);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu'}`);
    }
  };

  const handleDelete = async (elder) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa hồ sơ Cụ ${elder.full_name}?`)) return;
    try {
      await catalogApi.deleteElder(elder.id);
      fetchData();
    } catch (error) {
      alert('Không thể xóa: Hồ sơ đang bị ràng buộc với các ca tuần tra!');
    }
  };

  const filteredElders = elders.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedElders = {};
  filteredElders.forEach((elder) => {
    const roomInfo = rooms.find((r) => r.id === elder.room_id);
    const groupName = roomInfo ? `Phòng ${roomInfo.room_number}` : 'Khu vực chờ xếp phòng';
    if (!groupedElders[groupName]) groupedElders[groupName] = [];
    groupedElders[groupName].push(elder);
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên cụ hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.addBtn} onClick={handleOpenAdd}>
          + Thêm Hồ Sơ Cụ Mới
        </button>
      </div>

      <BulkActionBar count={selectedIds.length} itemLabel="hồ sơ cụ" onDelete={handleBulkDelete} />

      {loading ? (
        <div className={styles.loadingState}>Đang đồng bộ hồ sơ lưu trú...</div>
      ) : (
        <TableWrapper>
          <Table minWidth={640}>
            <thead>
              <tr>
                <Th width="40px" align="center">#</Th>
                <Th width="10%">ID</Th>
                <Th width="30%">Họ và Tên Cụ</Th>
                <Th width="35%">Ghi Chú Đặc Biệt</Th>
                <Th width="20%" align="right">Thao Tác</Th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedElders).length > 0 ? (
                Object.keys(groupedElders)
                  .sort()
                  .map((roomName) => (
                    <React.Fragment key={roomName}>
                      <GroupHeaderRow icon="🏠" label={roomName} count={groupedElders[roomName].length} countLabel="Cụ" colSpan={5} />
                      {groupedElders[roomName].map((elder) => {
                        const isChecked = selectedIds.includes(elder.id);
                        return (
                          <tr key={elder.id} className={isChecked ? styles.trRowSelected : undefined}>
                            <td className={styles.tdCheckbox}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheck(elder.id)}
                                className={styles.checkbox}
                              />
                            </td>
                            <td className={styles.tdId}>#{elder.id}</td>
                            <td className={styles.tdBold}>👵 {elder.full_name}</td>
                            <td className={styles.tdDesc}>{elder.notes || '-'}</td>
                            <td className={styles.tdActions}>
                              <ActionButton variant="primary" onClick={() => handleOpenEdit(elder)}>✏️</ActionButton>
                              <ActionButton variant="danger" onClick={() => handleDelete(elder)}>🗑️</ActionButton>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
              ) : (
                <EmptyRow colSpan={5}>Không tìm thấy hồ sơ Cụ nào.</EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      <ElderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingElder}
        rooms={rooms}
      />
    </div>
  );
};