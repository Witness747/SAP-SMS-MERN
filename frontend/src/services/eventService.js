import api from './api';

export const eventService = {
  getAll: async (params = {}) => {
    return await api.get('/events', { params });
  },

  getById: async (id) => {
    return await api.get(`/events/${id}`);
  },

  create: async (data) => {
    return await api.post('/events', data);
  },

  update: async (id, data) => {
    return await api.put(`/events/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/events/${id}`);
  },
};
