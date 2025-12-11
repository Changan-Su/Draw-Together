import LZString from 'lz-string';
import { Stroke } from '../types';

export interface GameState {
  t: string;       // topic
  p1?: Stroke[];   // player 1 strokes
  p2?: Stroke[];   // player 2 strokes
}

export const encodeGameState = (state: GameState): string => {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
};

export const decodeGameState = (hash: string): GameState | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as GameState;
  } catch (e) {
    console.error("Failed to decode game state", e);
    return null;
  }
};
