import { useEffect, useMemo, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import { Modal, StatusBadge } from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import { ElderTreeView } from "../ElderTreeView/ElderTreeView";
import { filterTree } from "../utils/doctorTree";
import styles from "./PatientStatus.module.css";

export const PatientStatus = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [facilities, setFacilities] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getDoctorDashboard();
                setFacilities(data || []);
            } catch (err) {
                setError("Không thể tải tình trạng cụ.");
                console.error("PatientStatus fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Danh sách 3 cụ cần chú ý nhất để hiện preview (chỉ báo động/bất thường)
    const attentionPreview = useMemo(() => {
        const filtered = filterTree(facilities, { statusFilter: "Báo động" });
        const flat = [];
        filtered.forEach((f) =>
            f.zones.forEach((z) =>
                z.rooms.forEach((r) =>
                    r.elders.forEach((e) =>
                        flat.push({ ...e, room_number: r.room_number, zone_name: z.zone_name })
                    )
                )
            )
        );
        return flat.slice(0, 3);
    }, [facilities]);

    const modalTree = useMemo(
        () => filterTree(facilities, { search, statusFilter }),
        [facilities, search, statusFilter]
    );

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
                {attentionPreview.map((patient) => (
                    <div key={patient.elder_id} className={styles.item}>
                        <button
                            type="button"
                            className={styles.name}
                            onClick={() =>
                                setSelectedPatient({
                                    ...patient,
                                    health: "Báo động",
                                })
                            }
                        >
                            {patient.full_name}
                        </button>

                        <div className={styles.itemRight}>
                            <span className={styles.condition}>
                                {patient.zone_name} · {patient.room_number}
                            </span>
                            <StatusBadge status="Báo động" />
                        </div>
                    </div>
                ))}

                {!attentionPreview.length && (
                    <p className={styles.emptyMessage}>Không có cảnh báo sức khỏe nào cần chú ý ngay.</p>
                )}
            </div>

            {showAllModal && (
                <Modal title="Tình trạng sức khỏe tất cả cụ" onClose={() => setShowAllModal(false)} wide>
                    <div className={uiStyles.filterBar}>
                        <input
                            type="text"
                            className={uiStyles.searchInput}
                            placeholder="Tìm theo tên cụ hoặc số phòng..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            className={uiStyles.filterSelect}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tất cả tình trạng</option>
                            <option value="Báo động">Báo động</option>
                            <option value="Bất thường">Bất thường</option>
                            <option value="Chưa đo">Chưa đo</option>
                            <option value="Ổn định">Ổn định</option>
                        </select>
                    </div>

                    <ElderTreeView
                        facilities={modalTree}
                        onElderClick={(elder) => {
                            setShowAllModal(false);
                            setSelectedPatient(elder);
                        }}
                    />
                </Modal>
            )}

            {selectedPatient && (
                <Modal title="Hồ sơ sức khỏe của cụ" onClose={() => setSelectedPatient(null)}>
                    <div className={uiStyles.profile}>
                        <div className={uiStyles.profileAvatar}>
                            {(selectedPatient.full_name ?? selectedPatient.elder_name ?? "?").charAt(0)}
                        </div>
                        <h3 className={styles.profileName}>
                            {selectedPatient.full_name ?? selectedPatient.elder_name}
                        </h3>
                        <p>
                            <b>Cơ sở:</b> {selectedPatient.facility_name ?? "—"}
                        </p>
                        <p>
                            <b>Khu / Phòng:</b> {selectedPatient.zone_name} · {selectedPatient.room_number}
                        </p>
                        <p>
                            <b>Trạng thái sức khỏe:</b> <StatusBadge status={selectedPatient.health} />
                        </p>
                        {selectedPatient.note && (
                            <p>
                                <b>Ghi chú:</b> {selectedPatient.note}
                            </p>
                        )}
                    </div>
                </Modal>
            )}
        </section>
    );
};