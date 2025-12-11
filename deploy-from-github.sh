#!/bin/bash

# 从 GitHub 克隆并部署 Draw Together
# Usage: ./deploy-from-github.sh [项目目录] [GitHub仓库URL]

set -e

# 默认配置
PROJECT_DIR="${1:-/opt/draw-together}"
GITHUB_REPO="${2:-https://github.com/Changan-Su/Draw-Together.git}"
BRANCH="${3:-main}"

echo "🎨 从 GitHub 部署 Draw Together..."
echo "📁 项目目录: $PROJECT_DIR"
echo "🔗 GitHub 仓库: $GITHUB_REPO"
echo "🌿 分支: $BRANCH"
echo ""

# 检查 Git 是否安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未安装 Git"
    echo "请先安装: sudo apt-get install git (Ubuntu/Debian) 或 sudo yum install git (CentOS/RHEL)"
    exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 如果目录已存在，询问是否覆盖
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  目录 $PROJECT_DIR 已存在"
    read -p "是否删除并重新克隆? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  删除现有目录..."
        rm -rf "$PROJECT_DIR"
    else
        echo "📝 使用现有目录，执行更新..."
        cd "$PROJECT_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
        echo "✅ 代码已更新"
    fi
fi

# 如果目录不存在，克隆仓库
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📥 从 GitHub 克隆仓库..."
    git clone -b "$BRANCH" "$GITHUB_REPO" "$PROJECT_DIR"
    echo "✅ 克隆完成"
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    read -p "请输入 GEMINI_API_KEY (可选，直接回车跳过): " api_key
    if [ -n "$api_key" ]; then
        echo "GEMINI_API_KEY=$api_key" > .env
        echo "✅ .env 文件已创建"
    else
        touch .env
        echo "ℹ️  已创建空的 .env 文件（在线联机模式不需要 API Key）"
    fi
fi

# 加载环境变量
if [ -f .env ]; then
    source .env
fi

echo ""
echo "🐳 构建 Docker 镜像..."
docker-compose build --no-cache

echo ""
echo "🚀 启动容器..."
docker-compose up -d

echo ""
echo "✨ 部署完成！"
echo "📱 应用运行在: http://服务器IP:33110"
echo ""
echo "📋 常用命令:"
echo "  查看日志:     cd $PROJECT_DIR && docker-compose logs -f"
echo "  停止服务:     cd $PROJECT_DIR && docker-compose down"
echo "  重启服务:     cd $PROJECT_DIR && docker-compose restart"
echo "  更新代码:     cd $PROJECT_DIR && ./update.sh"
echo ""
