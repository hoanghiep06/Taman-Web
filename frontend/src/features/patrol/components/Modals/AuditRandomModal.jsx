import React, { useState, useEffect } from 'react';
import { patrolApi } from '../../api/patrolApi';
import axiosClient from '../../../../api/axiosClient';

export const AuditRandomModal = ({ isOpen, onClose, initialFacilityId = null }) => {
  const [selectedFacility, setSelectedFacility] = useState(initialFacilityId);
  const [facilities, setFacilities] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Tải danh sách tất cả cơ sở để đưa vào dropdown filter
  useEffect(() => {
    if (isOpen) {
      axiosClient.get('/admin/facilities')
        .then((res) => setFacilities(res || []))
        .catch(() => setFacilities([]));
    }
  }, [isOpen]);

  // Đồng bộ facilityId truyền từ ngoài vào (nếu có)
  useEffect(() => {
    setSelectedFacility(initialFacilityId);
  }, [initialFacilityId]);

  // 2. Hàm lấy đúng 2 ảnh ngẫu nhiên theo cơ sở được chọn (hoặc toàn bộ)
  const fetchTwoRandomPhotos = async (facId = selectedFacility) => {
    setLoading(true);
    try {
      const params = { limit: 2 };
      if (facId) {
        params.facility_id = facId;
      }
      const res = await patrolApi.getRandomImages(params);
      setPhotos(res || []);
    } catch (err) {
      console.error("Lỗi lấy ảnh audit:", err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTwoRandomPhotos(selectedFacility);
    }
  }, [isOpen, selectedFacility]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%',
        maxWidth: '920px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#F8FAFC'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
              🎲 Kiểm Tra Chất Lượng Ảnh Ngẫu Nhiên (Audit 2 Ảnh)
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
              Bốc thăm ngẫu nhiên 2 ảnh trong ca trực để giám sát quy trình chụp minh chứng
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '22px',
              color: '#64748B', cursor: 'pointer', padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Thanh công cụ lọc cơ sở ngay trong Modal */}
        <div style={{
          padding: '12px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>🏢 Lọc theo cơ sở:</span>
            <select
              value={selectedFacility || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedFacility(val);
              }}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1',
                fontSize: '13px', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC',
                cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="">🌐 Tất cả các cơ sở (Toàn viện)</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchTwoRandomPhotos(selectedFacility)}
            disabled={loading}
            style={{
              padding: '7px 14px', backgroundColor: '#1F6F78', color: '#FFFFFF',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            🔄 {loading ? 'Đang bốc thăm...' : 'Đổi 2 ảnh khác'}
          </button>
        </div>

        {/* Body Modal: Khung hiển thị 2 ảnh */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#1F6F78', fontWeight: 700 }}>
              ⏳ Đang trích xuất 2 ảnh ngẫu nhiên từ Google Drive...
            </div>
          ) : photos.length > 0 ? (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              {photos.map((photo) => (
                <div key={photo.log_id} style={{
                  border: '1.5px solid #E2E8F0', borderRadius: '14px',
                  overflow: 'hidden', backgroundColor: '#F8FAFC',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  {/* Khung ảnh */}
                  <div style={{
                    width: '100%', height: '240px', backgroundColor: '#0F172A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                  }}>
                    <img 
                      src={photo.shareable_url} 
                      alt={photo.asset_name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>

                  {/* Metadata */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      {photo.asset_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#1F6F78', fontWeight: 600 }}>
                      👤 {photo.elder_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      🏢 {photo.facility_name} • <b>Phòng {photo.room_number}</b> ({photo.zone_name})
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', borderTop: '1px dashed #CBD5E1', paddingTop: '4px' }}>
                      🕒 Chụp bởi <b>{photo.inspected_by}</b> lúc {photo.inspected_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
              Chưa có dữ liệu ảnh kiểm kê hợp lệ nào trong ca này (theo cơ sở đã chọn).
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          backgroundColor: '#F8FAFC'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 22px', backgroundColor: '#E2E8F0', color: '#334155',
              border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};