import { Stroke } from '../types';

// API 基础URL - 开发环境用相对路径，生产环境也用相对路径
const API_BASE = '/api';

export interface GameData {
  id: string;
  topic: string;
  p1Strokes: Stroke[] | null;
  p2Strokes: Stroke[] | null;
  createdAt: number;
  updatedAt: number;
}

// 创建新游戏
export async function createGame(topic: string): Promise<{ gameId: string; topic: string }> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic })
  });
  if (!res.ok) throw new Error('Failed to create game');
  return res.json();
}

// 获取游戏状态
export async function getGame(gameId: string): Promise<GameData> {
  const res = await fetch(`${API_BASE}/games/${gameId}`);
  if (!res.ok) throw new Error('Game not found');
  return res.json();
}

// 提交绘画
export async function submitDrawing(gameId: string, player: 1 | 2, strokes: Stroke[]): Promise<GameData> {
  const res = await fetch(`${API_BASE}/games/${gameId}/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, strokes })
  });
  if (!res.ok) throw new Error('Failed to submit drawing');
  return res.json();
}

// 轮询游戏状态
export async function pollGame(gameId: string, since: number): Promise<GameData> {
  const res = await fetch(`${API_BASE}/games/${gameId}/poll?since=${since}`);
  if (!res.ok) throw new Error('Failed to poll game');
  return res.json();
}

