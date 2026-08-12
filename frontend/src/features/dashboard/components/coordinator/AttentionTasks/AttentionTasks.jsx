import { useState } from "react";
import { COORDINATOR_ATTENTION } from "../../../mock/dashboardMockData";
import {
    Section,
    AlertItem,
    DetailListModal,
    DetailFieldsModal,
    StatusBadge,
    EmptyState,
} from "../../ui/DashboardUI";

import uiStyles from "../../ui/DashboardUI.module.css";

const TYPE_LABEL = {
    danger: "Khẩn cấp",
    warning: "Cảnh báo",
    info: "Thông tin",
};

export const AttentionTasks = () => {
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Mặc định hiện 3 cái gần đây nhất
    const visibleTasks = COORDINATOR_ATTENTION.slice(0, 3);

    return (
        <Section
            title="Các việc cần chú ý"
            onTitleClick={() => setShowAllModal(true)}
            right={
                <button
                    type="button"
                    className={uiStyles.linkButton}
                    onClick={() => setShowAllModal(true)}
                >
                    Xem tất cả ({COORDINATOR_ATTENTION.length})
                </button>
            }
        >
            <div className={uiStyles.alertList}>
                {visibleTasks.map((item) => (
                    <AlertItem key={item.id} item={item} />
                ))}

                {!COORDINATOR_ATTENTION.length && (
                    <EmptyState message="Không có việc cần chú ý nào." />
                )}
            </div>

            {showAllModal && (
                <DetailListModal
                    title="Các việc cần chú ý hôm nay"
                    items={COORDINATOR_ATTENTION}
                    onClose={() => setShowAllModal(false)}
                    onItemClick={(item) => setSelectedItem(item)}
                    renderPrimary={(item) => item.title}
                    renderSecondary={(item) => `${item.description} · Lúc ${item.time}`}
                    renderBadge={(item) => (
                        <StatusBadge status={TYPE_LABEL[item.type] || item.type} />
                    )}
                    enableSearch
                />
            )}

            {selectedItem && (
                <DetailFieldsModal
                    title="Chi tiết công việc cần chú ý"
                    onClose={() => setSelectedItem(null)}
                    fields={[
                        { label: "Tiêu đề", value: selectedItem.title },
                        { label: "Mô tả", value: selectedItem.description },
                        { label: "Mức độ", value: TYPE_LABEL[selectedItem.type] || selectedItem.type },
                        { label: "Thời gian", value: selectedItem.time },
                    ]}
                />
            )}
        </Section>
    );
};