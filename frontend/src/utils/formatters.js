export const formatDuration = (seconds) => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const getStatusColor = (channel, queue) => {
  const totalVideos = channel.video_count || 0;
  const downloadedVideos = channel.downloaded_count || 0;
  const hasDownloading = queue.some(q => q.channel_id === channel.id);
  
  if (hasDownloading) return '#9b59b6'; // purple - downloading
  if (channel.monitored && downloadedVideos < totalVideos) return '#e74c3c'; // red - missing (monitored)
  if (!channel.monitored && downloadedVideos < totalVideos) return '#f39c12'; // orange - missing (unmonitored)
  if (downloadedVideos === totalVideos && totalVideos > 0) {
    return channel.monitored ? '#5d9cec' : '#27ae60'; // blue - continuing, green - ended
  }
  return '#6c757d'; // gray default
};
