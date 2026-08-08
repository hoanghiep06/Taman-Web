import { useCallback, useEffect, useState } from "react";
import { medicinesApi } from "../api/medicalApi";

export const useMedicines = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await medicinesApi.list();
        setMedicines(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const create = async (payload) => {
        await medicinesApi.create(payload);
        await reload();
    };

    const update = async (id, payload) => {
        await medicinesApi.update(id, payload);
        await reload();
    };

    const remove = async (id) => {
        await medicinesApi.remove(id);
        await reload();
    };

    const removeMany = async (ids) => {
        await medicinesApi.removeMany(ids);
        await reload();
    };

    return { medicines, loading, reload, create, update, remove, removeMany };
};