import styles from "./SystemStatistics.module.css";

const statistics = [
    {
        key: "elders",
        label: "Người cao tuổi",
        value: 245,
        icon: "👥",
    },
    {
        key: "manager",
        label: "Manager",
        value: 8,
        icon: "👔",
    },
    {
        key: "doctor",
        label: "Doctor",
        value: 12,
        icon: "🩺",
    },
    {
        key: "coordinator",
        label: "Coordinator",
        value: 15,
        icon: "📋",
    },
    {
        key: "caregiver",
        label: "Caregiver",
        value: 46,
        icon: "🤝",
    },
];

export const SystemStatistics = () => {
    const handleClick = (item) => {
        console.log("Xem chi tiết:", item.key);
    };

    return (
        <section>
            <h2 className={styles.title}>
                Tổng quan hệ thống
            </h2>

            <div className={styles.grid}>
                {statistics.map((item) => (
                    <button
                        key={item.key}
                        className={styles.card}
                        onClick={() => handleClick(item)}
                    >
                        <span className={styles.icon}>
                            {item.icon}
                        </span>

                        <span className={styles.label}>
                            {item.label}
                        </span>

                        <strong className={styles.value}>
                            {item.value}
                        </strong>
                    </button>
                ))}
            </div>
        </section>
    );
};