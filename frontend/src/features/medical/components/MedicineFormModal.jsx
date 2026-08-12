import { useEffect, useState } from "react";
import { Modal } from "../../../components/Modal";
import styles from "./MedicineFormModal.module.css";

const EMPTY_FORM = {
    name: "",
    unit: "Viên",
    dosageForm: "Nén",
    note: "",
    status: "active",
};

export const MedicineFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
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
        if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên thuốc";
        if (!form.unit.trim()) nextErrors.unit = "Vui lòng nhập đơn vị tính";
        if (!form.dosageForm.trim()) nextErrors.dosageForm = "Vui lòng nhập dạng bào chế";
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
            title={initialData ? "Sửa thông tin thuốc" : "Thêm thuốc mới"}
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
                    <label>Tên thuốc *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={handleChange("name")}
                        placeholder="Ví dụ: Paracetamol 500mg"
                    />
                    {errors.name && <span className={styles.error}>{errors.name}</span>}
                </div>

                <div className={styles.field}>
                    <label>Đơn vị tính *</label>
                    <input
                        type="text"
                        value={form.unit}
                        onChange={handleChange("unit")}
                        placeholder="Viên, Vỉ, Chai..."
                    />
                    {errors.unit && <span className={styles.error}>{errors.unit}</span>}
                </div>

                <div className={styles.field}>
                    <label>Dạng bào chế *</label>
                    <input
                        type="text"
                        value={form.dosageForm}
                        onChange={handleChange("dosageForm")}
                        placeholder="Viên nén, Viên nang, Siro..."
                    />
                    {errors.dosageForm && <span className={styles.error}>{errors.dosageForm}</span>}
                </div>

                <div className={styles.field}>
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={handleChange("status")}>
                        <option value="active">Đang dùng</option>
                        <option value="inactive">Ngừng dùng</option>
                    </select>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Ghi chú</label>
                    <textarea
                        rows={3}
                        value={form.note}
                        onChange={handleChange("note")}
                        placeholder="Ghi chú về thuốc..."
                    />
                </div>
            </div>
        </Modal>
    );
};