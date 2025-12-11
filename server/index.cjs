const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 33110;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 内存存储游戏数据（生产环境可以换成 Redis）
const games = new Map();

// 清理超过24小时的游戏
setInterval(() => {
  const now = Date.now();
  for (const [id, game] of games) {
    if (now - game.createdAt > 24 * 60 * 60 * 1000) {
      games.delete(id);
    }
  }
}, 60 * 60 * 1000); // 每小时清理一次

// 生成简短的游戏ID
function generateGameId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 创建新游戏
app.post('/api/games', (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }
  
  let gameId;
  do {
    gameId = generateGameId();
  } while (games.has(gameId));
  
  games.set(gameId, {
    id: gameId,
    topic,
    p1Strokes: null,
    p2Strokes: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  res.json({ gameId, topic });
});

// 获取游戏状态
app.get('/api/games/:id', (req, res) => {
  const game = games.get(req.params.id.toUpperCase());
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

// 提交绘画
app.post('/api/games/:id/draw', (req, res) => {
  const gameId = req.params.id.toUpperCase();
  const { player, strokes } = req.body;
  
  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (player === 1) {
    game.p1Strokes = strokes;
  } else if (player === 2) {
    game.p2Strokes = strokes;
  } else {
    return res.status(400).json({ error: 'Invalid player' });
  }
  
  game.updatedAt = Date.now();
  res.json(game);
});

// 轮询检查游戏状态（长轮询）
app.get('/api/games/:id/poll', async (req, res) => {
  const gameId = req.params.id.toUpperCase();
  const lastUpdate = parseInt(req.query.since) || 0;
  const timeout = 30000; // 30秒超时
  const startTime = Date.now();
  
  const checkUpdate = () => {
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.updatedAt > lastUpdate) {
      return res.json(game);
    }
    
    if (Date.now() - startTime > timeout) {
      return res.json(game); // 超时返回当前状态
    }
    
    setTimeout(checkUpdate, 1000); // 每秒检查一次
  };
  
  checkUpdate();
});

// 服务静态文件（生产环境）
app.use(express.static(path.join(__dirname, '../dist')));

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Draw Together server running at http://localhost:${PORT}`);
});

