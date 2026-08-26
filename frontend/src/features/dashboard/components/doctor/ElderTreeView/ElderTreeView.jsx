import { useState } from "react";
import { StatusBadge, EmptyState } from "../../ui/DashboardUI";
import { getElderHealthStatus, getElderNote } from "../utils/doctorTree";
import styles from "./ElderTreeView.module.css";

/**
 * Hiển thị cây Cơ sở -> Khu -> Phòng -> Cụ. Khu có thể thu gọn/mở rộng.
 * facilities: dữ liệu đã qua filterTree (hoặc nguyên bản nếu không cần lọc)
 */
export const ElderTreeView = ({ facilities, onElderClick }) => {
    const [collapsedZones, setCollapsedZones] = useState({});

    const toggleZone = (zoneId) => {
        setCollapsedZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
    };

    const hasAnyElder = (facilities || []).some((f) =>
        (f.zones || []).some((z) => (z.rooms || []).some((r) => (r.elders || []).length > 0))
    );

    if (!hasAnyElder) {
        return <EmptyState message="Không tìm thấy cụ nào phù hợp." />;
    }

    return (
        <div className={styles.tree}>
            {facilities.map((facility) => (
                <div key={facility.facility_id} className={styles.facility}>
                    <div className={styles.facilityHeader}>
                        <strong>{facility.facility_name}</strong>
                        <span className={styles.shiftTag}>
                            Ca {facility.active_shift_type === "Sang" ? "sáng" : "tối"} · {facility.active_shift_date}
                        </span>
                    </div>

                    {facility.zones.map((zone) => {
                        const isCollapsed = collapsedZones[zone.zone_id];
                        const elderCount = zone.rooms.reduce((sum, r) => sum + r.elders.length, 0);

                        return (
                            <div key={zone.zone_id} className={styles.zone}>
                                <button
                                    type="button"
                                    className={styles.zoneHeader}
                                    onClick={() => toggleZone(zone.zone_id)}
                                >
                                    <span className={styles.chevronIcon} data-collapsed={!!isCollapsed}>
                                        ▾
                                    </span>
                                    <span>Khu {zone.zone_name}</span>
                                    <span className={styles.zoneCount}>{elderCount} cụ</span>
                                </button>

                                {!isCollapsed && (
                                    <div className={styles.roomList}>
                                        {zone.rooms.map((room) => (
                                            <div key={room.room_id} className={styles.room}>
                                                <div className={styles.roomHeader}>
                                                    Phòng {room.room_number}
                                                </div>

                                                {room.elders.map((elder) => {
                                                    const health = getElderHealthStatus(elder);
                                                    const note = getElderNote(elder);

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={elder.elder_id}
                                                            className={styles.elderRow}
                                                            onClick={() =>
                                                                onElderClick &&
                                                                onElderClick({
                                                                    ...elder,
                                                                    room_number: room.room_number,
                                                                    zone_name: zone.zone_name,
                                                                    facility_name: facility.facility_name,
                                                                    health,
                                                                    note,
                                                                })
                                                            }
                                                        >
                                                            <div className={styles.elderInfo}>
                                                                <strong>{elder.full_name}</strong>
                                                                <span>{note}</span>
                                                            </div>
                                                            <StatusBadge status={health} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};