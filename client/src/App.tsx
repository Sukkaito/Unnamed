import { useState, useEffect } from 'react';
import { useGameClient } from './hooks/useGameClient';
import { LoginScreen } from './components/LoginScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameContainer } from './components/GameContainer';
import { Element } from './types';
import './App.css';

function App() {
  const {
    canvasRef,
    gameState,
    playerId,
    playerName,
    setPlayerName,
    selectedElement,
    setSelectedElement,
    isSpectator,
    elementAvailability,
    timerSync,
    chatMessages,
    connectionError,
    isConnecting,
    isKicked,
    setIsKicked,
    joinPublicGame,
    joinPrivateGame,
    createPrivateRoom,
    spectate,
    sendChatMessage,
    lobbyState,
    isInLobby,
    isReady,
    setLobbyReady,
    setLobbyElement,
    sendLobbyChat,
    kickPlayer,
    startGame
  } = useGameClient();

  const [showLogin, setShowLogin] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinPublic = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPublicGame(name);
  };

  const handleJoinPrivate = (name: string, roomCode: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPrivateGame(name, roomCode);
  };

  const handleCreatePrivate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    createPrivateRoom(name);
  };

  const handleSpectate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    spectate(name);
  };

  // Hide login screen when player joins lobby or game
  useEffect(() => {
    if ((playerId && isInLobby) || (playerId && !isInLobby && !showLogin)) {
      setShowLogin(false);
      setIsLoading(false);
    }
  }, [playerId, isInLobby, showLogin]);

  // Calculate element availability from lobby state
  const getElementAvailability = () => {
    if (!lobbyState || !lobbyState.players) {
      return { dog: true, duck: true, penguin: true, whale: true };
    }
    const usedElements = new Set(
      lobbyState.players
        .filter((p: any) => p.id !== playerId)
        .map((p: any) => p.element)
    );
    const available: Record<string, boolean> = {};
    ['dog', 'duck', 'penguin', 'whale'].forEach((el) => {
      available[el] = !usedElements.has(el);
    });
    return available;
  };

  const handleKickedClose = () => {
    setIsKicked(false);
    setShowLogin(true);
    setLoginError('');
  };

  return (
    <div className="App">
      {isKicked ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#F5F5DC',
            padding: '40px',
            borderRadius: '20px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '28px',
              color: '#FF6B6B',
              fontWeight: 'bold'
            }}>
              ⚠️ You Have Been Kicked
            </h2>
            <p style={{
              margin: '0 0 30px 0',
              fontSize: '18px',
              color: '#333',
              lineHeight: '1.5'
            }}>
              You have been removed from the room by the host.
            </p>
            <button
              onClick={handleKickedClose}
              style={{
                padding: '15px 40px',
                background: '#4ECDC4',
                border: '2px solid #000',
                borderRadius: '15px',
                color: '#000',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3AB8B0';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4ECDC4';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Return to Menu
            </button>
          </div>
        </div>
      ) : showLogin ? (
        <LoginScreen
          onJoinPublic={handleJoinPublic}
          onJoinPrivate={handleJoinPrivate}
          onCreatePrivate={handleCreatePrivate}
          onSpectate={handleSpectate}
          error={loginError}
          isLoading={isLoading || isConnecting}
          connectionError={connectionError}
          isConnecting={isConnecting}
        />
      ) : isInLobby && lobbyState ? (
        <LobbyScreen
          lobbyState={lobbyState}
          currentPlayerId={playerId || ''}
          selectedElement={selectedElement}
          onSelectElement={(el) => {
            setLobbyElement(el);
            setSelectedElement(el);
          }}
          elementAvailability={getElementAvailability()}
          chatMessages={chatMessages}
          onSendChat={sendLobbyChat}
          onSetReady={setLobbyReady}
          onKickPlayer={kickPlayer}
          onStartGame={startGame}
          isReady={isReady}
        />
      ) : (
        <GameContainer
          canvasRef={canvasRef}
          gameState={gameState}
          playerId={playerId}
          isSpectator={isSpectator}
          timerSync={timerSync}
          chatMessages={chatMessages}
          onSendChatMessage={sendChatMessage}
        />
      )}
    </div>
  );
}

export default App;

