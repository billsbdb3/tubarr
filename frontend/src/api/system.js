import api from './client';

export const systemApi = {
  getSettings: () => api.get('/settings'),
  
  updateSettings: (settings) => api.post('/settings', settings),
  
  getStatus: () => api.get('/system/status'),
  
  rescan: () => api.post('/command/rescan'),
  
  sync: () => api.post('/command/sync'),
  
  proxyImage: (url) => `/api/v1/proxy/image?url=${encodeURIComponent(url)}`
};
