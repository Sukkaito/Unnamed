const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./RoomManager');

const server = new WebSocket.Server({ port: 8080 });
const roomManager = new RoomManager();

// Map to track which room each player is in
const playerRoomMap = new Map(); // playerId -> roomId

console.log('Multiplayer Game Server running on port 8080');

server.on('connection', (ws) => {
    const playerId = uuidv4();
    ws.playerId = playerId;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleClientMessage(playerId, ws, message);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnect(playerId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
    });
});

function handleClientMessage(playerId, ws, message) {
    switch (message.type) {
        case 'JOIN_PUBLIC':
            handleJoinPublic(playerId, ws, message);
            break;
        case 'JOIN_PRIVATE':
            handleJoinPrivate(playerId, ws, message);
            break;
        case 'CREATE_PRIVATE':
            handleCreatePrivate(playerId, ws, message);
            break;
        case 'LOBBY_SET_READY':
            handleSetReady(playerId, ws, message);
            break;
        case 'LOBBY_SET_ELEMENT':
            handleLobbySetElement(playerId, ws, message);
            break;
        case 'LOBBY_CHAT':
            handleLobbyChat(playerId, ws, message);
            break;
        case 'KICK_PLAYER':
            handleKickPlayer(playerId, ws, message);
            break;
        case 'START_GAME':
            handleStartGame(playerId, ws);
            break;
        case 'MOVEMENT':
            handleMovement(playerId, ws, message);
            break;
        case 'CHAT_MESSAGE':
            handleChatMessage(playerId, ws, message);
            break;
    }
}

function handleJoinPublic(playerId, ws, message) {
    const room = roomManager.findOrCreatePublicRoom();
    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    if (result.error) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: result.error
        }));
        return;
    }

    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    // Include playerId in the response so client knows which player they are
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));

    // Notify other players
    roomManager.broadcastToRoom(room.id, {
        type: 'LOBBY_PLAYER_JOINED',
        player: {
            id: playerId,
            name: message.name,
            element: null,
            isReady: false,
            isHost: result.player.isHost
        }
    }, playerId);

    // Send updated lobby state to all
    broadcastLobbyState(room.id);
}

function handleJoinPrivate(playerId, ws, message) {
    const room = roomManager.findRoomByCode(message.roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: 'ROOM_NOT_FOUND'
        }));
        return;
    }

    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    if (result.error) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: result.error
        }));
        return;
    }

    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));

    // Notify other players
    roomManager.broadcastToRoom(room.id, {
        type: 'LOBBY_PLAYER_JOINED',
        player: {
            id: playerId,
            name: message.name,
            element: null,
            isReady: false,
            isHost: result.player.isHost
        }
    }, playerId);

    // Send updated lobby state to all
    broadcastLobbyState(room.id);
}

function handleCreatePrivate(playerId, ws, message) {
    const room = roomManager.createRoom(true);
    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));
}

function handleSetReady(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const success = roomManager.setPlayerReady(roomId, playerId, message.isReady);
    if (success) {
        broadcastLobbyState(roomId);
        // Game will only start when host clicks Start Game button
    }
}

function handleLobbySetElement(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    // Check if element is available (check other players in lobby)
    const isElementTaken = Array.from(room.players.values()).some(
        p => p.playerId !== playerId && p.element === message.element && p.element !== null
    );

    if (isElementTaken) {
        ws.send(JSON.stringify({
            type: 'ELEMENT_SELECTION_ERROR',
            reason: 'ELEMENT_TAKEN'
        }));
        return;
    }

    player.element = message.element;
    broadcastLobbyState(roomId);
}

function handleLobbyChat(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'LOBBY_CHAT_MESSAGE',
        playerId: playerId,
        playerName: player.name,
        message: message.message,
        timestamp: Date.now()
    });
}

function handleKickPlayer(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const result = roomManager.kickPlayer(roomId, playerId, message.targetPlayerId);
    
    if (result.success) {
        playerRoomMap.delete(message.targetPlayerId);
        broadcastLobbyState(roomId);
    } else {
        ws.send(JSON.stringify({
            type: 'KICK_ERROR',
            error: result.error
        }));
    }
}

