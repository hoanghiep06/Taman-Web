import { useState } from "react";

import { Section, Modal } from "../../ui/DashboardUI";
import { ADMIN_ACTIVITIES } from "../../../mock/dashboardMockData";

import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./RecentActivity.module.css";

const ActivityRow = ({ item }) => (
    <div className={styles.activityItem}>
        <div>
            <strong>{item.user}</strong>

            <p>
                {item.action}: <b>{item.target}</b>
            </p>
        </div>

        <time>{item.time}</time>
    </div>
);

export const RecentActivity = () => {
    const [showAll, setShowAll] = useState(false);

    return (
        <Section
            title="Hoạt động gần đây"
            right={
                <button type="button" className={uiStyles.linkButton} onClick={() => setShowAll(true)}>
                    Xem tất cả →
                </button>
            }
        >
            <div className={styles.activityList}>
                {ADMIN_ACTIVITIES.slice(0, 3).map((item) => (
                    <ActivityRow key={item.id} item={item} />
                ))}
            </div>

            {showAll && (
                <Modal title="Toàn bộ hoạt động / audit log" onClose={() => setShowAll(false)}>
                    <div className={styles.activityList}>
                        {ADMIN_ACTIVITIES.map((item) => (
                            <ActivityRow key={item.id} item={item} />
                        ))}
                    </div>
                </Modal>
            )}
        </Section>
    );
};
