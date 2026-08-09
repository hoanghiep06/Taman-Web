import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../../contexts/AuthContext";
import { LogoutConfirmModal } from "../../components/Header/LogoutConfirmModal";

import styles from "./MobileHeader.module.css";

export const MobileHeader = ({ onToggle }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirmLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className={styles.header}>
            <button className={styles.iconButton} onClick={onToggle} aria-label="Mở menu">
                ☰
            </button>

            <div className={styles.title}>
                TÂM AN
            </div>

            <button
                className={styles.logoutBtn}
                onClick={() => setConfirmOpen(true)}
                aria-label="Đăng xuất"
            >
                Đăng xuất
            </button>

            <LogoutConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmLogout}
            />
        </header>
    );
};