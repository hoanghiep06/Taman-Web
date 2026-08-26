import { useEffect, useState } from "react";

import { StatCard, DetailListModal, DetailFieldsModal, Modal, UnderDevelopment } from "../../ui/DashboardUI";
import { dashboardApi } from "../../../api/dashboardApi";

import uiStyles from "../../ui/DashboardUI.module.css";

export const CoordinatorOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elders, setElders] = useState([]);

    const [detailType, setDetailType] = useState(null);
    const [selectedElder, setSelectedElder] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                // Coordinator chưa có quyền gọi /admin/rooms (403) -> chỉ lấy elders,
                // backend sẽ tự lọc elders theo cơ sở của Coordinator đang đăng nhập
                const eldersData = await dashboardApi.getElders();
                setElders(eldersData || []);
            } catch (err) {
                setError("Không thể tải dữ liệu tổng quan.");
                console.error("CoordinatorOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Chưa map được room_id -> khu vực/số phòng (thiếu quyền gọi /admin/rooms)
    const eldersWithRoom = elders.map((e) => ({
        ...e,
        area: "—",
        room: e.room_id != null ? `#${e.room_id}` : "—",
    }));

    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;

    return (
        <>
            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={elders.length}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setDetailType("elders")}
                />

                <StatCard
                    title="Công việc hôm nay"
                    value="—"
                    icon="📋"
                    color="#ea580c"
                    onClick={() => setDetailType("tasks")}
                />

                <StatCard
                    title="Thông báo"
                    value="—"
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => setDetailType("notifications")}
                />
            </div>

            {detailType === "elders" && (
                <DetailListModal
                    title="Danh sách các cụ"
                    items={eldersWithRoom}
                    onClose={() => setDetailType(null)}
                    onItemClick={(elder) => setSelectedElder(elder)}
                    renderPrimary={(elder) => elder.full_name}
                    renderSecondary={(elder) => `Phòng ${elder.room}`}
                    enableSearch
                />
            )}

            {detailType === "tasks" && (
                <Modal title="Công việc hôm nay" onClose={() => setDetailType(null)}>
                    <UnderDevelopment message="Tính năng quản lý công việc đang được phát triển." />
                </Modal>
            )}

            {detailType === "notifications" && (
                <Modal title="Thông báo" onClose={() => setDetailType(null)}>
                    <UnderDevelopment message="Tính năng thông báo đang được phát triển." />
                </Modal>
            )}

            {selectedElder && (
                <DetailFieldsModal
                    title="Thông tin cụ"
                    avatarLabel={selectedElder.full_name.charAt(0)}
                    onClose={() => setSelectedElder(null)}
                    fields={[
                        { label: "Họ tên", value: selectedElder.full_name },
                        { label: "Phòng", value: selectedElder.room },
                        { label: "Giới tính", value: selectedElder.gender },
                    ]}
                />
            )}
        </>
    );
};