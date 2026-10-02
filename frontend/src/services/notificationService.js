import api from './api';

export const notificationService = {
  getPreferences: async () => {
    return await api.get('/notifications/preferences');
  },

  updatePreferences: async (data) => {
    return await api.put('/notifications/preferences', data);
  },

  getVapidKey: async () => {
    return await api.get('/notifications/vapid-key');
  },

  subscribePush: async (subscription) => {
    return await api.post('/notifications/subscribe', { subscription });
  },

  getSubscriptionStatus: async (endpoint) => {
    return await api.post('/notifications/subscription/status', { endpoint: endpoint || null });
  },

  unsubscribePush: async (endpoint) => {
    return await api.delete('/notifications/subscription', { data: { endpoint: endpoint || null } });
  },

  sendTestNotification: async () => {
    return await api.post('/notifications/test');
  },
};
