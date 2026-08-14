import axiosClient from '../../../api/axiosClient';

export const patrolApi = {
  getRooms: (params) => {
    return axiosClient.get('/admin/assets/rooms-progress', { params });
  },

  getAssetsForPatrol: (roomId) => {
    return axiosClient.get(`/admin/assets/room/${roomId}`, {
      params: { requires_inspection_only: true }
    });
  },

  getAssetsForPatrolByRoom: (roomId) => {
    return axiosClient.get(`/inspections/rooms/${roomId}/assets`);
  },

  getAssetStats: (params) => {
  
    return axiosClient.get('/admin/assets/stats', { params }); 
  },

  getElders: () => {
    return axiosClient.get('/admin/elders');
  },
  requestNonce: () => {
    return axiosClient.post('/inspections/request-nonce');
  },
  uploadMultiAssets: (formData) => {
    return axiosClient.post('/inspections/upload-multi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  reportMissing: (assetId, note) => {
    return axiosClient.post('/inspections/report-missing', {
      asset_id: assetId,
      note: note,
    });
  },
  // STAFF GỌI ĐƯỢC ẢNH TỪ DRIVE
  getInspectionImage: (logId) => {
    return axiosClient.get(`/inspections/logs/${logId}/image`);
  },

  getInspectionHistory: (params) => {
    return axiosClient.get('/inspections/history', { params });
  }
};