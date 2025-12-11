# 部署指南

## 从 GitHub 部署到服务器

### 快速开始

在服务器上执行以下命令：

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/Changan-Su/Draw-Together/main/deploy-from-github.sh
chmod +x deploy-from-github.sh

# 执行部署（默认部署到 /opt/draw-together）
./deploy-from-github.sh

# 或指定自定义目录
./deploy-from-github.sh /home/user/draw-together
```

### 脚本功能

`deploy-from-github.sh` 会自动完成：
1. ✅ 检查 Git、Docker 环境
2. ✅ 从 GitHub 克隆项目（如果目录不存在）
3. ✅ 创建 `.env` 文件（可选）
4. ✅ 构建 Docker 镜像
5. ✅ 启动容器

### 更新项目

当代码更新后，在服务器上运行：

```bash
# 进入项目目录
cd /opt/draw-together  # 或你的项目目录

# 运行更新脚本
./update.sh
```

`update.sh` 会自动：
1. ✅ 检查是否有未提交的更改
2. ✅ 从 GitHub 拉取最新代码
3. ✅ 询问是否重新构建和重启容器

### 手动更新

如果不想使用脚本，也可以手动操作：

```bash
cd /opt/draw-together
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 环境变量

创建 `.env` 文件（可选，在线联机模式不需要）：

```bash
GEMINI_API_KEY=你的API密钥
```

## 常用 Docker 命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

## 故障排查

### 端口被占用

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "33111:33110"  # 改为其他端口
```

### 权限问题

确保脚本有执行权限：
```bash
chmod +x deploy-from-github.sh update.sh deploy.sh
```

### Git 认证问题

如果仓库是私有的，需要配置 SSH 密钥或使用 Personal Access Token：
```bash
# 使用 SSH（推荐）
git remote set-url origin git@github.com:Changan-Su/Draw-Together.git

# 或使用 Token
git remote set-url origin https://YOUR_TOKEN@github.com/Changan-Su/Draw-Together.git
```
