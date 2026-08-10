import { useMemo, useState } from "react";

import { useAuth } from "../../../contexts/AuthContext";
import { useIsDesktop } from "../../../hooks/useIsDesktop";

import { DashboardWebLayout } from "../layouts/DashboardWebLayout";
import { DashboardMobileLayout } from "../layouts/DashboardMobileLayout";
import { DashboardHeader } from "../components/Common/DashboardHeader/DashboardHeader";

import {
    ADMIN_STATS,
    ADMIN_PEOPLE,
    ADMIN_ALERTS,
    ADMIN_ACTIVITIES,
    MANAGER_RESIDENTS,
    MANAGER_ELDERS_LIST,
    MANAGER_ADMITTED_LIST,
    MANAGER_ATTENTION_LIST,
    MANAGER_APPOINTMENTS_LIST,
    MANAGER_STAFF,
    MANAGER_HEALTH_ALERTS,
    MANAGER_MEDICATIONS,
    MANAGER_ROOMS,
    MANAGER_INCOMPLETE_TASKS,
    DOCTOR_STATS,
    DOCTOR_ELDERS_LIST,
    DOCTOR_NOTIFICATIONS,
    DOCTOR_ALERTS,
    DOCTOR_APPOINTMENTS,
    DOCTOR_CARE_REPORTS,
    COORDINATOR_STATS,
    COORDINATOR_ELDERS_LIST,
    COORDINATOR_NOTIFICATIONS,
    COORDINATOR_TASK_STATS,
    COORDINATOR_TASKS,
    COORDINATOR_ATTENTION,
    COORDINATOR_SCHEDULE,
    CAREGIVER_STATS,
    CAREGIVER_ELDERS_LIST,
    CAREGIVER_NOTIFICATIONS,
    CAREGIVER_SHIFT,
    CAREGIVER_TASKS,
    CAREGIVER_NOTES,
} from "../mock/dashboardMockData";

import styles from "./DashboardPage.module.css";


/* =========================================================
   COMMON
========================================================= */

const ROLE_NAMES = {
    admin: "Admin",
    manager: "Manager",
    doctor: "Doctor",
    coordinator: "Coordinator",
    caregiver: "Caregiver",
    carestaff: "Caregiver",
};

const normalizeRole = (role) => {
    if (!role) return "";

    return String(role)
        .toLowerCase()
        .replace(/[\s_-]/g, "");
};


const StatCard = ({ title, value, icon, color, onClick }) => (
    <button
        type="button"
        className={styles.statCard}
        style={{ "--stat-color": color }}
        onClick={onClick}
        data-disabled={!onClick}
    >
        <div className={styles.statIcon}>{icon}</div>

        <div className={styles.statContent}>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    </button>
);


const Section = ({ title, right, children, className = "" }) => (
    <section className={`${styles.section} ${className}`}>
        <div className={styles.sectionHeader}>
            <h2>{title}</h2>
            {right}
        </div>

        {children}
    </section>
);


const EmptyState = ({ message = "Không có dữ liệu" }) => (
    <div className={styles.emptyState}>
        {message}
    </div>
);


const StatusBadge = ({ status }) => {
    const normalized = String(status).toLowerCase();

    let className = styles.statusInfo;

    if (
        normalized.includes("đầy") ||
        normalized.includes("quá hạn") ||
        normalized.includes("danger") ||
        normalized.includes("không")
    ) {
        className = styles.statusDanger;
    } else if (
        normalized.includes("trống") ||
        normalized.includes("hoàn thành") ||
        normalized.includes("active")
    ) {
        className = styles.statusSuccess;
    } else if (
        normalized.includes("làm") ||
        normalized.includes("warning")
    ) {
        className = styles.statusWarning;
    }

    return (
        <span className={`${styles.statusBadge} ${className}`}>
            {status}
        </span>
    );
};


const AlertItem = ({ item, onClick }) => {
    const content = (
        <>
            <div className={`${styles.alertDot} ${styles[item.type]}`} />

            <div className={styles.alertContent}>
                <strong>{item.title}</strong>
                <p>{item.message || item.description || item.condition}</p>
                {item.time && <small>{item.time}</small>}
            </div>
        </>
    );

    if (!onClick) {
        return <div className={styles.alertItem}>{content}</div>;
    }

    return (
        <button
            type="button"
            className={`${styles.rowButton} ${styles.alertItem}`}
            onClick={onClick}
        >
            {content}
        </button>
    );
};


