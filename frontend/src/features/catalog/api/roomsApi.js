import axiosClient from '../../../api/axiosClient';

export const roomsApi = {
  getAllRooms: () => {
    return axiosClient.get('/admin/rooms');
  },

  getRoomById: (roomId) => {
    return axiosClient.get(`/admin/rooms/${roomId}`);
  },
};