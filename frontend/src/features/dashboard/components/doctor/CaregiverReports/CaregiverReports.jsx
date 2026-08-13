import { useEffect, useState } from "react";

import { dashboardApi } from "../../../api/dashboardApi";
import { DetailListModal, Modal } from "../../ui/DashboardUI";

import styles from "./CaregiverReports.module.css";

const formatDate = (dateString) => new Date(dateString).toLocaleDateString("vi-VN");

const formatDateTime = (isoString) =>
    new Date(isoString).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });

export const CaregiverReports = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reports, setReports] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getShiftReportsArchive({ limit_days: 14 });
                const sorted = [...(data || [])].sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
                setReports(sorted);
            } catch (err) {
                setError("Không thể tải báo cáo giao ca.");
                console.error("CaregiverReports fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const recentReports = reports.slice(0, 3);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Báo cáo giao ca</h2>
                <p className={styles.emptyMessage}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Báo cáo giao ca</h2>
                <p className={styles.emptyMessage}>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Báo cáo giao ca</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowAllModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {recentReports.map((report) => (
                    <button
                        key={report.id}
                        type="button"
                        className={styles.item}
                        onClick={() => setSelectedReport(report)}
                    >
                        <div className={styles.itemHeader}>
                            <strong>{report.reporter_name}</strong>
                            <span className={styles.shiftTag}>
                                Ca {report.shift_type === "Sang" ? "sáng" : "tối"} · {formatDate(report.shift_date)}
                            </span>
                        </div>

                        <p className={styles.notePreview}>{report.handover_notes}</p>
                    </button>
                ))}

                {!recentReports.length && (
                    <p className={styles.emptyMessage}>Chưa có báo cáo giao ca nào.</p>
                )}
            </div>

            {showAllModal && (
                <DetailListModal
                    title="Toàn bộ báo cáo giao ca"
                    items={reports}
                    onClose={() => setShowAllModal(false)}
                    onItemClick={(report) => {
                        setShowAllModal(false);
                        setSelectedReport(report);
                    }}
                    renderPrimary={(r) => r.reporter_name}
                    renderSecondary={(r) =>
                        `Ca ${r.shift_type === "Sang" ? "sáng" : "tối"} · ${formatDate(r.shift_date)} · ${r.handover_notes}`
                    }
                    enableSearch
                    searchKeys={["handover_notes", "shift_type"]}
                    enableFilter
                    filterKey="shift_type"
                    filterLabel="ca trực"
                    filterOptions={["Sang", "Toi"]}
                    getFilterLabel={(v) => (v === "Sang" ? "Ca sáng" : "Ca tối")}
                />
            )}

            {selectedReport && (
                <Modal
                    title={`Báo cáo ${selectedReport.shift_type === "Sang" ? "ca sáng" : "ca tối"} · ${formatDate(selectedReport.shift_date)}`}
                    onClose={() => setSelectedReport(null)}
                    wide
                >
                    <div className={styles.detail}>
                        <p><b>Người báo cáo:</b> {selectedReport.reporter_name}</p>
                        <p><b>Cơ sở:</b> {selectedReport.facility_name}</p>
                        <p><b>Thời gian nộp:</b> {formatDateTime(selectedReport.created_at)}</p>

                        <div className={styles.section}>
                            <h3>Ghi chú bàn giao</h3>
                            <p>{selectedReport.handover_notes || "Không có ghi chú."}</p>
                        </div>

                        <div className={styles.section}>
                            <h3>Diễn biến các cụ trong ca</h3>
                            <p className={styles.elderDescriptions}>
                                {selectedReport.formatted_elder_descriptions || "Không có diễn biến bất thường."}
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};