const Modal = ({ title, children, onClose }) => (
    <div className={styles.modalOverlay} onClick={onClose}>
        <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
        >
            <div className={styles.modalHeader}>
                <h2>{title}</h2>

                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div className={styles.modalBody}>
                {children}
            </div>
        </div>
    </div>
);


/* Generic "key -> value" detail modal, used for single-item detail popups
   across every dashboard (a room, a task, a staff member, a note, etc.) */
const DetailFieldsModal = ({ title, fields, avatarLabel, onClose }) => (
    <Modal title={title} onClose={onClose}>
        <div className={styles.profile}>
            {avatarLabel && (
                <div className={styles.profileAvatar}>{avatarLabel}</div>
            )}

            {fields.map((field) => (
                <p key={field.label}>
                    <b>{field.label}:</b> {field.value}
                </p>
            ))}
        </div>
    </Modal>
);


/* Generic list modal, used for "xem tất cả" popups (danh sách cụ, thông báo...) */
const DetailListModal = ({ title, items, onClose, onItemClick, renderPrimary, renderSecondary }) => (
    <Modal title={title} onClose={onClose}>
        <div className={styles.personList}>
            {items.map((item, index) => {
                const rowContent = (
                    <>
                        <div>
                            <strong>{renderPrimary(item)}</strong>
                            <span>{renderSecondary(item)}</span>
                        </div>

                        {onItemClick && <span className={styles.chevron}>→</span>}
                    </>
                );

                if (!onItemClick) {
                    return (
                        <div className={styles.personRow} key={item.id ?? index}>
                            {rowContent}
                        </div>
                    );
                }

                return (
                    <button
                        type="button"
                        className={`${styles.rowButton} ${styles.personRow}`}
                        key={item.id ?? index}
                        onClick={() => onItemClick(item)}
                    >
                        {rowContent}
                    </button>
                );
            })}

            {!items.length && <EmptyState />}
        </div>
    </Modal>
);


/* =========================================================
   ADMIN
========================================================= */

