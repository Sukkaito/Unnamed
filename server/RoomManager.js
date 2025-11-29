const { v4: uuidv4 } = require('uuid');
const GameEngine = require('./GameEngine');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> Room
        this.publicRooms = []; // Array of roomIds that are public and have space
        this.MAX_PLAYERS = 4;
    }

    generateRoomCode() {
        // Generate a 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    createRoom(isPrivate = false) {
        const roomId = uuidv4();
        const roomCode = isPrivate ? this.generateRoomCode() : null;
        
        const room = {
            id: roomId,
            code: roomCode,
            isPrivate: isPrivate,
            gameEngine: new GameEngine(),
            players: new Map(), // playerId -> { ws, name, element, isReady, isHost }
            spectators: new Map(), // spectatorId -> { ws, name }
            connectionStates: new Map(), // playerId -> { ws, initialized, isSpectator }
            createdAt: Date.now(),
            gameStarted: false
        };

        this.rooms.set(roomId, room);
        
        if (!isPrivate) {
            this.publicRooms.push(roomId);
        }

        console.log(`Created ${isPrivate ? 'private' : 'public'} room ${roomId}${roomCode ? ` with code ${roomCode}` : ''}`);
        return room;
    }

    findOrCreatePublicRoom() {
        // Find a public room with space and not started
        for (const roomId of this.publicRooms) {
            const room = this.rooms.get(roomId);
            if (room && room.players.size < this.MAX_PLAYERS && !room.gameStarted) {
                return room;
            }
        }

        // No available room, create a new one
        return this.createRoom(false);
    }

    findRoomByCode(code) {
        for (const room of this.rooms.values()) {
            if (room.code && room.code.toUpperCase() === code.toUpperCase()) {
                return room;
            }
        }
        return null;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getPlayerCount(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.players.size : 0;
    }

    addPlayerToRoom(roomId, playerId, ws, name, element = null) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (room.gameStarted) {
            return { error: 'GAME_STARTED' };
        }

        if (room.players.size >= this.MAX_PLAYERS) {
            return { error: 'ROOM_FULL' };
        }

        const isHost = room.players.size === 0;
        const player = {
            ws: ws,
            name: name,
            element: element, // Can be null initially
            isReady: false,
            isHost: isHost,
            playerId: playerId
        };

        room.players.set(playerId, player);
        room.connectionStates.set(playerId, { ws, initialized: false, isSpectator: false });

        // Update public rooms list
        if (!room.isPrivate && !this.publicRooms.includes(roomId)) {
            this.publicRooms.push(roomId);
        }

        return { success: true, room, player };
    }

    removePlayerFromRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const wasHost = room.players.get(playerId)?.isHost;
        room.players.delete(playerId);
        room.connectionStates.delete(playerId);
        room.gameEngine.removePlayer(playerId);

        // If host left, assign new host
        if (wasHost && room.players.size > 0) {
            const newHostId = Array.from(room.players.keys())[0];
            room.players.get(newHostId).isHost = true;
        }

        // Remove from public rooms if empty
        if (room.players.size === 0 && room.spectators.size === 0) {
            this.rooms.delete(roomId);
            const index = this.publicRooms.indexOf(roomId);
            if (index > -1) {
                this.publicRooms.splice(index, 1);
            }
        } else if (room.players.size >= this.MAX_PLAYERS && !room.isPrivate) {
            // Remove from public rooms if full
            const index = this.publicRooms.indexOf(roomId);
            if (index > -1) {
                this.publicRooms.splice(index, 1);
            }
        }
    }

    setPlayerReady(roomId, playerId, isReady) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.get(playerId);
        if (!player) return false;

        player.isReady = isReady;
        return true;
    }

    areAllPlayersReady(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.size === 0) return false;

        for (const player of room.players.values()) {
            if (!player.isReady) return false;
        }

        return true;
    }

    kickPlayer(roomId, kickerId, targetId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'ROOM_NOT_FOUND' };

        const kicker = room.players.get(kickerId);
        if (!kicker || !kicker.isHost) {
            return { error: 'NOT_HOST' };
        }

        const target = room.players.get(targetId);
        if (!target) {
            return { error: 'PLAYER_NOT_FOUND' };
        }

        if (kickerId === targetId) {
            return { error: 'CANNOT_KICK_SELF' };
        }

        // Close the target's connection
        if (target.ws && target.ws.readyState === 1) { // OPEN
            target.ws.close(1000, 'Kicked by host');
        }

        this.removePlayerFromRoom(roomId, targetId);
        return { success: true };
    }

    broadcastToRoom(roomId, message, excludePlayerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const payload = JSON.stringify(message);
        
        // Broadcast to all players
        room.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId && player.ws && player.ws.readyState === 1) {
                player.ws.send(payload);
            }
        });

        // Broadcast to all spectators
        room.spectators.forEach((spectator) => {
            if (spectator.ws && spectator.ws.readyState === 1) {
                spectator.ws.send(payload);
            }
        });
    }

    getRoomLobbyState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.playerId,
            name: p.name,
            element: p.element,
            isReady: p.isReady,
            isHost: p.isHost
        }));

        return {
            roomId: room.id,
            roomCode: room.code,
            isPrivate: room.isPrivate,
            players: players,
            maxPlayers: this.MAX_PLAYERS
        };
    }
}

module.exports = RoomManager;

