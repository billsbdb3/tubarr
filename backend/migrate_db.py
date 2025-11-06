#!/usr/bin/env python3
import sqlite3
import os

CONFIG_PATH = os.getenv('TUBARR_CONFIG_PATH', 'data')
DB_PATH = f'{CONFIG_PATH}/tubarr.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add new columns if they don't exist
    try:
        cursor.execute("ALTER TABLE videos ADD COLUMN season_number INTEGER DEFAULT 1")
        print("Added season_number column")
    except sqlite3.OperationalError:
        print("season_number column already exists")
    
    try:
        cursor.execute("ALTER TABLE videos ADD COLUMN episode_number INTEGER")
        print("Added episode_number column")
    except sqlite3.OperationalError:
        print("episode_number column already exists")
    
    try:
        cursor.execute("ALTER TABLE videos ADD COLUMN playlist_id TEXT")
        print("Added playlist_id column")
    except sqlite3.OperationalError:
        print("playlist_id column already exists")
    
    # Assign episode numbers to existing videos
    cursor.execute("SELECT id, channel_id FROM videos WHERE episode_number IS NULL ORDER BY publish_date")
    videos = cursor.fetchall()
    
    episode_counts = {}
    for video_id, channel_id in videos:
        if channel_id not in episode_counts:
            episode_counts[channel_id] = 1
        else:
            episode_counts[channel_id] += 1
        
        cursor.execute("UPDATE videos SET episode_number = ? WHERE id = ?", 
                      (episode_counts[channel_id], video_id))
    
    conn.commit()
    conn.close()
    print(f"Migration complete. Updated {len(videos)} videos with episode numbers.")

if __name__ == "__main__":
    migrate()
