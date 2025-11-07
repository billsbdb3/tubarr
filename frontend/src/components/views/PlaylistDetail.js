import React from 'react';

export function PlaylistDetail({ 
  playlistDetail, 
  queue, 
  downloadingVideos,
  formatDuration,
  deleteVideo,
  downloadVideoById,
  onBack 
}) {
  return (
    <>
      <button onClick={onBack} className="secondary" style={{marginBottom: '20px'}}>← Back to Channel</button>
      
      <div className="section-header">
        <h3>Playlist Videos ({playlistDetail.length})</h3>
      </div>
      <div className="video-grid">
        {playlistDetail.map(video => (
          <div key={video.video_id} className="video-card">
            <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} />
            <div className="video-card-content">
              <h4>{video.title}</h4>
              <p>{formatDuration(video.duration)}</p>
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
    </>
  );
}
