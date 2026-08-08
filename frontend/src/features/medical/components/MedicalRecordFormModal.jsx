import { useEffect, useState } from "react";

import { Modal } from "../../../components/Modal";

import styles from "./MedicalRecordFormModal.module.css";

const EMPTY_FORM = {
    elderName: "",
    room: "",
    diagnosis: "",
    doctor: "",
    date: new Date().toISOString().slice(0, 10),
    status: "active",
};

export const MedicalRecordFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
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
        if (!form.diagnosis.trim()) nextErrors.diagnosis = "Vui lòng nhập chẩn đoán";
        if (!form.doctor.trim()) nextErrors.doctor = "Vui lòng nhập bác sĩ phụ trách";
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
            title={initialData ? "Sửa hồ sơ bệnh án" : "Thêm hồ sơ bệnh án"}
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
            {/*
              TODO: khi có API GET /api/elders (danh sách cụ), đổi 2 ô "Người cao tuổi" +
              "Phòng" bên dưới thành <select> chọn từ danh sách thật, tự động điền phòng
              theo cụ được chọn, thay vì gõ tay như hiện tại.
            */}
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

                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Chẩn đoán *</label>
                    <input
                        type="text"
                        value={form.diagnosis}
                        onChange={handleChange("diagnosis")}
                        placeholder="Ví dụ: Tăng huyết áp"
                    />
                    {errors.diagnosis && <span className={styles.error}>{errors.diagnosis}</span>}
                </div>

                <div className={styles.field}>
                    <label>Bác sĩ phụ trách *</label>
                    <input
                        type="text"
                        value={form.doctor}
                        onChange={handleChange("doctor")}
                        placeholder="BS. Trần Văn Hải"
                    />
                    {errors.doctor && <span className={styles.error}>{errors.doctor}</span>}
                </div>

                <div className={styles.field}>
                    <label>Ngày ghi nhận</label>
                    <input type="date" value={form.date} onChange={handleChange("date")} />
                </div>

                <div className={styles.field}>
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={handleChange("status")}>
                        <option value="active">Đang theo dõi</option>
                        <option value="resolved">Đã khỏi</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
};