const AdminDashboard = () => {
    const [peopleType, setPeopleType] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showActivities, setShowActivities] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);

    const peopleConfig = {
        elders: {
            title: "Danh sách cụ",
            data: ADMIN_PEOPLE.elders,
        },
        managers: {
            title: "Danh sách Manager",
            data: ADMIN_PEOPLE.managers,
        },
        doctors: {
            title: "Danh sách Doctor",
            data: ADMIN_PEOPLE.doctors,
        },
        caregivers: {
            title: "Danh sách Caregiver",
            data: ADMIN_PEOPLE.caregivers,
        },
        coordinators: {
            title: "Danh sách Coordinator",
            data: ADMIN_PEOPLE.coordinators,
        },
    };

    return (
        <>
            <div className={styles.statistics}>
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

            <div className={styles.twoColumns}>
                <Section
                    title="Cảnh báo hệ thống"
                    right={
                        <span className={styles.countBadge}>
                            {ADMIN_ALERTS.length}
                        </span>
                    }
                >
                    <div className={styles.alertList}>
                        {ADMIN_ALERTS.map((item) => (
                            <AlertItem
                                key={item.id}
                                item={item}
                                onClick={() => setSelectedAlert(item)}
                            />
                        ))}
                    </div>
                </Section>

                <Section
                    title="Hoạt động gần đây"
                    right={
                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setShowActivities(true)}
                        >
                            Xem trong 1 ngày →
                        </button>
                    }
                >
                    <div className={styles.activityList}>
                        {ADMIN_ACTIVITIES.slice(0, 3).map((item) => (
                            <div
                                className={styles.activityItem}
                                key={item.id}
                            >
                                <div>
                                    <strong>{item.user}</strong>

                                    <p>
                                        {item.action}:{" "}
                                        <b>{item.target}</b>
                                    </p>
                                </div>

                                <time>{item.time}</time>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>

            {peopleType && (
                <DetailListModal
                    title={peopleConfig[peopleType].title}
                    items={peopleConfig[peopleType].data}
                    onClose={() => setPeopleType(null)}
                    onItemClick={(person) => setSelectedPerson(person)}
                    renderPrimary={(person) => person.name}
                    renderSecondary={(person) => `${person.facility} · ${person.detail}`}
                />
            )}

            {selectedPerson && (
                <Modal
                    title="Profile"
                    onClose={() => setSelectedPerson(null)}
                >
                    <div className={styles.profile}>
                        <div className={styles.profileAvatar}>
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

            {selectedAlert && (
                <DetailFieldsModal
                    title={selectedAlert.title}
                    onClose={() => setSelectedAlert(null)}
                    fields={[
                        { label: "Nội dung", value: selectedAlert.message },
                        { label: "Thời gian", value: selectedAlert.time },
                    ]}
                />
            )}

            {showActivities && (
                <Modal
                    title="Hoạt động trong 1 ngày"
                    onClose={() => setShowActivities(false)}
                >
                    <div className={styles.activityList}>
                        {ADMIN_ACTIVITIES.map((item) => (
                            <div
                                className={styles.activityItem}
                                key={item.id}
                            >
                                <div>
                                    <strong>{item.user}</strong>

                                    <p>
                                        {item.action}:{" "}
                                        <b>{item.target}</b>
                                    </p>
                                </div>

                                <time>{item.time}</time>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </>
    );
};


/* =========================================================
   MANAGER
========================================================= */

const ManagerDashboard = () => {
    const [roomSearch, setRoomSearch] = useState("");
    const [areaFilter, setAreaFilter] = useState("all");
    const [roomStatus, setRoomStatus] = useState("all");

    // { kind: "elders" | "admitted" | "attention" | "appointments" | "staff" | "healthAlert" | "medication" | "room" | "task", payload }
    const [detail, setDetail] = useState(null);
    const closeDetail = () => setDetail(null);

    const filteredRooms = useMemo(() => {
        return MANAGER_ROOMS.filter((room) => {
            const matchesSearch =
                room.room
                    .toLowerCase()
                    .includes(roomSearch.toLowerCase()) ||
                room.area
                    .toLowerCase()
                    .includes(roomSearch.toLowerCase());

            const matchesArea =
                areaFilter === "all" || room.area === areaFilter;

            const matchesStatus =
                roomStatus === "all" || room.status === roomStatus;

            return matchesSearch && matchesArea && matchesStatus;
        });
    }, [roomSearch, areaFilter, roomStatus]);

    return (
        <>
            <Section title="Residents">
                <div className={styles.statistics}>
                    <StatCard
                        title="Tổng cụ"
                        value={MANAGER_RESIDENTS.total}
                        icon="👴"
                        color="#2563eb"
                        onClick={() => setDetail({ kind: "elders" })}
                    />

                    <StatCard
                        title="Đang nhập viện"
                        value={MANAGER_RESIDENTS.admitted}
                        icon="🏥"
                        color="#0891b2"
                        onClick={() => setDetail({ kind: "admitted" })}
                    />

                    <StatCard
                        title="Cần chú ý"
                        value={MANAGER_RESIDENTS.attention}
                        icon="⚠️"
                        color="#dc2626"
                        onClick={() => setDetail({ kind: "attention" })}
                    />

                    <StatCard
                        title="Có lịch khám"
                        value={MANAGER_RESIDENTS.appointments}
                        icon="📅"
                        color="#7c3aed"
                        onClick={() => setDetail({ kind: "appointments" })}
                    />
                </div>
            </Section>

            <div className={styles.twoColumns}>
                <Section title="Staff">
                    <div className={styles.shiftCard}>
                        <div>
                            <span>Ca hiện tại</span>
                            <strong>{MANAGER_STAFF.shift}</strong>
                        </div>

                        <div className={styles.shiftTime}>
                            {MANAGER_STAFF.start} - {MANAGER_STAFF.end}
                        </div>
                    </div>

                    <div className={styles.staffSummary}>
                        <div>
                            <strong>{MANAGER_STAFF.active}</strong>
                            <span>Đang hoạt động</span>
                        </div>

                        <div>
                            <strong>{MANAGER_STAFF.inactive}</strong>
                            <span>Không hoạt động</span>
                        </div>
                    </div>

                    <div className={styles.staffList}>
                        {MANAGER_STAFF.members.map((staff) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.staffRow}`}
                                key={staff.name}
                                onClick={() => setDetail({ kind: "staff", payload: staff })}
                            >
                                <div>
                                    <strong>{staff.name}</strong>
                                    <span>{staff.role}</span>
                                </div>

                                <StatusBadge
                                    status={
                                        staff.status === "active"
                                            ? "Hoạt động"
                                            : "Không hoạt động"
                                    }
                                />
                            </button>
                        ))}
                    </div>
                </Section>

                <Section title="Healthcare">
                    <h3 className={styles.subTitle}>
                        Cảnh báo sức khỏe
                    </h3>

                    <div className={styles.alertList}>
                        {MANAGER_HEALTH_ALERTS.map((alert) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.healthAlert}`}
                                key={alert.id}
                                onClick={() => setDetail({ kind: "healthAlert", payload: alert })}
                            >
                                <div>
                                    <strong>{alert.name}</strong>
                                    <span>{alert.condition}</span>
                                </div>

                                <StatusBadge
                                    status={`${alert.value}`}
                                />
                            </button>
                        ))}
                    </div>

                    <h3 className={styles.subTitle}>
                        Thuốc sắp đến giờ
                    </h3>

                    <div className={styles.medicationList}>
                        {MANAGER_MEDICATIONS.map((item) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.medicationRow}`}
                                key={`${item.name}-${item.time}`}
                                onClick={() => setDetail({ kind: "medication", payload: item })}
                            >
                                <strong>{item.name}</strong>

                                <span>{item.medicine}</span>

                                <time>{item.time}</time>
                            </button>
                        ))}
                    </div>
                </Section>
            </div>

            <Section title="Operations">
                <div className={styles.roomToolbar}>
                    <input
                        type="search"
                        placeholder="Tìm khu hoặc phòng..."
                        value={roomSearch}
                        onChange={(event) =>
                            setRoomSearch(event.target.value)
                        }
                    />

                    <select
                        value={areaFilter}
                        onChange={(event) =>
                            setAreaFilter(event.target.value)
                        }
                    >
                        <option value="all">Tất cả khu</option>
                        <option value="Khu A">Khu A</option>
                        <option value="Khu B">Khu B</option>
                    </select>

                    <select
                        value={roomStatus}
                        onChange={(event) =>
                            setRoomStatus(event.target.value)
                        }
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="Trống">Trống</option>
                        <option value="Đầy">Đầy</option>
                    </select>
                </div>

                <div className={styles.roomTable}>
                    <div className={styles.tableHeader}>
                        <span>Khu</span>
                        <span>Phòng</span>
                        <span>Trạng thái</span>
                        <span>Sức chứa</span>
                    </div>

                    {filteredRooms.map((room) => (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.tableRow}`}
                            key={`${room.area}-${room.room}`}
                            onClick={() => setDetail({ kind: "room", payload: room })}
                        >
                            <span>{room.area}</span>
                            <strong>{room.room}</strong>

                            <StatusBadge status={room.status} />

                            <span>{room.beds}</span>
                        </button>
                    ))}

                    {!filteredRooms.length && (
                        <EmptyState message="Không tìm thấy phòng phù hợp." />
                    )}
                </div>
            </Section>

            <Section title="Công việc chưa hoàn thành">
                <div className={styles.taskList}>
                    {MANAGER_INCOMPLETE_TASKS.map((task) => (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.taskRow}`}
                            key={task.id}
                            onClick={() => setDetail({ kind: "task", payload: task })}
                        >
                            <div>
                                <strong>{task.task}</strong>

                                <span>
                                    {task.elder} · {task.room}
                                </span>
                            </div>

                            <time>{task.time}</time>

                            <StatusBadge status={task.status} />
                        </button>
                    ))}
                </div>
            </Section>

            {detail?.kind === "elders" && (
                <DetailListModal
                    title="Danh sách cụ"
                    items={MANAGER_ELDERS_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.area} · ${p.room} · ${p.note}`}
                />
            )}

            {detail?.kind === "admitted" && (
                <DetailListModal
                    title="Đang nhập viện"
                    items={MANAGER_ADMITTED_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.room} · ${p.reason} · từ ${p.since}`}
                />
            )}

            {detail?.kind === "attention" && (
                <DetailListModal
                    title="Cần chú ý"
                    items={MANAGER_ATTENTION_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.room} · ${p.condition}`}
                />
            )}

            {detail?.kind === "appointments" && (
                <DetailListModal
                    title="Có lịch khám"
                    items={MANAGER_APPOINTMENTS_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.time} · ${p.doctor} · ${p.type}`}
                />
            )}

            {detail?.kind === "staff" && (
                <DetailFieldsModal
                    title="Hồ sơ nhân viên"
                    onClose={closeDetail}
                    avatarLabel={detail.payload.name.charAt(0)}
                    fields={[
                        { label: "Vai trò", value: detail.payload.role },
                        {
                            label: "Trạng thái",
                            value: detail.payload.status === "active" ? "Hoạt động" : "Không hoạt động",
                        },
                        { label: "Ca trực", value: `${MANAGER_STAFF.shift} (${MANAGER_STAFF.start} - ${MANAGER_STAFF.end})` },
                    ]}
                />
            )}

            {detail?.kind === "healthAlert" && (
                <DetailFieldsModal
                    title={detail.payload.name}
                    onClose={closeDetail}
                    fields={[
                        { label: "Tình trạng", value: detail.payload.condition },
                        { label: "Chỉ số", value: detail.payload.value },
                    ]}
                />
            )}

            {detail?.kind === "medication" && (
                <DetailFieldsModal
                    title={detail.payload.name}
                    onClose={closeDetail}
                    fields={[
                        { label: "Thuốc", value: detail.payload.medicine },
                        { label: "Giờ uống", value: detail.payload.time },
                    ]}
                />
            )}

            {detail?.kind === "room" && (
                <DetailFieldsModal
                    title={`Phòng ${detail.payload.room}`}
                    onClose={closeDetail}
                    fields={[
                        { label: "Khu", value: detail.payload.area },
                        { label: "Trạng thái", value: detail.payload.status },
                        { label: "Sức chứa", value: detail.payload.beds },
                    ]}
                />
            )}

            {detail?.kind === "task" && (
                <DetailFieldsModal
                    title={detail.payload.task}
                    onClose={closeDetail}
                    fields={[
                        { label: "Cụ", value: detail.payload.elder },
                        { label: "Phòng", value: detail.payload.room },
                        { label: "Thời gian", value: detail.payload.time },
                        { label: "Trạng thái", value: detail.payload.status },
                    ]}
                />
            )}
        </>
    );
};


/* =========================================================
   DOCTOR
========================================================= */

const DoctorDashboard = () => {
    // { kind: "elders" | "notifications" | "alert" | "appointment" | "report", payload }
    const [detail, setDetail] = useState(null);
    const closeDetail = () => setDetail(null);

    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={DOCTOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setDetail({ kind: "elders" })}
                />

                <StatCard
                    title="Cuộc hẹn hôm nay"
                    value={DOCTOR_STATS.appointments}
                    icon="📅"
                    color="#7c3aed"
                    onClick={() => setDetail({ kind: "appointmentsList" })}
                />

                <StatCard
                    title="Thông báo"
                    value={DOCTOR_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
                    onClick={() => setDetail({ kind: "notifications" })}
                />
            </div>

            <Section title="Tình trạng cụ">
                <div className={styles.healthOverview}>
                    {DOCTOR_ALERTS.map((item) => (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.patientAlert} ${
                                item.severity === "danger"
                                    ? styles.patientDanger
                                    : styles.patientWarning
                            }`}
                            key={item.id}
                            onClick={() => setDetail({ kind: "alert", payload: item })}
                        >
                            <div>
                                <strong>{item.name}</strong>
                                <span>
                                    {item.room} · {item.condition}
                                </span>
                            </div>

                            <StatusBadge
                                status={
                                    item.severity === "danger"
                                        ? "Báo động"
                                        : "Cần theo dõi"
                                }
                            />
                        </button>
                    ))}
                </div>
            </Section>

            <div className={styles.twoColumns}>
                <Section title="Cuộc hẹn hôm nay">
                    <div className={styles.appointmentList}>
                        {DOCTOR_APPOINTMENTS.map((appointment) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.appointmentRow}`}
                                key={`${appointment.time}-${appointment.elder}`}
                                onClick={() => setDetail({ kind: "appointment", payload: appointment })}
                            >
                                <time>{appointment.time}</time>

                                <div>
                                    <strong>
                                        {appointment.elder}
                                    </strong>

                                    <span>
                                        {appointment.room} ·{" "}
                                        {appointment.type}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>

                <Section title="Báo cáo từ người chăm sóc">
                    <div className={styles.reportList}>
                        {DOCTOR_CARE_REPORTS.map((report, index) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.reportRow}`}
                                key={`${report.caregiver}-${index}`}
                                onClick={() => setDetail({ kind: "report", payload: report })}
                            >
                                <div>
                                    <strong>{report.caregiver}</strong>
                                    <span>{report.elder}</span>
                                </div>

                                <div>
                                    <strong>{report.activity}</strong>
                                </div>

                                <time>{report.time}</time>
                            </button>
                        ))}
                    </div>
                </Section>
            </div>

            {detail?.kind === "elders" && (
                <DetailListModal
                    title="Danh sách cụ"
                    items={DOCTOR_ELDERS_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.room} · ${p.note}`}
                />
            )}

            {detail?.kind === "notifications" && (
                <DetailListModal
                    title="Thông báo"
                    items={DOCTOR_NOTIFICATIONS}
                    onClose={closeDetail}
                    renderPrimary={(n) => n.title}
                    renderSecondary={(n) => `${n.detail} · ${n.time}`}
                />
            )}

            {detail?.kind === "appointmentsList" && (
                <DetailListModal
                    title="Cuộc hẹn hôm nay"
                    items={DOCTOR_APPOINTMENTS}
                    onClose={closeDetail}
                    onItemClick={(item) => setDetail({ kind: "appointment", payload: item })}
                    renderPrimary={(a) => a.elder}
                    renderSecondary={(a) => `${a.time} · ${a.room} · ${a.type}`}
                />
            )}

            {detail?.kind === "alert" && (
                <DetailFieldsModal
                    title={detail.payload.name}
                    onClose={closeDetail}
                    fields={[
                        { label: "Phòng", value: detail.payload.room },
                        { label: "Tình trạng", value: detail.payload.condition },
                        {
                            label: "Mức độ",
                            value: detail.payload.severity === "danger" ? "Báo động" : "Cần theo dõi",
                        },
                    ]}
                />
            )}

            {detail?.kind === "appointment" && (
                <DetailFieldsModal
                    title={detail.payload.elder}
                    onClose={closeDetail}
                    fields={[
                        { label: "Giờ hẹn", value: detail.payload.time },
                        { label: "Phòng", value: detail.payload.room },
                        { label: "Loại khám", value: detail.payload.type },
                    ]}
                />
            )}

            {detail?.kind === "report" && (
                <DetailFieldsModal
                    title={detail.payload.activity}
                    onClose={closeDetail}
                    fields={[
                        { label: "Người chăm sóc", value: detail.payload.caregiver },
                        { label: "Cụ", value: detail.payload.elder },
                        { label: "Thời gian", value: detail.payload.time },
                    ]}
                />
            )}
        </>
    );
};


/* =========================================================
   COORDINATOR
========================================================= */

const CoordinatorDashboard = () => {
    const [showTasks, setShowTasks] = useState(false);

    // { kind: "elders" | "notifications" | "attention" | "schedule" | "task", payload }
    const [detail, setDetail] = useState(null);
    const closeDetail = () => setDetail(null);

    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng cụ"
                    value={COORDINATOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setDetail({ kind: "elders" })}
                />

                <StatCard
                    title="Công việc hôm nay"
                    value={COORDINATOR_STATS.tasks}
                    icon="📋"
                    color="#059669"
                    onClick={() => setShowTasks(true)}
                />

                <StatCard
                    title="Thông báo"
                    value={COORDINATOR_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
                    onClick={() => setDetail({ kind: "notifications" })}
                />
            </div>

            <Section
                title="Tình trạng công việc"
                right={
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setShowTasks(true)}
                    >
                        Xem tất cả task →
                    </button>
                }
            >
                <div className={styles.statistics}>
                    <StatCard
                        title="Tổng task"
                        value={COORDINATOR_TASK_STATS.total}
                        icon="📋"
                        color="#2563eb"
                        onClick={() => setShowTasks(true)}
                    />

                    <StatCard
                        title="Đang làm"
                        value={COORDINATOR_TASK_STATS.doing}
                        icon="🔄"
                        color="#0891b2"
                        onClick={() => setShowTasks(true)}
                    />

                    <StatCard
                        title="Quá hạn"
                        value={COORDINATOR_TASK_STATS.overdue}
                        icon="🔴"
                        color="#dc2626"
                        onClick={() => setShowTasks(true)}
                    />

                    <StatCard
                        title="Chưa làm"
                        value={COORDINATOR_TASK_STATS.pending}
                        icon="⏳"
                        color="#f59e0b"
                        onClick={() => setShowTasks(true)}
                    />
                </div>
            </Section>

            <div className={styles.twoColumns}>
                <Section title="Các việc cần chú ý">
                    <div className={styles.alertList}>
                        {COORDINATOR_ATTENTION.map((item) => (
                            <AlertItem
                                key={item.id}
                                item={item}
                                onClick={() => setDetail({ kind: "attention", payload: item })}
                            />
                        ))}
                    </div>
                </Section>

                <Section title="Lịch trình hôm nay">
                    <div className={styles.scheduleList}>
                        {COORDINATOR_SCHEDULE.map((item) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.scheduleRow}`}
                                key={`${item.time}-${item.title}`}
                                onClick={() => setDetail({ kind: "schedule", payload: item })}
                            >
                                <time>{item.time}</time>

                                <div>
                                    <strong>{item.title}</strong>
                                    <span>{item.location}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>
            </div>

            {showTasks && (
                <Modal
                    title="Danh sách công việc"
                    onClose={() => setShowTasks(false)}
                >
                    <div className={styles.taskList}>
                        {COORDINATOR_TASKS.map((task) => (
                            <button
                                type="button"
                                className={`${styles.rowButton} ${styles.taskRow}`}
                                key={task.id}
                                onClick={() => setDetail({ kind: "task", payload: task })}
                            >
                                <div>
                                    <strong>
                                        {task.id} · {task.task}
                                    </strong>

                                    <span>
                                        {task.elder} · {task.time} ·{" "}
                                        {task.date}
                                    </span>
                                </div>

                                <StatusBadge status={task.status} />
                            </button>
                        ))}
                    </div>
                </Modal>
            )}

            {detail?.kind === "elders" && (
                <DetailListModal
                    title="Danh sách cụ"
                    items={COORDINATOR_ELDERS_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `${p.area} · ${p.room}`}
                />
            )}

            {detail?.kind === "notifications" && (
                <DetailListModal
                    title="Thông báo"
                    items={COORDINATOR_NOTIFICATIONS}
                    onClose={closeDetail}
                    renderPrimary={(n) => n.title}
                    renderSecondary={(n) => `${n.detail} · ${n.time}`}
                />
            )}

            {detail?.kind === "attention" && (
                <DetailFieldsModal
                    title={detail.payload.title}
                    onClose={closeDetail}
                    fields={[
                        { label: "Chi tiết", value: detail.payload.description },
                    ]}
                />
            )}

            {detail?.kind === "schedule" && (
                <DetailFieldsModal
                    title={detail.payload.title}
                    onClose={closeDetail}
                    fields={[
                        { label: "Thời gian", value: detail.payload.time },
                        { label: "Địa điểm", value: detail.payload.location },
                    ]}
                />
            )}

            {detail?.kind === "task" && (
                <DetailFieldsModal
                    title={`${detail.payload.id} · ${detail.payload.task}`}
                    onClose={closeDetail}
                    fields={[
                        { label: "Cụ", value: detail.payload.elder },
                        { label: "Giờ", value: detail.payload.time },
                        { label: "Ngày", value: detail.payload.date },
                        { label: "Trạng thái", value: detail.payload.status },
                    ]}
                />
            )}
        </>
    );
};


