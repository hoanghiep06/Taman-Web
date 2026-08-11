import styles from "./RevenueChart.module.css";

// TODO: nối API doanh thu thật khi backend sẵn sàng
const MOCK_REVENUE = [
    { month: "T1", value: 42 },
    { month: "T2", value: 58 },
    { month: "T3", value: 51 },
    { month: "T4", value: 67 },
    { month: "T5", value: 73 },
    { month: "T6", value: 60 },
];

export const RevenueChart = () => {
    const max = Math.max(...MOCK_REVENUE.map((item) => item.value));

    return (
        <div className={styles.card}>
            <h3 className={styles.title}>Doanh thu 6 tháng gần nhất</h3>
            <div className={styles.chart}>
                {MOCK_REVENUE.map((item) => (
                    <div key={item.month} className={styles.barWrap}>
                        <div
                            className={styles.bar}
                            style={{ height: `${(item.value / max) * 100}%` }}
                        />
                        <span className={styles.barLabel}>{item.month}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};