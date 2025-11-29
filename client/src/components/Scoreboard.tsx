import { GameState, Player } from '../types';

interface ScoreboardProps {
  gameState: GameState;
  playerId: string | null;
}

export function Scoreboard({ gameState, playerId }: ScoreboardProps) {
  const getPlayerDisplayName = (player: Player): string => {
    return player.name || player.id?.substring(0, 4) || 'Player';
  };

  const players = Object.values(gameState.players || {});
  const sortedPlayers = [...players].sort((a, b) => (b.area || 0) - (a.area || 0));

  return (
    <div className="scoreboard-tab" style={{
      position: 'absolute',
      top: '50%',
      left: 0,
      transform: 'translateY(-50%)',
      background: 'rgba(0, 0, 0, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderTopRightRadius: '12px',
      borderBottomRightRadius: '12px',
      padding: '14px 16px',
      width: '170px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(6px)'
    }}>
      <div className="scoreboard-title">Leaderboard</div>
      <ol id="scoreList" style={{
        listStyle: 'none',
        padding: 0,
        margin: 0
      }}>
        {sortedPlayers.map((player, index) => {
          const isCurrent = player.id === playerId;
          return (
            <li
              key={player.id}
              className={isCurrent ? 'current' : ''}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                marginBottom: '4px',
                padding: '4px 6px',
                borderRadius: '3px',
                background: isCurrent
                  ? 'rgba(255, 234, 167, 0.15)'
                  : 'rgba(15, 52, 96, 0.4)',
                border: isCurrent ? '1px solid #FFEAA7' : 'none'
              }}
            >
              <span className="player-name" style={{ fontWeight: 'bold' }}>
                {index + 1}. {getPlayerDisplayName(player)}
              </span>
              <span className="player-score" style={{ color: '#FFEAA7' }}>
                {player.area || 0}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

