import api from './api';

export const timetableService = {
  getAll: async (day = null, pagination = {}) => {
    return await api.get('/timetable', { params: { ...(day ? { day } : {}), ...pagination } });
  },

  getTodayClasses: async () => {
    return await api.get('/timetable/today');
  },

  create: async (data) => {
    return await api.post('/timetable', data);
  },

  update: async (id, data) => {
    return await api.put(`/timetable/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/timetable/${id}`);
  },
};
