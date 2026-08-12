import { useState } from "react";

import { Section, AlertItem, DetailFieldsModal, DetailListModal, LinkButton, CountBadge } from "../../ui/DashboardUI";
import { ADMIN_ALERTS } from "../../../mock/dashboardMockData";

import uiStyles from "../../ui/DashboardUI.module.css";

export const SystemAlert = () => {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showAllList, setShowAllList] = useState(false);

    return (
        <Section
            title="Cảnh báo hệ thống"
            onTitleClick={() => setShowAllList(true)}
            right={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CountBadge count={ADMIN_ALERTS.length} />
                    <LinkButton onClick={() => setShowAllList(true)}>Xem tất cả →</LinkButton>
                </div>
            }
        >
            <div className={uiStyles.alertList}>
                {ADMIN_ALERTS.slice(0, 3).map((item) => (
                    <AlertItem key={item.id} item={item} onClick={() => setSelectedAlert(item)} />
                ))}
            </div>

            {selectedAlert && (
                <DetailFieldsModal
                    title={selectedAlert.title}
                    onClose={() => setSelectedAlert(null)}
                    fields={[
                        { label: "Nội dung", value: selectedAlert.message },
                        { label: "Thời gian", value: selectedAlert.time },
                    ]}
                />
            )}

            {showAllList && (
                <DetailListModal
                    title="Toàn bộ cảnh báo hệ thống"
                    items={ADMIN_ALERTS}
                    onClose={() => setShowAllList(false)}
                    onItemClick={(item) => {
                        setSelectedAlert(item);
                    }}
                    renderPrimary={(item) => item.title}
                    renderSecondary={(item) => `${item.message} · ${item.time}`}
                />
            )}
        </Section>
    );
};
