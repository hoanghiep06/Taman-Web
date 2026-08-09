import { useEffect, useState } from "react";

import { Modal } from "../../../components/Modal";

import styles from "./HealthCheckFormModal.module.css";

const EMPTY_FORM = {
    elderName: "",
    room: "",
    checkDate: new Date().toISOString().slice(0, 10),
    result: "normal",
    doctor: "",
    note: "",
};

export const HealthCheckFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
            setErrors({});
        }
    }, [isOpen, initialData]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const validate = () => {
        const nextErrors = {};
        if (!form.elderName.trim()) nextErrors.elderName = "Vui lòng nhập tên người cao tuổi";
        if (!form.doctor.trim()) nextErrors.doctor = "Vui lòng nhập bác sĩ khám";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSubmit(form);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Sửa lần khám" : "Thêm lần khám mới"}
            size="md"
            footer={
                <>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
                        Hủy
                    </button>
                    <button className={styles.saveBtn} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Đang lưu..." : "Lưu"}
                    </button>
                </>
            }
        >
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>Người cao tuổi *</label>
                    <input
                        type="text"
                        value={form.elderName}
                        onChange={handleChange("elderName")}
                        placeholder="Nguyễn Văn A"
                    />
                    {errors.elderName && <span className={styles.error}>{errors.elderName}</span>}
                </div>

                <div className={styles.field}>
                    <label>Phòng</label>
                    <input
                        type="text"
                        value={form.room}
                        onChange={handleChange("room")}
                        placeholder="A101"
                    />
                </div>

                <div className={styles.field}>
                    <label>Ngày khám</label>
                    <input type="date" value={form.checkDate} onChange={handleChange("checkDate")} />
                </div>

                <div className={styles.field}>
                    <label>Kết quả</label>
                    <select value={form.result} onChange={handleChange("result")}>
                        <option value="normal">Bình thường</option>
                        <option value="warning">Cần theo dõi</option>
                        <option value="danger">Cần tái khám gấp</option>
                    </select>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Bác sĩ khám *</label>
                    <input
                        type="text"
                        value={form.doctor}
                        onChange={handleChange("doctor")}
                        placeholder="BS. Trần Văn Hải"
                    />
                    {errors.doctor && <span className={styles.error}>{errors.doctor}</span>}
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Ghi chú</label>
                    <textarea
                        rows={3}
                        value={form.note}
                        onChange={handleChange("note")}
                        placeholder="Nhận xét của bác sĩ..."
                    />
                </div>
            </div>
        </Modal>
    );
};