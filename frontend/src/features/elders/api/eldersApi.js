import axiosClient from '../../../api/axiosClient';

export const eldersApi = {
  getAllElders: () => {
    return axiosClient.get('/admin/elders');
  },

  getElderById: (elderId) => {
    return axiosClient.get(`/admin/elders/${elderId}`);
  },

  createElder: (elderData) => {
    return axiosClient.post('/admin/elders', elderData);
  },

  updateElder: (elderId, elderData) => {
    return axiosClient.put(`/admin/elders/${elderId}`, elderData);
  },

  deleteElder: (elderId) => {
    return axiosClient.delete(`/admin/elders/${elderId}`);
  },

  getHealthProfile: (elderId) => {
    return axiosClient.get(`/admin/elders/${elderId}/health-profile`);
  },
};