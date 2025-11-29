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

  return (
    <div className="App">
      {showLogin ? (
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

