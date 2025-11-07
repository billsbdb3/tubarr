import React from 'react';

export function ChannelPreview({ 
  channelPreview, 
  addingChannel,
  addChannelFromSearch,
  onBack 
}) {
  return (
    <>
      <button onClick={onBack} className="secondary" style={{marginBottom: '20px'}}>← Back to Search</button>
      
      <div className="channel-header">
        {channelPreview.search_result.thumbnail && (
          <img src={channelPreview.search_result.thumbnail} alt={channelPreview.channel_name} />
        )}
        <div className="channel-info">
          <h2>{channelPreview.channel_name}</h2>
          <div className="info-row">
            {channelPreview.search_result.subscriber_count && (
              <span><strong>Subscribers:</strong> {channelPreview.search_result.subscriber_count.toLocaleString()}</span>
            )}
            {channelPreview.search_result.video_count && (
              <span><strong>Videos:</strong> {channelPreview.search_result.video_count.toLocaleString()}</span>
            )}
          </div>
          {channelPreview.search_result.description && (
            <p style={{fontSize: '13px', color: '#b3b3b3', marginTop: '10px', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{channelPreview.search_result.description}</p>
          )}
          <button onClick={() => addChannelFromSearch(channelPreview.search_result)} style={{marginTop: '15px'}} disabled={addingChannel === channelPreview.search_result.channel_id}>
            {addingChannel === channelPreview.search_result.channel_id ? 'Adding Channel...' : 'Add This Channel'}
          </button>
        </div>
      </div>

      <div className="section-header">
        <h3>Recent Videos</h3>
      </div>
      <div className="video-grid">
        {channelPreview.videos.map(video => (
          <div key={video.video_id} className="video-card">
            <img src={video.thumbnail} alt={video.title} />
            <div className="video-card-content">
              <h4>{video.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
