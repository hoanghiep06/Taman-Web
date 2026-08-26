import { useEffect, useMemo, useState } from "react";

import { dashboardApi } from "../../../api/dashboardApi";
import { StatCard, Modal } from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import { ElderTreeView } from "../ElderTreeView/ElderTreeView";
import { countTree, filterTree } from "../utils/doctorTree";

import styles from "./DoctorOverview.module.css";

export const DoctorOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [facilities, setFacilities] = useState([]);
    const [activeView, setActiveView] = useState(null); // "elders" | "attention" | null
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getDoctorDashboard();
                setFacilities(data || []);
            } catch (err) {
                setError("Không thể tải dữ liệu tổng quan.");
                console.error("DoctorOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const { total, attention } = countTree(facilities);

    const treeForView = useMemo(() => {
        if (activeView === "attention") {
            return filterTree(facilities, { search, statusFilter: "Báo động" });
        }
        return filterTree(facilities, { search, statusFilter: "all" });
    }, [facilities, search, activeView]);

    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;

    return (
        <>
            <div className={styles.grid}>
                <StatCard
                    title="Tổng số cụ"
                    value={total}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => {
                        setSearch("");
                        setActiveView("elders");
                    }}
                />

                <StatCard
                    title="Cần chú ý"
                    value={attention}
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => {
                        setSearch("");
                        setActiveView("attention");
                    }}
                />
            </div>

            {activeView && (
                <Modal
                    title={activeView === "attention" ? "Cụ cần chú ý" : "Danh sách cụ"}
                    onClose={() => setActiveView(null)}
                    wide
                >
                    <div className={uiStyles.filterBar}>
                        <input
                            type="text"
                            className={uiStyles.searchInput}
                            placeholder="Tìm theo tên cụ hoặc số phòng..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <ElderTreeView facilities={treeForView} />
                </Modal>
            )}
        </>
    );
};