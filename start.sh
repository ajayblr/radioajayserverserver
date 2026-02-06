#!/bin/bash

# RadioAjay Quick Start Script

echo "🎵 RadioAjay Quick Start"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set a secure password!"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "Building and starting RadioAjay..."
echo ""

# Build and start
docker-compose up -d --build

# Wait a few seconds
sleep 3

# Show status
echo ""
echo "✓ RadioAjay is starting up!"
echo ""
echo "📡 Access points:"
echo "   Public Player:  http://localhost:3000"
echo "   Admin Panel:    http://localhost:3000/admin"
echo "   HLS Stream:     http://localhost:3000/stream/radioajay.m3u8"
echo ""
echo "🔑 Default admin password: radioajay123"
echo "   (Change this in .env file!)"
echo ""
echo "📋 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop RadioAjay:"
echo "   docker-compose down"
echo ""
