import React, { useState } from 'react';
import { channelsApi } from '../../api/channels';
import { useApp } from '../../context/AppContext';

export function SearchView() {
  const { refreshChannels } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const results = await channelsApi.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError('Failed to search channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async (channelUrl) => {
    try {
      await channelsApi.add(channelUrl);
      await refreshChannels();
      setSearchResults(searchResults.filter(r => r.url !== channelUrl));
    } catch (err) {
      alert('Failed to add channel');
      console.error(err);
    }
  };

  const handlePreview = async (channelUrl) => {
    try {
      const info = await channelsApi.getInfo(channelUrl);
      alert(`Channel: ${info.name}\nVideos: ${info.video_count}\nSubscribers: ${info.subscriber_count}`);
    } catch (err) {
      alert('Failed to get channel info');
      console.error(err);
    }
  };

  return (
    <div className="search-view">
      <h2>Search Channels</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Enter channel URL or search term..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Results ({searchResults.length})</h3>
          <div className="results-grid">
            {searchResults.map((result, idx) => (
              <div key={idx} className="result-card">
                <img src={result.thumbnail} alt={result.name} />
                <h4>{result.name}</h4>
                <p>{result.description}</p>
                <div className="result-actions">
                  <button onClick={() => handlePreview(result.url)}>
                    Preview
                  </button>
                  <button onClick={() => handleAddChannel(result.url)} className="primary">
                    Add Channel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
