import { useEffect, useState } from "react";

import { StatCard, DetailListModal, Modal } from "../../ui/DashboardUI";
import { dashboardApi } from "../../../api/dashboardApi";

import uiStyles from "../../ui/DashboardUI.module.css";

const ROLE_KEYS = {
    Manager: "managers",
    Doctor: "doctors",
    Caregiver: "caregivers",
    Coordinator: "coordinators",
};

export const AdminOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [users, setUsers] = useState([]);
    const [elders, setElders] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [rooms, setRooms] = useState([]);

    // "elders" | "managers" | "doctors" | "caregivers" | "coordinators" | null
    const [peopleType, setPeopleType] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [usersData, eldersData, facilitiesData, roomsData] = await Promise.all([
                    dashboardApi.getUsers(),
                    dashboardApi.getElders(),
                    dashboardApi.getFacilities(),
                    dashboardApi.getRooms(),
                ]);

                setUsers(usersData || []);
                setElders(eldersData || []);
                setFacilities(facilitiesData || []);
                setRooms(roomsData || []);
            } catch (err) {
                setError("Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
                console.error("AdminOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const facilityNameById = facilities.reduce((acc, f) => {
        acc[f.id] = f.name;
        return acc;
    }, {});

    const getFacilityName = (facilityId) =>
        facilityNameById[facilityId] ?? `Cơ sở #${facilityId}`;

    const roomById = rooms.reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
    }, {});

    const usersByRole = Object.entries(ROLE_KEYS).reduce((acc, [roleValue, key]) => {
        acc[key] = users.filter((u) => u.role === roleValue);
        return acc;
    }, {});

    const facilityIds = facilities.map((f) => f.id);

    // Gắn sẵn facility_id/facility_name/room_number cho từng cụ dựa trên room_id
    const eldersWithFacility = elders.map((e) => {
        const room = roomById[e.room_id];
        return {
            ...e,
            facility_id: room?.facility_id ?? null,
            facility_name: room?.facility_name ?? "Chưa xác định",
            room_number: room?.room_number ?? "—",
            zone_name: room?.zone_name ?? "—",
        };
    });

    const PEOPLE_CONFIG = {
        elders: {
            title: "Danh sách cụ",
            data: eldersWithFacility,
            renderPrimary: (e) => e.full_name,
            renderSecondary: (e) => `${e.facility_name} · Phòng ${e.room_number}`,
            enableFilter: true,
        },
        managers: {
            title: "Danh sách Manager",
            data: usersByRole.managers,
            renderPrimary: (u) => u.full_name,
            renderSecondary: (u) => `${getFacilityName(u.facility_id)} · ${u.is_active ? "Đang hoạt động" : "Đã khóa"}`,
            enableFilter: true,
        },
        doctors: {
            title: "Danh sách Doctor",
            data: usersByRole.doctors,
            renderPrimary: (u) => u.full_name,
            renderSecondary: (u) => `${getFacilityName(u.facility_id)} · ${u.is_active ? "Đang hoạt động" : "Đã khóa"}`,
            enableFilter: true,
        },
        caregivers: {
            title: "Danh sách Caregiver",
            data: usersByRole.caregivers,
            renderPrimary: (u) => u.full_name,
            renderSecondary: (u) => `${getFacilityName(u.facility_id)} · ${u.is_active ? "Đang hoạt động" : "Đã khóa"}`,
            enableFilter: true,
        },
        coordinators: {
            title: "Danh sách Coordinator",
            data: usersByRole.coordinators,
            renderPrimary: (u) => u.full_name,
            renderSecondary: (u) => `${getFacilityName(u.facility_id)} · ${u.is_active ? "Đang hoạt động" : "Đã khóa"}`,
            enableFilter: true,
        },
    };

    const activeConfig = peopleType ? PEOPLE_CONFIG[peopleType] : null;

    if (loading) {
        return <div className={uiStyles.emptyState}>Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className={uiStyles.emptyState}>{error}</div>;
    }

    return (
        <>
            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng cụ"
                    value={elders.length}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setPeopleType("elders")}
                />

                <StatCard
                    title="Manager"
                    value={usersByRole.managers.length}
                    icon="👔"
                    color="#7c3aed"
                    onClick={() => setPeopleType("managers")}
                />

                <StatCard
                    title="Doctor"
                    value={usersByRole.doctors.length}
                    icon="🩺"
                    color="#059669"
                    onClick={() => setPeopleType("doctors")}
                />

                <StatCard
                    title="Caregiver"
                    value={usersByRole.caregivers.length}
                    icon="🤝"
                    color="#ea580c"
                    onClick={() => setPeopleType("caregivers")}
                />

                <StatCard
                    title="Coordinator"
                    value={usersByRole.coordinators.length}
                    icon="📋"
                    color="#0891b2"
                    onClick={() => setPeopleType("coordinators")}
                />
            </div>

            {activeConfig && (
                <DetailListModal
                    title={activeConfig.title}
                    items={activeConfig.data}
                    onClose={() => setPeopleType(null)}
                    onItemClick={(person) => setSelectedPerson(person)}
                    renderPrimary={activeConfig.renderPrimary}
                    renderSecondary={activeConfig.renderSecondary}
                    enableSearch
                    enableFilter={activeConfig.enableFilter}
                    filterKey="facility_id"
                    filterLabel="cơ sở"
                    filterOptions={facilityIds}
                    getFilterLabel={getFacilityName}
                />
            )}

            {selectedPerson && (
                <Modal title="Profile" onClose={() => setSelectedPerson(null)}>
                    <div className={uiStyles.profile}>
                        <div className={uiStyles.profileAvatar}>
                            {(selectedPerson.full_name ?? "?").charAt(0)}
                        </div>

                        <h3>{selectedPerson.full_name}</h3>

                        {selectedPerson.role && (
                            <p>
                                <b>Vai trò:</b> {selectedPerson.role}
                            </p>
                        )}

                        {selectedPerson.facility_name && (
                            <p>
                                <b>Cơ sở:</b> {selectedPerson.facility_name}
                            </p>
                        )}

                        {!selectedPerson.facility_name && "facility_id" in selectedPerson && (
                            <p>
                                <b>Cơ sở:</b> {getFacilityName(selectedPerson.facility_id)}
                            </p>
                        )}

                        {selectedPerson.zone_name && selectedPerson.zone_name !== "—" && (
                            <p>
                                <b>Phân khu:</b> {selectedPerson.zone_name}
                            </p>
                        )}

                        {selectedPerson.room_number && (
                            <p>
                                <b>Phòng:</b> {selectedPerson.room_number}
                            </p>
                        )}

                        {selectedPerson.phone_number && (
                            <p>
                                <b>Số điện thoại:</b> {selectedPerson.phone_number}
                            </p>
                        )}

                        {"is_active" in selectedPerson && (
                            <p>
                                <b>Trạng thái:</b> {selectedPerson.is_active ? "Đang hoạt động" : "Đã khóa"}
                            </p>
                        )}

                        {selectedPerson.gender && (
                            <p>
                                <b>Giới tính:</b> {selectedPerson.gender}
                            </p>
                        )}

                        {selectedPerson.date_of_birth && (
                            <p>
                                <b>Ngày sinh:</b> {selectedPerson.date_of_birth}
                            </p>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
};