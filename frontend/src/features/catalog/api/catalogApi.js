import axiosClient from '../../../api/axiosClient';

export const catalogApi = {
  // ================= QUẢN LÝ PHÒNG (ROOMS) =================
  getRooms: () => axiosClient.get('/admin/rooms'),
  createRoom: (data) => axiosClient.post('/admin/rooms', data),
  updateRoom: (id, data) => axiosClient.put(`/admin/rooms/${id}`, data),
  deleteRoom: (id) => axiosClient.delete(`/admin/rooms/${id}`),

  // ================= QUẢN LÝ CÁC CỤ (ELDERS) =================
  getElders: () => axiosClient.get('/admin/elders'),
  createElder: (data) => axiosClient.post('/admin/elders', data),
  updateElder: (id, data) => axiosClient.put(`/admin/elders/${id}`, data),
  deleteElder: (id) => axiosClient.delete(`/admin/elders/${id}`),

  // ================= QUẢN LÝ TÀI SẢN (ASSETS) =================
  getAssets: () => axiosClient.get('/admin/assets'),
  createAsset: (data) => axiosClient.post('/admin/assets', data),
  updateAsset: (id, data) => axiosClient.put(`/admin/assets/${id}`, data),
  deleteAsset: (id) => axiosClient.delete(`/admin/assets/${id}`),

  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/admin/assets/import-xlsx', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    }
};