import { useEffect, useState } from "react";

import { Modal } from "../../../components/Modal";

import styles from "./DiseaseFormModal.module.css";

const EMPTY_FORM = {
    name: "",
    icdCode: "",
    description: "",
    status: "active",
};

export const DiseaseFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
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
        if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên bệnh";
        if (!form.icdCode.trim()) nextErrors.icdCode = "Vui lòng nhập mã ICD-10";
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
            title={initialData ? "Sửa thông tin bệnh" : "Thêm bệnh mới"}
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
                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Tên bệnh *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={handleChange("name")}
                        placeholder="Ví dụ: Tăng huyết áp"
                    />
                    {errors.name && <span className={styles.error}>{errors.name}</span>}
                </div>

                <div className={styles.field}>
                    <label>Mã ICD-10 *</label>
                    <input
                        type="text"
                        value={form.icdCode}
                        onChange={handleChange("icdCode")}
                        placeholder="I10"
                    />
                    {errors.icdCode && <span className={styles.error}>{errors.icdCode}</span>}
                </div>

                <div className={styles.field}>
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={handleChange("status")}>
                        <option value="active">Đang dùng</option>
                        <option value="inactive">Ngừng dùng</option>
                    </select>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Mô tả</label>
                    <textarea
                        rows={3}
                        value={form.description}
                        onChange={handleChange("description")}
                        placeholder="Mô tả ngắn gọn về bệnh..."
                    />
                </div>
            </div>
        </Modal>
    );
};