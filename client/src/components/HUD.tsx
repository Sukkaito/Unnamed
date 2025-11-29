import { GameState } from '../types';

interface HUDProps {
  gameState: GameState;
  playerId: string | null;
  isSpectator: boolean;
}

export function HUD({ gameState, playerId, isSpectator }: HUDProps) {
  const player = playerId ? gameState.players[playerId] : null;
  const playerCount = Object.keys(gameState.players).length;

  return (
    <div id="hud" style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '10px 16px',
      borderRadius: '5px',
      border: '1px solid #0f3460',
      display: 'flex',
      alignItems: 'flex-start',
      minWidth: '160px'
    }}>
      <div id="playerInfo">
        <div>
          Territory: <span id="territory">
            {isSpectator ? '-' : (player?.area || 0)}
          </span>
        </div>
        <div>
          Cells Captured: <span id="cellsCaptured">
            {isSpectator ? '-' : (player?.area || 0)}
          </span>
        </div>
        <div>
          Players: <span id="playerCount">{playerCount}</span>
        </div>
      </div>
    </div>
  );
}