/* =========================================================
   CAREGIVER
========================================================= */

const CaregiverDashboard = () => {
    // { kind: "elders" | "notifications" | "task" | "note", payload }
    const [detail, setDetail] = useState(null);
    const closeDetail = () => setDetail(null);

    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={CAREGIVER_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setDetail({ kind: "elders" })}
                />

                <StatCard
                    title="Công việc hôm nay"
                    value={CAREGIVER_STATS.tasks}
                    icon="📋"
                    color="#059669"
                    onClick={() => setDetail({ kind: "tasksList" })}
                />

                <StatCard
                    title="Thông báo"
                    value={CAREGIVER_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
                    onClick={() => setDetail({ kind: "notifications" })}
                />
            </div>

            <Section title="Ca trực hiện tại">
                <div className={styles.currentShift}>
                    <div>
                        <span>Ca hiện tại</span>
                        <strong>{CAREGIVER_SHIFT.name}</strong>
                    </div>

                    <div>
                        <span>Thời gian</span>
                        <strong>
                            {CAREGIVER_SHIFT.start} -{" "}
                            {CAREGIVER_SHIFT.end}
                        </strong>
                    </div>
                </div>
            </Section>

            <Section title="Các task hôm nay">
                <div className={styles.caregiverTaskList}>
                    {CAREGIVER_TASKS.map((task) => (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.caregiverTask} ${
                                task.type === "now"
                                    ? styles.taskNow
                                    : task.type === "next"
                                      ? styles.taskNext
                                      : ""
                            }`}
                            key={task.id}
                            onClick={() => setDetail({ kind: "task", payload: task })}
                        >
                            <div className={styles.taskTime}>
                                {task.time}
                            </div>

                            <div className={styles.taskMain}>
                                <strong>{task.task}</strong>

                                <span>
                                    {task.elder} · {task.room}
                                </span>
                            </div>

                            <StatusBadge
                                status={
                                    task.type === "now"
                                        ? "NOW"
                                        : task.type === "next"
                                          ? "NEXT"
                                          : "Tiếp theo"
                                }
                            />
                        </button>
                    ))}
                </div>
            </Section>

            <Section title="Lưu ý của Bác sĩ / Manager">
                <div className={styles.notesList}>
                    {CAREGIVER_NOTES.map((note) => (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.noteItem}`}
                            key={note.id}
                            onClick={() => setDetail({ kind: "note", payload: note })}
                        >
                            <div className={styles.noteTime}>
                                <strong>{note.time}</strong>
                                <span>{note.date}</span>
                            </div>

                            <div className={styles.noteContent}>
                                <strong>{note.author}</strong>

                                <span>{note.elder}</span>

                                <p>{note.note}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Section>

            {detail?.kind === "elders" && (
                <DetailListModal
                    title="Danh sách cụ"
                    items={CAREGIVER_ELDERS_LIST}
                    onClose={closeDetail}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => p.room}
                />
            )}

            {detail?.kind === "tasksList" && (
                <DetailListModal
                    title="Các task hôm nay"
                    items={CAREGIVER_TASKS}
                    onClose={closeDetail}
                    onItemClick={(item) => setDetail({ kind: "task", payload: item })}
                    renderPrimary={(t) => t.task}
                    renderSecondary={(t) => `${t.time} · ${t.elder} · ${t.room}`}
                />
            )}

            {detail?.kind === "notifications" && (
                <DetailListModal
                    title="Thông báo"
                    items={CAREGIVER_NOTIFICATIONS}
                    onClose={closeDetail}
                    renderPrimary={(n) => n.title}
                    renderSecondary={(n) => `${n.detail} · ${n.time}`}
                />
            )}

            {detail?.kind === "task" && (
                <DetailFieldsModal
                    title={detail.payload.task}
                    onClose={closeDetail}
                    fields={[
                        { label: "Cụ", value: detail.payload.elder },
                        { label: "Phòng", value: detail.payload.room },
                        { label: "Giờ", value: detail.payload.time },
                    ]}
                />
            )}

            {detail?.kind === "note" && (
                <DetailFieldsModal
                    title={`Lưu ý từ ${detail.payload.author}`}
                    onClose={closeDetail}
                    fields={[
                        { label: "Cụ", value: detail.payload.elder },
                        { label: "Nội dung", value: detail.payload.note },
                        { label: "Thời gian", value: `${detail.payload.time} · ${detail.payload.date}` },
                    ]}
                />
            )}
        </>
    );
};


/* =========================================================
   MAIN PAGE
========================================================= */

export const DashboardPage = () => {
    const { user } = useAuth();

    const isDesktop = useIsDesktop();

    const Layout = isDesktop
        ? DashboardWebLayout
        : DashboardMobileLayout;

    const role = normalizeRole(user?.role);

    const roleLabel = ROLE_NAMES[role] || "Người dùng";

    const renderDashboard = () => {
        switch (role) {
            case "admin":
                return <AdminDashboard />;

            case "manager":
                return <ManagerDashboard />;

            case "doctor":
                return <DoctorDashboard />;

            case "coordinator":
                return <CoordinatorDashboard />;

            case "caregiver":
            case "carestaff":
                return <CaregiverDashboard />;

            default:
                return (
                    <EmptyState>
                        Dashboard cho role "{user?.role}" chưa được cấu hình.
                    </EmptyState>
                );
        }
    };

    return (
        <Layout>
            <DashboardHeader
                role={user?.role}
                userName={roleLabel}
                shift="Ca sáng"
                date={new Date().toLocaleDateString("vi-VN")}
            />

            <div className={styles.dashboard}>
                {renderDashboard()}
            </div>
        </Layout>
    );
};