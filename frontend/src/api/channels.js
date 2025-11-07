import api from './client';

export const channelsApi = {
  getAll: () => api.get('/channel'),
  
  getDetail: (id, params = {}) => api.get(`/channel/${id}`, { params }),
  
  add: (data) => api.post('/channel', data),
  
  delete: (id) => api.delete(`/channel/${id}`),
  
  sync: (id) => api.post(`/channel/${id}/sync`),
  
  toggleMonitor: (id) => api.patch(`/channel/${id}/monitor`),
  
  getPlaylists: (id) => api.get(`/channel/${id}/playlists`),
  
  search: (query) => api.get('/search', { params: { query } }),
  
  getInfo: (channelId) => api.get(`/channel/info/${channelId}`),
  
  preview: (channelId) => api.get(`/preview/channel/${channelId}`)
};
