import api from './client';

export const videosApi = {
  getAll: async () => {
    const res = await api.get('/video');
    return res.data;
  },
  
  download: async (videoId) => {
    const res = await api.post(`/video/${videoId}/download`);
    return res.data;
  },
  
  downloadById: async (youtubeVideoId, channelId) => {
    const res = await api.post(`/video/download/${youtubeVideoId}`, { channel_id: channelId });
    return res.data;
  },
  
  delete: async (videoId) => {
    const res = await api.delete(`/video/${videoId}`);
    return res.data;
  },
  
  getQueue: async () => {
    const res = await api.get('/queue');
    return res.data;
  },
  
  getHistory: async () => {
    const res = await api.get('/history');
    return res.data;
  }
};
