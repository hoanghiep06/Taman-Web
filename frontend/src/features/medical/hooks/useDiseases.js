import { useCallback, useEffect, useState } from "react";
import { diseasesApi } from "../api/medicalApi";

export const useDiseases = () => {
    const [diseases, setDiseases] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await diseasesApi.list();
        setDiseases(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const create = async (payload) => {
        await diseasesApi.create(payload);
        await reload();
    };

    const update = async (id, payload) => {
        await diseasesApi.update(id, payload);
        await reload();
    };

    const remove = async (id) => {
        await diseasesApi.remove(id);
        await reload();
    };

    const removeMany = async (ids) => {
        await diseasesApi.removeMany(ids);
        await reload();
    };

    return { diseases, loading, reload, create, update, remove, removeMany };
};