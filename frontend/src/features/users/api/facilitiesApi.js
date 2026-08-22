import axiosClient from '../../../api/axiosClient';

export const facilitiesApi = {
  getAllFacilities: () => {
    return axiosClient.get('/admin/facilities');
  },

  createFacility: (facilityData) => {
    return axiosClient.post('/admin/facilities', facilityData);
  },

  updateFacility: (facilityId, facilityData) => {
    return axiosClient.put(`/admin/facilities/${facilityId}`, facilityData);
  },

  deleteFacility: (facilityId) => {
    return axiosClient.delete(`/admin/facilities/${facilityId}`);
  },

  getZonesByFacility: (facilityId) => {
    return axiosClient.get('/admin/facilities/zones', {
      params: { facility_id: facilityId },
    });
  },

  createZone: (zoneData) => {
    return axiosClient.post('/admin/facilities/zones', zoneData);
  },

  updateZone: (zoneId, zoneData) => {
    return axiosClient.put(`/admin/facilities/zones/${zoneId}`, zoneData);
  },

  deleteZone: (zoneId) => {
    return axiosClient.delete(`/admin/facilities/zones/${zoneId}`);
  },
};