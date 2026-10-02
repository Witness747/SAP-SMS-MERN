import api from './api';

export const taskService = {
  getAll: async (params = {}) => {
    return await api.get('/tasks', { params });
  },

  getById: async (id) => {
    return await api.get(`/tasks/${id}`);
  },

  create: async (taskData) => {
    return await api.post('/tasks', taskData);
  },

  update: async (id, taskData) => {
    return await api.put(`/tasks/${id}`, taskData);
  },

  toggleStatus: async (id) => {
    return await api.patch(`/tasks/${id}/toggle`);
  },

  delete: async (id) => {
    return await api.delete(`/tasks/${id}`);
  },
};
