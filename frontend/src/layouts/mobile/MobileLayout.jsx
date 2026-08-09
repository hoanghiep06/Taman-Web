import { useState } from "react";
import { Outlet } from "react-router-dom";

import { MobileHeader } from "./components/MobileHeader";
import { MobileDrawer } from "./components/MobileDrawer";

import styles from "./MobileLayout.module.css";

export const MobileLayout = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className={styles.layout}>
            <MobileHeader onToggle={() => setDrawerOpen(true)} />

            <main className={styles.main}>
                <Outlet />
            </main>

            <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
};