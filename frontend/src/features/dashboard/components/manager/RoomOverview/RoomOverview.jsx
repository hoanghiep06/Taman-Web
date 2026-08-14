import { useEffect, useMemo, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import { StatusBadge } from "../../ui/DashboardUI";
import styles from "./RoomOverview.module.css";

export const RoomOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [elders, setElders] = useState([]);

    const [zone, setZone] = useState("");
    const [roomSearch, setRoomSearch] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [roomsData, eldersData] = await Promise.all([
                    dashboardApi.getRooms(),
                    dashboardApi.getElders(),
                ]);
                setRooms(roomsData || []);
                setElders(eldersData || []);
            } catch (err) {
                setError("Không thể tải danh sách phòng.");
                console.error("RoomOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Đếm số cụ đang ở mỗi phòng, dùng để suy ra trạng thái Trống/Đang sử dụng
    const occupantCountByRoom = useMemo(() => {
        return elders.reduce((acc, e) => {
            acc[e.room_id] = (acc[e.room_id] || 0) + 1;
            return acc;
        }, {});
    }, [elders]);

    const roomsWithStatus = useMemo(() => {
        return rooms.map((r) => {
            const occupantCount = occupantCountByRoom[r.id] || 0;
            return {
                ...r,
                occupantCount,
                statusLabel: occupantCount > 0 ? "Đang sử dụng" : "Trống",
            };
        });
    }, [rooms, occupantCountByRoom]);

    const zoneOptions = useMemo(
        () => Array.from(new Set(rooms.map((r) => r.zone_name).filter(Boolean))),
        [rooms]
    );

    const filteredRooms = roomsWithStatus.filter((item) => {
        return (
            (!zone || item.zone_name === zone) &&
            (!roomSearch || item.room_number === roomSearch) &&
            (!status || item.statusLabel === status)
        );
    });

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Phòng</h2>
                <p className={styles.emptyMessage}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Phòng</h2>
                <p className={styles.emptyMessage}>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <h2>Phòng</h2>

            <div className={styles.filters}>
                <select
                    value={zone}
                    onChange={(e) => {
                        setZone(e.target.value);
                        setRoomSearch("");
                    }}
                >
                    <option value="">Tất cả khu</option>
                    {zoneOptions.map((z) => (
                        <option key={z} value={z}>
                            {z}
                        </option>
                    ))}
                </select>

                <select value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)}>
                    <option value="">Tất cả phòng</option>
                    {roomsWithStatus
                        .filter((r) => !zone || r.zone_name === zone)
                        .map((item) => (
                            <option key={item.id} value={item.room_number}>
                                {item.room_number}
                            </option>
                        ))}
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="Trống">Trống</option>
                    <option value="Đang sử dụng">Đang sử dụng</option>
                </select>
            </div>

            <div className={styles.list}>
                {filteredRooms.map((item) => (
                    <div key={item.id} className={styles.item}>
                        <div>
                            <strong>{item.room_number}</strong>
                            <span className={styles.zoneLabel}>({item.zone_name})</span>
                        </div>

                        <div className={styles.itemRight}>
                            <span className={styles.occupantCount}>{item.occupantCount} cụ đang ở</span>
                            <StatusBadge status={item.statusLabel} />
                        </div>
                    </div>
                ))}

                {!filteredRooms.length && (
                    <p className={styles.emptyMessage}>Không tìm thấy phòng phù hợp.</p>
                )}
            </div>
        </section>
    );
};