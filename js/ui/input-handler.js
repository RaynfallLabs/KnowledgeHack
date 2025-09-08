/**
 * input-handler.js - Handles all keyboard and mouse input
 * Manages input modes (normal, quiz, menu, etc.)
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.enabled = true;
        this.mode = 'normal'; // normal, quiz, menu, inventory, etc.
        
        // Key states
        this.keysPressed = new Set();
        this.keyBindings = this.createDefaultBindings();
        this.extendedCommands = this.createExtendedCommands();
        
        // Modal/menu states
        this.modalStack = [];
        
        // Direction mode state
        this.nextAction = null;
        
        // Setup listeners
        this.setupEventListeners();
    }
    
    /**
     * Create default key bindings
     */
    createDefaultBindings() {
        return {
            // Movement - Arrow keys
            'ArrowUp': () => this.handleMove(0, -1),
            'ArrowDown': () => this.handleMove(0, 1),
            'ArrowLeft': () => this.handleMove(-1, 0),
            'ArrowRight': () => this.handleMove(1, 0),
            
            // Movement - Numpad
            'Numpad8': () => this.handleMove(0, -1),
            'Numpad2': () => this.handleMove(0, 1),
            'Numpad4': () => this.handleMove(-1, 0),
            'Numpad6': () => this.handleMove(1, 0),
            'Numpad7': () => this.handleMove(-1, -1),
            'Numpad9': () => this.handleMove(1, -1),
            'Numpad1': () => this.handleMove(-1, 1),
            'Numpad3': () => this.handleMove(1, 1),
            'Numpad5': () => this.handleWait(),
            
            // Movement - VI keys (Vim/NetHack style)
            'h': () => this.handleMove(-1, 0),
            'j': () => this.handleMove(0, 1),
            'k': () => this.handleMove(0, -1),
            'l': () => this.handleMove(1, 0),
            'y': () => this.handleMove(-1, -1),
            'u': () => this.handleMove(1, -1),
            'b': () => this.handleMove(-1, 1),
            'n': () => this.handleMove(1, 1),
            
            // Actions
            'g': () => this.handlePickup(),
            ',': () => this.handlePickup(), // Alternative pickup
            'Enter': () => this.handlePickup(), // Another alternative
            'd': () => this.handleDrop(),
            'D': () => this.handleDropMany(),
            'e': () => this.handleEquipment(),
            'E': () => this.handleEquipment(), // Capital E also works
            'i': () => this.handleInventory(),
            'I': () => this.handleIdentify(), // Shift+I for identification
            'a': () => this.handleApply(),
            'r': () => this.handleRead(),
            'q': () => this.handleQuaff(),
            'z': () => this.handleCast(),
            'f': () => this.handleFire(),
            't': () => this.handleThrow(),
            'o': () => this.handleOpen(),
            'c': () => this.handleClose(),
            's': () => this.handleSearch(),
            '.': () => this.handleWait(),
            ' ': () => this.handleWait(), // Space also waits
            '<': () => this.handleStairsUp(),
            '>': () => this.handleStairsDown(),
            
            // Extended commands
            '#': () => this.handleExtendedCommand(),
            
            // System
            'Escape': () => this.handleEscape(),
            '?': () => this.handleHelp(),
            'S': () => this.handleSave(),
            'Q': () => this.handleQuit(),
            'p': () => this.handlePause(),
            
            // Debug (only in debug mode)
            'F1': () => this.handleDebugToggle(),
            'F2': () => this.handleDebugReveal(),
            'F3': () => this.handleDebugGodMode(),
            'F4': () => this.handleDebugSpawn(),
        };
    }
    
    /**
     * Create extended command list (#commands)
     */
    createExtendedCommands() {
        return {
            'pray': () => this.handlePray(),
            'meditate': () => this.handleMeditate(),
            'study': () => this.handleStudy(),
            'cook': () => this.handleCook(),
            'tame': () => this.handleTame(),
            'offer': () => this.handleOffer(),
            'chat': () => this.handleChat(),
            'sit': () => this.handleSit(),
            'dip': () => this.handleDip(),
            'rub': () => this.handleRub(),
            'loot': () => this.handleLoot(),
            'untrap': () => this.handleUntrap(),
            'jump': () => this.handleJump(),
            'monster': () => this.handleMonsterInfo(),
            'conduct': () => this.handleConduct(),
            'overview': () => this.handleOverview(),
            'quit': () => this.handleQuit(),
            'save': () => this.handleSave()
        };
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events (for future use)
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => this.handleMouseClick(e));
            canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        }
        
        // Prevent default browser behaviors for game keys
        document.addEventListener('keydown', (e) => {
            if (this.shouldPreventDefault(e.key)) {
                e.preventDefault();
            }
        });
        
        // Listen for mode changes
        EventBus.on(EVENTS.UI_OPEN_QUIZ, () => this.setMode('quiz'));
        EventBus.on(EVENTS.UI_CLOSE_QUIZ, () => this.setMode('normal'));
        EventBus.on(EVENTS.UI_OPEN_INVENTORY, () => this.setMode('inventory'));
        EventBus.on(EVENTS.UI_CLOSE_INVENTORY, () => this.setMode('normal'));
        EventBus.on(EVENTS.GAME_PAUSE, () => this.setMode('paused'));
        EventBus.on(EVENTS.GAME_RESUME, () => this.setMode('normal'));
    }
    
    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        // Don't handle input if disabled or game over
        if (!this.enabled || this.game.gameOver) {
            return;
        }
        
        const key = event.key;
        
        // Track key state
        this.keysPressed.add(key);
        
        // Handle based on current mode
        switch (this.mode) {
            case 'normal':
                this.handleNormalModeKey(key, event);
                break;
            case 'quiz':
                // Quiz handles its own input
                break;
            case 'inventory':
                this.handleInventoryModeKey(key, event);
                break;
            case 'menu':
                this.handleMenuModeKey(key, event);
                break;
            case 'identification':
                this.handleIdentificationModeKey(key, event);
                break;
            case 'direction':
                this.handleDirectionModeKey(key, event);
                break;
            case 'extended':
                this.handleExtendedModeKey(key, event);
                break;
            case 'paused':
                if (key === 'p' || key === 'Escape') {
                    this.game.togglePause();
                }
                break;
        }
    }
    
    /**
     * Handle key up event
     */
    handleKeyUp(event) {
        this.keysPressed.delete(event.key);
    }
    
    /**
     * Handle normal game mode keys
     */
    handleNormalModeKey(key, event) {
        // Check for Shift+Key combinations
        if (event.shiftKey) {
            const shiftKey = `Shift+${key}`;
            if (shiftKey === 'Shift+I') {
                this.handleIdentify();
                return;
            } else if (shiftKey === 'Shift+E') {
                this.handleEquipment();
                return;
            }
        }
        
        // Regular key bindings
        const action = this.keyBindings[key];
        if (action) {
            action();
        }
    }
    
    /**
     * Handle inventory mode keys
     */
    handleInventoryModeKey(key, event) {
        if (key === 'Escape' || key === 'i') {
            EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
            this.setMode('normal');
        } else if (key.length === 1 && key >= 'a' && key <= 'z') {
            this.handleInventoryKey(key);
        }
    }
    
    /**
     * Handle menu mode keys
     */
    handleMenuModeKey(key, event) {
        if (key === 'Escape') {
            this.closeCurrentModal();
        }
        // Other menu keys handled by specific menus
    }
    
    /**
     * Handle identification mode keys
     */
    handleIdentificationModeKey(key, event) {
        if (key === 'Escape') {
            EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
            this.setMode('normal');
        } else if (key.length === 1 && key >= 'a' && key <= 'z') {
            // Identify item at letter position
            const index = key.charCodeAt(0) - 'a'.charCodeAt(0);
            EventBus.emit(EVENTS.PLAYER_IDENTIFY, { type: 'item', index });
            this.setMode('normal');
        }
    }
    
    /**
     * Handle direction mode keys
     */
    handleDirectionModeKey(key, event) {
        let dx = 0, dy = 0;
        let validDirection = false;
        
        // Check for direction keys
        switch(key) {
            case 'ArrowUp':
            case 'k':
            case 'Numpad8':
                dx = 0; dy = -1; validDirection = true;
                break;
            case 'ArrowDown':
            case 'j':
            case 'Numpad2':
                dx = 0; dy = 1; validDirection = true;
                break;
            case 'ArrowLeft':
            case 'h':
            case 'Numpad4':
                dx = -1; dy = 0; validDirection = true;
                break;
            case 'ArrowRight':
            case 'l':
            case 'Numpad6':
                dx = 1; dy = 0; validDirection = true;
                break;
            case 'y':
            case 'Numpad7':
                dx = -1; dy = -1; validDirection = true;
                break;
            case 'u':
            case 'Numpad9':
                dx = 1; dy = -1; validDirection = true;
                break;
            case 'b':
            case 'Numpad1':
                dx = -1; dy = 1; validDirection = true;
                break;
            case 'n':
            case 'Numpad3':
                dx = 1; dy = 1; validDirection = true;
                break;
            case 'Escape':
                this.setMode('normal');
                this.nextAction = null;
                EventBus.emit(EVENTS.UI_MESSAGE, "Cancelled.", 'info');
                return;
        }
        
        if (validDirection) {
            // Execute the pending action in that direction
            this.executeDirectionalAction(dx, dy);
            this.setMode('normal');
            this.nextAction = null;
        }
    }
    
    /**
     * Handle extended command mode
     */
    handleExtendedModeKey(key, event) {
        // Build command string
        if (key === 'Enter') {
            // Execute command
            const command = this.currentCommand;
            const action = this.extendedCommands[command];
            if (action) {
                action();
            } else {
                EventBus.emit(EVENTS.UI_MESSAGE, `Unknown command: ${command}`, 'warning');
            }
            this.setMode('normal');
            this.currentCommand = '';
        } else if (key === 'Escape') {
            this.setMode('normal');
            this.currentCommand = '';
        } else if (key.length === 1) {
            this.currentCommand = (this.currentCommand || '') + key;
            EventBus.emit(EVENTS.UI_MESSAGE, `Command: ${this.currentCommand}`, 'info');
        }
    }
    
    /**
     * Execute directional action
     */
    executeDirectionalAction(dx, dy) {
        switch(this.nextAction) {
            case 'tame':
                EventBus.emit(EVENTS.PLAYER_TAME, { dx, dy });
                break;
            case 'chat':
                EventBus.emit(EVENTS.PLAYER_CHAT, { dx, dy });
                break;
            case 'loot':
                EventBus.emit(EVENTS.PLAYER_LOOT, { dx, dy });
                break;
            case 'untrap':
                EventBus.emit(EVENTS.PLAYER_UNTRAP, { dx, dy });
                break;
            case 'jump':
                EventBus.emit(EVENTS.PLAYER_JUMP, { dx, dy });
                break;
            case 'open':
                EventBus.emit(EVENTS.PLAYER_OPEN, { dx, dy });
                break;
            case 'close':
                EventBus.emit(EVENTS.PLAYER_CLOSE, { dx, dy });
                break;
        }
    }
    
    /**
     * Handle inventory letter key
     */
    handleInventoryKey(letter) {
        const index = letter.charCodeAt(0) - 'a'.charCodeAt(0);
        EventBus.emit(EVENTS.PLAYER_USE_ITEM, index);
    }
    
    // ========== Action Handlers ==========
    
    handleMove(dx, dy) {
        if (this.mode !== 'normal') return;
        
        // Check for diagonal movement
        const direction = this.getDirectionName(dx, dy);
        
        if (this.game && this.game.handlePlayerMove) {
            this.game.handlePlayerMove(direction);
        } else {
            EventBus.emit(EVENTS.PLAYER_MOVE, { dx, dy, direction });
        }
    }
    
    getDirectionName(dx, dy) {
        if (dx === 0 && dy === -1) return 'north';
        if (dx === 0 && dy === 1) return 'south';
        if (dx === 1 && dy === 0) return 'east';
        if (dx === -1 && dy === 0) return 'west';
        if (dx === 1 && dy === -1) return 'northeast';
        if (dx === -1 && dy === -1) return 'northwest';
        if (dx === 1 && dy === 1) return 'southeast';
        if (dx === -1 && dy === 1) return 'southwest';
        return 'none';
    }
    
    handleWait() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_WAIT);
    }
    
    handlePickup() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_PICKUP);
    }
    
    handleDrop() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Drop what item?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'drop' });
    }
    
    handleDropMany() {
        if (this.mode !== 'normal') return;
        this.setMode('menu');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'drop-many' });
    }
    
    handleInventory() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY);
    }
    
    handleEquipment() {
        if (this.mode !== 'normal') return;
        this.setMode('menu');
        EventBus.emit(EVENTS.UI_OPEN_EQUIPMENT);
    }
    
    handleIdentify() {
        if (this.mode !== 'normal') return;
        
        // Check if player can identify items
        if (this.game.player && this.game.player.wisdom >= 20) {
            this.setMode('identification');
            EventBus.emit(EVENTS.UI_MESSAGE, "Identify which item?", 'prompt');
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'identify' });
        } else {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                "You need 20 wisdom to identify items!", 'warning');
        }
    }
    
    handleApply() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Apply what tool?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'apply' });
    }
    
    handleRead() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Read what?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'read' });
    }
    
    handleQuaff() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Drink what potion?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'quaff' });
    }
    
    handleCast() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_CAST_SPELL);
    }
    
    handleFire() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Fire in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'fire';
    }
    
    handleThrow() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Throw what item?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'throw' });
    }
    
    handleOpen() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Open in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'open';
    }
    
    handleClose() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.UI_MESSAGE, "Close in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'close';
    }
    
    handleSearch() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_SEARCH);
        EventBus.emit(EVENTS.UI_MESSAGE, "You search carefully...", 'info');
    }
    
    handleStairsUp() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_USE_STAIRS, { direction: 'up' });
    }
    
    handleStairsDown() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_USE_STAIRS, { direction: 'down' });
    }
    
    handleExtendedCommand() {
        if (this.mode !== 'normal') return;
        this.setMode('extended');
        this.currentCommand = '';
        EventBus.emit(EVENTS.UI_MESSAGE, "Extended command: ", 'prompt');
    }
    
    handleEscape() {
        // Context-dependent escape
        if (this.mode === 'inventory' || this.mode === 'menu' || 
            this.mode === 'identification' || this.mode === 'direction' ||
            this.mode === 'extended') {
            this.closeCurrentModal();
            this.setMode('normal');
            this.nextAction = null;
            this.currentCommand = '';
        } else if (this.mode === 'paused') {
            if (this.game && this.game.togglePause) {
                this.game.togglePause();
            }
        } else {
            // In normal mode, open menu
            EventBus.emit(EVENTS.UI_OPEN_MENU);
        }
    }
    
    handleHelp() {
        EventBus.emit(EVENTS.UI_OPEN_HELP);
    }
    
    handleSave() {
        if (this.mode !== 'normal') return;
        if (this.game && this.game.save) {
            if (this.game.save()) {
                EventBus.emit(EVENTS.UI_MESSAGE, "Game saved!", 'success');
            } else {
                EventBus.emit(EVENTS.UI_MESSAGE, "Save failed!", 'error');
            }
        }
    }
    
    handleQuit() {
        if (confirm("Really quit? Your progress will be saved.")) {
            if (this.game && this.game.save) {
                this.game.save();
            }
            EventBus.emit(EVENTS.GAME_QUIT);
        }
    }
    
    handlePause() {
        if (this.game && this.game.togglePause) {
            this.game.togglePause();
        } else {
            EventBus.emit(EVENTS.GAME_PAUSE);
        }
    }
    
    // ========== Extended Command Handlers ==========
    
    handlePray() {
        EventBus.emit(EVENTS.UI_MESSAGE, "You begin to pray...", 'action');
        EventBus.emit(EVENTS.PLAYER_PRAY);
    }
    
    handleMeditate() {
        EventBus.emit(EVENTS.UI_MESSAGE, "You enter a meditative trance...", 'action');
        EventBus.emit(EVENTS.PLAYER_MEDITATE);
    }
    
    handleStudy() {
        EventBus.emit(EVENTS.UI_MESSAGE, "What would you like to study?", 'prompt');
        EventBus.emit(EVENTS.UI_OPEN_STUDY_MENU);
    }
    
    handleCook() {
        EventBus.emit(EVENTS.UI_MESSAGE, "What would you like to cook?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'cook' });
    }
    
    handleTame() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Tame in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'tame';
    }
    
    handleOffer() {
        EventBus.emit(EVENTS.PLAYER_OFFER);
    }
    
    handleChat() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Talk in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'chat';
    }
    
    handleSit() {
        EventBus.emit(EVENTS.PLAYER_SIT);
        EventBus.emit(EVENTS.UI_MESSAGE, "You sit down.", 'action');
    }
    
    handleDip() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Dip what item?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'dip' });
    }
    
    handleRub() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Rub what item?", 'prompt');
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'rub' });
    }
    
    handleLoot() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Loot in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'loot';
    }
    
    handleUntrap() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Untrap in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'untrap';
    }
    
    handleJump() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Jump in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'jump';
    }
    
    handleMonsterInfo() {
        EventBus.emit(EVENTS.UI_OPEN_MONSTER_INFO);
    }
    
    handleConduct() {
        EventBus.emit(EVENTS.UI_OPEN_CONDUCT);
    }
    
    handleOverview() {
        EventBus.emit(EVENTS.UI_OPEN_OVERVIEW);
    }
    
    // ========== Debug Handlers ==========
    
    handleDebugToggle() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_TOGGLE);
        EventBus.emit(EVENTS.UI_MESSAGE, "Debug mode toggled", 'debug');
    }
    
    handleDebugReveal() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_REVEAL_MAP);
        EventBus.emit(EVENTS.UI_MESSAGE, "Map revealed", 'debug');
    }
    
    handleDebugGodMode() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_GOD_MODE);
        EventBus.emit(EVENTS.UI_MESSAGE, "God mode toggled", 'debug');
    }
    
    handleDebugSpawn() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_SPAWN_ITEMS);
        EventBus.emit(EVENTS.UI_MESSAGE, "Debug items spawned", 'debug');
    }
    
    // ========== Mouse Handlers ==========
    
    handleMouseClick(event) {
        // TODO: Implement mouse controls
        // - Click to move
        // - Click on monster to attack
        // - Click on item to examine
    }
    
    handleMouseMove(event) {
        // TODO: Implement mouse hover
        // - Show tooltips
        // - Highlight tiles
    }
    
    handleRightClick(event) {
        event.preventDefault();
        // TODO: Context menu
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Set input mode
     */
    setMode(mode) {
        this.mode = mode;
        console.log(`Input mode: ${mode}`);
    }
    
    /**
     * Check if key should prevent default
     */
    shouldPreventDefault(key) {
        // Prevent default for arrow keys and space
        return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key);
    }
    
    /**
     * Close current modal
     */
    closeCurrentModal() {
        EventBus.emit(EVENTS.UI_CLOSE_ALL);
    }
    
    /**
     * Enable/disable input
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Check if a modifier key is pressed
     */
    isModifierPressed(modifier) {
        switch (modifier) {
            case 'shift': return this.keysPressed.has('Shift');
            case 'ctrl': return this.keysPressed.has('Control');
            case 'alt': return this.keysPressed.has('Alt');
            case 'meta': return this.keysPressed.has('Meta');
            default: return false;
        }
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        // Remove all event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.removeEventListener('click', this.handleMouseClick);
            canvas.removeEventListener('mousemove', this.handleMouseMove);
            canvas.removeEventListener('contextmenu', this.handleRightClick);
        }
    }
}

// Export for use in other modules
export default InputHandler;