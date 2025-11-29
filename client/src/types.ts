export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export type Element = 'dog' | 'duck' | 'penguin' | 'whale';

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  element?: Element;
  area?: number;
}

export interface InterpolatedPlayer extends Player {
  prevX: number;
  prevY: number;
  lastUpdateTime: number;
}

export interface Cell {
  ownerId: string | null;
  color: string;
  isTrail: boolean;
}

export interface GameState {
  players: Record<string, Player>;
  cells: Cell[][];
  timeRemaining?: number;
  gameOver?: boolean;
  winnerName?: string;
}

export interface Arena {
  width: number;
  height: number;
}

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ServerMessage {
  type: string;
  [key: string]: any;
}

export interface TimerSync {
  remainingMs: number;
  syncedAt: number;
  serverTimestamp: number;
}

