import { useContext, useEffect } from "react";
import { NavLink } from "react-router-dom";

import { AuthContext } from "../../../contexts/AuthContext";
import { SIDEBAR_MENU } from "../../../config/navigation";
import { ROLE_LABELS } from "../../../utils/constants";

import styles from "./MobileDrawer.module.css";

export const MobileDrawer = ({ isOpen, onClose }) => {
    const { user } = useContext(AuthContext);
    const menu = SIDEBAR_MENU[user?.role] || [];

    // Khóa scroll nền khi drawer đang mở
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <div className={styles.logoCircle}>TA</div>
                        <div>
                            <h2 className={styles.brandTitle}>TÂM AN</h2>
                            <span className={styles.brandSubtitle}>
                                {ROLE_LABELS[user?.role] || "Người dùng"}
                            </span>
                        </div>
                    </div>

                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng menu">
                        ✕
                    </button>
                </div>

                <nav className={styles.menu}>
                    {menu.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                isActive ? `${styles.link} ${styles.active}` : styles.link
                            }
                        >
                            <span className={styles.icon}>{item.icon}</span>
                            <span>{item.title}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </div>
    );
};