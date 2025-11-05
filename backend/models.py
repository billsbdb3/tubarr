from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Channel(Base):
    __tablename__ = 'channels'
    
    id = Column(Integer, primary_key=True)
    channel_url = Column(String, unique=True)
    channel_id = Column(String, unique=True)
    channel_name = Column(String)
    thumbnail = Column(String)
    description = Column(String)
    monitored = Column(Boolean, default=True)
    download_path = Column(String)
    quality = Column(String, default='1080p')
    added = Column(DateTime, default=datetime.utcnow)
    last_sync = Column(DateTime)
    tags = Column(String, default='[]')
    
    videos = relationship('Video', back_populates='channel')

class Video(Base):
    __tablename__ = 'videos'
    
    id = Column(Integer, primary_key=True)
    video_id = Column(String, unique=True)
    channel_id = Column(Integer, ForeignKey('channels.id'))
    title = Column(String)
    publish_date = Column(DateTime)
    downloaded = Column(Boolean, default=False)
    download_path = Column(String)
    file_size = Column(Integer)
    download_status = Column(String, default='pending')
    duration = Column(Integer)
    
    channel = relationship('Channel', back_populates='videos')

class DownloadQueue(Base):
    __tablename__ = 'queue'
    
    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey('videos.id'))
    status = Column(String, default='queued')
    progress = Column(Integer, default=0)
    added = Column(DateTime, default=datetime.utcnow)

class History(Base):
    __tablename__ = 'history'
    
    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey('videos.id'))
    event_type = Column(String)
    date = Column(DateTime, default=datetime.utcnow)
    data = Column(String)
