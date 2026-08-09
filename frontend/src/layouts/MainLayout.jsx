import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { Header } from "./components/Header/Header";

import styles from "./MainLayout.module.css";

export const MainLayout = () => {

    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (

        <div className={styles.layout}>

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className={styles.content}>

                <Header
                    onToggle={() => setSidebarOpen(true)}
                    sidebarOpen={sidebarOpen}
                />

                <main className={styles.main}>
                    <Outlet />
                </main>

            </div>

        </div>

    );

};