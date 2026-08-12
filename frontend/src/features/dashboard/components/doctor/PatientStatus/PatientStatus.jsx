import { useState } from "react";
import {
    DOCTOR_ELDERS_LIST,
    DOCTOR_ALERTS,
} from "../../../mock/dashboardMockData";
import { DetailListModal, Modal, StatusBadge } from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./PatientStatus.module.css";

/**
 * Thứ tự ưu tiên trạng thái:
 * 1. Báo động
 * 2. Cần chú ý
 * 3. Ổn định
 */
const STATUS_PRIORITY = {
    "Báo động": 1,
    "Cần chú ý": 2,
    "Ổn định": 3,
};

/**
 * Chuẩn hóa trạng thái về đúng 3 trạng thái duy nhất.
 */
const normalizeHealthStatus = (status) => {
    const value = String(status || "").toLowerCase().trim();

    if (
        value.includes("báo động") ||
        value.includes("danger") ||
        value.includes("khẩn")
    ) {
        return "Báo động";
    }

    if (
        value.includes("cần chú ý") ||
        value.includes("cần theo dõi") ||
        value.includes("theo dõi") ||
        value.includes("warning")
    ) {
        return "Cần chú ý";
    }

    return "Ổn định";
};

/**
 * Lấy thông tin cụ đầy đủ từ DOCTOR_ELDERS_LIST
 * dựa trên tên xuất hiện trong DOCTOR_ALERTS.
 */
const getPatientInfo = (alert) => {
    const patient = DOCTOR_ELDERS_LIST.find(
        (elder) => elder.name === alert.name
    );

    if (!patient) {
        return {
            ...alert,
            health: normalizeHealthStatus(
                alert.severity === "danger"
                    ? "Báo động"
                    : alert.severity === "warning"
                      ? "Cần chú ý"
                      : "Ổn định"
            ),
        };
    }

    return {
        ...patient,
        condition: alert.condition,
        health: normalizeHealthStatus(patient.health),
    };
};

export const PatientStatus = () => {
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    /**
     * Danh sách cảnh báo hiển thị ngoài dashboard.
     * Chỉ hiển thị tối đa 3 cụ.
     *
     * Trạng thái được lấy từ DOCTOR_ELDERS_LIST,
     * không lấy trực tiếp từ severity để tránh lệch trạng thái.
     */
    const visibleAlerts = [...DOCTOR_ALERTS]
    .map(getPatientInfo)
    .sort(
        (a, b) =>
            STATUS_PRIORITY[a.health] - STATUS_PRIORITY[b.health]
    )
    .slice(0, 3);
    /**
     * Danh sách tất cả cụ.
     *
     * Sắp xếp:
     * Báo động -> Cần chú ý -> Ổn định
     */
    const sortedPatients = [...DOCTOR_ELDERS_LIST]
        .map((patient) => ({
            ...patient,
            health: normalizeHealthStatus(patient.health),
        }))
        .sort(
            (a, b) =>
                STATUS_PRIORITY[a.health] - STATUS_PRIORITY[b.health]
        );

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Tình trạng cụ</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowAllModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {visibleAlerts.map((patient) => (
                    <div
                        key={patient.id}
                        className={styles.item}
                    >
                        <button
                            type="button"
                            className={styles.name}
                            onClick={() => setSelectedPatient(patient)}
                        >
                            {patient.name}
                        </button>

                        <div className={styles.itemRight}>
                            <span className={styles.condition}>
                                {patient.room} ·{" "}
                                {patient.condition || patient.note}
                            </span>

                            <StatusBadge
                                status={normalizeHealthStatus(patient.health)}
                            />
                        </div>
                    </div>
                ))}

                {!DOCTOR_ALERTS.length && (
                    <p className={styles.emptyMessage}>
                        Không có cảnh báo sức khỏe của cụ nào.
                    </p>
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
                    renderPrimary={(patient) => patient.name}
                    renderSecondary={(patient) =>
                        `Phòng: ${patient.room} · Ghi chú: ${patient.note}`
                    }
                    renderBadge={(patient) => (
                        <StatusBadge
                            status={normalizeHealthStatus(patient.health)}
                        />
                    )}
                />
            )}

            {selectedPatient && (
                <Modal
                    title="Hồ sơ sức khỏe của cụ"
                    onClose={() => setSelectedPatient(null)}
                >
                    <div className={uiStyles.profile}>
                        <div className={uiStyles.profileAvatar}>
                            {selectedPatient.name.charAt(0)}
                        </div>

                        <h3 className={styles.profileName}>
                            {selectedPatient.name}
                        </h3>

                        <p>
                            <b>Phòng ở:</b> {selectedPatient.room}
                        </p>

                        <p>
                            <b>Trạng thái sức khỏe:</b>{" "}
                            <StatusBadge
                                status={normalizeHealthStatus(
                                    selectedPatient.health
                                )}
                            />
                        </p>

                        <p>
                            <b>Chẩn đoán/Lưu ý:</b>{" "}
                            {selectedPatient.note ||
                                selectedPatient.condition ||
                                "Không có ghi chú"}
                        </p>
                    </div>
                </Modal>
            )}
        </section>
    );
};
