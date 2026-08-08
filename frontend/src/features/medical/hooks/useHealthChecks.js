import { useCallback, useEffect, useState } from "react";
import { healthChecksApi } from "../api/medicalApi";

export const useHealthChecks = () => {
    const [checks, setChecks] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await healthChecksApi.list();
        setChecks(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const create = async (payload) => {
        await healthChecksApi.create(payload);
        await reload();
    };

    const update = async (id, payload) => {
        await healthChecksApi.update(id, payload);
        await reload();
    };

    const remove = async (id) => {
        await healthChecksApi.remove(id);
        await reload();
    };

    return { checks, loading, reload, create, update, remove };
};