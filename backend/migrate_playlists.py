#!/usr/bin/env python3
import sqlite3
import os

CONFIG_PATH = os.getenv('TUBARR_CONFIG_PATH', 'data')
DB_PATH = f'{CONFIG_PATH}/tubarr.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create playlists table
    try:
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
        print("Created playlists table")
    except sqlite3.OperationalError as e:
        print(f"Playlists table already exists or error: {e}")
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
