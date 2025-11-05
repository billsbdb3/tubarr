FROM python:3.11-slim

# Install Node.js and ffmpeg
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy frontend and build
COPY frontend/package*.json /app/frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend /app/frontend
RUN npm run build

# Create directories for volumes
RUN mkdir -p /config /downloads

# Set environment variables
ENV TUBARR_CONFIG_PATH=/config
ENV TUBARR_DOWNLOADS_PATH=/downloads
ENV STATIC_DIR=/app/frontend/build

WORKDIR /app

# Expose port
EXPOSE 7171

# Start script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
