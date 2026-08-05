import styles from "./StatisticCard.module.css";

export const StatisticCard = ({
    title,
    value,
    color = "#2563eb"
}) => {

    return (

        <div
            className={styles.card}
            style={{
                borderTop:`5px solid ${color}`
            }}
        >

        <div className={styles.header}>
            <h3>{title}</h3>
        </div>

        <div className={styles.value}>
            {value}
        </div>

        </div>

    );

};