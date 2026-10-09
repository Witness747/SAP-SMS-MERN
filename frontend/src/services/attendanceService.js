import api from './api';

export const attendanceService = {
  getAll: async (params = {}) => {
    return await api.get('/attendance', { params });
  },

  getById: async (id) => {
    return await api.get(`/attendance/${id}`);
  },

  update: async (id, data) => {
    return await api.put(`/attendance/${id}`, data);
  },

  log: async (id, action) => {
    return await api.post(`/attendance/${id}/log`, { action });
  },

  reset: async (id) => {
    return await api.post(`/attendance/${id}/reset`);
  },
};
