import { useCallback, useEffect, useState } from "react";
import { medicalRecordsApi } from "../api/medicalApi";

export const useMedicalRecords = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await medicalRecordsApi.list();
        setRecords(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const create = async (payload) => {
        await medicalRecordsApi.create(payload);
        await reload();
    };

    const update = async (id, payload) => {
        await medicalRecordsApi.update(id, payload);
        await reload();
    };

    const remove = async (id) => {
        await medicalRecordsApi.remove(id);
        await reload();
    };

    return { records, loading, reload, create, update, remove };
};