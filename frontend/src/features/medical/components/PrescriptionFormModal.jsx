import { useEffect, useState } from "react";

import { Modal } from "../../../components/Modal";
import { ActionButton } from "../../../components/table/ActionButton";

import styles from "./PrescriptionFormModal.module.css";

const EMPTY_ITEM = { medicineName: "", dosage: "" };

const EMPTY_FORM = {
    elderName: "",
    room: "",
    doctor: "",
    date: new Date().toISOString().slice(0, 10),
    status: "active",
    items: [{ ...EMPTY_ITEM }],
};

export const PrescriptionFormModal = ({ isOpen, onClose, onSubmit, initialData, medicineOptions = [] }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setForm(
                initialData
                    ? { ...EMPTY_FORM, ...initialData, items: initialData.items?.length ? initialData.items : [{ ...EMPTY_ITEM }] }
                    : EMPTY_FORM
            );
            setErrors({});
        }
    }, [isOpen, initialData]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleItemChange = (index, field) => (e) => {
        const value = e.target.value;
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        }));
    };

    const addItemRow = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
    };

    const removeItemRow = (index) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const validate = () => {
        const nextErrors = {};
        if (!form.elderName.trim()) nextErrors.elderName = "Vui lòng nhập tên người cao tuổi";
        if (!form.doctor.trim()) nextErrors.doctor = "Vui lòng nhập bác sĩ kê đơn";

        const hasValidItem = form.items.some((item) => item.medicineName.trim());
        if (!hasValidItem) nextErrors.items = "Cần ít nhất 1 loại thuốc";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            const cleanedItems = form.items.filter((item) => item.medicineName.trim());
            await onSubmit({ ...form, items: cleanedItems });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Sửa đơn thuốc" : "Kê đơn thuốc mới"}
            size="lg"
            footer={
                <>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
                        Hủy
                    </button>
                    <button className={styles.saveBtn} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Đang lưu..." : "Lưu đơn thuốc"}
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
                    <input type="text" value={form.room} onChange={handleChange("room")} placeholder="A101" />
                </div>

                <div className={styles.field}>
                    <label>Bác sĩ kê đơn *</label>
                    <input
                        type="text"
                        value={form.doctor}
                        onChange={handleChange("doctor")}
                        placeholder="BS. Trần Văn Hải"
                    />
                    {errors.doctor && <span className={styles.error}>{errors.doctor}</span>}
                </div>

                <div className={styles.field}>
                    <label>Ngày kê đơn</label>
                    <input type="date" value={form.date} onChange={handleChange("date")} />
                </div>

                <div className={styles.field}>
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={handleChange("status")}>
                        <option value="active">Đang dùng</option>
                        <option value="completed">Đã hoàn tất</option>
                    </select>
                </div>
            </div>

            <div className={styles.itemsSection}>
                <div className={styles.itemsHeader}>
                    <label>Danh sách thuốc *</label>
                    <ActionButton variant="primary" onClick={addItemRow}>
                        ＋ Thêm thuốc
                    </ActionButton>
                </div>

                {errors.items && <span className={styles.error}>{errors.items}</span>}

                <div className={styles.itemsList}>
                    {form.items.map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                            <select
                                value={item.medicineName}
                                onChange={handleItemChange(index, "medicineName")}
                                className={styles.itemSelect}
                            >
                                <option value="">— Chọn thuốc —</option>
                                {medicineOptions.map((m) => (
                                    <option key={m.id} value={m.name}>
                                        {m.name}
                                    </option>
                                ))}
                                {/* Cho phép giữ giá trị cũ nếu thuốc đã bị xóa khỏi danh mục */}
                                {item.medicineName && !medicineOptions.some((m) => m.name === item.medicineName) && (
                                    <option value={item.medicineName}>{item.medicineName} (đã ngừng dùng)</option>
                                )}
                            </select>

                            <input
                                type="text"
                                value={item.dosage}
                                onChange={handleItemChange(index, "dosage")}
                                placeholder="Liều dùng: 1 viên/ngày, sau ăn..."
                                className={styles.itemDosage}
                            />

                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => removeItemRow(index)}
                                disabled={form.items.length === 1}
                                aria-label="Xóa dòng thuốc"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};