import api from './client';

export const playlistsApi = {
  getVideos: (playlistId) => api.get(`/playlist/${playlistId}`),
  
  monitor: (playlistId, channelId, downloadAll = true) => 
    api.post(`/playlist/${playlistId}/monitor`, null, {
      params: { channel_id: channelId, download_all: downloadAll }
    }),
  
  unmonitor: (playlistId) => api.post(`/playlist/${playlistId}/unmonitor`)
};
