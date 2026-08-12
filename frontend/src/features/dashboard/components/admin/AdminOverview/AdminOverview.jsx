import { useState } from "react";

import { StatCard, DetailListModal, Modal } from "../../ui/DashboardUI";
import { ADMIN_STATS, ADMIN_PEOPLE } from "../../../mock/dashboardMockData";

import uiStyles from "../../ui/DashboardUI.module.css";

/* Cấu hình từng loại người theo stat card, khớp key trong ADMIN_PEOPLE */
const PEOPLE_CONFIG = {
    elders: { title: "Danh sách cụ", data: ADMIN_PEOPLE.elders },
    managers: { title: "Danh sách Manager", data: ADMIN_PEOPLE.managers },
    doctors: { title: "Danh sách Doctor", data: ADMIN_PEOPLE.doctors },
    caregivers: { title: "Danh sách Caregiver", data: ADMIN_PEOPLE.caregivers },
    coordinators: { title: "Danh sách Coordinator", data: ADMIN_PEOPLE.coordinators },
};

export const AdminOverview = () => {
    // "elders" | "managers" | "doctors" | "caregivers" | "coordinators" | null
    const [peopleType, setPeopleType] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);

    return (
        <>
            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng cụ"
                    value={ADMIN_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setPeopleType("elders")}
                />

                <StatCard
                    title="Manager"
                    value={ADMIN_STATS.managers}
                    icon="👔"
                    color="#7c3aed"
                    onClick={() => setPeopleType("managers")}
                />

                <StatCard
                    title="Doctor"
                    value={ADMIN_STATS.doctors}
                    icon="🩺"
                    color="#059669"
                    onClick={() => setPeopleType("doctors")}
                />

                <StatCard
                    title="Caregiver"
                    value={ADMIN_STATS.caregivers}
                    icon="🤝"
                    color="#ea580c"
                    onClick={() => setPeopleType("caregivers")}
                />

                <StatCard
                    title="Coordinator"
                    value={ADMIN_STATS.coordinators}
                    icon="📋"
                    color="#0891b2"
                    onClick={() => setPeopleType("coordinators")}
                />
            </div>

            {peopleType && (
                <DetailListModal
                    title={PEOPLE_CONFIG[peopleType].title}
                    items={PEOPLE_CONFIG[peopleType].data}
                    onClose={() => setPeopleType(null)}
                    onItemClick={(person) => setSelectedPerson(person)}
                    renderPrimary={(person) => person.name}
                    renderSecondary={(person) => `${person.facility} · ${person.detail}`}
                    enableSearch
                    enableFilter
                    filterKey="facility"
                    filterLabel="cơ sở"
                />
            )}

            {selectedPerson && (
                <Modal title="Profile" onClose={() => setSelectedPerson(null)}>
                    <div className={uiStyles.profile}>
                        <div className={uiStyles.profileAvatar}>
                            {selectedPerson.name.charAt(0)}
                        </div>

                        <h3>{selectedPerson.name}</h3>

                        <p>
                            <b>Vai trò:</b> {selectedPerson.role}
                        </p>

                        <p>
                            <b>Cơ sở:</b> {selectedPerson.facility}
                        </p>

                        <p>
                            <b>Thông tin:</b> {selectedPerson.detail}
                        </p>
                    </div>
                </Modal>
            )}
        </>
    );
};