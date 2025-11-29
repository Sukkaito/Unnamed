class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Disable image smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        this.canvas.tabIndex = 0;
        this.canvas.focus();
        this.ws = null;
        
        this.playerId = null;
        this.gameState = {
            players: {},
            cells: []
        };
        this.elementImages = {
            dog: [],
            duck: [],
            penguin: [],
            whale: []
        };
        // Player base images (in‑game character) from the `Main` folder.
        this.avatarImages = {
            dog: null,
            duck: null,
            penguin: null,
            whale: null
        };
        // Optional overlay mask images drawn on top of players.
        // Mỗi con vật có thể có 1 mask riêng với cách align khác nhau.
        this.maskImages = {
            dog: null,
            duck: null,
            penguin: null,
            whale: null
        };
        // Shadow images (được vẽ phía dưới Main).
        this.shadowImages = {
            dog: null,
            duck: null,
            penguin: null,
            whale: null
        };
        this.dirtImages = [];
        this.dirtIndexCache = new Map(); // Cache for dirt tile indices
        this.randomSeed = Math.random() * 1000000; // Random seed for more variation
        this.loadElementImages();
        this.loadDirtImages();
        this.playerName = '';
        this.availableElements = ['dog', 'duck', 'penguin', 'whale'];
        this.selectedElement = this.availableElements[0];
        this.timerElement = document.getElementById('timer');
        this.statusMessageElement = document.getElementById('statusMessage');
        this.timerSync = null;
        this.elementSelectionInitialized = false;
        this.loginUIInitialized = false;
        this.elementAvailability = {};
        this.currentLoginStep = 'name';
        this.loginStepElements = {};
        this.nameErrorElement = null;
        this.elementErrorElement = null;
        this.pendingInitPayload = null;
        this.isAttemptingJoin = false;
        this.pendingPlayerId = null;
        this.isSpectator = false;
        
        this.currentDirection = 'NONE';
        this.directionMap = {
            ArrowUp: 'UP',
            ArrowDown: 'DOWN',
            ArrowLeft: 'LEFT',
            ArrowRight: 'RIGHT',
            w: 'UP',
            s: 'DOWN',
            a: 'LEFT',
            d: 'RIGHT'
        };
        this.oppositeDirections = {
            UP: 'DOWN',
            DOWN: 'UP',
            LEFT: 'RIGHT',
            RIGHT: 'LEFT'
        };
        this.arena = { width: 1600, height: 900 };
        // Match server: smaller cells so we see more of the arena
        this.cellSize = 48;
        this.playerSize = 48;
        this.camera = {
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        };
        this.lastFrameTime = 0;
        
        this.setupEventListeners();
        this.showLoginScreen();
    }

    loadElementImages() {
        // Load animal land images, player (Main) images và overlay Mask image từ thư mục NEW
        const animals = [
            {
                name: 'dog',
                folder: 'DOG',
                landFiles: ['Asset 3.png', 'Asset 4.png', 'Asset 5.png'],
                mainFile: 'Asset 43.png',
                maskFile: 'Asset 41.png',
                shadowFile: 'Asset 50.png'
            },
            {
                name: 'duck',
                folder: 'DUCK',
                landFiles: ['Asset 7.png', 'Asset 8.png', 'Asset 9.png'],
                mainFile: 'Asset 30.png',
                maskFile: 'Asset 31.png',
                shadowFile: 'Asset 47.png'
            },
            {
                name: 'penguin',
                folder: 'PEGUIN',
                landFiles: ['Asset 17.png', 'Asset 18.png', 'Asset 19.png'],
                mainFile: 'Asset 44.png',
                maskFile: 'Asset 46.png',
                shadowFile: 'Asset 49.png'
            },
            {
                name: 'whale',
                folder: 'WHALE',
                landFiles: ['Asset 12.png', 'Asset 13.png', 'Asset 14.png'],
                mainFile: 'Asset 33.png',
                maskFile: 'Asset 34.png',
                shadowFile: 'Asset 48.png'
            }
        ];

        animals.forEach(({ name, folder, landFiles, mainFile, maskFile, shadowFile }) => {
            // Load land images
            landFiles.forEach((filename) => {
                const img = new Image();
                img.src = `../elements/NEW/${folder}/Land/${filename}`;
                img.onload = () => {
                    this.elementImages[name].push(img);
                };
                img.onerror = () => {
                    console.warn(`Failed to load ${name} land texture: ${filename}`);
                };
            });

            // Load main player image from Main folder (used for in‑game player)
            const mainImg = new Image();
            mainImg.src = `../elements/NEW/${folder}/Main/${mainFile}`;
            mainImg.onload = () => {
                this.avatarImages[name] = mainImg;
            };
            mainImg.onerror = () => {
                console.warn(`Failed to load ${name} main image: ${mainFile}`);
            };

            // Load optional mask image from Mask folder (overlay)
            if (maskFile) {
                const maskImg = new Image();
                maskImg.src = `../elements/NEW/${folder}/Mask/${maskFile}`;
                maskImg.onload = () => {
                    if (!this.maskImages[name]) {
                        this.maskImages[name] = maskImg;
                    } else {
                        this.maskImages[name] = maskImg;
                    }
                };
                maskImg.onerror = () => {
                    console.warn(`Failed to load ${name} mask image: ${maskFile}`);
                };
            }

            // Load optional shadow image từ thư mục Shadow (vẽ phía dưới Main)
            if (shadowFile) {
                const shadowImg = new Image();
                shadowImg.src = `../elements/NEW/${folder}/Shadow/${shadowFile}`;
                shadowImg.onload = () => {
                    this.shadowImages[name] = shadowImg;
                };
                shadowImg.onerror = () => {
                    console.warn(`Failed to load ${name} shadow image: ${shadowFile}`);
                };
            }
        });
    }

    loadDirtImages() {
        const landDefaultFiles = [
            'SET 1 (1).png',
            'SET 1 (2).png',
            'SET 1 (3).png'
        ];
        
        landDefaultFiles.forEach((filename) => {
            const img = new Image();
            img.src = `../elements/NEW/LAND DEFAUT/${filename}`;
            img.onload = () => {
                this.dirtImages.push(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load land default texture: ${filename}`);
            };
        });
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('gameContainer').style.display = 'none';
        
        this.setupLoginUI();
        this.switchLoginStep('name');
        this.setupElementSelection();
    }

    showGameScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
    }

    setupLoginUI() {
        if (this.loginUIInitialized) return;
        this.loginStepElements = {
            nameStep: document.getElementById('nameStep'),
            elementStep: document.getElementById('elementStep'),
            nameInput: document.getElementById('playerNameInput'),
            continueButton: document.getElementById('continueButton'),
            backButton: document.getElementById('backToNameButton'),
            startButton: document.getElementById('startButton'),
            spectateButton: document.getElementById('spectateButton'),
            spectateFromNameButton: document.getElementById('spectateFromNameButton')
        };
        this.nameErrorElement = document.getElementById('nameError');
        this.elementErrorElement = document.getElementById('elementError');

        this.loginStepElements.continueButton.addEventListener('click', () => this.handleNameSubmission());
        this.loginStepElements.backButton.addEventListener('click', () => this.switchLoginStep('name'));
        this.loginStepElements.startButton.addEventListener('click', () => this.handleJoinGame());
        this.loginStepElements.spectateButton.addEventListener('click', () => this.handleSpectate());
        if (this.loginStepElements.spectateFromNameButton) {
            this.loginStepElements.spectateFromNameButton.addEventListener('click', () => this.handleSpectateFromName());
        }
        this.loginStepElements.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleNameSubmission();
            }
        });
        this.loginUIInitialized = true;
    }

    handleNameSubmission() {
        const input = this.loginStepElements.nameInput;
        const sanitized = this.sanitizePlayerName(input.value);
        if (!sanitized) {
            this.showNameError('Please enter a valid name');
            return;
        }
        this.playerName = sanitized;
        input.value = sanitized;
        this.showNameError('');
        this.switchLoginStep('element');
        this.ensureConnection();
    }

    handleJoinGame() {
        if (!this.playerName) {
            this.showNameError('Please enter your name first.');
            this.switchLoginStep('name');
            return;
        }
        if (!this.selectedElement) {
            this.showElementError('Please choose an element');
            return;
        }

        if (this.elementAvailability[this.selectedElement] === false) {
            this.showElementError('This element is already taken');
            return;
        }

        this.showElementError('');
        this.isSpectator = false;
        this.setJoinLoading(true);
        this.pendingInitPayload = {
            name: this.playerName,
            element: this.selectedElement
        };
        this.ensureConnection();
        this.trySendInitPayload();
    }

    handleSpectateFromName() {
        const input = this.loginStepElements.nameInput;
        const sanitized = this.sanitizePlayerName(input.value);
        if (!sanitized) {
            this.showNameError('Please enter a valid name');
            return;
        }
        this.playerName = sanitized;
        input.value = sanitized;
        this.showNameError('');
        
        this.isSpectator = true;
        this.setJoinLoading(true);
        this.pendingInitPayload = {
            name: this.playerName,
            isSpectator: true
        };
        this.ensureConnection();
        this.trySendSpectatePayload();
    }

    handleSpectate() {
        if (!this.playerName) {
            this.showNameError('Please enter your name first.');
            this.switchLoginStep('name');
            return;
        }

        this.showElementError('');
        this.isSpectator = true;
        this.setJoinLoading(true);
        this.pendingInitPayload = {
            name: this.playerName,
            isSpectator: true
        };
        this.ensureConnection();
        this.trySendSpectatePayload();
    }

    setJoinLoading(isLoading) {
        this.isAttemptingJoin = isLoading;
        this.updateJoinButtonState();
        const startButton = this.loginStepElements.startButton;
        const spectateButton = this.loginStepElements.spectateButton;
        const spectateFromNameButton = this.loginStepElements.spectateFromNameButton;
        const continueButton = this.loginStepElements.continueButton;
        
        if (startButton) {
            startButton.textContent = isLoading ? 'Joining...' : 'Join Match';
        }
        if (spectateButton) {
            spectateButton.disabled = isLoading;
            spectateButton.textContent = isLoading ? 'Joining...' : 'Spectate';
        }
        if (spectateFromNameButton) {
            spectateFromNameButton.disabled = isLoading;
            spectateFromNameButton.textContent = isLoading ? 'Joining...' : 'Spectate';
        }
        if (continueButton) {
            continueButton.disabled = isLoading;
        }
    }

    updateJoinButtonState() {
        const startButton = this.loginStepElements.startButton;
        if (!startButton) return;
        const isDisabled = this.isAttemptingJoin ||
            !this.selectedElement ||
            this.elementAvailability[this.selectedElement] === false;
        startButton.disabled = isDisabled;
    }

    showNameError(message) {
        if (this.nameErrorElement) {
            this.nameErrorElement.textContent = message || '';
        }
    }

    showElementError(message) {
        if (this.elementErrorElement) {
            this.elementErrorElement.textContent = message || '';
        }
    }

    switchLoginStep(step) {
        this.currentLoginStep = step;
        if (!this.loginStepElements.nameStep || !this.loginStepElements.elementStep) return;
        this.loginStepElements.nameStep.classList.toggle('active', step === 'name');
        this.loginStepElements.elementStep.classList.toggle('active', step === 'element');
        if (step === 'name') {
            this.setJoinLoading(false);
            this.showElementError('');
        } else {
            this.updateJoinButtonState();
            this.showElementError('');
        }
    }

    handleElementAvailability(availableElements = {}, playerIdHint = null) {
        if (this.playerId) return;
        if (playerIdHint) {
            this.pendingPlayerId = playerIdHint;
        }
        this.updateElementOptionsAvailability(availableElements);
        this.updateJoinButtonState();
    }

    handleElementSelectionError(reason, availability) {
        this.pendingInitPayload = null;
        this.setJoinLoading(false);
        this.showElementError(this.translateElementError(reason));
        if (availability) {
            this.updateElementOptionsAvailability(availability);
        }
    }

    translateElementError(reason) {
        switch (reason) {
            case 'ELEMENT_TAKEN':
                return 'This element is already being used.';
            case 'INVALID_ELEMENT':
                return 'Invalid element.';
            case 'ELEMENT_REQUIRED':
                return 'Please select an element.';
            default:
                return 'Unable to select element. Please try again.';
        }
    }

    setupElementSelection() {
        if (this.elementSelectionInitialized) {
            this.updateElementOptionsAvailability();
            this.selectElement(this.selectedElement);
            return;
        }

        const optionButtons = document.querySelectorAll('.element-option');
        if (!optionButtons.length) return;
        optionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const element = button.dataset.element;
                if (element) {
                    this.selectElement(element);
                }
            });
        });

        const initialElement = this.selectedElement || optionButtons[0].dataset.element;
        if (initialElement) {
            this.selectElement(initialElement);
        }
        this.elementSelectionInitialized = true;
        this.updateElementOptionsAvailability();
    }

    selectElement(element) {
        if (!this.availableElements.includes(element)) return;
        if (this.elementAvailability[element] === false) return;
        this.selectedElement = element;
        const optionButtons = document.querySelectorAll('.element-option');
        optionButtons.forEach((button) => {
            const isSelected = button.dataset.element === element;
            button.classList.toggle('selected', isSelected);
        });
        this.updateJoinButtonState();
    }

    updateElementOptionsAvailability(availabilityUpdate = null) {
        if (availabilityUpdate) {
            this.elementAvailability = {
                ...this.elementAvailability,
                ...availabilityUpdate
            };
        }

        const optionButtons = document.querySelectorAll('.element-option');
        if (!optionButtons.length) return;
        optionButtons.forEach((button) => {
            const element = button.dataset.element;
            const isAvailable = this.elementAvailability[element] !== false;
            button.disabled = !isAvailable;
            button.classList.toggle('disabled', !isAvailable);
        });

        if (this.selectedElement && this.elementAvailability[this.selectedElement] === false) {
            this.selectedElement = null;
        }

        if (!this.selectedElement) {
            const firstAvailable = this.availableElements.find(el => this.elementAvailability[el] !== false);
            if (firstAvailable) {
                this.selectElement(firstAvailable);
            }
        } else {
            this.updateJoinButtonState();
        }
    }

    ensureConnection() {
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.trySendInitPayload();
                return;
            }
            if (this.ws.readyState === WebSocket.CONNECTING) {
                return;
            }
        }
        this.createWebSocket();
    }

    createWebSocket() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('Connected to game server');
            if (this.isSpectator) {
                this.trySendSpectatePayload();
            } else {
                this.trySendInitPayload();
            }
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            if (this.playerId) {
                this.addChatMessage('system', 'Disconnected from server');
            } else if (this.currentLoginStep === 'element') {
                this.showElementError('Lost connection to the server. Please try again.');
                this.setJoinLoading(false);
            }
            this.ws = null;
            this.pendingInitPayload = null;
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (!this.playerId && this.currentLoginStep === 'element') {
                this.showElementError('Unable to connect to the server. Please try again.');
                this.setJoinLoading(false);
            }
        };
    }

    trySendInitPayload() {
        if (!this.pendingInitPayload) return;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'INIT_PLAYER',
            name: this.pendingInitPayload.name,
            element: this.pendingInitPayload.element
        }));
    }

    trySendSpectatePayload() {
        if (!this.pendingInitPayload) return;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'SPECTATE',
            name: this.pendingInitPayload.name
        }));
    }

    handleServerMessage(message) {
        switch (message.type) {
            case 'PLAYER_CONFIG':
                this.handleElementAvailability(message.availableElements, message.playerId);
                return;
            case 'ELEMENT_SELECTION_ERROR':
                this.handleElementSelectionError(message.reason, message.availableElements);
                return;
            case 'ROOM_FULL':
                this.setJoinLoading(false);
                this.showElementError('Room is full (max 4 players). Please choose spectator mode.');
                return;
        }

        if (!this.playerId && message.type !== 'INIT') {
            return;
        }

        switch (message.type) {
            case 'INIT':
                this.playerId = message.playerId;
                this.arena = message.arena;
                this.gameState.players[message.playerId] = message.player;
                this.playerName = message.player.name || this.playerName;
                this.pendingInitPayload = null;
                this.setJoinLoading(false);
                this.showGameScreen();
                this.updateHUD();
                break;
                
            case 'SPECTATE_INIT':
                this.playerId = message.playerId;
                this.arena = message.arena;
                this.isSpectator = true;
                this.pendingInitPayload = null;
                this.setJoinLoading(false);
                this.showGameScreen();
                this.updateHUD();
                this.addChatMessage('system', 'You are in spectator mode');
                break;
                
            case 'GAME_STATE_UPDATE':
                this.gameState = message.gameState;
                this.syncTimer(message.gameState?.timeRemaining, message.timestamp);
                this.updateHUD();
                break;
                
            case 'PLAYER_JOINED':
                this.gameState.players[message.player.id] = message.player;
                this.addChatMessage('system', `${message.player.name || message.player.id.substr(0, 8)} joined`);
                break;
                
            case 'PLAYER_LEFT':
                const departingPlayer = this.gameState.players[message.playerId];
                const departingName = departingPlayer ? (departingPlayer.name || departingPlayer.id.substr(0, 8)) : message.playerId.substr(0, 8);
                delete this.gameState.players[message.playerId];
                this.addChatMessage('system', `${departingName} left`);
                break;
                
            case 'SPECTATOR_JOINED':
                this.addChatMessage('system', `${message.name || message.playerId.substr(0, 8)} joined as spectator`);
                break;
                
            case 'SPECTATOR_LEFT':
                this.addChatMessage('system', `Spectator left`);
                break;
                
            case 'CHAT_MESSAGE':
                const player = this.gameState.players[message.playerId];
                const playerName = player ? (player.name || player.id.substr(0, 8)) : 'Unknown';
                this.addChatMessage('player', `${playerName}: ${message.message}`);
                break;
            case 'PLAYER_RENAMED':
                this.handlePlayerRenamed(message.playerId, message.name);
                break;
            case 'PLAYER_ELEMENT_CHANGED':
                this.handlePlayerElementChanged(message.playerId, message.element, message.color);
                break;
        }
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            const activeTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
            const isTyping = activeTag === 'input' || activeTag === 'textarea' || e.target?.isContentEditable;
            if (isTyping) {
                return;
            }
            // Chat input
            if (e.key === 'Enter') {
                this.focusChatInput();
                return;
            }

            if (e.code === 'Space') {
                this.setDirection('NONE');
                e.preventDefault();
                return;
            }

            const direction = this.directionMap[e.key];
            if (direction && direction !== this.currentDirection && !this.isOppositeDirection(direction, this.currentDirection)) {
                this.setDirection(direction);
                e.preventDefault();
            }
        });

        // Chat system
        document.getElementById('sendButton').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }

    focusChatInput() {
        const chatInput = document.getElementById('chatInput');
        chatInput.focus();
    }

    sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (message && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'CHAT_MESSAGE',
                message: message
            }));
            chatInput.value = '';
        }
        
        // Refocus canvas for game controls
        this.canvas.focus();
    }

    addChatMessage(type, message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        messageElement.textContent = message;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    update(delta) {
        // Movement handled by direction commands from key presses
    }

    render() {
        this.updateCamera();

        // Clear canvas
        this.ctx.fillStyle = '#0B1324';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background dirt tiles
        this.drawBackgroundDirt();

        // Draw grid lines on top of default dirt
        // (claimed territory will be drawn after this and will cover the grid)
        this.drawGridLines();

        // Draw claimed cells (on top of dirt + grid)
        this.drawClaimedCells();

        // Draw players
        Object.values(this.gameState.players).forEach(player => {
            this.drawPlayer(player);
        });
    }

    getDirtIndexForCell(row, col) {
        const key = `${row}_${col}`;
        
        // Check cache first
        if (this.dirtIndexCache.has(key)) {
            const cachedIndex = this.dirtIndexCache.get(key);
            // Ensure cached index is still valid
            if (cachedIndex < this.dirtImages.length) {
                return cachedIndex;
            }
        }

        // Return 0 if no images loaded yet
        if (this.dirtImages.length === 0) {
            return 0;
        }

        // Use same-style random selection as claimed cells:
        // simpleHash(row, col, seed) % length
        const hash = this.simpleHash(row, col, `default_${this.randomSeed}`);
        const dirtIndex = Math.abs(hash) % this.dirtImages.length;
        
        // Cache the result so each default cell keeps its texture
        this.dirtIndexCache.set(key, dirtIndex);
        return dirtIndex;
    }

    drawBackgroundDirt() {
        if (this.dirtImages.length === 0) return;

        const startCol = Math.max(0, Math.floor(this.camera.x / this.cellSize));
        const endCol = Math.ceil((this.camera.x + this.camera.width) / this.cellSize);
        const startRow = Math.max(0, Math.floor(this.camera.y / this.cellSize));
        const endRow = Math.ceil((this.camera.y + this.camera.height) / this.cellSize);

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                // Check if this cell is claimed
                const isClaimed = this.isCellClaimed(row, col);
                if (isClaimed) continue;

                // Get dirt index with color group avoidance
                const dirtIndex = this.getDirtIndexForCell(row, col);
                const dirtImg = this.dirtImages[dirtIndex];

                if (dirtImg) {
                    // Round coordinates to prevent sub-pixel rendering issues
                    const x = Math.round(col * this.cellSize - this.camera.x);
                    const y = Math.round(row * this.cellSize - this.camera.y);
                    this.ctx.drawImage(dirtImg, x, y, this.cellSize, this.cellSize);
                }
            }
        }
    }

    drawGridLines() {
        // Calculate visible grid bounds
        const startCol = Math.max(0, Math.floor(this.camera.x / this.cellSize));
        const endCol = Math.ceil((this.camera.x + this.camera.width) / this.cellSize);
        const startRow = Math.max(0, Math.floor(this.camera.y / this.cellSize));
        const endRow = Math.ceil((this.camera.y + this.camera.height) / this.cellSize);

        // Set consistent line properties for all lines
        this.ctx.strokeStyle = '#000000'; // Black color for better visibility
        this.ctx.lineWidth = 1; // Thin solid lines
        this.ctx.lineCap = 'butt'; // Flat line caps for uniform appearance
        this.ctx.lineJoin = 'miter'; // Sharp corners

        // Draw vertical lines (solid) - align with cell edges
        for (let col = startCol; col <= endCol; col++) {
            // Grid line at cell boundary: col * cellSize (no +0.5 to align with player edges)
            const x = Math.round(col * this.cellSize - this.camera.x);
            if (x >= 0 && x <= this.camera.width) {
                this.ctx.beginPath();
                const startY = Math.max(0, Math.round(startRow * this.cellSize - this.camera.y));
                const endY = Math.min(this.camera.height, Math.round(endRow * this.cellSize - this.camera.y));
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
                this.ctx.stroke();
            }
        }

        // Draw horizontal lines (solid) - align with cell edges
        for (let row = startRow; row <= endRow; row++) {
            // Grid line at cell boundary: row * cellSize (no +0.5 to align with player edges)
            const y = Math.round(row * this.cellSize - this.camera.y);
            if (y >= 0 && y <= this.camera.height) {
                this.ctx.beginPath();
                const startX = Math.max(0, Math.round(startCol * this.cellSize - this.camera.x));
                const endX = Math.min(this.camera.width, Math.round(endCol * this.cellSize - this.camera.x));
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
                this.ctx.stroke();
            }
        }

        // Draw darker segments at intersection corners, extending along edges
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2; // Thicker for emphasis
        const segmentLength = 3; // Length of darker segments extending from corners
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                // Align intersection points with grid (same as grid lines and player)
                const x = Math.round(col * this.cellSize - this.camera.x);
                const y = Math.round(row * this.cellSize - this.camera.y);
                
                // Only draw if intersection is visible
                if (x >= 0 && x <= this.camera.width && y >= 0 && y <= this.camera.height) {
                    // Draw vertical segment going up
                    if (y - segmentLength >= 0) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x, y - segmentLength);
                        this.ctx.stroke();
                    }
                    
                    // Draw vertical segment going down
                    if (y + segmentLength <= this.camera.height) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x, y + segmentLength);
                        this.ctx.stroke();
                    }
                    
                    // Draw horizontal segment going left
                    if (x - segmentLength >= 0) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x - segmentLength, y);
                        this.ctx.stroke();
                    }
                    
                    // Draw horizontal segment going right
                    if (x + segmentLength <= this.camera.width) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + segmentLength, y);
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        // Reset line width
        this.ctx.lineWidth = 1;
    }

    isCellClaimed(row, col) {
        if (!Array.isArray(this.gameState.cells) || this.gameState.cells.length === 0) return false;
        const rowData = this.gameState.cells[row];
        if (!rowData) return false;
        const cell = rowData[col];
        return cell !== null && cell !== undefined;
    }

    drawTerritoryBorder(cell, x, y, row, col) {
        if (!cell || cell.isTrail) return;
        if (!Array.isArray(this.gameState.cells) || this.gameState.cells.length === 0) return;

        const cells = this.gameState.cells;
        const ownerId = cell.ownerId;
        if (!ownerId) return;

        const rows = cells.length;
        const cols = cells[0]?.length || 0;

        const isDifferentOwner = (r, c) => {
            if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
            const nRow = cells[r];
            if (!nRow) return true;
            const nCell = nRow[c];
            if (!nCell) return true;
            return nCell.ownerId !== ownerId || nCell.isTrail;
        };

        const topDifferent = isDifferentOwner(row - 1, col);
        const bottomDifferent = isDifferentOwner(row + 1, col);
        const leftDifferent = isDifferentOwner(row, col - 1);
        const rightDifferent = isDifferentOwner(row, col + 1);

        if (!topDifferent && !bottomDifferent && !leftDifferent && !rightDifferent) return;

        const prevStrokeStyle = this.ctx.strokeStyle;
        const prevLineWidth = this.ctx.lineWidth;
        const prevAlpha = this.ctx.globalAlpha;
        const prevLineCap = this.ctx.lineCap;
        const prevLineJoin = this.ctx.lineJoin;

        // Choose border color based on element/owner
        let borderColor = cell.color || '#ffffff';
        const ownerPlayer = this.gameState.players[ownerId];
        if (ownerPlayer && ownerPlayer.element) {
            switch (ownerPlayer.element) {
                case 'dog':
                    borderColor = '#2BBAA5';
                    break;
                case 'duck':
                    borderColor = '#FAECB6';
                    break;
                case 'whale':
                    borderColor = '#1D2A62';
                    break;
                case 'penguin':
                    borderColor = '#F5F3D8';
                    break;
            }
        }

        // Stronger, more visible border using the chosen color
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 4;      // thicker stroke
        this.ctx.globalAlpha = 1.0;  // fully opaque to make it clear
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Draw borders slightly INSET so they don't bleed into neighbouring cells
        const inset = this.ctx.lineWidth / 2; // draw inward only
        const innerX = x + inset;
        const innerY = y + inset;
        const innerSize = this.cellSize - inset * 2;

        this.ctx.beginPath();

        // Top border (inside the cell)
        if (topDifferent) {
            this.ctx.moveTo(innerX, innerY);
            this.ctx.lineTo(innerX + innerSize, innerY);
        }

        // Bottom border (inside the cell)
        if (bottomDifferent) {
            const by = innerY + innerSize;
            this.ctx.moveTo(innerX, by);
            this.ctx.lineTo(innerX + innerSize, by);
        }

        // Left border (inside the cell)
        if (leftDifferent) {
            this.ctx.moveTo(innerX, innerY);
            this.ctx.lineTo(innerX, innerY + innerSize);
        }

        // Right border (inside the cell)
        if (rightDifferent) {
            const rx = innerX + innerSize;
            this.ctx.moveTo(rx, innerY);
            this.ctx.lineTo(rx, innerY + innerSize);
        }

        this.ctx.stroke();

        this.ctx.strokeStyle = prevStrokeStyle;
        this.ctx.lineWidth = prevLineWidth;
        this.ctx.globalAlpha = prevAlpha;
        this.ctx.lineCap = prevLineCap;
        this.ctx.lineJoin = prevLineJoin;
    }

    simpleHash(row, col, ownerId) {
        // Improved hash function for better randomization
        // Use prime numbers and bit operations for better distribution
        const str = `${row}_${col}_${ownerId}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Add more variation with prime number multiplication
        hash = hash * 31 + row * 17;
        hash = hash * 37 + col * 23;
        hash = hash ^ (hash >>> 16); // XOR with right shift for better distribution
        return hash;
    }

    drawClaimedCells() {
        if (!Array.isArray(this.gameState.cells) || this.gameState.cells.length === 0) return;

        const startCol = Math.max(0, Math.floor(this.camera.x / this.cellSize));
        const endCol = Math.min(
            this.gameState.cells[0].length,
            Math.ceil((this.camera.x + this.camera.width) / this.cellSize)
        );
        const startRow = Math.max(0, Math.floor(this.camera.y / this.cellSize));
        const endRow = Math.min(
            this.gameState.cells.length,
            Math.ceil((this.camera.y + this.camera.height) / this.cellSize)
        );

        for (let row = startRow; row < endRow; row++) {
            const rowData = this.gameState.cells[row];
            if (!rowData) continue;

            for (let col = startCol; col < endCol; col++) {
                const cell = rowData[col];
                if (!cell) continue;

                // Round coordinates to prevent sub-pixel rendering issues
                const x = Math.round(col * this.cellSize - this.camera.x);
                const y = Math.round(row * this.cellSize - this.camera.y);
                this.drawCellWithStyle(cell, x, y, row, col);
            }
        }
    }

    drawCellWithStyle(cell, x, y, row, col) {
        const player = this.gameState.players[cell.ownerId];
        let img = null;

        if (player && player.element) {
            const elementData = this.elementImages[player.element];
            if (Array.isArray(elementData) && elementData.length > 0) {
                // Random animal land image (using hash with random seed for more variation)
                const hash = this.simpleHash(row, col, `${cell.ownerId}_${this.randomSeed}`);
                const imageIndex = Math.abs(hash) % elementData.length;
                img = elementData[imageIndex];
            }
        }

        if (img && !cell.isTrail) {
            this.ctx.globalAlpha = 1;
            this.ctx.drawImage(img, x, y, this.cellSize, this.cellSize);
        } else {
            this.ctx.fillStyle = cell.color;
            this.ctx.globalAlpha = cell.isTrail ? 0.5 : 1;
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            this.ctx.globalAlpha = 1;
        }

        // Draw a subtle border around owned territory (but not trail cells)
        if (!cell.isTrail) {
            this.drawTerritoryBorder(cell, x, y, row, col);
        }

        if (cell.isTrail) {
            this.ctx.strokeStyle = '#ffffff55';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        }
    }

    drawPlayer(player) {
        const isCurrentPlayer = player.id === this.playerId;
        // Calculate screen position - player.x is always col * cellSize from server
        // Round to ensure pixel-perfect alignment with grid
        const screenX = Math.round(player.x - this.camera.x);
        const screenY = Math.round(player.y - this.camera.y);

        if (screenX + this.playerSize < 0 || screenX > this.canvas.width ||
            screenY + this.playerSize < 0 || screenY > this.camera.height) {
            return;
        }

        // Draw shadow image (nếu có) phía dưới Main (không xoay).
        // Shadow được scale theo Main và align cạnh trên trùng với cạnh trên của Main.
        const avatarImg = player.element ? this.avatarImages[player.element] : null;
        const shadowImg = player.element ? this.shadowImages[player.element] : null;

        if (shadowImg && avatarImg) {
            const baseWidth = avatarImg.width;
            const baseHeight = avatarImg.height;
            const shWidth = shadowImg.width;
            const shHeight = shadowImg.height;

            if (baseWidth > 0 && baseHeight > 0 && shWidth > 0 && shHeight > 0) {
                const scale = this.playerSize / baseWidth;
                const scaledShadowWidth = shWidth * scale;
                const scaledShadowHeight = shHeight * scale;

                // Căn ngang giữa theo Main, cạnh trên trùng với screenY (đỉnh Main)
                const drawX = Math.round(screenX + (this.playerSize - scaledShadowWidth) / 2);
                const drawY = Math.round(screenY);

                this.ctx.drawImage(shadowImg, drawX, drawY, scaledShadowWidth, scaledShadowHeight);
            }
        }

        // Draw avatar base image if available, otherwise fallback to color rectangle
        if (avatarImg) {
            // Vẽ player đúng theo grid, không xoay
            this.ctx.drawImage(avatarImg, screenX, screenY, this.playerSize, this.playerSize);
        } else {
            // Fallback to color rectangle if avatar not loaded yet
            this.ctx.fillStyle = player.color;
            this.ctx.fillRect(screenX, screenY, this.playerSize, this.playerSize);
        }

        // Draw mask layer trên player nếu có (không xoay).
        // Quy ước align cho từng con:
        // - dog:    align cạnh dưới (đáy mask trùng đáy Main), căn giữa ngang
        // - duck:   align cạnh trên (đỉnh mask trùng đỉnh Main), căn giữa ngang
        // - whale:  align cạnh dưới + cạnh trái của Main
        // - penguin:align cạnh dưới, căn giữa ngang
        if (player.element && this.maskImages[player.element] && avatarImg) {
            const maskImg = this.maskImages[player.element];
            const baseWidth = avatarImg.width;
            const baseHeight = avatarImg.height;
            const maskWidth = maskImg.width;
            const maskHeight = maskImg.height;

            if (baseWidth > 0 && baseHeight > 0 && maskWidth > 0 && maskHeight > 0) {
                // Tỉ lệ phóng của Main so với kích thước gốc (giả sử scale đều theo chiều ngang)
                const scale = this.playerSize / baseWidth;
                const scaledMaskWidth = maskWidth * scale;
                const scaledMaskHeight = maskHeight * scale;

                let drawX;
                let drawY;

                if (player.element === 'duck') {
                    // Vịt: align với cạnh trên của Main, căn giữa ngang
                    drawX = Math.round(screenX + (this.playerSize - scaledMaskWidth) / 2);
                    drawY = Math.round(screenY);
                } else if (player.element === 'whale') {
                    // Cá voi: align cạnh dưới + cạnh trái của Main
                    const baseBottomY = screenY + this.playerSize;
                    drawX = Math.round(screenX);
                    drawY = Math.round(baseBottomY - scaledMaskHeight);
                } else {
                    // Dog, penguin: align với cạnh dưới của Main, căn giữa ngang
                    const baseBottomY = screenY + this.playerSize;
                    drawX = Math.round(screenX + (this.playerSize - scaledMaskWidth) / 2);
                    drawY = Math.round(baseBottomY - scaledMaskHeight);
                }

                this.ctx.drawImage(maskImg, drawX, drawY, scaledMaskWidth, scaledMaskHeight);
            }
        }

        // Không vẽ khung viền cho player nữa để nhân vật nhìn "clean" hơn.
        // Thông tin nhận diện người chơi vẫn nằm ở HUD/scoreboard.
    }

    setDirection(direction) {
        if (this.isSpectator) return; // Spectators cannot move
        if (!this.ws || direction === this.currentDirection || this.gameState.gameOver) return;
        if (this.isOppositeDirection(direction, this.currentDirection)) return;
        this.currentDirection = direction;
        this.ws.send(JSON.stringify({
            type: 'MOVEMENT',
            direction
        }));
    }

    updateHUD() {
        if (!this.playerId) return;
        
        if (this.isSpectator) {
            // Spectator HUD: show player count and scoreboard
            document.getElementById('territory').textContent = '-';
            document.getElementById('cellsCaptured').textContent = '-';
            document.getElementById('playerCount').textContent = Object.keys(this.gameState.players).length;
        } else {
            const player = this.gameState.players[this.playerId];
            if (player) {
                document.getElementById('territory').textContent = player.area || 0;
                document.getElementById('cellsCaptured').textContent = player.area || 0;
                document.getElementById('playerCount').textContent = Object.keys(this.gameState.players).length;
            }
        }

        this.updateScoreboard();
        this.updateTimerStatus();
    }

    updateScoreboard() {
        const list = document.getElementById('scoreList');
        if (!list) return;

        const players = Object.values(this.gameState.players || {});
        players.sort((a, b) => (b.area || 0) - (a.area || 0));

        list.innerHTML = '';

        players.forEach((player, index) => {
            const item = document.createElement('li');
            if (player.id === this.playerId) {
                item.classList.add('current');
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            const displayName = this.getPlayerDisplayName(player);
            nameSpan.textContent = `${index + 1}. ${displayName}`;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'player-score';
            scoreSpan.textContent = `${player.area || 0}`;

            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
            list.appendChild(item);
        });
    }

    updateCamera() {
        if (!this.playerId) return;
        
        if (this.isSpectator) {
            // Spectator camera: center on arena or follow first player
            const players = Object.values(this.gameState.players);
            if (players.length > 0) {
                // Follow the first player (or could be changed to follow leader)
                const targetPlayer = players[0];
                const centerX = targetPlayer.x + this.playerSize / 2;
                const centerY = targetPlayer.y + this.playerSize / 2;

                const maxX = Math.max(0, this.arena.width - this.camera.width);
                const maxY = Math.max(0, this.arena.height - this.camera.height);

                // Snap camera to pixel grid to prevent sub-pixel rendering artifacts
                const rawX = Math.min(maxX, Math.max(0, centerX - this.camera.width / 2));
                const rawY = Math.min(maxY, Math.max(0, centerY - this.camera.height / 2));
                this.camera.x = Math.round(rawX);
                this.camera.y = Math.round(rawY);
            } else {
                // Center on arena if no players
                this.camera.x = Math.round((this.arena.width - this.camera.width) / 2);
                this.camera.y = Math.round((this.arena.height - this.camera.height) / 2);
            }
            return;
        }
        
        const player = this.gameState.players[this.playerId];
        if (!player) return;

        const centerX = player.x + this.playerSize / 2;
        const centerY = player.y + this.playerSize / 2;

        const maxX = Math.max(0, this.arena.width - this.camera.width);
        const maxY = Math.max(0, this.arena.height - this.camera.height);

        // Use a "dead zone" camera: only move camera when player gets close to the viewport edge
        // This greatly reduces background motion and helps prevent motion sickness.
        const marginX = this.camera.width * 0.25;  // 25% of screen width on each side
        const marginY = this.camera.height * 0.25; // 25% of screen height on top/bottom

        let camX = this.camera.x;
        let camY = this.camera.y;

        const left = camX + marginX;
        const right = camX + this.camera.width - marginX;
        const top = camY + marginY;
        const bottom = camY + this.camera.height - marginY;

        if (centerX < left) {
            camX = centerX - marginX;
        } else if (centerX > right) {
            camX = centerX + marginX - this.camera.width;
        }

        if (centerY < top) {
            camY = centerY - marginY;
        } else if (centerY > bottom) {
            camY = centerY + marginY - this.camera.height;
        }

        // Clamp to arena bounds and snap to integer pixels to avoid sub-pixel jitter
        camX = Math.min(maxX, Math.max(0, camX));
        camY = Math.min(maxY, Math.max(0, camY));
        this.camera.x = Math.round(camX);
        this.camera.y = Math.round(camY);
    }

    sanitizePlayerName(name) {
        const trimmed = (name || '').trim().substring(0, 9);
        const cleaned = trimmed.replace(/[<>]/g, '').replace(/[^\p{L}\p{N}\s_\-]/gu, '');
        if (cleaned) {
            return cleaned;
        }
        return '';
    }

    getPlayerDisplayName(player) {
        if (!player) return 'Unknown';
        return player.name || player.id?.substr(0, 4) || 'Player';
    }

    isOppositeDirection(dirA, dirB) {
        if (!dirA || !dirB) return false;
        if (dirA === 'NONE' || dirB === 'NONE') return false;
        return this.oppositeDirections[dirA] === dirB || this.oppositeDirections[dirB] === dirA;
    }

    updateTimerStatus() {
        if (!this.timerElement) return;
        const defaultTime = 3 * 60 * 1000;
        let timeRemaining = (typeof this.gameState.timeRemaining === 'number')
            ? this.gameState.timeRemaining
            : defaultTime;

        if (this.timerSync && typeof this.timerSync.remainingMs === 'number') {
            const elapsed = performance.now() - this.timerSync.syncedAt;
            timeRemaining = Math.max(0, this.timerSync.remainingMs - elapsed);
        }

        this.timerElement.textContent = this.formatTime(timeRemaining);

        if (!this.statusMessageElement) return;
        if (this.gameState.gameOver) {
            const winnerName = this.gameState.winnerName;
            this.statusMessageElement.textContent = winnerName ? `${winnerName} wins!` : 'Match ended';
            this.statusMessageElement.classList.add('game-over');
        } else {
            this.statusMessageElement.textContent = '';
            this.statusMessageElement.classList.remove('game-over');
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    syncTimer(timeRemaining, serverTimestamp) {
        if (typeof timeRemaining !== 'number') {
            this.timerSync = null;
            return;
        }
        this.timerSync = {
            remainingMs: timeRemaining,
            syncedAt: performance.now(),
            serverTimestamp: serverTimestamp || Date.now()
        };
    }

    handlePlayerRenamed(playerId, name) {
        if (!playerId || !name) return;
        const player = this.gameState.players[playerId];
        if (player) {
            player.name = name;
        }
        if (playerId === this.playerId) {
            this.playerName = name;
        }
        this.updateHUD();
    }

    handlePlayerElementChanged(playerId, element, color) {
        if (!playerId || !element) return;
        const player = this.gameState.players[playerId];
        if (player) {
            player.element = element;
            if (color) {
                player.color = color;
            }
        }

        if (playerId === this.playerId && this.availableElements.includes(element)) {
            this.selectedElement = element;
            this.selectElement(element);
        }

        this.updateHUD();
    }

    gameLoop(timestamp = 0) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const delta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.update(delta);
        this.render();
        requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
    }
}

// Start the game once the page finishes loading
window.addEventListener('load', () => {
    const game = new GameClient();
    requestAnimationFrame((timestamp) => game.gameLoop(timestamp));
});