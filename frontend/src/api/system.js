import api from './client';

export const systemApi = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  
  updateSettings: async (settings) => {
    const res = await api.post('/settings', settings);
    return res.data;
  },
  
  getStatus: async () => {
    const res = await api.get('/system/status');
    return res.data;
  },
  
  rescan: async () => {
    const res = await api.post('/command/rescan');
    return res.data;
  },
  
  sync: async () => {
    const res = await api.post('/command/sync');
    return res.data;
  },
  
  proxyImage: (url) => `/api/v1/proxy/image?url=${encodeURIComponent(url)}`
};
