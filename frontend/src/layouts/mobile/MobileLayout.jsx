import { Outlet } from "react-router-dom";

import { MobileHeader } from "./components/MobileHeader";
import { BottomNavigation } from "./components/BottomNavigation";

import styles from "./MobileLayout.module.css";

export const MobileLayout = () => {

    return (

        <div className={styles.layout}>

            <MobileHeader />

            <main className={styles.main}>

                <Outlet />

            </main>

            <BottomNavigation />

        </div>

    );

};