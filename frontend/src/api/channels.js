import api from './client';

export const channelsApi = {
  getAll: async () => {
    const res = await api.get('/channel');
    return res.data;
  },
  
  getDetail: async (id, params = {}) => {
    const res = await api.get(`/channel/${id}`, { params });
    return res.data;
  },
  
  add: async (channelUrl) => {
    const res = await api.post('/channel', { url: channelUrl });
    return res.data;
  },
  
  delete: async (id) => {
    const res = await api.delete(`/channel/${id}`);
    return res.data;
  },
  
  sync: async (id) => {
    const res = await api.post(`/channel/${id}/sync`);
    return res.data;
  },
  
  toggleMonitor: async (id) => {
    const res = await api.patch(`/channel/${id}/monitor`);
    return res.data;
  },
  
  getPlaylists: async (id) => {
    const res = await api.get(`/channel/${id}/playlists`);
    return res.data;
  },
  
  search: async (query) => {
    const res = await api.get('/search', { params: { query } });
    return res.data;
  },
  
  getInfo: async (channelId) => {
    const res = await api.get(`/channel/info/${channelId}`);
    return res.data;
  },
  
  preview: async (channelId) => {
    const res = await api.get(`/preview/channel/${channelId}`);
    return res.data;
  }
};
