import { useMemo, useState } from "react";

import { TableWrapper, Table, Th, Td, EmptyRow } from "../../../components/table/Table";
import { ActionButton } from "../../../components/table/ActionButton";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";
import { StatusBadge } from "../../../components/StatusBadge";

import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useMedicalRecords } from "../hooks/useMedicalRecords";
import { MedicalWebLayout } from "../layouts/MedicalWebLayout";
import { MedicalMobileLayout } from "../layouts/MedicalMobileLayout";
import { MedicalRecordFormModal } from "../components/MedicalRecordFormModal";

import styles from "./MedicalRecordPage.module.css";

const PAGE_SIZE = 8;

const STATUS_LABEL = {
    active: { label: "Đang theo dõi", variant: "warning" },
    resolved: { label: "Đã khỏi", variant: "success" },
};

export const MedicalRecordPage = () => {
    const { records, loading, create, update, remove } = useMedicalRecords();
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? MedicalWebLayout : MedicalMobileLayout;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return records;
        return records.filter(
            (r) =>
                r.elderName.toLowerCase().includes(keyword) ||
                r.diagnosis.toLowerCase().includes(keyword) ||
                r.room.toLowerCase().includes(keyword)
        );
    }, [records, search]);

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
        if (!window.confirm(`Xóa hồ sơ bệnh án của "${item.elderName}"?`)) return;
        await remove(item.id);
    };

    return (
        <Layout>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Hồ sơ bệnh án</h1>
                    <p className={styles.subtitle}>Theo dõi chẩn đoán và tình trạng bệnh của người cao tuổi</p>
                </div>

                <button className={styles.addBtn} onClick={openCreateModal}>
                    ＋ Thêm hồ sơ
                </button>
            </div>

            <div className={styles.toolbar}>
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    onClear={() => handleSearchChange("")}
                    placeholder="Tìm theo tên cụ, phòng hoặc chẩn đoán..."
                />
            </div>

            <TableWrapper>
                <Table minWidth={820}>
                    <thead>
                        <tr>
                            <Th>Người cao tuổi</Th>
                            <Th width={80}>Phòng</Th>
                            <Th>Chẩn đoán</Th>
                            <Th>Bác sĩ phụ trách</Th>
                            <Th width={110}>Ngày ghi nhận</Th>
                            <Th align="center">Trạng thái</Th>
                            <Th align="right">Hành động</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <EmptyRow colSpan={7}>Đang tải dữ liệu...</EmptyRow>}

                        {!loading && paged.length === 0 && (
                            <EmptyRow colSpan={7}>Không tìm thấy hồ sơ nào</EmptyRow>
                        )}

                        {!loading &&
                            paged.map((item) => (
                                <tr key={item.id}>
                                    <Td bold>{item.elderName}</Td>
                                    <Td>{item.room}</Td>
                                    <Td>{item.diagnosis}</Td>
                                    <Td muted>{item.doctor}</Td>
                                    <Td muted>{item.date}</Td>
                                    <Td align="center">
                                        <StatusBadge variant={STATUS_LABEL[item.status]?.variant || "neutral"}>
                                            {STATUS_LABEL[item.status]?.label || item.status}
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

            <MedicalRecordFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingItem}
            />
        </Layout>
    );
};