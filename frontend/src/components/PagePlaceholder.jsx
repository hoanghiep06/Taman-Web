import styles from "./PagePlaceholder.module.css";

export const PagePlaceholder = ({ title }) => {
    return (
        <div className={styles.container}>
            <h1>{title}</h1>

            <p>
                Màn hình này sẽ được phát triển ở Sprint tiếp theo.
            </p>
        </div>
    );
};