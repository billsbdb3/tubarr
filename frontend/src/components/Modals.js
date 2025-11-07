import React from 'react';

export function ChannelModal({ channelModal, setChannelModal, addingChannel, onConfirm }) {
  if (!channelModal) return null;

  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
      <div style={{background: 'var(--bg-primary)', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%'}}>
        <h2 style={{marginBottom: '20px'}}>Add Channel</h2>
        
        <div style={{display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center'}}>
          {channelModal.thumbnail && (
            <img src={channelModal.thumbnail} alt="" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}} />
          )}
          <div>
            <div style={{fontSize: '18px', fontWeight: 'bold'}}>{channelModal.channel_name}</div>
          </div>
        </div>

        <div style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Download Path</label>
          <input 
            type="text" 
            value={channelModal.download_path}
            onChange={(e) => setChannelModal({...channelModal, download_path: e.target.value})}
            style={{width: '100%'}}
          />
        </div>

        <div style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Quality</label>
          <select 
            value={channelModal.quality}
            onChange={(e) => setChannelModal({...channelModal, quality: e.target.value})}
            style={{width: '100%'}}
          >
            <option value="2160p">2160p (4K)</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="720p">720p (HD)</option>
            <option value="480p">480p (SD)</option>
            <option value="best">Best Available</option>
          </select>
        </div>

        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
            <input 
              type="checkbox" 
              checked={channelModal.monitored}
              onChange={(e) => setChannelModal({...channelModal, monitored: e.target.checked})}
            />
            <span>Monitor this channel for new videos</span>
          </label>
        </div>

        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
          <button onClick={() => setChannelModal(null)} style={{background: 'var(--bg-secondary)'}}>Cancel</button>
          <button onClick={onConfirm} disabled={addingChannel}>
            {addingChannel ? 'Adding...' : 'Add Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlaylistModal({ playlistModal, setPlaylistModal, onConfirm }) {
  if (!playlistModal) return null;

  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
      <div style={{background: 'var(--bg-primary)', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%'}}>
        <h2 style={{marginBottom: '20px'}}>{playlistModal.monitored ? 'Manage' : 'Add'} Playlist</h2>
        
        <div style={{marginBottom: '20px'}}>
          <div style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '5px'}}>📁 {playlistModal.title}</div>
          <div style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{playlistModal.video_count} videos</div>
        </div>

        {!playlistModal.monitored && (
          <>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                <input 
                  type="checkbox" 
                  checked={playlistModal.downloadAll}
                  onChange={(e) => setPlaylistModal({...playlistModal, downloadAll: e.target.checked})}
                />
                <span>Download all existing videos now</span>
              </label>
              <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', marginLeft: '30px'}}>
                If unchecked, only new videos added to the playlist will be downloaded
              </p>
            </div>
          </>
        )}

        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
          <button onClick={() => setPlaylistModal(null)} style={{background: 'var(--bg-secondary)'}}>Cancel</button>
          <button onClick={onConfirm}>
            {playlistModal.monitored ? 'Unmonitor' : 'Monitor Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
}
