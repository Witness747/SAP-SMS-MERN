import api from './api';

export const dashboardService = {
  getDashboardData: async () => {
    return await api.get('/dashboard');
  },
};
