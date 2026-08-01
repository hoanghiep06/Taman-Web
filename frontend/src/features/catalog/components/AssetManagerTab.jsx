import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/catalogApi';
import { AssetFormModal } from './AssetFormModal';
import { TableWrapper, Table, Th, EmptyRow } from '../../../components/table/Table';
import { ActionButton } from '../../../components/table/ActionButton';
import { BulkActionBar } from '../../../components/table/BulkActionBar';
import { GroupHeaderRow } from '../../../components/table/GroupHeaderRow';
import { StatusBadge } from '../../../components/StatusBadge';
import styles from './AssetManagerTab.module.css';

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
        catalogApi.getAssets(),
        catalogApi.getRooms(),
        catalogApi.getElders(),
      ]);
      setAssets(assetsData);
      setRooms(roomsData);
      setElders(eldersData);
      setSelectedIds([]);
    } catch (err) {
      console.error('Lỗi:', err);
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
    if (!window.confirm(`⚠️ Xác nhận xóa vĩnh viễn ${selectedIds.length} tài sản đã chọn?`)) return;
    let successCount = 0,
      failCount = 0;

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await catalogApi.deleteAsset(id);
            successCount++;
          } catch (error) {
            failCount++;
          }
        })
      );
      if (failCount > 0) alert(`Đã xóa ${successCount} mục. \n❌ ${failCount} mục không thể xóa do kẹt lịch sử tuần tra.`);
      else alert(`Đã xóa thành công toàn bộ ${successCount} mục!`);

      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Có lỗi hệ thống xảy ra trong quá trình xóa.');
    }
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };
  const handleSubmitForm = async (formData) => {
    try {
      if (editingAsset) await catalogApi.updateAsset(editingAsset.id, formData);
      else await catalogApi.createAsset(formData);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(`Lỗi: ${error.response?.data?.detail || 'Không thể lưu'}`);
    }
  };
  const handleDelete = async (asset) => {
    if (!window.confirm(`⚠️ Xác nhận xóa: ${asset.asset_name}?`)) return;
    try {
      await catalogApi.deleteAsset(asset.id);
      fetchData();
    } catch (error) {
      alert('Tài sản đang kẹt trong lịch sử đi tuần!');
    }
  };

  const filteredAssets = assets.filter((a) => {
    const term = searchTerm.toLowerCase();
    const matchName = a.asset_name.toLowerCase().includes(term);
    const elderOwner = elders.find((e) => e.id === a.elder_id);
    const elderName = elderOwner ? elderOwner.full_name.toLowerCase() : '';
    return matchName || elderName.includes(term);
  });

  const groupedAssets = {};
  filteredAssets.forEach((asset) => {
    const roomInfo = rooms.find((r) => r.id === asset.room_id);
    const roomName = roomInfo ? `Phòng ${roomInfo.room_number}` : 'Lưu kho';
    if (!groupedAssets[roomName]) groupedAssets[roomName] = [];
    groupedAssets[roomName].push(asset);
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm tài sản hoặc Tên cụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.addBtn} onClick={handleOpenAdd}>
          + Thêm Tài Sản Thủ Công
        </button>
      </div>

      <BulkActionBar count={selectedIds.length} itemLabel="tài sản" onDelete={handleBulkDelete} deleteLabel="🗑️ Xóa Mục Đã Chọn" />

      {loading ? (
        <div className={styles.loadingState}>Đang đồng bộ...</div>
      ) : (
        <TableWrapper>
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th width="40px" align="center">#</Th>
                <Th>Mã TS</Th>
                <Th>Tên Tài Sản / Đặc điểm</Th>
                <Th>Phân Bổ Sở Hữu</Th>
                <Th align="right">Thao Tác</Th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedAssets).length > 0 ? (
                Object.keys(groupedAssets)
                  .sort()
                  .map((roomName) => (
                    <React.Fragment key={roomName}>
                      <GroupHeaderRow icon="🏠" label={roomName} count={groupedAssets[roomName].length} countLabel="món" colSpan={5} />
                      {groupedAssets[roomName].map((asset) => {
                        const elderOwner = elders.find((e) => e.id === asset.elder_id);
                        const isChecked = selectedIds.includes(asset.id);
                        const isMismatch = elderOwner && elderOwner.room_id !== asset.room_id;
                        const correctRoom = isMismatch ? rooms.find((r) => r.id === elderOwner.room_id) : null;

                        return (
                          <tr
                            key={asset.id}
                            className={isMismatch ? styles.trRowError : isChecked ? styles.trRowSelected : undefined}
                          >
                            <td className={styles.tdCheckbox}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheck(asset.id)}
                                className={styles.checkbox}
                              />
                            </td>
                            <td className={styles.tdId}>TA-{asset.id}</td>
                            <td className={styles.td}>
                              <div className={styles.tdBold}>{asset.asset_name}</div>
                              {isMismatch && (
                                <div className={styles.mismatchAlert}>
                                  ⚠️ Cụ đã sang P.{correctRoom?.room_number || 'khác'}. Bấm Sửa để dời đồ theo!
                                </div>
                              )}
                            </td>
                            <td className={styles.td}>
                              {elderOwner ? (
                                <StatusBadge variant="warning">👤 {elderOwner.full_name}</StatusBadge>
                              ) : (
                                <StatusBadge variant="neutral">🏢 Tài sản chung</StatusBadge>
                              )}
                            </td>
                            <td className={styles.tdActions}>
                              <ActionButton variant="primary" onClick={() => handleOpenEdit(asset)}>✏️</ActionButton>
                              <ActionButton variant="danger" onClick={() => handleDelete(asset)}>🗑️</ActionButton>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
              ) : (
                <EmptyRow colSpan={5}>Không tìm thấy tài sản.</EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      <AssetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingAsset}
        rooms={rooms}
        elders={elders}
      />
    </div>
  );
};