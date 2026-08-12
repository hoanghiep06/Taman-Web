import { useState } from "react";
import { MANAGER_STAFF } from "../../../mock/dashboardMockData";
import { DetailListModal, StatusBadge } from "../../ui/DashboardUI";
import styles from "./StaffOverview.module.css";

export const StaffOverview = () => {
    const [showModal, setShowModal] = useState(false);

    const members = MANAGER_STAFF.members || [];

    // Gắn nhãn trạng thái tiếng Việt để hiển thị + tìm kiếm/lọc
    const membersWithLabel = members.map((m) => ({
        ...m,
        statusLabel: m.status === "active" ? "Hoạt động" : "Không hoạt động",
    }));

    // 3 người đầu tiên theo thứ tự bảng chữ cái tên
    const visibleMembers = [...membersWithLabel]
        .sort((a, b) => a.name.localeCompare(b.name, "vi"))
        .slice(0, 3);

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h2>Nhân sự</h2>
                    <strong>
                        {members.length} người trong ca ({MANAGER_STAFF.shift})
                    </strong>
                </div>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowModal(true)}
                >
                    Xem chi tiết
                </button>
            </div>

            <div className={styles.summaryInfo}>
                <span>Đang hoạt động: <strong>{MANAGER_STAFF.active}</strong></span>
                <span>Không hoạt động: <strong>{MANAGER_STAFF.inactive}</strong></span>
            </div>

            <div className={styles.list}>
                {visibleMembers.map((m, idx) => (
                    <div key={m.id ?? idx} className={styles.item}>
                        <div className={styles.info}>
                            <strong>{m.name}</strong>
                            <span>{m.role}</span>
                        </div>

                        <StatusBadge status={m.statusLabel} />
                    </div>
                ))}

                {!visibleMembers.length && (
                    <p className={styles.emptyMessage}>Không có nhân sự nào.</p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title={`Chi tiết ca trực: ${MANAGER_STAFF.shift} (${MANAGER_STAFF.start} - ${MANAGER_STAFF.end})`}
                    items={membersWithLabel}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(m) => m.name}
                    renderSecondary={(m) => `Vai trò: ${m.role}`}
                    renderBadge={(m) => <StatusBadge status={m.statusLabel} />}
                    enableSearch
                    searchKeys={["statusLabel"]}
                    enableFilter
                    filterKey="statusLabel"
                    filterLabel="trạng thái"
                    filterOptions={["Hoạt động", "Không hoạt động"]}
                />
            )}
        </section>
    );
};