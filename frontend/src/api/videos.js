import api from './client';

export const videosApi = {
  getAll: () => api.get('/video'),
  
  download: (videoId) => api.post(`/video/${videoId}/download`),
  
  downloadById: (youtubeVideoId, channelId) => 
    api.post(`/video/download/${youtubeVideoId}`, { channel_id: channelId }),
  
  delete: (videoId) => api.delete(`/video/${videoId}`),
  
  getQueue: () => api.get('/queue'),
  
  getHistory: () => api.get('/history')
};
