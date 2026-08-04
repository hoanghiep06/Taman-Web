import { NavLink } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "../../../contexts/AuthContext";
import { SIDEBAR_MENU } from "../../../config/sidebarMenu";

import styles from "./Sidebar.module.css";

export const Sidebar = ({
    collapsed,
    onToggle
}) => {

    const { user } = useContext(AuthContext);

    const menu = SIDEBAR_MENU[user?.role] || [];


    return (

        <aside
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
        >

            {/* Header */}

            <div className={styles.sidebarHeader}>

                <div className={styles.brand}>

                    <div className={styles.logoCircle}>
                        TA
                    </div>

                    {!collapsed && (

                        <div>

                            <h2>TÂM AN</h2>

                            <span>Healthcare</span>

                        </div>

                    )}

                </div>

                <button
                    className={styles.toggleBtn}
                    onClick={onToggle}
                >
                    {collapsed ? "▶" : "◀"}
                </button>

            </div>

            {/* Menu */}

            <nav className={styles.menu}>

                {

                    menu.map(item => (

                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                isActive
                                    ? `${styles.link} ${styles.active}`
                                    : styles.link
                            }
                        >

                            <span className={styles.icon}>
                                {item.icon}
                            </span>

                            {!collapsed && (
                                <span>{item.title}</span>
                            )}

                        </NavLink>

                    ))

                }

            </nav>

        </aside>

    );

};