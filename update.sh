#!/bin/bash

# 从 GitHub 更新 Draw Together 项目
# Usage: ./update.sh [项目目录]

set -e

# 默认项目目录（如果当前目录是项目目录，则使用当前目录）
if git rev-parse --git-dir > /dev/null 2>&1; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${1:-/opt/draw-together}"
fi

echo "🔄 更新 Draw Together 项目..."
echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 检查目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误: 目录 $PROJECT_DIR 不存在"
    echo "请先运行: ./deploy-from-github.sh"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查是否是 Git 仓库
if [ ! -d .git ]; then
    echo "❌ 错误: $PROJECT_DIR 不是 Git 仓库"
    exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 当前分支: $CURRENT_BRANCH"

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  检测到未提交的更改"
    read -p "是否暂存更改? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "Auto-stash before update $(date +%Y-%m-%d_%H:%M:%S)"
        echo "✅ 更改已暂存"
        STASHED=true
    else
        echo "❌ 更新已取消"
        exit 1
    fi
fi

# 获取远程更新
echo "📥 从 GitHub 拉取最新代码..."
git fetch origin

# 检查是否有更新
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ 代码已是最新版本"
    
    # 如果有暂存的更改，恢复它们
    if [ "$STASHED" = true ]; then
        echo "📦 恢复暂存的更改..."
        git stash pop
    fi
    
    exit 0
fi

echo "🔄 发现新版本，正在更新..."
git pull origin "$CURRENT_BRANCH"

# 恢复暂存的更改（如果有）
if [ "$STASHED" = true ]; then
    echo "📦 恢复暂存的更改..."
    if git stash pop; then
        echo "✅ 更改已恢复"
    else
        echo "⚠️  恢复更改时出现冲突，请手动解决"
    fi
fi

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "⚠️  警告: .env 文件不存在"
    read -p "是否创建 .env 文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入 GEMINI_API_KEY (可选，直接回车跳过): " api_key
        if [ -n "$api_key" ]; then
            echo "GEMINI_API_KEY=$api_key" > .env
        else
            touch .env
        fi
    fi
fi

# 加载环境变量
if [ -f .env ]; then
    source .env
fi

# 询问是否重新构建和重启
echo ""
read -p "是否重新构建并重启 Docker 容器? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🐳 重新构建 Docker 镜像..."
    docker-compose build --no-cache
    
    echo "🔄 重启容器..."
    docker-compose down
    docker-compose up -d
    
    echo ""
    echo "✅ 更新完成！容器已重启"
else
    echo "ℹ️  代码已更新，但未重启容器"
    echo "手动重启: docker-compose restart"
fi

echo ""
echo "📋 查看日志: docker-compose logs -f"
