import { useMemo, useState } from "react";

import { TableWrapper, Table, Th, Td, EmptyRow } from "../../../components/table/Table";
import { ActionButton } from "../../../components/table/ActionButton";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";
import { StatusBadge } from "../../../components/StatusBadge";

import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useHealthChecks } from "../hooks/useHealthChecks";
import { MedicalWebLayout } from "../layouts/MedicalWebLayout";
import { MedicalMobileLayout } from "../layouts/MedicalMobileLayout";
import { HealthCheckFormModal } from "../components/HealthCheckFormModal";

import styles from "./HealthCheckPage.module.css";

const PAGE_SIZE = 8;

const RESULT_LABEL = {
    normal: { label: "Bình thường", variant: "success" },
    warning: { label: "Cần theo dõi", variant: "warning" },
    danger: { label: "Cần tái khám gấp", variant: "danger" },
};

export const HealthCheckPage = () => {
    const { checks, loading, create, update, remove } = useHealthChecks();
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? MedicalWebLayout : MedicalMobileLayout;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return checks;
        return checks.filter(
            (c) => c.elderName.toLowerCase().includes(keyword) || c.room.toLowerCase().includes(keyword)
        );
    }, [checks, search]);

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
        if (!window.confirm(`Xóa lần khám ngày ${item.checkDate} của "${item.elderName}"?`)) return;
        await remove(item.id);
    };

    return (
        <Layout>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Lịch sử khám sức khỏe</h1>
                    <p className={styles.subtitle}>Ghi nhận kết quả các lần khám định kỳ</p>
                </div>

                <button className={styles.addBtn} onClick={openCreateModal}>
                    ＋ Thêm lần khám
                </button>
            </div>

            <div className={styles.toolbar}>
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    onClear={() => handleSearchChange("")}
                    placeholder="Tìm theo tên cụ hoặc phòng..."
                />
            </div>

            <TableWrapper>
                <Table minWidth={820}>
                    <thead>
                        <tr>
                            <Th>Người cao tuổi</Th>
                            <Th width={80}>Phòng</Th>
                            <Th width={110}>Ngày khám</Th>
                            <Th align="center">Kết quả</Th>
                            <Th>Bác sĩ</Th>
                            <Th>Ghi chú</Th>
                            <Th align="right">Hành động</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <EmptyRow colSpan={7}>Đang tải dữ liệu...</EmptyRow>}

                        {!loading && paged.length === 0 && (
                            <EmptyRow colSpan={7}>Không tìm thấy lần khám nào</EmptyRow>
                        )}

                        {!loading &&
                            paged.map((item) => (
                                <tr key={item.id}>
                                    <Td bold>{item.elderName}</Td>
                                    <Td>{item.room}</Td>
                                    <Td muted>{item.checkDate}</Td>
                                    <Td align="center">
                                        <StatusBadge variant={RESULT_LABEL[item.result]?.variant || "neutral"}>
                                            {RESULT_LABEL[item.result]?.label || item.result}
                                        </StatusBadge>
                                    </Td>
                                    <Td muted>{item.doctor}</Td>
                                    <Td muted>{item.note || "—"}</Td>
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

            <HealthCheckFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingItem}
            />
        </Layout>
    );
};