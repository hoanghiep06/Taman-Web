import { useCallback, useEffect, useState } from "react";
import { prescriptionsApi, medicinesApi } from "../api/medicalApi";

export const usePrescriptions = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [medicineOptions, setMedicineOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const [prescriptionData, medicineData] = await Promise.all([
            prescriptionsApi.list(),
            medicinesApi.list(),
        ]);
        setPrescriptions(prescriptionData);
        setMedicineOptions(medicineData.filter((m) => m.status === "active"));
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const create = async (payload) => {
        await prescriptionsApi.create(payload);
        await reload();
    };

    const update = async (id, payload) => {
        await prescriptionsApi.update(id, payload);
        await reload();
    };

    const remove = async (id) => {
        await prescriptionsApi.remove(id);
        await reload();
    };

    return { prescriptions, medicineOptions, loading, reload, create, update, remove };
};