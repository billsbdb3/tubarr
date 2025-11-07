import React from 'react';
import axios from 'axios';

export function SearchView({ 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  setSearchResults,
  addingChannel,
  setChannelModal,
  setChannelPreview,
  setView,
  settings 
}) {
  const searchChannels = async (e) => {
    e.preventDefault();
    const res = await axios.get(`/api/v1/search?query=${searchQuery}`);
    setSearchResults(res.data);
    
    // Fetch full channel info in background
    res.data.forEach(async (result, idx) => {
      try {
        const infoRes = await axios.get(`/api/v1/channel/info/${result.channel_id}`);
        if (infoRes.data) {
          const proxiedUrl = infoRes.data.thumbnail ? `/api/v1/proxy/image?url=${encodeURIComponent(infoRes.data.thumbnail)}` : null;
          setSearchResults(prev => 
            prev.map((item, i) => 
              i === idx ? {...item, ...infoRes.data, thumbnail: proxiedUrl} : item
            )
          );
        }
      } catch (e) {
        // Keep placeholder
      }
    });
  };

  const addChannelFromSearch = async (result) => {
    setChannelModal({
      channel_url: result.channel_url,
      channel_id: result.channel_id,
      channel_name: result.channel_name,
      thumbnail: result.thumbnail,
      monitored: true,
      quality: settings.defaultQuality || '1080p',
      download_path: settings.defaultPath || '/downloads'
    });
  };

  const previewChannel = async (result) => {
    const res = await axios.get(`/api/v1/preview/channel/${result.channel_id}`);
    setChannelPreview({...res.data, search_result: result});
    setView('channel-preview');
  };

  return (
    <>
      <div className="page-header">
        <h2>Search Channels</h2>
      </div>
      
      <form onSubmit={searchChannels}>
        <input
          type="text"
          placeholder="Search for YouTube channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          required
        />
        <button type="submit">Search</button>
      </form>

      {searchResults.length > 0 && (
        <div style={{marginTop: '30px'}}>
          {searchResults.map((result, idx) => (
            <div key={idx} className="channel-header" style={{marginBottom: '20px'}}>
              {result.thumbnail ? (
                <img src={result.thumbnail} alt={result.channel_name} style={{width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover'}} />
              ) : (
                <div style={{width: '140px', height: '140px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold', color: 'white', flexShrink: 0}}>
                  {result.channel_name.charAt(0)}
                </div>
              )}
              <div className="channel-info" style={{flex: 1}}>
                <h2>{result.channel_name}</h2>
                <div className="info-row">
                  {result.subscriber_count && (
                    <span><strong>Subscribers:</strong> {result.subscriber_count.toLocaleString()}</span>
                  )}
                  {result.video_count && (
                    <span><strong>Videos:</strong> {result.video_count.toLocaleString()}</span>
                  )}
                </div>
                {result.description && (
                  <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: '1.4'}}>{result.description}</p>
                )}
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                  <button onClick={() => previewChannel(result)}>Preview</button>
                  <button onClick={() => addChannelFromSearch(result)} disabled={addingChannel === result.channel_id}>
                    {addingChannel === result.channel_id ? 'Adding...' : 'Add Channel'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
