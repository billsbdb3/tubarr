import React from 'react';

export function AddChannel({ newChannel, setNewChannel, onSubmit }) {
  return (
    <div className="section">
      <h2>Add Channel Manually</h2>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Channel URL"
          value={newChannel.channel_url}
          onChange={(e) => setNewChannel({...newChannel, channel_url: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Download Path"
          value={newChannel.download_path}
          onChange={(e) => setNewChannel({...newChannel, download_path: e.target.value})}
        />
        <select
          value={newChannel.quality}
          onChange={(e) => setNewChannel({...newChannel, quality: e.target.value})}
        >
          <option value="2160p">2160p (4K)</option>
          <option value="1080p">1080p (Full HD)</option>
          <option value="720p">720p (HD)</option>
          <option value="480p">480p (SD)</option>
          <option value="best">Best Available</option>
        </select>
        <button type="submit">Add Channel</button>
      </form>
    </div>
  );
}
