#!/bin/bash

# SafeShipper MCP Manim Activation Script
# Run this script when Docker Desktop is available on Windows

echo "🎬 Setting up MCP Manim for SafeShipper..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not available. Please install Docker Desktop and try again."
    echo "📥 Download: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Navigate to the Manim directory
cd "$(dirname "$0")/mcp-tools/mcp-manim" || exit 1

echo "🐳 Building Manim Docker container..."
docker-compose build

echo "🚀 Starting Manim MCP server..."
docker-compose up -d

# Wait for the container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 10

# Test the installation
echo "🧪 Testing Manim installation..."
docker-compose exec mcp-manim-server python3 -c "
import manim
import mcp
print('✅ Manim version:', manim.__version__)
print('✅ MCP Python available')
print('✅ Manim MCP server is ready for mathematical animations!')
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MCP Manim is now active and ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy claude_desktop_config.json to Claude Desktop's config directory"
    echo "2. Restart Claude Desktop"
    echo "3. Look for the MCP server icons in Claude Desktop"
    echo ""
    echo "🎯 You can now create SafeShipper visualizations:"
    echo "- pH segregation animations for dangerous goods"
    echo "- Load planning optimization demonstrations"
    echo "- Chemical compatibility matrix visualizations"
else
    echo "❌ Something went wrong. Check the logs:"
    docker-compose logs mcp-manim-server
fi