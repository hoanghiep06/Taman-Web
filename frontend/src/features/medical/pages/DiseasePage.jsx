import { useMemo, useState } from "react";

import { TableWrapper, Table, Th, Td, EmptyRow } from "../../../components/table/Table";
import { ActionButton } from "../../../components/table/ActionButton";
import { BulkActionBar } from "../../../components/table/BulkActionBar";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";
import { StatusBadge } from "../../../components/StatusBadge";

import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useDiseases } from "../hooks/useDiseases";
import { MedicalWebLayout } from "../layouts/MedicalWebLayout";
import { MedicalMobileLayout } from "../layouts/MedicalMobileLayout";
import { DiseaseFormModal } from "../components/DiseaseFormModal";

import styles from "./DiseasePage.module.css";

const PAGE_SIZE = 8;

export const DiseasePage = () => {
    const { diseases, loading, create, update, remove, removeMany } = useDiseases();
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? MedicalWebLayout : MedicalMobileLayout;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return diseases;
        return diseases.filter(
            (d) => d.name.toLowerCase().includes(keyword) || d.icdCode.toLowerCase().includes(keyword)
        );
    }, [diseases, search]);

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
        if (!window.confirm(`Xóa bệnh "${item.name}"?`)) return;
        await remove(item.id);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === paged.length ? [] : paged.map((d) => d.id));
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Xóa ${selectedIds.length} bệnh đã chọn?`)) return;
        await removeMany(selectedIds);
        setSelectedIds([]);
    };

    return (
        <Layout>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Quản lý bệnh</h1>
                    <p className={styles.subtitle}>Danh mục bệnh dùng chung, tham chiếu trong hồ sơ bệnh án</p>
                </div>

                <button className={styles.addBtn} onClick={openCreateModal}>
                    ＋ Thêm bệnh
                </button>
            </div>

            <div className={styles.toolbar}>
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    onClear={() => handleSearchChange("")}
                    placeholder="Tìm theo tên bệnh hoặc mã ICD..."
                />
            </div>

            <BulkActionBar count={selectedIds.length} itemLabel="bệnh" onDelete={handleBulkDelete} />

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
                            <Th>Tên bệnh</Th>
                            <Th width={100}>Mã ICD-10</Th>
                            <Th>Mô tả</Th>
                            <Th align="center">Trạng thái</Th>
                            <Th align="right">Hành động</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <EmptyRow colSpan={6}>Đang tải dữ liệu...</EmptyRow>}

                        {!loading && paged.length === 0 && (
                            <EmptyRow colSpan={6}>Không tìm thấy bệnh nào</EmptyRow>
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
                                    <Td mono>{item.icdCode}</Td>
                                    <Td muted>{item.description || "—"}</Td>
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

            <DiseaseFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingItem}
            />
        </Layout>
    );
};