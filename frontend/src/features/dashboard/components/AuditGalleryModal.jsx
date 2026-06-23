import React, { useState } from 'react';

export const AuditGalleryModal = ({ isOpen, onClose, shiftInfo, auditSamples, totalFound, onRefreshRandom }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>🕵️‍♂️ Thanh Tra Ảnh Ngẫu Nhiên</h3>
            <p style={styles.modalSubtitle}>Ca ngày: {shiftInfo?.shift_date} ({shiftInfo?.shift_type}) — Tổng kho: <b>{totalFound}</b> ảnh gốc</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={onRefreshRandom} style={styles.refreshBtn}>🔄 Đổi mẫu khác</button>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        {/* Lưới hiển thị ảnh kiểu Pinterest Gallery */}
        <div style={styles.scrollBody}>
          {auditSamples.length > 0 ? (
            <div style={styles.galleryGrid}>
              {auditSamples.map((sample, idx) => (
                <div key={idx} style={styles.auditCard}>
                  <div style={styles.imageWrapper}>
                    <img 
                      src={sample.temporary_shareable_url} 
                      alt="Minh chứng audit" 
                      style={styles.img}
                      loading="lazy"
                    />
                    <span style={styles.roomTag}>P.{sample.room_number}</span>
                  </div>
                  
                  <div style={styles.cardInfo}>
                    <div style={styles.metaRow}>
                      <span>👤 {sample.operator_name}</span>
                      <span>⏱️ {sample.inspected_at}</span>
                    </div>
                    
                    {/* Gom nhóm vẹn toàn: Hiện danh sách đồ vật có trong bức ảnh này */}
                    <div style={styles.itemsBox}>
                      {sample.items.map((it, i) => (
                        <div key={i} style={styles.itemTag}>
                          📦 {it.asset_name} <small style={{color: '#64748B'}}>({it.elder_name})</small>
                        </div>
                      ))}
                    </div>
                    
                    <div style={styles.logIdsText}>
                      Mã liên vết: #{sample.associated_log_ids.join(', #')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.empty}>Phiên ca trực này chưa có hình ảnh minh chứng nào được nộp thành công.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalBox: { backgroundColor: '#FFFFFF', borderRadius: '20px', width: '85%', maxWidth: '1000px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  modalTitle: { margin: '0 0 2px 0', fontSize: '18px', fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { margin: 0, fontSize: '13px', color: '#64748B' },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  refreshBtn: { padding: '8px 16px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FE', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', padding: '4px' },
  
  scrollBody: { flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F8FAFC', WebkitOverflowScrolling: 'touch' },
  galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  
  auditCard: { backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' },
  imageWrapper: { width: '100%', aspectRatio: '4/3', backgroundColor: '#0F172A', position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  roomTag: { position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', color: '#FFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' },
  
  cardInfo: { padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', fontWeight: '600' },
  itemsBox: { display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #F1F5F9' },
  itemTag: { fontSize: '12px', color: '#1E293B', fontWeight: '600' },
  logIdsText: { fontSize: '10.5px', color: '#94A3B8', fontFamily: 'monospace', textAlign: 'right', marginTop: 'auto' },
  empty: { textAlign: 'center', padding: '80px 0', color: '#94A3B8', fontStyle: 'italic', fontSize: '14px' }
};