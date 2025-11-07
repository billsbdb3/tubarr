import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ChannelList } from './components/views/ChannelList';
import { ChannelDetail } from './components/views/ChannelDetail';
import './App.css';

function AppContent() {
  const { view, setView, queue } = useApp();
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
    setView('channel-detail');
  };

  const handleBackToChannels = () => {
    setSelectedChannel(null);
    setView('home');
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>📺 Tubarr</h1>
        <nav>
          <button 
            className={view === 'home' ? 'active' : ''} 
            onClick={() => setView('home')}
          >
            🏠 Channels
          </button>
          <button 
            className={view === 'activity' ? 'active' : ''} 
            onClick={() => setView('activity')}
          >
            📊 Activity
            {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length > 0 && (
              <span className="badge">
                {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length}
              </span>
            )}
          </button>
          <button 
            className={view === 'search' ? 'active' : ''} 
            onClick={() => setView('search')}
          >
            🔍 Search
          </button>
          <button 
            className={view === 'settings' ? 'active' : ''} 
            onClick={() => setView('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>

      <div className="main-content">
        {view === 'home' && (
          <ChannelList onChannelClick={handleChannelClick} />
        )}

        {view === 'channel-detail' && selectedChannel && (
          <ChannelDetail 
            channel={selectedChannel} 
            onBack={handleBackToChannels}
          />
        )}

        {view === 'activity' && (
          <div>
            <h2>Activity View - Coming Soon</h2>
            <p>This will show queue and history</p>
          </div>
        )}

        {view === 'search' && (
          <div>
            <h2>Search View - Coming Soon</h2>
            <p>This will allow searching for new channels</p>
          </div>
        )}

        {view === 'settings' && (
          <div>
            <h2>Settings View - Coming Soon</h2>
            <p>This will show all settings</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
