import api from './client';

export const playlistsApi = {
  getVideos: async (playlistId) => {
    const res = await api.get(`/playlist/${playlistId}`);
    return res.data;
  },
  
  monitor: async (playlistId, channelId, downloadAll = true) => {
    const res = await api.post(`/playlist/${playlistId}/monitor`, null, {
      params: { channel_id: channelId, download_all: downloadAll }
    });
    return res.data;
  },
  
  unmonitor: async (playlistId) => {
    const res = await api.post(`/playlist/${playlistId}/unmonitor`);
    return res.data;
  }
};
