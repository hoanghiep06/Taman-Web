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
    MANAGER_STAFF,
    MANAGER_HEALTH_ALERTS,
    MANAGER_MEDICATIONS,
    MANAGER_ROOMS,
    MANAGER_INCOMPLETE_TASKS,
    DOCTOR_STATS,
    DOCTOR_ALERTS,
    DOCTOR_APPOINTMENTS,
    DOCTOR_CARE_REPORTS,
    COORDINATOR_STATS,
    COORDINATOR_TASK_STATS,
    COORDINATOR_TASKS,
    COORDINATOR_ATTENTION,
    COORDINATOR_SCHEDULE,
    CAREGIVER_STATS,
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


const AlertItem = ({ item }) => (
    <div className={styles.alertItem}>
        <div className={`${styles.alertDot} ${styles[item.type]}`} />

        <div className={styles.alertContent}>
            <strong>{item.title}</strong>
            <p>{item.message || item.description || item.condition}</p>
            {item.time && <small>{item.time}</small>}
        </div>
    </div>
);


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


/* =========================================================
   ADMIN
========================================================= */

const AdminDashboard = () => {
    const [peopleType, setPeopleType] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showActivities, setShowActivities] = useState(false);

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
                            <AlertItem key={item.id} item={item} />
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
                <Modal
                    title={peopleConfig[peopleType].title}
                    onClose={() => setPeopleType(null)}
                >
                    <div className={styles.personList}>
                        {peopleConfig[peopleType].data.map((person) => (
                            <button
                                type="button"
                                className={styles.personRow}
                                key={person.id}
                                onClick={() => setSelectedPerson(person)}
                            >
                                <div>
                                    <strong>{person.name}</strong>

                                    <span>
                                        {person.facility} · {person.detail}
                                    </span>
                                </div>

                                <span>→</span>
                            </button>
                        ))}
                    </div>
                </Modal>
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
                    />

                    <StatCard
                        title="Đang nhập viện"
                        value={MANAGER_RESIDENTS.admitted}
                        icon="🏥"
                        color="#0891b2"
                    />

                    <StatCard
                        title="Cần chú ý"
                        value={MANAGER_RESIDENTS.attention}
                        icon="⚠️"
                        color="#dc2626"
                    />

                    <StatCard
                        title="Có lịch khám"
                        value={MANAGER_RESIDENTS.appointments}
                        icon="📅"
                        color="#7c3aed"
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
                            <div
                                className={styles.staffRow}
                                key={staff.name}
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
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="Healthcare">
                    <h3 className={styles.subTitle}>
                        Cảnh báo sức khỏe
                    </h3>

                    <div className={styles.alertList}>
                        {MANAGER_HEALTH_ALERTS.map((alert) => (
                            <div
                                className={styles.healthAlert}
                                key={alert.id}
                            >
                                <div>
                                    <strong>{alert.name}</strong>
                                    <span>{alert.condition}</span>
                                </div>

                                <StatusBadge
                                    status={`${alert.value}`}
                                />
                            </div>
                        ))}
                    </div>

                    <h3 className={styles.subTitle}>
                        Thuốc sắp đến giờ
                    </h3>

                    <div className={styles.medicationList}>
                        {MANAGER_MEDICATIONS.map((item) => (
                            <div
                                className={styles.medicationRow}
                                key={`${item.name}-${item.time}`}
                            >
                                <strong>{item.name}</strong>

                                <span>{item.medicine}</span>

                                <time>{item.time}</time>
                            </div>
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
                        <div
                            className={styles.tableRow}
                            key={`${room.area}-${room.room}`}
                        >
                            <span>{room.area}</span>
                            <strong>{room.room}</strong>

                            <StatusBadge status={room.status} />

                            <span>{room.beds}</span>
                        </div>
                    ))}

                    {!filteredRooms.length && (
                        <EmptyState message="Không tìm thấy phòng phù hợp." />
                    )}
                </div>
            </Section>

            <Section title="Công việc chưa hoàn thành">
                <div className={styles.taskList}>
                    {MANAGER_INCOMPLETE_TASKS.map((task) => (
                        <div className={styles.taskRow} key={task.id}>
                            <div>
                                <strong>{task.task}</strong>

                                <span>
                                    {task.elder} · {task.room}
                                </span>
                            </div>

                            <time>{task.time}</time>

                            <StatusBadge status={task.status} />
                        </div>
                    ))}
                </div>
            </Section>
        </>
    );
};


