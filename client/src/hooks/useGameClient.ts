import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Player, Direction, Element, Arena, Camera, ServerMessage, TimerSync } from '../types';
import { ImageLoader } from '../utils/imageLoader';
import { GameRenderer } from '../utils/gameRenderer';

const WS_URL = import.meta.env.VITE_SERVER_WS || 'ws://localhost:8080';
const CELL_SIZE = 48;
const PLAYER_SIZE = 48;

export function useGameClient() {
  const [gameState, setGameState] = useState<GameState>({
    players: {},
    cells: []
  });
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [selectedElement, setSelectedElement] = useState<Element>('dog');
  const [isSpectator, setIsSpectator] = useState(false);
  const [arena, setArena] = useState<Arena>({ width: 1600, height: 900 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, width: 1600, height: 900 });
  const [elementAvailability, setElementAvailability] = useState<Record<string, boolean>>({});
  const [timerSync, setTimerSync] = useState<TimerSync | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction>('NONE');
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'player' | 'system'; content: string }>>([]);
  const [connectionError, setConnectionError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [lobbyState, setLobbyState] = useState<any>(null);
  const [isInLobby, setIsInLobby] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageLoaderRef = useRef<ImageLoader | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const pendingInitPayloadRef = useRef<{ name: string; element?: Element; isSpectator?: boolean } | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, width: 1600, height: 900 });
  const arenaRef = useRef<Arena>(arena);
  const playerIdRef = useRef<string | null>(null);
  const isSpectatorRef = useRef<boolean>(false);
  // Store previous positions for interpolation
  const previousPositionsRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());
  const interpolatedGameStateRef = useRef<GameState>(gameState);

  const directionMap: Record<string, Direction> = {
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    w: 'UP',
    s: 'DOWN',
    a: 'LEFT',
    d: 'RIGHT'
  };

  const oppositeDirections: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
    NONE: 'NONE'
  };

  // Initialize image loader and renderer
  useEffect(() => {
    // Wait for canvas to be available
    const initCanvas = () => {
      if (!canvasRef.current) {
        setTimeout(initCanvas, 100);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setTimeout(initCanvas, 100);
        return;
      }

      // Disable image smoothing for pixel-perfect rendering
      ctx.imageSmoothingEnabled = false;
      (ctx as any).webkitImageSmoothingEnabled = false;
      (ctx as any).mozImageSmoothingEnabled = false;
      (ctx as any).msImageSmoothingEnabled = false;

      canvas.tabIndex = 0;
      canvas.focus();

      const imageLoader = new ImageLoader();
      imageLoader.loadElementImages();
      imageLoader.loadDirtImages();
      imageLoaderRef.current = imageLoader;

      const renderer = new GameRenderer(ctx, CELL_SIZE, PLAYER_SIZE, imageLoader);
      rendererRef.current = renderer;

      const initialCamera = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height
      };
      setCamera(initialCamera);
      cameraRef.current = initialCamera;
    };

    initCanvas();
  }, []);

  // WebSocket connection - only connect when needed
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }

    setIsConnecting(true);
    setConnectionError('');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to game server');
        setIsConnecting(false);
        setConnectionError('');
        // Send pending payload if exists
        if (pendingInitPayloadRef.current) {
          if (pendingInitPayloadRef.current.isSpectator) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'SPECTATE',
                name: pendingInitPayloadRef.current.name
              }));
            }
          } else if (pendingInitPayloadRef.current.element) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'INIT_PLAYER',
                name: pendingInitPayloadRef.current.name,
                element: pendingInitPayloadRef.current.element
              }));
            }
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          // Handle message inline to avoid dependency issues
          switch (message.type) {
            case 'LOBBY_JOINED':
              if (message.playerId) {
                setPlayerId(message.playerId);
              }
              setLobbyState(message.lobbyState);
              setIsInLobby(true);
              setIsReady(false);
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: 'Joined lobby'
              }]);
              break;
            case 'LOBBY_STATE_UPDATE':
              setLobbyState(message.lobbyState);
              // Update ready status
              if (playerId) {
                const currentPlayer = message.lobbyState?.players?.find((p: any) => p.id === playerId);
                if (currentPlayer) {
                  setIsReady(currentPlayer.isReady);
                }
              }
              break;
            case 'LOBBY_PLAYER_JOINED':
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: `${message.player.name || 'Player'} joined the lobby`
              }]);
              break;
            case 'LOBBY_PLAYER_LEFT':
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: 'A player left the lobby'
              }]);
              break;
            case 'LOBBY_CHAT_MESSAGE':
              setChatMessages(prev => [...prev, {
                type: 'player',
                content: `${message.playerName}: ${message.message}`
              }]);
              break;
            case 'GAME_STARTED':
              setIsInLobby(false);
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: 'Game starting!'
              }]);
              break;
            case 'GAME_START_ERROR':
              setConnectionError(message.message || 'Cannot start game. Please check all players have selected a character.');
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: message.message || 'Cannot start game. All players must select a character.'
              }]);
              break;
            case 'INIT':
              setPlayerId(message.playerId);
              setArena(message.arena);
              // Update canvas and camera size to match arena
              if (canvasRef.current) {
                canvasRef.current.width = message.arena.width;
                canvasRef.current.height = message.arena.height;
                const newCamera = {
                  x: 0,
                  y: 0,
                  width: message.arena.width,
                  height: message.arena.height
                };
                setCamera(newCamera);
                cameraRef.current = newCamera;
              }
              setGameState(prev => ({
                ...prev,
                players: { [message.playerId]: message.player }
              }));
              setPlayerName(message.player.name || playerName);
              setIsInLobby(false);
              pendingInitPayloadRef.current = null;
              break;
            case 'GAME_STATE_UPDATE':
              setGameState(message.gameState);
              if (message.gameState?.timeRemaining !== undefined && message.timestamp) {
                setTimerSync({
                  remainingMs: message.gameState.timeRemaining,
                  syncedAt: performance.now(),
                  serverTimestamp: message.timestamp
                });
              }
              break;
            case 'GAME_STATE_DELTA':
              // Apply delta update to current state
              setGameState(prev => {
                const newState = { ...prev };
                const delta = message.delta;

                // Update players
                if (delta.players) {
                  newState.players = { ...prev.players };
                  for (const playerId in delta.players) {
                    if (delta.players[playerId] === null) {
                      // Player removed
                      delete newState.players[playerId];
                    } else {
                      // Player updated or added
                      newState.players[playerId] = delta.players[playerId];
                    }
                  }
                }

                // Update cells
                if (delta.cells && delta.cells.length > 0) {
                  // Ensure cells array exists
                  if (!newState.cells || newState.cells.length === 0) {
                    newState.cells = prev.cells;
                  } else {
                    newState.cells = prev.cells.map(row => [...row]);
                  }
                  
                  delta.cells.forEach((cellUpdate: any) => {
                    const { row, col, cell } = cellUpdate;
                    if (newState.cells[row]) {
                      newState.cells[row][col] = cell;
                    }
                  });
                }

                // Update game time and timer
                // if (delta.gameTime !== undefined) {
                //   newState.gameTime = delta.gameTime;
                // }
                if (delta.timeRemaining !== undefined) {
                  newState.timeRemaining = delta.timeRemaining;
                  if (message.timestamp) {
                    setTimerSync({
                      remainingMs: delta.timeRemaining,
                      syncedAt: performance.now(),
                      serverTimestamp: message.timestamp
                    });
                  }
                }
                if (delta.gameOver !== undefined) {
                  newState.gameOver = delta.gameOver;
                }
                // if (delta.winnerId !== undefined) {
                //   newState.winnerId = delta.winnerId;
                // }
                if (delta.winnerName !== undefined) {
                  newState.winnerName = delta.winnerName;
                }

                return newState;
              });
              break;
            case 'PLAYER_JOINED':
              setChatMessages(prev => [...prev, {
                type: 'system',
                content: `${message.player.name || message.player.id?.substring(0, 8) || 'Player'} joined`
              }]);
              setGameState(prev => ({
                ...prev,
                players: { ...prev.players, [message.player.id]: message.player }
              }));
              break;
            case 'PLAYER_LEFT':
              setGameState(prev => {
                const departingPlayer = prev.players[message.playerId];
                const departingName = departingPlayer
                  ? (departingPlayer.name || departingPlayer.id?.substring(0, 8) || 'Player')
                  : message.playerId?.substring(0, 8) || 'Player';
                setChatMessages(chatMsg => [...chatMsg, {
                  type: 'system',
                  content: `${departingName} left`
                }]);
                const newPlayers = { ...prev.players };
                delete newPlayers[message.playerId];
                return { ...prev, players: newPlayers };
              });
              break;
            case 'CHAT_MESSAGE':
              setGameState(prev => {
                const player = prev.players[message.playerId];
                const playerName = player ? (player.name || player.id?.substring(0, 8) || 'Unknown') : 'Unknown';
                setChatMessages(chatMsg => [...chatMsg, {
                  type: 'player',
                  content: `${playerName}: ${message.message}`
                }]);
                return prev;
              });
              break;
            case 'ELEMENT_SELECTION_ERROR':
              setConnectionError('Element selection error. Please try again.');
              pendingInitPayloadRef.current = null;
              break;
            case 'JOIN_ERROR':
              if (message.error === 'ROOM_NOT_FOUND') {
                setConnectionError('Room not found. Please check the room code.');
              } else if (message.error === 'GAME_STARTED') {
                setConnectionError('Cannot join room. The game has already started.');
              } else if (message.error === 'ROOM_FULL') {
                setConnectionError('Room is full. Please try another room.');
              } else {
                setConnectionError('Failed to join room.');
              }
              pendingInitPayloadRef.current = null;
              break;
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Disconnected from server', event.code, event.reason);
        setIsConnecting(false);
        wsRef.current = null;
        
        // Check if player was kicked
        if (event.reason === 'Kicked by host' || event.code === 1000 && event.reason?.includes('Kicked')) {
          setIsKicked(true);
          setIsInLobby(false);
          setLobbyState(null);
          setConnectionError('You have been kicked from the room by the host.');
          pendingInitPayloadRef.current = null;
          return; // Don't reconnect if kicked
        }
        
        // Only auto-reconnect if we had a playerId (were actually playing)
        if (playerId && event.code !== 1000) {
          setConnectionError('Lost connection to server. Reconnecting...');
          setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 3000);
        } else {
          pendingInitPayloadRef.current = null;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        setConnectionError('Cannot connect to game server. Make sure the server is running on port 8080.');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnecting(false);
      setConnectionError('Failed to connect to game server.');
    }
  }, [playerId]);

  const trySendInitPayload = useCallback(() => {
    if (!pendingInitPayloadRef.current || !pendingInitPayloadRef.current.element) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'INIT_PLAYER',
      name: pendingInitPayloadRef.current.name,
      element: pendingInitPayloadRef.current.element
    }));
  }, []);

  const trySendSpectatePayload = useCallback(() => {
    if (!pendingInitPayloadRef.current) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'SPECTATE',
      name: pendingInitPayloadRef.current.name
    }));
  }, []);

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'PLAYER_CONFIG':
        setElementAvailability(message.availableElements || {});
        if (message.playerId) {
          pendingInitPayloadRef.current = { ...pendingInitPayloadRef.current!, playerId: message.playerId } as any;
        }
        return;

      case 'INIT':
        setPlayerId(message.playerId);
        setArena(message.arena);
        setGameState(prev => ({
          ...prev,
          players: { [message.playerId]: message.player }
        }));
        setPlayerName(message.player.name || playerName);
        pendingInitPayloadRef.current = null;
        break;


      case 'GAME_STATE_UPDATE':
        setGameState(message.gameState);
        if (message.gameState?.timeRemaining !== undefined && message.timestamp) {
          setTimerSync({
            remainingMs: message.gameState.timeRemaining,
            syncedAt: performance.now(),
            serverTimestamp: message.timestamp
          });
        }
        break;


      case 'CHAT_MESSAGE':
        setGameState(prev => {
          const player = prev.players[message.playerId];
          const playerName = player ? (player.name || player.id?.substring(0, 8) || 'Unknown') : 'Unknown';
          setChatMessages(chatMsg => [...chatMsg, {
            type: 'player',
            content: `${playerName}: ${message.message}`
          }]);
          return prev;
        });
        break;

      case 'PLAYER_JOINED':
        setChatMessages(prev => [...prev, {
          type: 'system',
          content: `${message.player.name || message.player.id?.substring(0, 8) || 'Player'} joined`
        }]);
        setGameState(prev => ({
          ...prev,
          players: { ...prev.players, [message.player.id]: message.player }
        }));
        break;

      case 'PLAYER_LEFT':
        setGameState(prev => {
          const departingPlayer = prev.players[message.playerId];
          const departingName = departingPlayer
            ? (departingPlayer.name || departingPlayer.id?.substring(0, 8) || 'Player')
            : message.playerId?.substring(0, 8) || 'Player';
          setChatMessages(chatMsg => [...chatMsg, {
            type: 'system',
            content: `${departingName} left`
          }]);
          const newPlayers = { ...prev.players };
          delete newPlayers[message.playerId];
          return { ...prev, players: newPlayers };
        });
        break;

      case 'SPECTATOR_JOINED':
        setChatMessages(prev => [...prev, {
          type: 'system',
          content: `${message.name || message.playerId?.substring(0, 8) || 'Player'} joined as spectator`
        }]);
        break;

      case 'SPECTATOR_LEFT':
        setChatMessages(prev => [...prev, {
          type: 'system',
          content: 'Spectator left'
        }]);
        break;

      case 'SPECTATE_INIT':
        setChatMessages(prev => [...prev, {
          type: 'system',
          content: 'You are in spectator mode'
        }]);
        setPlayerId(message.playerId);
        setArena(message.arena);
        // Update canvas and camera size to match arena
        if (canvasRef.current) {
          canvasRef.current.width = message.arena.width;
          canvasRef.current.height = message.arena.height;
          const newCamera = {
            x: 0,
            y: 0,
            width: message.arena.width,
            height: message.arena.height
          };
          setCamera(newCamera);
          cameraRef.current = newCamera;
        }
        setIsSpectator(true);
        pendingInitPayloadRef.current = null;
        break;
    }
  }, [playerName]);

  // Helper function to interpolate between two values
  const lerp = (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  };

  // Interpolate player positions for smooth movement
  const interpolatePlayerPositions = (
    currentState: GameState,
    previousPositions: Map<string, { x: number; y: number; time: number }>,
    currentTime: number
  ): GameState => {
    const interpolatedPlayers: Record<string, Player> = {};
    const interpolationDelay = 50; // 50ms delay for interpolation

    Object.keys(currentState.players).forEach(playerId => {
      const currentPlayer = currentState.players[playerId];
      const prev = previousPositions.get(playerId);

      if (prev && prev.time > 0) {
        const timeSinceUpdate = currentTime - prev.time;
        // Only interpolate if update was recent
        if (timeSinceUpdate < interpolationDelay * 2) {
          // Calculate interpolation factor (0 = previous, 1 = current)
          const factor = Math.min(1, timeSinceUpdate / interpolationDelay);
          
          // Interpolate position
          const interpX = lerp(prev.x, currentPlayer.x, factor);
          const interpY = lerp(prev.y, currentPlayer.y, factor);

          interpolatedPlayers[playerId] = {
            ...currentPlayer,
            x: interpX,
            y: interpY
          };
        } else {
          // Too old, use current position
          interpolatedPlayers[playerId] = currentPlayer;
        }
      } else {
        // No previous position, use current
        interpolatedPlayers[playerId] = currentPlayer;
      }
    });

    return {
      ...currentState,
      players: interpolatedPlayers
    };
  };

  // Update refs when state changes and store previous positions for interpolation
  useEffect(() => {
    // Store previous positions before updating
    const now = performance.now();
    Object.keys(gameState.players).forEach(playerId => {
      const player = gameState.players[playerId];
      const prev = previousPositionsRef.current.get(playerId);
      if (prev) {
        // Update previous position
        previousPositionsRef.current.set(playerId, {
          x: prev.x,
          y: prev.y,
          time: prev.time
        });
      }
      // Store current position as new previous
      previousPositionsRef.current.set(playerId, {
        x: player.x,
        y: player.y,
        time: now
      });
    });
    
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    arenaRef.current = arena;
  }, [arena]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    isSpectatorRef.current = isSpectator;
  }, [isSpectator]);

  // Game loop - runs continuously
  useEffect(() => {
    let animationId: number;
    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (!rendererRef.current || !canvasRef.current) {
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Interpolate player positions for smooth movement
      const interpolatedState = interpolatePlayerPositions(
        gameStateRef.current,
        previousPositionsRef.current,
        timestamp
      );
      interpolatedGameStateRef.current = interpolatedState;

      // Update camera using refs (only if we have a player) - with smoothing
      if (playerIdRef.current) {
        updateCameraRefSmooth(delta);
      }

      // Render using interpolated state for smooth movement
      if (rendererRef.current) {
        try {
          rendererRef.current.render(
            interpolatedGameStateRef.current,
            cameraRef.current,
            arenaRef.current
          );
        } catch (error) {
          console.error('Render error:', error);
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    // Start the loop
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []); // Only run once when component mounts

  // Camera update function that uses refs (for game loop) - with smoothing
  const updateCameraRefSmooth = useCallback((delta: number) => {
    if (!playerIdRef.current) return;

    const currentGameState = interpolatedGameStateRef.current;
    const currentArena = arenaRef.current;
    const currentCamera = cameraRef.current;

    // Smooth camera movement factor (higher = smoother but slower response)
    const smoothFactor = Math.min(1, delta / 16.67); // Normalize to 60fps, adjust for higher fps

    if (isSpectatorRef.current) {
      const players = Object.values(currentGameState.players);
      if (players.length > 0) {
        const targetPlayer = players[0];
        const centerX = targetPlayer.x + PLAYER_SIZE / 2;
        const centerY = targetPlayer.y + PLAYER_SIZE / 2;

        const maxX = Math.max(0, currentArena.width - currentCamera.width);
        const maxY = Math.max(0, currentArena.height - currentCamera.height);

        const targetX = Math.min(maxX, Math.max(0, centerX - currentCamera.width / 2));
        const targetY = Math.min(maxY, Math.max(0, centerY - currentCamera.height / 2));
        
        // Smooth camera movement
        cameraRef.current.x = lerp(currentCamera.x, targetX, smoothFactor * 0.15);
        cameraRef.current.y = lerp(currentCamera.y, targetY, smoothFactor * 0.15);
        
        setCamera(prev => ({
          ...prev,
          x: cameraRef.current.x,
          y: cameraRef.current.y
        }));
      }
      return;
    }

    const player = currentGameState.players[playerIdRef.current];
    if (!player) return;

    const centerX = player.x + PLAYER_SIZE / 2;
    const centerY = player.y + PLAYER_SIZE / 2;

    const maxX = Math.max(0, currentArena.width - currentCamera.width);
    const maxY = Math.max(0, currentArena.height - currentCamera.height);

    const marginX = currentCamera.width * 0.25;
    const marginY = currentCamera.height * 0.25;

    let targetX = currentCamera.x;
    let targetY = currentCamera.y;

    const left = targetX + marginX;
    const right = targetX + currentCamera.width - marginX;
    const top = targetY + marginY;
    const bottom = targetY + currentCamera.height - marginY;

    if (centerX < left) {
      targetX = centerX - marginX;
    } else if (centerX > right) {
      targetX = centerX + marginX - currentCamera.width;
    }

    if (centerY < top) {
      targetY = centerY - marginY;
    } else if (centerY > bottom) {
      targetY = centerY + marginY - currentCamera.height;
    }

    targetX = Math.min(maxX, Math.max(0, targetX));
    targetY = Math.min(maxY, Math.max(0, targetY));
    
    // Smooth camera movement (faster response for player camera)
    cameraRef.current.x = lerp(currentCamera.x, targetX, smoothFactor * 0.2);
    cameraRef.current.y = lerp(currentCamera.y, targetY, smoothFactor * 0.2);
    
    setCamera(prev => ({
      ...prev,
      x: cameraRef.current.x,
      y: cameraRef.current.y
    }));
  }, []);

  const setDirection = useCallback((direction: Direction) => {
    if (isSpectator) return;
    if (!wsRef.current || direction === currentDirection) return;
    if (oppositeDirections[direction] === currentDirection && currentDirection !== 'NONE') return;
    if (gameState.gameOver) return;

    setCurrentDirection(direction);
    wsRef.current.send(JSON.stringify({
      type: 'MOVEMENT',
      direction
    }));
  }, [isSpectator, currentDirection, gameState.gameOver]);

  const sendChatMessage = useCallback((message: string) => {
    if (message && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        message: message.trim()
      }));
    }
  }, []);

  const joinPublicGame = useCallback((name: string) => {
    const sendJoin = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'JOIN_PUBLIC',
          name: name
        }));
        return true;
      }
      return false;
    };

    if (!sendJoin()) {
      connectWebSocket();
      // Wait for connection
      const checkConnection = setInterval(() => {
        if (sendJoin()) {
          clearInterval(checkConnection);
        }
      }, 100);
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }, [connectWebSocket]);

  const joinPrivateGame = useCallback((name: string, roomCode: string) => {
    const sendJoin = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'JOIN_PRIVATE',
          name: name,
          roomCode: roomCode
        }));
        return true;
      }
      return false;
    };

    if (!sendJoin()) {
      connectWebSocket();
      // Wait for connection
      const checkConnection = setInterval(() => {
        if (sendJoin()) {
          clearInterval(checkConnection);
        }
      }, 100);
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }, [connectWebSocket]);

  const createPrivateRoom = useCallback((name: string) => {
    const sendCreate = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CREATE_PRIVATE',
          name: name
        }));
        return true;
      }
      return false;
    };

    if (!sendCreate()) {
      connectWebSocket();
      // Wait for connection
      const checkConnection = setInterval(() => {
        if (sendCreate()) {
          clearInterval(checkConnection);
        }
      }, 100);
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }, [connectWebSocket]);

  const setLobbyReady = useCallback((isReady: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOBBY_SET_READY',
        isReady: isReady
      }));
      setIsReady(isReady);
    }
  }, []);

  const setLobbyElement = useCallback((element: Element) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOBBY_SET_ELEMENT',
        element: element
      }));
      setSelectedElement(element);
    }
  }, []);

  const sendLobbyChat = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOBBY_CHAT',
        message: message
      }));
    }
  }, []);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'KICK_PLAYER',
        targetPlayerId: targetPlayerId
      }));
    }
  }, []);

  const startGame = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'START_GAME'
      }));
    }
  }, []);

  const joinGame = useCallback((name: string, element: Element) => {
    joinPublicGame(name, element);
  }, [joinPublicGame]);

  const spectate = useCallback((name: string) => {
    setIsSpectator(true);
    pendingInitPayloadRef.current = { name, isSpectator: true };
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    } else {
      trySendSpectatePayload();
    }
  }, [trySendSpectatePayload, connectWebSocket]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase() || '';
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      if (isTyping) return;

      if (e.key === 'Enter') {
        // Focus chat input (handled by Chat component)
        return;
      }

      if (e.code === 'Space') {
        setDirection('NONE');
        e.preventDefault();
        return;
      }

      const direction = directionMap[e.key];
      if (direction && direction !== currentDirection) {
        if (oppositeDirections[direction] !== currentDirection || currentDirection === 'NONE') {
          setDirection(direction);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDirection, setDirection]);

  return {
    canvasRef,
    gameState,
    playerId,
    playerName,
    setPlayerName,
    selectedElement,
    setSelectedElement,
    isSpectator,
    arena,
    camera,
    elementAvailability,
    timerSync,
    chatMessages,
    connectionError,
    isConnecting,
    isKicked,
    setIsKicked,
    joinGame,
    joinPublicGame,
    joinPrivateGame,
    createPrivateRoom,
    spectate,
    sendChatMessage,
    setDirection,
    connectWebSocket,
    lobbyState,
    isInLobby,
    isReady,
    setLobbyReady,
    setLobbyElement,
    sendLobbyChat,
    kickPlayer,
    startGame
  };
}

