import styles from "./Header.module.css";

export const Header = ({ onToggle }) => {

    return (

        <header className={styles.header}>


            <div className={styles.right}>

                <button>

                    Đăng xuất

                </button>

            </div>

        </header>

    );

};