/* =========================================================
   DOCTOR
========================================================= */

const DoctorDashboard = () => {
    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={DOCTOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                />

                <StatCard
                    title="Cuộc hẹn hôm nay"
                    value={DOCTOR_STATS.appointments}
                    icon="📅"
                    color="#7c3aed"
                />

                <StatCard
                    title="Thông báo"
                    value={DOCTOR_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
                />
            </div>

            <Section title="Tình trạng cụ">
                <div className={styles.healthOverview}>
                    {DOCTOR_ALERTS.map((item) => (
                        <div
                            className={`${styles.patientAlert} ${
                                item.severity === "danger"
                                    ? styles.patientDanger
                                    : styles.patientWarning
                            }`}
                            key={item.id}
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
                        </div>
                    ))}
                </div>
            </Section>

            <div className={styles.twoColumns}>
                <Section title="Cuộc hẹn hôm nay">
                    <div className={styles.appointmentList}>
                        {DOCTOR_APPOINTMENTS.map((appointment) => (
                            <div
                                className={styles.appointmentRow}
                                key={`${appointment.time}-${appointment.elder}`}
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
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="Báo cáo từ người chăm sóc">
                    <div className={styles.reportList}>
                        {DOCTOR_CARE_REPORTS.map((report, index) => (
                            <div
                                className={styles.reportRow}
                                key={`${report.caregiver}-${index}`}
                            >
                                <div>
                                    <strong>{report.caregiver}</strong>
                                    <span>{report.elder}</span>
                                </div>

                                <div>
                                    <strong>{report.activity}</strong>
                                </div>

                                <time>{report.time}</time>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>
        </>
    );
};


/* =========================================================
   COORDINATOR
========================================================= */

const CoordinatorDashboard = () => {
    const [showTasks, setShowTasks] = useState(false);

    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng cụ"
                    value={COORDINATOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                />

                <StatCard
                    title="Công việc hôm nay"
                    value={COORDINATOR_STATS.tasks}
                    icon="📋"
                    color="#059669"
                />

                <StatCard
                    title="Thông báo"
                    value={COORDINATOR_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
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
                            />
                        ))}
                    </div>
                </Section>

                <Section title="Lịch trình hôm nay">
                    <div className={styles.scheduleList}>
                        {COORDINATOR_SCHEDULE.map((item) => (
                            <div
                                className={styles.scheduleRow}
                                key={`${item.time}-${item.title}`}
                            >
                                <time>{item.time}</time>

                                <div>
                                    <strong>{item.title}</strong>
                                    <span>{item.location}</span>
                                </div>
                            </div>
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
                            <div
                                className={styles.taskRow}
                                key={task.id}
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
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </>
    );
};


/* =========================================================
   CAREGIVER
========================================================= */

const CaregiverDashboard = () => {
    return (
        <>
            <div className={styles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={CAREGIVER_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                />

                <StatCard
                    title="Công việc hôm nay"
                    value={CAREGIVER_STATS.tasks}
                    icon="📋"
                    color="#059669"
                />

                <StatCard
                    title="Thông báo"
                    value={CAREGIVER_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
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
                        <div
                            className={`${styles.caregiverTask} ${
                                task.type === "now"
                                    ? styles.taskNow
                                    : task.type === "next"
                                      ? styles.taskNext
                                      : ""
                            }`}
                            key={task.id}
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
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Lưu ý của Bác sĩ / Manager">
                <div className={styles.notesList}>
                    {CAREGIVER_NOTES.map((note) => (
                        <div
                            className={styles.noteItem}
                            key={note.id}
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
                        </div>
                    ))}
                </div>
            </Section>
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