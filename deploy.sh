#!/bin/bash

# Deploy script for Draw Together
# Usage: ./deploy.sh

set -e

echo "🎨 Deploying Draw Together..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with GEMINI_API_KEY=your_key"
    echo "Example: cp .env.example .env && nano .env"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY is not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Build and deploy with Docker Compose
echo "🐳 Building Docker image..."
docker-compose build --no-cache

echo "🚀 Starting container..."
docker-compose up -d

echo ""
echo "✨ Deployment complete!"
echo "📱 Your app is running at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop:          docker-compose down"
echo "  Restart:       docker-compose restart"

