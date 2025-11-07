import React from 'react';

export function ChannelDetailView({
  channelDetail,
  loading,
  playlists,
  playlistsLoading,
  selectedVideos,
  setSelectedVideos,
  sortBy,
  setSortBy,
  filterBy,
  setFilterBy,
  queue,
  downloadingVideos,
  setView,
  syncChannel,
  toggleMonitor,
  deleteChannelFromDetail,
  viewPlaylist,
  setPlaylistModal,
  downloadVideoById,
  deleteVideo,
  loadMoreVideos,
  formatDuration
}) {
  return (
    <>
      <button onClick={() => setView('home')} className="secondary" style={{marginBottom: '20px'}}>← Back to Channels</button>
      {loading ? (
        <div className="loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading channel videos...</p>
        </div>
      ) : channelDetail && (
        <>
          <div className="channel-header">
            {channelDetail.channel.thumbnail && (
              <img src={`/api/v1/proxy/image?url=${encodeURIComponent(channelDetail.channel.thumbnail)}`} alt={channelDetail.channel.channel_name} />
            )}
            <div className="channel-info">
              <h2>{channelDetail.channel.channel_name}</h2>
              <div className="info-row">
                <span><strong>Videos:</strong> {channelDetail.total_videos}</span>
                <span><strong>Downloaded:</strong> {channelDetail.downloaded_count}</span>
                <span><strong>Quality:</strong> {channelDetail.channel.quality}</span>
                <span><strong>Status:</strong> {channelDetail.channel.monitored ? '✅ Monitored' : '⏸️ Paused'}</span>
              </div>
              {channelDetail.channel.description && (
                <p style={{fontSize: '13px', color: '#b3b3b3', marginTop: '10px', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{channelDetail.channel.description}</p>
              )}
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button onClick={() => syncChannel(channelDetail.channel.id)}>
                  🔄 Sync Channel
                </button>
                <button onClick={() => toggleMonitor(channelDetail.channel.id)}>
                  {channelDetail.channel.monitored ? 'Pause Monitoring' : 'Resume Monitoring'}
                </button>
                <button onClick={() => deleteChannelFromDetail(channelDetail.channel.id)} className="danger">
                  Delete Channel
                </button>
              </div>
            </div>
          </div>
      
          {playlistsLoading && (
            <div style={{padding: '20px', textAlign: 'center'}}>
              <span style={{fontSize: '24px'}}>⏳</span> Loading playlists...
            </div>
          )}
          
          {!playlistsLoading && playlists.length > 0 && (
            <>
              <div className="section-header">
                <h3>Playlists</h3>
              </div>
              <div className="card-grid">
                {playlists.map(playlist => {
                  const totalVideos = playlist.video_count || 0;
                  const downloadedVideos = playlist.downloaded_count || 0;
                  
                  let statusColor = '#6c757d';
                  if (playlist.monitored && downloadedVideos < totalVideos) {
                    statusColor = '#e74c3c';
                  } else if (!playlist.monitored && downloadedVideos < totalVideos && downloadedVideos > 0) {
                    statusColor = '#f39c12';
                  } else if (downloadedVideos === totalVideos && totalVideos > 0) {
                    statusColor = playlist.monitored ? '#5d9cec' : '#27ae60';
                  }
                  
                  return (
                    <div 
                      key={playlist.playlist_id} 
                      className="playlist-card"
                      style={{'--status-color': statusColor}}
                    >
                      <div onClick={() => viewPlaylist(playlist.playlist_id)} style={{cursor: 'pointer'}}>
                        <h4>
                          {playlist.monitored && '✓ '}
                          📁 {playlist.title}
                        </h4>
                        <p>{playlist.video_count} videos • {playlist.downloaded_count || 0} downloaded</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistModal({
                            playlist_id: playlist.playlist_id,
                            title: playlist.title,
                            video_count: playlist.video_count,
                            monitored: playlist.monitored || false,
                            downloadAll: false
                          });
                        }}
                        style={{marginTop: '10px', width: '100%', fontSize: '12px', padding: '5px'}}
                      >
                        {playlist.monitored ? 'Manage Playlist' : 'Add Playlist'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="section-header">
            <h3>Videos ({channelDetail.loaded_videos} of {channelDetail.total_videos})</h3>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              {selectedVideos.size > 0 && (
                <>
                  <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{selectedVideos.size} selected</span>
                  <button onClick={() => {
                    selectedVideos.forEach(vid => downloadVideoById(vid));
                    setSelectedVideos(new Set());
                  }} style={{padding: '5px 10px'}}>Download Selected</button>
                  <button onClick={() => {
                    if (window.confirm(`Delete ${selectedVideos.size} videos?`)) {
                      selectedVideos.forEach(vid => deleteVideo(vid));
                      setSelectedVideos(new Set());
                    }
                  }} className="danger" style={{padding: '5px 10px'}}>Delete Selected</button>
                  <button onClick={() => setSelectedVideos(new Set())} style={{padding: '5px 10px', background: 'var(--bg-secondary)'}}>Clear</button>
                </>
              )}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{width: 'auto'}}>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="title">Title A-Z</option>
              </select>
              <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} style={{width: 'auto'}}>
                <option value="all">All Videos</option>
                <option value="downloaded">Downloaded Only</option>
                <option value="available">Not Downloaded</option>
              </select>
            </div>
          </div>
          <div className="video-grid">
            {channelDetail.videos.map(video => (
              <div key={video.video_id} className="video-card" style={{position: 'relative'}}>
                <input 
                  type="checkbox" 
                  checked={selectedVideos.has(video.video_id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedVideos);
                    if (e.target.checked) {
                      newSelected.add(video.video_id);
                    } else {
                      newSelected.delete(video.video_id);
                    }
                    setSelectedVideos(newSelected);
                  }}
                  style={{position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', cursor: 'pointer', zIndex: 10}}
                />
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-card-content">
                  <h4>{video.title}</h4>
                  <p>{formatDuration(video.duration)} {video.view_count && `• ${(video.view_count / 1000).toFixed(0)}K views`}</p>
                  <p>
                    {video.downloaded ? '✅ Downloaded' : 
                     queue.find(q => q.video_id === video.video_id) ? '⏳ Downloading...' : 
                     '📥 Not Downloaded'}
                  </p>
                  {video.downloaded ? (
                    <button onClick={() => deleteVideo(video.video_id)} className="danger">Delete</button>
                  ) : (
                    <button onClick={() => downloadVideoById(video.video_id)} disabled={downloadingVideos.has(video.video_id)}>
                      {downloadingVideos.has(video.video_id) ? 'Queuing...' : 'Download'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {channelDetail.loaded_videos < channelDetail.total_videos && (
            <button onClick={loadMoreVideos} style={{marginTop: '20px', width: '100%'}}>
              Load More Videos
            </button>
          )}
        </>
      )}
    </>
  );
}
