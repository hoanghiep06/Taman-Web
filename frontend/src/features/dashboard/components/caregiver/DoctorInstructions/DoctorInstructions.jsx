import { useMemo, useState } from "react";
import { DetailListModal } from "../../ui/DashboardUI";
import styles from "./DoctorInstructions.module.css";

const INSTRUCTIONS = [
    { id: 1, doctor: "BS. Trần Văn Minh", resident: "Trần Thị B", instruction: "Theo dõi huyết áp mỗi 2 giờ.", time: "08:30" },
    { id: 2, doctor: "BS. Trần Văn Minh", resident: "Lê Văn C", instruction: "Nhắc cụ uống thuốc sau ăn.", time: "08:00" },
    { id: 3, doctor: "BS. Nguyễn Thị Hạnh", resident: "Nguyễn Thị D", instruction: "Hạn chế vận động mạnh, kiểm tra vết thương mỗi 6 tiếng.", time: "09:15" },
    { id: 4, doctor: "BS. Trần Văn Minh", resident: "Phạm Thị H", instruction: "Theo dõi lượng nước uống, tối thiểu 1.5L/ngày.", time: "07:45" },
];

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

export const DoctorInstructions = () => {
    const [showModal, setShowModal] = useState(false);

    const sortedInstructions = useMemo(
        () => [...INSTRUCTIONS].sort((a, b) => timeToMinutes(b.time) - timeToMinutes(a.time)),
        []
    );

    const visibleInstructions = sortedInstructions.slice(0, 3);

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Chỉ dẫn của bác sĩ</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {visibleInstructions.map((item) => (
                    <div key={item.id} className={styles.item}>
                        <strong>{item.resident}</strong>
                        <span>{item.instruction}</span>
                        <small>{item.doctor} · {item.time}</small>
                    </div>
                ))}

                {!visibleInstructions.length && (
                    <p className={styles.emptyMessage}>Không có chỉ dẫn nào từ bác sĩ.</p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Toàn bộ chỉ dẫn của bác sĩ"
                    items={sortedInstructions}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(item) => item.resident}
                    renderSecondary={(item) => `${item.instruction} · ${item.doctor} · ${item.time}`}
                    enableSearch
                    searchKeys={["doctor", "instruction"]}
                />
            )}
        </section>
    );
};