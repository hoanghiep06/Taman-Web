import { useEffect, useState } from "react";
import { overviewApi } from "../api/medicalApi";

export const useHealthOverview = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        overviewApi.getSummary().then((data) => {
            setSummary(data);
            setLoading(false);
        });
    }, []);

    return { summary, loading };
};