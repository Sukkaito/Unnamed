import { GameState, TimerSync } from '../types';

interface TimerOverlayProps {
  gameState: GameState;
  timerSync: TimerSync | null;
}

export function TimerOverlay({ gameState, timerSync }: TimerOverlayProps) {
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const getTimeRemaining = (): number => {
    const defaultTime = 3 * 60 * 1000;
    let timeRemaining = typeof gameState.timeRemaining === 'number'
      ? gameState.timeRemaining
      : defaultTime;

    if (timerSync && typeof timerSync.remainingMs === 'number') {
      const elapsed = performance.now() - timerSync.syncedAt;
      timeRemaining = Math.max(0, timerSync.remainingMs - elapsed);
    }

    return timeRemaining;
  };

  const timeRemaining = getTimeRemaining();
  const winnerName = gameState.winnerName;
  const isGameOver = gameState.gameOver;

  return (
    <div id="timerOverlay" style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(6, 12, 24, 0.55)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      padding: '14px 28px',
      textAlign: 'center',
      minWidth: '180px',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)'
    }}>
      <div className="timer-label">Time Left</div>
      <div id="timer">{formatTime(timeRemaining)}</div>
      <div id="statusMessage" className={isGameOver ? 'game-over' : ''} style={{
        fontSize: '12px',
        marginTop: '6px',
        minHeight: '18px',
        color: isGameOver ? '#FFEAA7' : 'inherit'
      }}>
        {isGameOver ? (winnerName ? `${winnerName} wins!` : 'Match ended') : ''}
      </div>
    </div>
  );
}

