import { MainLayout } from "./MainLayout";
import { MobileLayout } from "./mobile/MobileLayout";

import { useIsDesktop } from "../hooks/useIsDesktop";

export const ResponsiveLayout = () => {
    const isDesktop = useIsDesktop();

    return isDesktop
        ? <MainLayout />
        : <MobileLayout />;
};