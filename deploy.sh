#!/bin/bash

# Deploy script for Draw Together
# Usage: ./deploy.sh
# 注意: 此脚本用于本地已有代码的部署
# 如果要从 GitHub 克隆，请使用: ./deploy-from-github.sh

set -e

echo "🎨 Deploying Draw Together..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating empty .env file (online multiplayer mode doesn't require API key)"
    touch .env
fi

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# GEMINI_API_KEY 是可选的（在线联机模式不需要）
if [ -z "$GEMINI_API_KEY" ]; then
    echo "ℹ️  GEMINI_API_KEY not set (optional for online multiplayer mode)"
fi

echo "✅ Environment variables loaded"

# Build and deploy with Docker Compose
echo "🐳 Building Docker image..."
docker-compose build --no-cache

echo "🚀 Starting container..."
docker-compose up -d

echo ""
echo "✨ Deployment complete!"
echo "📱 Your app is running at: http://localhost:33110"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop:          docker-compose down"
echo "  Restart:       docker-compose restart"
echo "  Update code:   ./update.sh"

