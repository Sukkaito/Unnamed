import { useRef } from 'react';
import { GameState, Player, TimerSync } from '../types';
import { HUD } from './HUD';
import { Chat } from './Chat';
import { Scoreboard } from './Scoreboard';
import { TimerOverlay } from './TimerOverlay';

interface GameContainerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameState: GameState;
  playerId: string | null;
  isSpectator: boolean;
  timerSync: TimerSync | null;
  chatMessages: Array<{ type: 'player' | 'system'; content: string }>;
  onSendChatMessage: (message: string) => void;
}

export function GameContainer({
  canvasRef,
  gameState,
  playerId,
  isSpectator,
  timerSync,
  chatMessages,
  onSendChatMessage
}: GameContainerProps) {
  return (
    <div id="gameContainer" style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'block'
    }}>
      <HUD gameState={gameState} playerId={playerId} isSpectator={isSpectator} />
      <TimerOverlay gameState={gameState} timerSync={timerSync} />
      <Scoreboard gameState={gameState} playerId={playerId} />
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        width={1600}
        height={900}
        style={{
          display: 'block',
          background: '#162447',
          margin: '0 auto',
          border: '2px solid #0f3460',
          imageRendering: 'pixelated'
        }}
      />
      <Chat chatMessages={chatMessages} onSendMessage={onSendChatMessage} />
    </div>
  );
}

