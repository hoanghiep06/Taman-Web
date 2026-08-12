import { useState } from "react";

import { DOCTOR_CARE_REPORTS } from "../../../mock/dashboardMockData";
import { Modal } from "../../ui/DashboardUI";

import styles from "./CaregiverReports.module.css";

const ReportsTable = ({ reports }) => (
    <div className={styles.tableWrapper}>
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Người gửi</th>
                    <th>Cụ</th>
                    <th>Hoạt động</th>
                    <th>Lưu ý</th>
                    <th>Thời gian</th>
                </tr>
            </thead>

            <tbody>
                {reports.map((report, index) => (
                    <tr key={report.id ?? index}>
                        <td className={styles.caregiverCell}>{report.caregiver}</td>
                        <td>{report.elder}</td>
                        <td>{report.activity}</td>
                        <td className={styles.noteCell}>{report.note}</td>
                        <td className={styles.timeCell}>{report.time}</td>
                    </tr>
                ))}

                {!reports.length && (
                    <tr>
                        <td colSpan="5" className={styles.emptyCell}>
                            Không có báo cáo nào từ người chăm sóc.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

export const CaregiverReports = () => {
    const [showAllModal, setShowAllModal] = useState(false);

    const recentReports = DOCTOR_CARE_REPORTS.slice(0, 3);

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Báo cáo từ người chăm sóc</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowAllModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <ReportsTable reports={recentReports} />

            {showAllModal && (
                <Modal
                    title="Tất cả báo cáo từ người chăm sóc"
                    onClose={() => setShowAllModal(false)}
                    wide
                >
                    <ReportsTable reports={DOCTOR_CARE_REPORTS} />
                </Modal>
            )}
        </section>
    );
};