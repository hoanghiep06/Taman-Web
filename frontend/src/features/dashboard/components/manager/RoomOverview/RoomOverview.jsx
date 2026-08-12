import { useState } from "react";
import { MANAGER_ROOMS } from "../../../mock/dashboardMockData";
import { StatusBadge } from "../../ui/DashboardUI";
import styles from "./RoomOverview.module.css";

export const RoomOverview = () => {
    const [area, setArea] = useState("");
    const [roomSearch, setRoomSearch] = useState("");
    const [status, setStatus] = useState("");

    const filteredRooms = MANAGER_ROOMS.filter((item) => {
        return (
            (!area || item.area === area) &&
            (!roomSearch || item.room === roomSearch) &&
            (!status || item.status === status)
        );
    });

    return (
        <section className={styles.card}>
            <h2>Phòng</h2>

            <div className={styles.filters} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "12px 0" }}>
                <select
                    value={area}
                    onChange={(e) => {
                        setArea(e.target.value);
                        setRoomSearch(""); // reset room select when area changes to avoid mismatch
                    }}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                >
                    <option value="">Tất cả khu</option>
                    <option value="Khu A">Khu A</option>
                    <option value="Khu B">Khu B</option>
                </select>

                <select
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                >
                    <option value="">Tất cả phòng</option>
                    {MANAGER_ROOMS.filter(r => !area || r.area === area).map((item) => (
                        <option key={item.room} value={item.room}>
                            {item.room}
                        </option>
                    ))}
                </select>

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Trống">Trống</option>
                    <option value="Đầy">Đầy</option>
                </select>
            </div>

            <div className={styles.list} style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                {filteredRooms.map((item) => (
                    <div
                        key={item.room}
                        className={styles.item}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderBottom: "1px solid #f1f5f9"
                        }}
                    >
                        <div>
                            <strong style={{ color: "#0f172a" }}>{item.room}</strong>
                            <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>({item.area})</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", color: "#64748b" }}>{item.beds}</span>
                            <StatusBadge status={item.status} />
                        </div>
                    </div>
                ))}

                {!filteredRooms.length && <p style={{ color: "#64748b", textAlign: "center", padding: "16px" }}>Không tìm thấy phòng phù hợp.</p>}
            </div>
        </section>
    );
};