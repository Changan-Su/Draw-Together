# 双人联画 / DuoDraw

一个有趣的蒙眼合作绘画游戏。两个人分别画一个主题的上半部分和下半部分，最后合成有趣的画作！

## 功能特点

- 🎨 **传阅模式**: 把设备传给身边的朋友一起玩
- 🌐 **在线联机**: 通过链接分享给远方的好友，实时同步结果
- 🤖 **AI 补全**: 让 Gemini AI 完成下半部分

## 在线联机流程

1. **玩家1** 创建游戏，获得房间号和链接
2. **玩家1** 画上半部分，同时把链接发给玩家2
3. **玩家2** 打开链接，等玩家1画完后开始画下半部分
4. **玩家2** 画完后，**双方同时自动看到结果**！✨

## 在 Linux 服务器上部署 (Docker)

### 前置要求

- Linux 服务器
- Git、Docker 和 Docker Compose 已安装
- (可选) Gemini API Key - 仅 AI 模式需要

### 方式一：从 GitHub 直接部署（推荐）

```bash
# 1. SSH 连接服务器
ssh user@服务器IP

# 2. 下载部署脚本并执行
curl -O https://raw.githubusercontent.com/Changan-Su/Draw-Together/main/deploy-from-github.sh
chmod +x deploy-from-github.sh
./deploy-from-github.sh

# 或者指定目录和仓库
./deploy-from-github.sh /opt/draw-together https://github.com/Changan-Su/Draw-Together.git main

# 脚本会自动：
# - 从 GitHub 克隆项目
# - 创建 .env 文件（可选）
# - 构建并启动 Docker 容器
```

### 方式二：手动上传部署

```bash
# 1. 上传项目到服务器
scp -r ./Draw-Together user@服务器IP:/home/user/

# 2. SSH 连接服务器
ssh user@服务器IP
cd /home/user/Draw-Together

# 3. 创建环境变量文件（AI模式需要，在线联机不需要）
echo "GEMINI_API_KEY=你的API密钥" > .env
# 或者留空：touch .env

# 4. 构建并启动
docker-compose up -d --build

# 5. 访问应用
# http://服务器IP:33110
```

### 更新项目

如果项目已部署，可以使用更新脚本从 GitHub 拉取最新代码：

```bash
# 进入项目目录
cd /opt/draw-together  # 或你的项目目录

# 运行更新脚本
./update.sh

# 脚本会自动：
# - 从 GitHub 拉取最新代码
# - 询问是否重新构建和重启容器
```

### 常用命令

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启
docker-compose restart

# 重新构建
docker-compose up -d --build

# 从 GitHub 更新代码并重启
./update.sh
```

### 修改端口

编辑 `docker-compose.yml`:
```yaml
ports:
  - "你的端口:33110"
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + 后端）
npm run dev

# 前端: http://localhost:3000
# 后端: http://localhost:33110
```

## 技术架构

```
├── App.tsx              # 前端主应用
├── server/
│   └── index.js         # Express 后端 API
├── services/
│   ├── gameApi.ts       # 游戏 API 客户端
│   └── geminiService.ts # Gemini AI 服务
├── data/
│   └── topics.ts        # 1000+ 题目库
├── Dockerfile           # Docker 构建
├── docker-compose.yml   # Docker 编排
├── deploy.sh            # 本地部署脚本
├── deploy-from-github.sh # 从 GitHub 部署脚本
└── update.sh            # 更新脚本（从 GitHub 拉取）
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/games | 创建游戏 |
| GET | /api/games/:id | 获取游戏状态 |
| POST | /api/games/:id/draw | 提交绘画 |
| GET | /api/games/:id/poll | 轮询状态更新 |

---

Made By Forsion Ai Studio 2025
