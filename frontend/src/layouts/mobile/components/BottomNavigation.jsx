import { NavLink } from "react-router-dom";

import styles from "./BottomNavigation.module.css";

const ITEMS = [
    {
        label: "Home",
        icon: "🏠",
        to: "/care-staff",
    },
    {
        label: "Elders",
        icon: "👴",
        to: "/elders",
    },
    {
        label: "Vitals",
        icon: "❤️",
        to: "/vitals",
    },
    {
        label: "Report",
        icon: "📝",
        to: "/reports",
    },
    {
        label: "Account",
        icon: "👤",
        to: "/profile",
    },
];

export const BottomNavigation = () => {

    return (

        <nav className={styles.nav}>

            {

                ITEMS.map(item => (

                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            isActive
                                ? `${styles.item} ${styles.active}`
                                : styles.item
                        }
                    >

                        <span>{item.icon}</span>

                        <small>{item.label}</small>

                    </NavLink>

                ))

            }

        </nav>

    );

};