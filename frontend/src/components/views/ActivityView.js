import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { videosApi } from '../../api/videos';
import { formatDuration, getStatusColor } from '../../utils/formatters';

export function ActivityView() {
  const { queue } = useApp();
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await videosApi.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeQueue = queue.filter(v => 
    v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued'
  );

  return (
    <div className="activity-view">
      <h2>Activity</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'queue' ? 'active' : ''} 
          onClick={() => setActiveTab('queue')}
        >
          Queue ({activeQueue.length})
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="queue-list">
          {activeQueue.length === 0 ? (
            <p className="empty-state">No active downloads</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Channel</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeQueue.map(video => (
                  <tr key={video.id}>
                    <td>{video.title}</td>
                    <td>{video.channel_name}</td>
                    <td>{formatDuration(video.duration)}</td>
                    <td>
                      <span className={`status ${getStatusColor(video.status)}`}>
                        {video.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-list">
          {loading ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p className="empty-state">No download history</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Channel</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Downloaded</th>
                </tr>
              </thead>
              <tbody>
                {history.map(video => (
                  <tr key={video.id}>
                    <td>{video.title}</td>
                    <td>{video.channel_name}</td>
                    <td>{formatDuration(video.duration)}</td>
                    <td>
                      <span className={`status ${getStatusColor(video.status)}`}>
                        {video.status}
                      </span>
                    </td>
                    <td>{new Date(video.downloaded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
