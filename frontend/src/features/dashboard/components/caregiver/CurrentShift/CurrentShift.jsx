import { useEffect, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import styles from "./CurrentShift.module.css";

export const CurrentShift = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shift, setShift] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getCurrentShift();
                setShift(data || null);
            } catch (err) {
                setError("Không thể tải thông tin ca trực.");
                console.error("CurrentShift fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Ca trực hiện tại</h2>
                <p>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Ca trực hiện tại</h2>
                <p>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <h2>Ca trực hiện tại</h2>

            <div className={styles.info}>
                <div>
                    <span>Ca</span>
                    <strong>{shift?.shift_type ?? "—"}</strong>
                </div>

                <div>
                    <span>Thời gian</span>
                    <strong>
                        {shift?.start_time ?? "—"} - {shift?.end_time ?? "—"}
                    </strong>
                </div>
            </div>
        </section>
    );
};