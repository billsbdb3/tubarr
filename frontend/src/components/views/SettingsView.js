import React from 'react';
import axios from 'axios';

export function SettingsView({ 
  settings, 
  setSettings, 
  settingsTab, 
  setSettingsTab,
  status 
}) {
  const saveSettings = async () => {
    await axios.post('/api/v1/settings', settings);
    alert('Settings saved!');
  };

  const generateApiKey = async () => {
    const res = await axios.post('/api/v1/settings/generate-key');
    setSettings({...settings, apiKey: res.data.apiKey});
  };

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-tabs">
        <button 
          onClick={() => setSettingsTab('general')} 
          className={settingsTab === 'general' ? 'active' : ''}
        >
          General
        </button>
        <button 
          onClick={() => setSettingsTab('media')} 
          className={settingsTab === 'media' ? 'active' : ''}
        >
          Media Management
        </button>
        <button 
          onClick={() => setSettingsTab('quality')} 
          className={settingsTab === 'quality' ? 'active' : ''}
        >
          Quality
        </button>
        <button 
          onClick={() => setSettingsTab('ui')} 
          className={settingsTab === 'ui' ? 'active' : ''}
        >
          UI
        </button>
      </div>

      {settingsTab === 'general' && (
        <div className="settings-section">
          <h3 style={{marginBottom: '20px'}}>General</h3>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>API Key</label>
            <div style={{display: 'flex', gap: '10px'}}>
              <input 
                type="text" 
                value={settings.apiKey || 'Not generated'} 
                readOnly 
                style={{flex: 1}} 
              />
              <button onClick={generateApiKey}>Generate New Key</button>
            </div>
            <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>Required for API access and integrations</p>
          </div>

          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Default Download Path</label>
            <input 
              type="text" 
              value={settings.defaultPath} 
              onChange={(e) => setSettings({...settings, defaultPath: e.target.value})}
              style={{width: '100%'}} 
            />
            <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>Where new channels will download by default</p>
          </div>

          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Auto Sync</label>
            <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input 
                type="checkbox" 
                checked={settings.autoSync}
                onChange={(e) => setSettings({...settings, autoSync: e.target.checked})}
              />
              <span>Automatically check for new videos</span>
            </label>
          </div>

          {settings.autoSync && (
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Sync Interval (minutes)</label>
              <input 
                type="number" 
                value={settings.syncInterval} 
                onChange={(e) => setSettings({...settings, syncInterval: parseInt(e.target.value)})}
                min="5"
                max="1440"
                style={{width: '200px'}} 
              />
            </div>
          )}

          <button onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      {settingsTab === 'media' && (
        <div className="settings-section">
          <h3 style={{marginBottom: '20px'}}>Media Management</h3>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>File Naming Format</label>
            <select 
              value={settings.namingFormat}
              onChange={(e) => setSettings({...settings, namingFormat: e.target.value})}
              style={{width: '100%', marginBottom: '10px'}}
            >
              <option value="standard">Standard: Channel - S01E01 - Title</option>
              <option value="scene">Scene: Channel.S01E01.Title</option>
              <option value="plex">Plex: Channel - s01e01 - Title</option>
              <option value="custom">Custom Pattern</option>
            </select>
          </div>

          {settings.namingFormat === 'custom' && (
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Custom Pattern</label>
              <input 
                type="text" 
                value={settings.customNaming || '{channel} - S{season:00}E{episode:000} - {title}'}
                onChange={(e) => setSettings({...settings, customNaming: e.target.value})}
                style={{width: '100%', marginBottom: '5px'}} 
              />
              <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>
                Tokens: {'{channel}'}, {'{title}'}, {'{season:00}'}, {'{episode:000}'}, {'{id}'}, {'{date}'}
              </p>
              <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px'}}>
                Example: {settings.customNaming?.replace('{channel}', 'Linus Tech Tips').replace('{season:00}', '01').replace('{episode:000}', '042').replace('{title}', 'This GPU is INSANE').replace('{id}', 'dQw4w9WgXcQ').replace('{date}', '2025-01-15') || 'Enter pattern above'}
              </p>
            </div>
          )}

          {settings.namingFormat !== 'custom' && (
            <div style={{marginBottom: '20px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '4px'}}>
              <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Preview:</div>
              <div style={{fontSize: '14px', marginTop: '5px'}}>
                {settings.namingFormat === 'standard' && 'Linus Tech Tips - S01E042 - This GPU is INSANE.mkv'}
                {settings.namingFormat === 'scene' && 'Linus.Tech.Tips.S01E042.This.GPU.is.INSANE.mkv'}
                {settings.namingFormat === 'plex' && 'Linus Tech Tips - s01e42 - This GPU is INSANE.mkv'}
              </div>
            </div>
          )}

          <button onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      {settingsTab === 'quality' && (
        <div className="settings-section">
          <h3 style={{marginBottom: '20px'}}>Quality Profiles</h3>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Default Quality</label>
            <select 
              value={settings.defaultQuality}
              onChange={(e) => setSettings({...settings, defaultQuality: e.target.value})}
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
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Preferred Format</label>
            <select style={{width: '100%'}}>
              <option value="mkv">MKV (Matroska)</option>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <button onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      {settingsTab === 'ui' && (
        <div className="settings-section">
          <h3 style={{marginBottom: '20px'}}>UI Settings</h3>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value})}
              style={{width: '100%'}}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>Videos Per Page</label>
            <input type="number" defaultValue="50" min="10" max="200" style={{width: '200px'}} />
          </div>

          <button onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      <div className="settings-section" style={{marginTop: '20px'}}>
        <h3 style={{marginBottom: '15px'}}>System Information</h3>
        <div style={{display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', fontSize: '14px'}}>
          <span style={{color: 'var(--text-secondary)'}}>Version:</span>
          <span>{status.app_version || '1.0.2'}</span>
          <span style={{color: 'var(--text-secondary)'}}>yt-dlp Version:</span>
          <span>{status.ytdlp_version || 'unknown'}</span>
          <span style={{color: 'var(--text-secondary)'}}>Backend Status:</span>
          <span style={{color: '#5d9cec'}}>● Running</span>
          <span style={{color: 'var(--text-secondary)'}}>Database:</span>
          <span>{status.videos} videos, {status.downloaded} downloaded</span>
          <span style={{color: 'var(--text-secondary)'}}>Channels:</span>
          <span>{status.channels} monitored</span>
        </div>
      </div>
    </>
  );
}
