import { useMemo, useState } from "react";

import { TableWrapper, Table, Th, Td, EmptyRow } from "../../../components/table/Table";
import { ActionButton } from "../../../components/table/ActionButton";
import { BulkActionBar } from "../../../components/table/BulkActionBar";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";
import { StatusBadge } from "../../../components/StatusBadge";

import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useMedicines } from "../hooks/useMedicines";
import { MedicalWebLayout } from "../layouts/MedicalWebLayout";
import { MedicalMobileLayout } from "../layouts/MedicalMobileLayout";
import { MedicineFormModal } from "../components/MedicineFormModal";

import styles from "./MedicinePage.module.css";

const PAGE_SIZE = 8;

export const MedicinePage = () => {
    const { medicines, loading, create, update, remove, removeMany } = useMedicines();
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? MedicalWebLayout : MedicalMobileLayout;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return medicines;
        return medicines.filter((m) => m.name.toLowerCase().includes(keyword));
    }, [medicines, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSearchChange = (value) => {
        setSearch(value);
        setPage(1);
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleSubmit = async (payload) => {
        if (editingItem) {
            await update(editingItem.id, payload);
        } else {
            await create(payload);
        }
        setModalOpen(false);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Xóa thuốc "${item.name}"?`)) return;
        await remove(item.id);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === paged.length ? [] : paged.map((m) => m.id));
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Xóa ${selectedIds.length} thuốc đã chọn?`)) return;
        await removeMany(selectedIds);
        setSelectedIds([]);
    };

    return (
        <Layout>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Quản lý thuốc</h1>
                    <p className={styles.subtitle}>Danh mục thuốc dùng chung trong hệ thống</p>
                </div>

                <button className={styles.addBtn} onClick={openCreateModal}>
                    ＋ Thêm thuốc
                </button>
            </div>

            <div className={styles.toolbar}>
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    onClear={() => handleSearchChange("")}
                    placeholder="Tìm theo tên thuốc..."
                />
            </div>

            <BulkActionBar count={selectedIds.length} itemLabel="thuốc" onDelete={handleBulkDelete} />

            <TableWrapper>
                <Table minWidth={720}>
                    <thead>
                        <tr>
                            <Th width={40}>
                                <input
                                    type="checkbox"
                                    checked={paged.length > 0 && selectedIds.length === paged.length}
                                    onChange={toggleSelectAll}
                                />
                            </Th>
                            <Th>Tên thuốc</Th>
                            <Th>Đơn vị</Th>
                            <Th>Dạng bào chế</Th>
                            <Th>Ghi chú</Th>
                            <Th align="center">Trạng thái</Th>
                            <Th align="right">Hành động</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <EmptyRow colSpan={7}>Đang tải dữ liệu...</EmptyRow>}

                        {!loading && paged.length === 0 && (
                            <EmptyRow colSpan={7}>Không tìm thấy thuốc nào</EmptyRow>
                        )}

                        {!loading &&
                            paged.map((item) => (
                                <tr key={item.id}>
                                    <Td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                    </Td>
                                    <Td bold>{item.name}</Td>
                                    <Td>{item.unit}</Td>
                                    <Td>{item.dosageForm}</Td>
                                    <Td muted>{item.note || "—"}</Td>
                                    <Td align="center">
                                        <StatusBadge variant={item.status === "active" ? "success" : "neutral"}>
                                            {item.status === "active" ? "Đang dùng" : "Ngừng dùng"}
                                        </StatusBadge>
                                    </Td>
                                    <Td align="right">
                                        <div className={styles.actions}>
                                            <ActionButton variant="primary" onClick={() => openEditModal(item)}>
                                                ✏️ Sửa
                                            </ActionButton>
                                            <ActionButton variant="danger" onClick={() => handleDelete(item)}>
                                                🗑️ Xóa
                                            </ActionButton>
                                        </div>
                                    </Td>
                                </tr>
                            ))}
                    </tbody>
                </Table>
            </TableWrapper>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalRecords={filtered.length}
            />

            <MedicineFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingItem}
            />
        </Layout>
    );
};