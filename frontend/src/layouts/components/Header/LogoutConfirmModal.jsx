import { Modal } from "../../../components/Modal";

import styles from "./LogoutConfirmModal.module.css";

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Xác nhận đăng xuất"
            size="sm"
            footer={
                <>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Hủy
                    </button>
                    <button className={styles.confirmBtn} onClick={onConfirm}>
                        Đăng xuất
                    </button>
                </>
            }
        >
            <p className={styles.message}>
                Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
            </p>
        </Modal>
    );
};