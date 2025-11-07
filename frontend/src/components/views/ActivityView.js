import React from 'react';

export function ActivityView({ queue, history }) {
  return (
    <>
      <div className="page-header">
        <h2>Activity</h2>
        <div className="stats">
          <span style={{color: '#5d9cec'}}>🔄 Auto-refreshing every 1s</span>
        </div>
      </div>

      <div className="section-header">
        <h3>Queue ({queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length})</h3>
      </div>
      <div className="activity-section" style={{marginBottom: '30px'}}>
        {queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').length === 0 ? (
          <p style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>No active downloads</p>
        ) : (
          queue.filter(v => v.status === 'Pending' || v.status.includes('Downloading') || v.status === 'Queued').map(item => (
            <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{flex: 1}}>
                <h4 style={{fontSize: '14px', marginBottom: '5px'}}>{item.title}</h4>
                <p style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.channel_name}</p>
              </div>
              <span style={{fontSize: '12px', color: '#f39c12'}}>⏳ {item.status || 'Pending'}</span>
            </div>
          ))
        )}
      </div>

      <div className="section-header">
        <h3>Recently Downloaded ({history.length})</h3>
      </div>
      <div className="activity-section">
        {history.length === 0 ? (
          <p style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>No download history</p>
        ) : (
          history.map(item => (
            <div key={item.id} style={{padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{flex: 1}}>
                <h4 style={{fontSize: '14px', marginBottom: '5px'}}>{item.video_title}</h4>
                <p style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.channel_name} • {new Date(item.downloaded_at).toLocaleString()}</p>
              </div>
              <span style={{fontSize: '12px', color: '#5d9cec'}}>✅ Downloaded</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

