import { Section, UnderDevelopment } from "../../ui/DashboardUI";

export const TaskStatus = () => {
    return (
        <Section title="Tình trạng công việc">
            <UnderDevelopment message="Tính năng theo dõi tình trạng công việc đang được phát triển." />
        </Section>
    );
};