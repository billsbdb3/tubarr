import React from 'react';

export function ChannelList({ channels, queue, status, onChannelClick }) {
  return (
    <>
      <div className="page-header">
        <h2>Channels</h2>
        <div className="stats">
          <span>{status.channels || 0} Channels • {status.downloaded || 0} Downloaded</span>
        </div>
      </div>

      <div className="card-grid">
        {channels.map(channel => {
          const totalVideos = channel.video_count || 0;
          const downloadedVideos = channel.downloaded_count || 0;
          const hasDownloading = queue.some(q => q.channel_id === channel.id);
          
          let statusColor = '#6c757d';
          if (hasDownloading) {
            statusColor = '#9b59b6';
          } else if (channel.monitored && downloadedVideos < totalVideos) {
            statusColor = '#e74c3c';
          } else if (!channel.monitored && downloadedVideos < totalVideos) {
            statusColor = '#f39c12';
          } else if (downloadedVideos === totalVideos && totalVideos > 0) {
            statusColor = channel.monitored ? '#5d9cec' : '#27ae60';
          }
          
          return (
            <div 
              key={channel.id} 
              className="card" 
              onClick={() => onChannelClick(channel)}
              style={{'--status-color': statusColor}}
            >
              {channel.thumbnail ? (
                <img src={`/api/v1/proxy/image?url=${encodeURIComponent(channel.thumbnail)}`} alt={channel.channel_name} style={{aspectRatio: '1', borderRadius: '50%'}} />
              ) : (
                <div style={{width: '100%', aspectRatio: '1', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'white'}}>
                  {channel.channel_name.charAt(0)}
                </div>
              )}
              <h3>{channel.channel_name}</h3>
              <p>{channel.quality} • {channel.monitored ? 'Monitored' : 'Paused'}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
