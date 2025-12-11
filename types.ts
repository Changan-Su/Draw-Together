export enum GameMode {
  LOCAL = 'LOCAL',
  AI = 'AI',
  ONLINE = 'ONLINE'
}

export enum GameStage {
  MENU = 'MENU',
  TOPIC_SELECTION = 'TOPIC_SELECTION',
  P1_DRAW = 'P1_DRAW',
  TRANSITION = 'TRANSITION', // Pass device or AI generating or Share Link
  P2_DRAW = 'P2_DRAW',
  RESULT = 'RESULT'
}

export interface DrawData {
  dataUrl: string;
}

export type Stroke = number[]; // [x, y, x, y, ...] flattened

export enum DrawingPart {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM'
}

export type Language = 'en' | 'zh';
