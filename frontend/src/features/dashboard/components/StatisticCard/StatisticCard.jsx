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

            <h3>{title}</h3>

            <h1>{value}</h1>

        </div>

    );

};