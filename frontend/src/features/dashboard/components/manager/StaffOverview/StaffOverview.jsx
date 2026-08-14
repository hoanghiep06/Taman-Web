import { useEffect, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import { DetailListModal, StatusBadge } from "../../ui/DashboardUI";
import styles from "./StaffOverview.module.css";

const STAFF_ROLES = ["Doctor", "Caregiver", "Coordinator"];

export const StaffOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [members, setMembers] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getUsers();
                const staff = (data || [])
                    .filter((u) => STAFF_ROLES.includes(u.role))
                    .map((u) => ({
                        ...u,
                        statusLabel: u.is_active ? "Hoạt động" : "Không hoạt động",
                    }));
                setMembers(staff);
            } catch (err) {
                setError("Không thể tải danh sách nhân sự.");
                console.error("StaffOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const activeCount = members.filter((m) => m.is_active).length;
    const inactiveCount = members.length - activeCount;

    const visibleMembers = [...members]
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"))
        .slice(0, 3);

    if (loading) return <section className={styles.card}><h2>Nhân sự</h2><p>Đang tải...</p></section>;
    if (error) return <section className={styles.card}><h2>Nhân sự</h2><p>{error}</p></section>;

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h2>Nhân sự</h2>
                    <strong>{members.length} nhân sự tại cơ sở</strong>
                </div>

                <button type="button" className={styles.viewAllButton} onClick={() => setShowModal(true)}>
                    Xem chi tiết
                </button>
            </div>

            <div className={styles.summaryInfo}>
                <span>Đang hoạt động: <strong>{activeCount}</strong></span>
                <span>Không hoạt động: <strong>{inactiveCount}</strong></span>
            </div>

            <div className={styles.list}>
                {visibleMembers.map((m) => (
                    <div key={m.id} className={styles.item}>
                        <div className={styles.info}>
                            <strong>{m.full_name}</strong>
                            <span>{m.role}</span>
                        </div>
                        <StatusBadge status={m.statusLabel} />
                    </div>
                ))}
            </div>

            {showModal && (
                <DetailListModal
                    title="Chi tiết nhân sự"
                    items={members}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(m) => m.full_name}
                    renderSecondary={(m) => `Vai trò: ${m.role}`}
                    renderBadge={(m) => <StatusBadge status={m.statusLabel} />}
                    enableSearch
                    searchKeys={["role", "statusLabel"]}
                    enableFilter
                    filterKey="statusLabel"
                    filterLabel="trạng thái"
                    filterOptions={["Hoạt động", "Không hoạt động"]}
                />
            )}
        </section>
    );
};