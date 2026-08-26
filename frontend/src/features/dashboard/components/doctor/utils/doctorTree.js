export const STATUS_TAG_LABEL = {
    NOT_MEASURED: "Chưa đo",
    NORMAL: "Ổn định",
    ABNORMAL: "Bất thường",
};

export const getElderHealthStatus = (elder) => {
    if (elder.has_abnormal_vital) return "Báo động";
    if (elder.status_tag === "NOT_MEASURED") return "Chưa đo";
    if (elder.status_tag === "ABNORMAL") return "Bất thường";
    return "Ổn định";
};

export const getElderNote = (elder) => {
    if (elder.latest_vital) {
        const v = elder.latest_vital;
        return `HA ${v.bp_systolic}/${v.bp_diastolic} · SpO₂ ${v.spo2}% · Nhiệt độ ${v.temperature}°C`;
    }
    return STATUS_TAG_LABEL[elder.status_tag] || "Chưa có dữ liệu sinh hiệu";
};

/**
 * Đếm tổng số cụ và số cụ cần chú ý (báo động/bất thường) trên toàn cây.
 */
export const countTree = (facilities) => {
    let total = 0;
    let attention = 0;

    (facilities || []).forEach((facility) => {
        (facility.zones || []).forEach((zone) => {
            (zone.rooms || []).forEach((room) => {
                (room.elders || []).forEach((elder) => {
                    total += 1;
                    if (elder.has_abnormal_vital || elder.status_tag === "ABNORMAL") {
                        attention += 1;
                    }
                });
            });
        });
    });

    return { total, attention };
};

/**
 * Lọc cây theo từ khóa tìm kiếm (tên cụ / số phòng) và theo trạng thái sức khỏe.
 * Trả về cây mới, đã loại bỏ các nhánh (khu/phòng/cơ sở) không còn cụ nào khớp.
 */
export const filterTree = (facilities, { search = "", statusFilter = "all" } = {}) => {
    const keyword = search.trim().toLowerCase();

    return (facilities || [])
        .map((facility) => {
            const zones = (facility.zones || [])
                .map((zone) => {
                    const rooms = (zone.rooms || [])
                        .map((room) => {
                            const elders = (room.elders || []).filter((elder) => {
                                const health = getElderHealthStatus(elder);
                                const matchesStatus = statusFilter === "all" || health === statusFilter;
                                const matchesSearch =
                                    !keyword ||
                                    elder.full_name.toLowerCase().includes(keyword) ||
                                    room.room_number.toLowerCase().includes(keyword);
                                return matchesStatus && matchesSearch;
                            });
                            return { ...room, elders };
                        })
                        .filter((room) => room.elders.length > 0);
                    return { ...zone, rooms };
                })
                .filter((zone) => zone.rooms.length > 0);
            return { ...facility, zones };
        })
        .filter((facility) => facility.zones.length > 0);
};

/**
 * Chỉ dùng nội bộ cho Notification (thông báo cần dạng danh sách phẳng, không cần cây).
 */
export const flattenAttentionElders = (facilities) => {
    const result = [];

    (facilities || []).forEach((facility) => {
        (facility.zones || []).forEach((zone) => {
            (zone.rooms || []).forEach((room) => {
                (room.elders || []).forEach((elder) => {
                    if (elder.has_abnormal_vital) {
                        result.push({
                            elder_id: elder.elder_id,
                            elder_name: elder.full_name,
                            room_number: room.room_number,
                            zone_name: zone.zone_name,
                            facility_name: facility.facility_name,
                            note: getElderNote(elder),
                            measured_at: elder.latest_vital?.measured_at,
                        });
                    }
                });
            });
        });
    });

    return result;
};