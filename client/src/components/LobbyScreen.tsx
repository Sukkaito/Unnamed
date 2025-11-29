import { useState, useEffect, useRef } from 'react';
import { Element } from '../types';

interface LobbyPlayer {
  id: string;
  name: string;
  element: Element;
  isReady: boolean;
  isHost: boolean;
}

interface LobbyState {
  roomId: string;
  roomCode: string | null;
  isPrivate: boolean;
  players: LobbyPlayer[];
  maxPlayers: number;
}

interface LobbyScreenProps {
  lobbyState: LobbyState;
  currentPlayerId: string;
  selectedElement: Element;
  onSelectElement: (element: Element) => void;
  elementAvailability: Record<string, boolean>;
  chatMessages: Array<{ type: 'player' | 'system'; content: string }>;
  onSendChat: (message: string) => void;
  onSetReady: (isReady: boolean) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  isReady: boolean;
}

export function LobbyScreen({
  lobbyState,
  currentPlayerId,
  selectedElement,
  onSelectElement,
  elementAvailability,
  chatMessages,
  onSendChat,
  onSetReady,
  onKickPlayer,
  onStartGame,
  isReady
}: LobbyScreenProps) {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentPlayer = lobbyState.players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost || false;
  const allReady = lobbyState.players.length >= 2 && lobbyState.players.every(p => p.isReady);
  const canStart = isHost && allReady;

  const availableElements: Element[] = ['dog', 'duck', 'penguin', 'whale'];

  // Map element names to folder names and card image filenames
  const elementCardMap: Record<Element, { folder: string; cardFile: string; displayName: string; color: string }> = {
    dog: { folder: 'DOG', cardFile: 'Asset 5@3x.png', displayName: 'PUPPY', color: '#90EE90' },
    duck: { folder: 'DUCK', cardFile: 'Asset 7@3x.png', displayName: 'DUCK', color: '#FFA500' },
    penguin: { folder: 'PEGUIN', cardFile: 'Asset 6@3x.png', displayName: 'PENGUIN', color: '#87CEEB' },
    whale: { folder: 'WHALE', cardFile: 'Asset 8@3x.png', displayName: 'WHALE', color: '#87CEEB' }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = () => {
    const message = chatInput.trim();
    if (message) {
      onSendChat(message);
      setChatInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendChat();
    }
  };

  const getElementDisplayName = (element: Element | null): string => {
    if (!element) return '';
    return elementCardMap[element].displayName;
  };

  // Get host player name
  const hostPlayer = lobbyState.players.find(p => p.isHost);
  const lobbyName = hostPlayer ? `${hostPlayer.name}'s room` : 'LOBBY NAME';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#808080',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      color: '#000',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '1400px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Lobby Name Header */}
        <div style={{
          background: '#F5F5DC',
          padding: '15px 25px',
          borderRadius: '15px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {lobbyName}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          flex: 1,
          minHeight: 0
        }}>
          {/* Left Panel - Players List and Chat */}
          <div style={{
            width: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Players List */}
            <div style={{
              background: '#F5F5DC',
              padding: '20px',
              borderRadius: '15px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '400px'
            }}>
              {/* Player Rows */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                overflowY: 'auto'
              }}>
                {Array.from({ length: lobbyState.maxPlayers }).map((_, index) => {
                  const player = lobbyState.players[index];
                  if (!player) {
                    return (
                      <div
                        key={`empty-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isHost ? '2fr 1.5fr 1fr auto' : '2fr 1.5fr 1fr',
                          gap: '10px',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{
                          background: '#90EE90',
                          padding: '12px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '50px'
                        }}></div>
                        <div style={{
                          background: '#FFA500',
                          padding: '12px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '50px'
                        }}></div>
                        <div style={{
                          background: '#90EE90',
                          padding: '12px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '50px'
                        }}></div>
                        {isHost && (
                          <div style={{
                            width: '30px',
                            height: '30px',
                            background: '#FFA500',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.3
                          }}>
                            <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>×</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isHost ? '2fr 1.5fr 1fr auto' : '2fr 1.5fr 1fr',
                        gap: '10px',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        background: '#90EE90',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        fontSize: player.isHost ? '18px' : '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '50px',
                        color: player.isHost ? '#FFA500' : '#000'
                      }}>
                        {player.name}
                      </div>
                      <div style={{
                        background: '#FFA500',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '50px'
                      }}>
                        {getElementDisplayName(player.element)}
                      </div>
                      <div style={{
                        background: '#90EE90',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: player.isReady ? '#000' : '#666',
                        height: '50px'
                      }}>
                        {player.isReady ? '✓' : ''}
                      </div>
                      {isHost && (
                        <>
                          {player.id !== currentPlayerId ? (
                            <div
                              onClick={() => onKickPlayer(player.id)}
                              style={{
                                width: '30px',
                                height: '30px',
                                background: '#FFA500',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>×</span>
                            </div>
                          ) : (
                            <div style={{
                              width: '30px',
                              height: '30px'
                            }}></div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Section */}
            <div style={{
              background: '#F5F5DC',
              padding: '20px',
              borderRadius: '15px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0
            }}>
              <h2 style={{
                margin: '0 0 15px 0',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'cursive'
              }}>
                Chat
              </h2>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '15px',
                padding: '15px',
                background: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: '150px'
              }}>
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: '14px',
                      color: msg.type === 'system' ? '#666' : '#000',
                      fontStyle: msg.type === 'system' ? 'italic' : 'normal',
                      padding: '5px 0'
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#1E3A5F',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSendChat}
                  style={{
                    padding: '12px 20px',
                    background: '#1E3A5F',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Character Cards */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            justifyContent: 'space-between'
          }}>
            {/* Character Selection Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '30px',
              flex: 1,
              alignContent: 'center',
              alignItems: 'center',
              justifyItems: 'stretch'
            }}>
              {availableElements.map((element) => {
                const isAvailable = elementAvailability[element] !== false;
                const isSelected = selectedElement === element;
                const elementInfo = elementCardMap[element];
                const cardImagePath = `/elements/NEW/${elementInfo.folder}/Card/${elementInfo.cardFile}`;

                return (
                  <button
                    key={element}
                    onClick={() => isAvailable && onSelectElement(element)}
                    disabled={!isAvailable}
                    style={{
                      background: 'transparent',
                      border: isSelected ? '4px solid #FFA500' : 'none',
                      borderRadius: '20px',
                      padding: isSelected ? '4px' : '0',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      opacity: isAvailable ? 1 : 0.5,
                      position: 'relative',
                      transition: 'transform 0.2s, padding 0.2s',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      overflow: 'hidden',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (isAvailable) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
                    }}
                  >
                    <img
                      src={cardImagePath}
                      alt={elementInfo.displayName}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.error(`Failed to load card image: ${cardImagePath}`);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Ready Button */}
            <button
              onClick={() => onSetReady(!isReady)}
              style={{
                padding: '20px',
                background: '#F5F5DC',
                border: '2px solid #000',
                borderRadius: '15px',
                color: '#000',
                fontSize: '20px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {isReady ? '✓ READY' : 'READY'}
            </button>

            {/* Start Game Button (Host only) */}
            {canStart && (
              <button
                onClick={onStartGame}
                style={{
                  padding: '20px',
                  background: '#4ECDC4',
                  border: '2px solid #000',
                  borderRadius: '15px',
                  color: '#000',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  animation: 'pulse 2s infinite'
                }}
              >
                Start Game
              </button>
            )}
            {canStart && lobbyState.players.some((p: LobbyPlayer) => !p.element) && (
              <p style={{
                fontSize: '12px',
                color: '#FFA500',
                textAlign: 'center',
                marginTop: '10px',
                fontWeight: 'bold'
              }}>
                ⚠️ All players must select a character
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

