import axiosClient from '../../../api/axiosClient';

export const eldersHealthApi = {
  getVitalHistory: (elderId) => {
    return axiosClient.get(`/health/vitals/elder/${elderId}`);
  },

  getWeightHistory: (elderId) => {
    return axiosClient.get(`/health/weight/elder/${elderId}`);
  },

  getHealthProfile: (elderId) => {
    return axiosClient.get(`/admin/elders/${elderId}/health-profile`);
  },
};