function handleStartGame(playerId, ws) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'ROOM_NOT_FOUND',
            message: 'Room not found'
        }));
        return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'ROOM_NOT_FOUND',
            message: 'Room not found'
        }));
        return;
    }

    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_HOST',
            message: 'Only the host can start the game'
        }));
        return;
    }

    // Check if all players have selected an element
    for (const [pid, playerData] of room.players.entries()) {
        if (!playerData.element) {
            ws.send(JSON.stringify({
                type: 'GAME_START_ERROR',
                error: 'ELEMENT_REQUIRED',
                message: 'All players must select a character before starting'
            }));
            return;
        }
    }

    // Check if all players are ready and at least 2 players
    if (!roomManager.areAllPlayersReady(roomId)) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_ALL_READY',
            message: 'All players must be ready before starting'
        }));
        return;
    }

    if (roomManager.getPlayerCount(roomId) < 2) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_ENOUGH_PLAYERS',
            message: 'At least 2 players are required to start the game'
        }));
        return;
    }

    startGame(roomId);
}

function startGame(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Check that all players have selected an element
    for (const [playerId, playerData] of room.players.entries()) {
        if (!playerData.element) {
            // Notify player they need to select an element
            playerData.ws.send(JSON.stringify({
                type: 'GAME_START_ERROR',
                error: 'ELEMENT_REQUIRED',
                message: 'All players must select a character before starting'
            }));
            return;
        }
    }

    // Initialize all players in the game engine
    room.players.forEach((playerData, playerId) => {
        const player = room.gameEngine.addPlayer(playerId, playerData.ws, {
            name: playerData.name,
            element: playerData.element
        });

        const state = room.connectionStates.get(playerId);
        if (state) {
            state.initialized = true;
            state.isSpectator = false;
        }

        // Send INIT to each player
        playerData.ws.send(JSON.stringify({
            type: 'INIT',
            playerId: playerId,
            player: player,
            arena: room.gameEngine.arena
        }));
    });

    // Mark room as game started
    room.gameStarted = true;
    
    // Remove from public rooms list if it's a public room
    if (!room.isPrivate) {
        const index = roomManager.publicRooms.indexOf(roomId);
        if (index > -1) {
            roomManager.publicRooms.splice(index, 1);
        }
    }

    // Broadcast game started
    roomManager.broadcastToRoom(roomId, {
        type: 'GAME_STARTED'
    });

    // Start game loop for this room
    if (!room.gameLoopInterval) {
        let frameCount = 0;
        const FULL_STATE_INTERVAL = 60; // Send full state every 60 frames (~1 second)

        room.gameLoopInterval = setInterval(() => {
            const currentRoom = roomManager.getRoom(roomId);
            if (!currentRoom) return;

            currentRoom.gameEngine.update();
            frameCount++;

            // Send full state periodically for synchronization
            if (frameCount % FULL_STATE_INTERVAL === 0) {
                const gameState = currentRoom.gameEngine.getGameState();
                roomManager.broadcastToRoom(roomId, {
                    type: 'GAME_STATE_UPDATE',
                    gameState: gameState,
                    timestamp: Date.now()
                });
            } else {
                // Send delta updates
                if (currentRoom.gameEngine.hasChanges()) {
                    const delta = currentRoom.gameEngine.getStateDelta();
                    roomManager.broadcastToRoom(roomId, {
                        type: 'GAME_STATE_DELTA',
                        delta: delta,
                        timestamp: Date.now()
                    });
                }
            }
        }, 1000 / 60);
    }
}

function handleMovement(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const state = room.connectionStates.get(playerId);
    if (!state || !state.initialized) return;

    room.gameEngine.setPlayerDirection(playerId, message.direction);
}

function handleChatMessage(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const state = room.connectionStates.get(playerId);
    if (!state || !state.initialized) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'CHAT_MESSAGE',
        playerId: playerId,
        message: message.message,
        timestamp: Date.now()
    });
}

function handleDisconnect(playerId) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
        roomManager.removePlayerFromRoom(roomId, playerId);
        playerRoomMap.delete(playerId);
        
        roomManager.broadcastToRoom(roomId, {
            type: 'LOBBY_PLAYER_LEFT',
            playerId: playerId
        });
        
        broadcastLobbyState(roomId);
    }
}

function broadcastLobbyState(roomId) {
    const roomState = roomManager.getRoomLobbyState(roomId);
    if (!roomState) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'LOBBY_STATE_UPDATE',
        lobbyState: roomState
    });
}

// Cleanup intervals on process exit
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    // Clean up all game loops
    roomManager.rooms.forEach((room) => {
        if (room.gameLoopInterval) {
            clearInterval(room.gameLoopInterval);
        }
    });
    process.exit();
});
