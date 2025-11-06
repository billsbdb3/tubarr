#!/usr/bin/env python3
"""
Database migration script - runs automatically on startup
"""
import sqlite3
import os
import sys

CONFIG_PATH = os.getenv('TUBARR_CONFIG_PATH', 'data')
DB_PATH = f'{CONFIG_PATH}/tubarr.db'

def get_db_version(cursor):
    """Get current database version"""
    try:
        cursor.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        result = cursor.fetchone()
        return result[0] if result else 0
    except sqlite3.OperationalError:
        return 0

def set_db_version(cursor, version):
    """Set database version"""
    cursor.execute("INSERT INTO schema_version (version, applied_at) VALUES (?, datetime('now'))", (version,))

def migrate():
    """Run all pending migrations"""
    os.makedirs(CONFIG_PATH, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create schema_version table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    current_version = get_db_version(cursor)
    print(f"Current database version: {current_version}")
    
    # Migration 1: Add season/episode columns to videos
    if current_version < 1:
        print("Applying migration 1: Add season/episode columns...")
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN season_number INTEGER DEFAULT 1")
        except sqlite3.OperationalError:
            pass
        
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN episode_number INTEGER")
        except sqlite3.OperationalError:
            pass
        
        try:
            cursor.execute("ALTER TABLE videos ADD COLUMN playlist_id TEXT")
        except sqlite3.OperationalError:
            pass
        
        # Assign episode numbers to existing videos
        cursor.execute("SELECT id, channel_id FROM videos WHERE episode_number IS NULL ORDER BY publish_date")
        videos = cursor.fetchall()
        episode_counts = {}
        for video_id, channel_id in videos:
            if channel_id not in episode_counts:
                episode_counts[channel_id] = 1
            else:
                episode_counts[channel_id] += 1
            cursor.execute("UPDATE videos SET episode_number = ?, season_number = 0 WHERE id = ?", 
                          (episode_counts[channel_id], video_id))
        
        set_db_version(cursor, 1)
        print(f"Migration 1 complete. Updated {len(videos)} videos.")
    
    # Migration 2: Create playlists table
    if current_version < 2:
        print("Applying migration 2: Create playlists table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id TEXT UNIQUE NOT NULL,
                channel_id INTEGER NOT NULL,
                title TEXT,
                monitored BOOLEAN DEFAULT 0,
                download_path TEXT,
                quality TEXT DEFAULT '1080p',
                season_number INTEGER DEFAULT 1,
                added DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_sync DATETIME,
                FOREIGN KEY (channel_id) REFERENCES channels(id)
            )
        """)
        set_db_version(cursor, 2)
        print("Migration 2 complete.")
    
    conn.commit()
    conn.close()
    print(f"Database migrations complete. Current version: {max(current_version, 2)}")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
