import { useEffect, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import { DetailListModal, Modal, StatusBadge } from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./PatientStatus.module.css";

const STATUS_PRIORITY = { "Báo động": 1, "Cần chú ý": 2, "Ổn định": 3 };

const getHealthStatus = (elder) => {
    if (elder.has_abnormal_vital) return "Báo động";
    if ((elder.doctor_attention_reasons || []).length > 0) return "Cần chú ý";
    return "Ổn định";
};

const getNote = (elder) => {
    if ((elder.doctor_attention_reasons || []).length) {
        return elder.doctor_attention_reasons.join(", ");
    }
    if (elder.latest_vital_signs) {
        const v = elder.latest_vital_signs;
        return `HA ${v.bp_systolic}/${v.bp_diastolic} · SpO₂ ${v.spo2}% · Nhiệt độ ${v.temperature}°C`;
    }
    return "Chưa có dữ liệu sinh hiệu";
};

export const PatientStatus = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elders, setElders] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getDoctorDashboard();
                setElders(data || []);
            } catch (err) {
                setError("Không thể tải tình trạng cụ.");
                console.error("PatientStatus fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const eldersWithStatus = elders.map((e) => ({
        ...e,
        health: getHealthStatus(e),
        note: getNote(e),
    }));

    const sortedPatients = [...eldersWithStatus].sort(
        (a, b) => STATUS_PRIORITY[a.health] - STATUS_PRIORITY[b.health]
    );

    const visibleAlerts = sortedPatients.slice(0, 3);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Tình trạng cụ</h2>
                <p className={styles.emptyMessage}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Tình trạng cụ</h2>
                <p className={styles.emptyMessage}>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Tình trạng cụ</h2>
                <button type="button" className={styles.viewAllButton} onClick={() => setShowAllModal(true)}>
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {visibleAlerts.map((patient) => (
                    <div key={patient.elder_id} className={styles.item}>
                        <button
                            type="button"
                            className={styles.name}
                            onClick={() => setSelectedPatient(patient)}
                        >
                            {patient.elder_name}
                        </button>

                        <div className={styles.itemRight}>
                            <span className={styles.condition}>
                                {patient.room_number} · {patient.note}
                            </span>
                            <StatusBadge status={patient.health} />
                        </div>
                    </div>
                ))}

                {!sortedPatients.length && (
                    <p className={styles.emptyMessage}>Không có cảnh báo sức khỏe của cụ nào.</p>
                )}
            </div>

            {showAllModal && (
                <DetailListModal
                    title="Tình trạng sức khỏe tất cả cụ"
                    items={sortedPatients}
                    onClose={() => setShowAllModal(false)}
                    onItemClick={(item) => {
                        setShowAllModal(false);
                        setSelectedPatient(item);
                    }}
                    renderPrimary={(p) => p.elder_name}
                    renderSecondary={(p) => `Phòng: ${p.room_number} · Ghi chú: ${p.note}`}
                    renderBadge={(p) => <StatusBadge status={p.health} />}
                    enableSearch
                    searchKeys={["room_number"]}
                    enableFilter
                    filterKey="health"
                    filterLabel="tình trạng"
                    filterOptions={["Báo động", "Cần chú ý", "Ổn định"]}
                />
            )}

            {selectedPatient && (
                <Modal title="Hồ sơ sức khỏe của cụ" onClose={() => setSelectedPatient(null)}>
                    <div className={uiStyles.profile}>
                        <div className={uiStyles.profileAvatar}>
                            {selectedPatient.elder_name.charAt(0)}
                        </div>
                        <h3 className={styles.profileName}>{selectedPatient.elder_name}</h3>
                        <p><b>Phòng ở:</b> {selectedPatient.room_number}</p>
                        <p><b>Trạng thái sức khỏe:</b> <StatusBadge status={selectedPatient.health} /></p>
                        <p><b>Chẩn đoán/Lưu ý:</b> {selectedPatient.note}</p>
                        {selectedPatient.active_prescription_url && (
                            <p>
                                <b>Đơn thuốc hiện tại:</b>{" "}
                                <a href={selectedPatient.active_prescription_url} target="_blank" rel="noreferrer">
                                    Xem đơn thuốc
                                </a>
                            </p>
                        )}
                    </div>
                </Modal>
            )}
        </section>
    );
};