FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY backend/ .

# Copy frontend files
COPY frontend/ /app/frontend/

# Create data directories
RUN mkdir -p /app/data/media /app/data/hls /app/data/db

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/server.js"]
