import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../../contexts/AuthContext";

import styles from "./Header.module.css";

export const Header = ({ onToggle }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;
        logout();
        navigate("/login");
    };

    return (
        <header className={styles.header}>
            <div className={styles.right}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <span className={styles.logoutIcon}>🚪</span>
                    Đăng xuất
                </button>
            </div>
        </header>
    );
};