import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../../contexts/AuthContext";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

import styles from "./Header.module.css";

export const Header = ({ onToggle, sidebarOpen }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirmLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className={styles.header}>
            {!sidebarOpen && (
                <button className={styles.toggleBtn} onClick={onToggle} aria-label="Mở menu">
                    ☰
                </button>
            )}

            <div className={styles.right}>
                <button className={styles.logoutBtn} onClick={() => setConfirmOpen(true)}>
                    Đăng xuất
                </button>
            </div>

            <LogoutConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmLogout}
            />
        </header>
    );
};