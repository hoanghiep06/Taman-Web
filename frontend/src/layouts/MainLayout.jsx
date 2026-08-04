import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { Header } from "./components/Header/Header";

import styles from "./MainLayout.module.css";

export const MainLayout = () => {

    const [collapsed, setCollapsed] = useState(false);

    return (

        <div className={styles.layout}>

            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
            />

            <div className={styles.content}>

                {/* Header không còn nút mở sidebar */}
                <Header />

                <main className={styles.main}>
                    <Outlet />
                </main>

            </div>

        </div>

    );

};