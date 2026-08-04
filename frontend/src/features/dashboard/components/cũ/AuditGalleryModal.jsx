import { Modal } from '../../../components/Modal';
import styles from './AuditGalleryModal.module.css';

export const AuditGalleryModal = ({ isOpen, onClose, shiftInfo, auditSamples, totalFound, onRefreshRandom }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="🕵️‍♂️ Thanh Tra Ảnh Ngẫu Nhiên"
      subtitle={
        <>
          Ca ngày: {shiftInfo?.shift_date} ({shiftInfo?.shift_type}) — Tổng kho: <b>{totalFound}</b> ảnh gốc
        </>
      }
      headerActions={
        <button onClick={onRefreshRandom} className={styles.refreshBtn}>
          🔄 Đổi mẫu khác
        </button>
      }
    >
      {auditSamples.length > 0 ? (
        <div className={styles.galleryGrid}>
          {auditSamples.map((sample, idx) => (
            <div key={idx} className={styles.auditCard}>
              <div className={styles.imageWrapper}>
                <img src={sample.temporary_shareable_url} alt="Minh chứng audit" className={styles.img} loading="lazy" />
                <span className={styles.roomTag}>P.{sample.room_number}</span>
              </div>

              <div className={styles.cardInfo}>
                <div className={styles.metaRow}>
                  <span>👤 {sample.operator_name}</span>
                  <span>⏱️ {sample.inspected_at}</span>
                </div>

                <div className={styles.itemsBox}>
                  {sample.items.map((it, i) => (
                    <div key={i} className={styles.itemTag}>
                      📦 {it.asset_name} <small className={styles.itemElder}>({it.elder_name})</small>
                    </div>
                  ))}
                </div>

                <div className={styles.logIdsText}>Mã liên vết: #{sample.associated_log_ids.join(', #')}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Phiên ca trực này chưa có hình ảnh minh chứng nào được nộp thành công.</div>
      )}
    </Modal>
  );
};