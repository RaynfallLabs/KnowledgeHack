/**
 * input-handler.js - Complete fixed version
 * Handles all keyboard and mouse input
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
        
        // Modal/menu states
        this.modalStack = [];
        
        // Direction for next action
        this.nextAction = null;
        
        // Setup listeners
        this.setupEventListeners();
        this.setupGameEventListeners();
        
        console.log('🎮 Input handler initialized');
    }
    
    /**
     * Create default key bindings
     */
    createDefaultBindings() {
        return {
            // Movement - Arrow keys
            'ArrowUp': () => this.handleMove('north'),
            'ArrowDown': () => this.handleMove('south'),
            'ArrowLeft': () => this.handleMove('west'),
            'ArrowRight': () => this.handleMove('east'),
            
            // Movement - Numpad
            'Numpad8': () => this.handleMove('north'),
            'Numpad2': () => this.handleMove('south'),
            'Numpad4': () => this.handleMove('west'),
            'Numpad6': () => this.handleMove('east'),
            'Numpad7': () => this.handleMove('northwest'),
            'Numpad9': () => this.handleMove('northeast'),
            'Numpad1': () => this.handleMove('southwest'),
            'Numpad3': () => this.handleMove('southeast'),
            'Numpad5': () => this.handleWait(),
            
            // Movement - VI keys (Vim/NetHack style)
            'h': () => this.handleMove('west'),
            'j': () => this.handleMove('south'),
            'k': () => this.handleMove('north'),
            'l': () => this.handleMove('east'),
            'y': () => this.handleMove('northwest'),
            'u': () => this.handleMove('northeast'),
            'b': () => this.handleMove('southwest'),
            'n': () => this.handleMove('southeast'),
            
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
            
            // Stairs
            '<': () => this.handleStairs('up'),
            '>': () => this.handleStairs('down'),
            
            // System
            'Escape': () => this.handleEscape(),
            '?': () => this.handleHelp(),
            'S': () => this.handleSave(),
            'Q': () => this.handleQuit(),
            'p': () => this.handlePause(),
            
            // Extended commands
            '#': () => this.handleExtendedCommand(),
            
            // Debug (only in debug mode)
            'F1': () => this.handleDebugToggle(),
            'F2': () => this.handleDebugReveal(),
            'F3': () => this.handleDebugGodMode(),
            'F4': () => this.handleDebugSpawn()
        };
    }
    
    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => this.handleClick(e));
            canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        }
        
        // Prevent default browser behaviors for game keys
        document.addEventListener('keydown', (e) => {
            if (this.shouldPreventDefault(e.key)) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Setup game event listeners
     */
    setupGameEventListeners() {
        // Listen for mode changes (only if events exist)
        if (EVENTS) {
            if (EVENTS.UI_OPEN_QUIZ) {
                EventBus.on(EVENTS.UI_OPEN_QUIZ, () => this.setMode('quiz'));
            }
            if (EVENTS.UI_CLOSE_QUIZ) {
                EventBus.on(EVENTS.UI_CLOSE_QUIZ, () => this.setMode('normal'));
            }
            if (EVENTS.UI_OPEN_INVENTORY) {
                EventBus.on(EVENTS.UI_OPEN_INVENTORY, () => this.setMode('inventory'));
            }
            if (EVENTS.UI_CLOSE_INVENTORY) {
                EventBus.on(EVENTS.UI_CLOSE_INVENTORY, () => this.setMode('normal'));
            }
            if (EVENTS.GAME_PAUSE) {
                EventBus.on(EVENTS.GAME_PAUSE, () => this.setMode('paused'));
            }
            if (EVENTS.GAME_RESUME) {
                EventBus.on(EVENTS.GAME_RESUME, () => this.setMode('normal'));
            }
        }
    }
    
    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        // Don't handle input if disabled or game over
        if (!this.enabled || (this.game && this.game.gameOver)) {
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
            case 'direction':
                this.handleDirectionModeKey(key, event);
                break;
            case 'menu':
                this.handleMenuModeKey(key, event);
                break;
            case 'paused':
                if (key === 'p' || key === 'Escape') {
                    this.handlePause();
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
        if (event.shiftKey && key === 'I') {
            this.handleIdentify();
            return;
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
            this.closeInventory();
        } else if (key.length === 1 && key >= 'a' && key <= 'z') {
            this.handleInventorySelection(key);
        }
    }
    
    /**
     * Handle direction mode keys
     */
    handleDirectionModeKey(key, event) {
        let direction = null;
        
        // Map keys to directions
        const directionMap = {
            'ArrowUp': 'north',
            'ArrowDown': 'south',
            'ArrowLeft': 'west',
            'ArrowRight': 'east',
            'h': 'west',
            'j': 'south',
            'k': 'north',
            'l': 'east',
            'y': 'northwest',
            'u': 'northeast',
            'b': 'southwest',
            'n': 'southeast'
        };
        
        direction = directionMap[key];
        
        if (direction) {
            this.executeDirectionAction(direction);
            this.setMode('normal');
        } else if (key === 'Escape') {
            this.setMode('normal');
            this.nextAction = null;
        }
    }
    
    /**
     * Handle menu mode keys
     */
    handleMenuModeKey(key, event) {
        if (key === 'Escape') {
            this.closeCurrentModal();
        }
    }
    
    /**
     * Execute action in given direction
     */
    executeDirectionAction(direction) {
        if (!this.nextAction) return;
        
        const dx = direction.includes('west') ? -1 : direction.includes('east') ? 1 : 0;
        const dy = direction.includes('north') ? -1 : direction.includes('south') ? 1 : 0;
        
        switch (this.nextAction) {
            case 'open':
                this.game.handleOpenInDirection(dx, dy);
                break;
            case 'close':
                this.game.handleCloseInDirection(dx, dy);
                break;
            case 'loot':
                this.game.handleLootInDirection(dx, dy);
                break;
            // Add more directional actions as needed
        }
        
        this.nextAction = null;
    }
    
    // ========== Action Handlers ==========
    
    handleMove(direction) {
        if (this.mode !== 'normal' || !this.game) return;
        this.game.handlePlayerMove(direction);
    }
    
    handleWait() {
        if (this.mode !== 'normal' || !this.game) return;
        // Waiting is just not moving but still taking a turn
        if (this.game.processTurn) {
            this.game.processTurn();
        }
    }
    
    handlePickup() {
        if (this.mode !== 'normal' || !this.game) return;
        if (this.game.handlePickup) {
            this.game.handlePickup();
        }
    }
    
    handleDrop() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'drop' });
        }
    }
    
    handleDropMany() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'drop-many' });
        }
    }
    
    handleInventory() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY);
        }
    }
    
    handleEquipment() {
        if (this.mode !== 'normal') return;
        this.setMode('menu');
        if (EVENTS && EVENTS.UI_OPEN_EQUIPMENT) {
            EventBus.emit(EVENTS.UI_OPEN_EQUIPMENT);
        }
    }
    
    handleIdentify() {
        if (this.mode !== 'normal') return;
        // Check if player has identification ability
        if (this.game && this.game.player) {
            this.setMode('inventory');
            if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
                EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'identify' });
            }
        }
    }
    
    handleApply() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'apply' });
        }
    }
    
    handleRead() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'read' });
        }
    }
    
    handleQuaff() {
        if (this.mode !== 'normal') return;
        this.setMode('inventory');
        if (EVENTS && EVENTS.UI_OPEN_INVENTORY) {
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'quaff' });
        }
    }
    
    handleCast() {
        if (this.mode !== 'normal') return;
        if (EVENTS && EVENTS.UI_OPEN_SPELL_MENU) {
            EventBus.emit(EVENTS.UI_OPEN_SPELL_MENU);
        }
    }
    
    handleFire() {
        if (this.mode !== 'normal') return;
        // TODO: Implement ranged targeting
    }
    
    handleThrow() {
        if (this.mode !== 'normal') return;
        // TODO: Implement throwing
    }
    
    handleOpen() {
        if (this.mode !== 'normal') return;
        this.setMode('direction');
        this.nextAction = 'open';
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('Open in which direction?', 'prompt');
        }
    }
    
    handleClose() {
        if (this.mode !== 'normal') return;
        this.setMode('direction');
        this.nextAction = 'close';
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('Close in which direction?', 'prompt');
        }
    }
    
    handleSearch() {
        if (this.mode !== 'normal' || !this.game) return;
        if (this.game.handleSearch) {
            this.game.handleSearch();
        } else if (this.game.messageLog) {
            this.game.messageLog.add('You search carefully...', 'info');
        }
    }
    
    handleStairs(direction) {
        if (this.mode !== 'normal' || !this.game) return;
        if (this.game.handleStairs) {
            this.game.handleStairs(direction);
        }
    }
    
    handleEscape() {
        // Context-dependent escape
        if (this.mode === 'inventory' || this.mode === 'menu') {
            this.closeCurrentModal();
        } else if (this.mode === 'direction') {
            this.setMode('normal');
            this.nextAction = null;
        } else if (this.mode === 'paused') {
            this.handlePause();
        }
    }
    
    handleHelp() {
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('=== Controls ===', 'info');
            this.game.messageLog.add('Arrow keys or HJKL: Move', 'info');
            this.game.messageLog.add('g or ,: Pick up items', 'info');
            this.game.messageLog.add('i: Inventory', 'info');
            this.game.messageLog.add('e: Equipment', 'info');
            this.game.messageLog.add('.: Wait', 'info');
            this.game.messageLog.add('?: This help', 'info');
        }
    }
    
    handleSave() {
        if (this.mode !== 'normal' || !this.game) return;
        if (this.game.save) {
            this.game.save();
        }
    }
    
    handleQuit() {
        if (confirm("Really quit? Your progress will be saved.")) {
            if (this.game && this.game.save) {
                this.game.save();
            }
            if (EVENTS && EVENTS.GAME_OVER) {
                EventBus.emit(EVENTS.GAME_OVER);
            }
        }
    }
    
    handlePause() {
        if (this.game && this.game.togglePause) {
            this.game.togglePause();
        } else {
            this.setMode(this.mode === 'paused' ? 'normal' : 'paused');
        }
    }
    
    handleExtendedCommand() {
        if (this.mode !== 'normal') return;
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('Extended commands not yet implemented', 'info');
        }
    }
    
    // ========== Inventory Handlers ==========
    
    handleInventorySelection(letter) {
        const index = letter.charCodeAt(0) - 'a'.charCodeAt(0);
        if (EVENTS && EVENTS.INVENTORY_ITEM_SELECTED) {
            EventBus.emit(EVENTS.INVENTORY_ITEM_SELECTED, { index, letter });
        }
        this.closeInventory();
    }
    
    closeInventory() {
        this.setMode('normal');
        if (EVENTS && EVENTS.UI_CLOSE_INVENTORY) {
            EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
        }
    }
    
    // ========== Debug Handlers ==========
    
    handleDebugToggle() {
        if (!CONFIG.DEBUG_MODE) return;
        CONFIG.SHOW_DEBUG_UI = !CONFIG.SHOW_DEBUG_UI;
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add(`Debug UI: ${CONFIG.SHOW_DEBUG_UI ? 'ON' : 'OFF'}`, 'system');
        }
    }
    
    handleDebugReveal() {
        if (!CONFIG.DEBUG_MODE) return;
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('Revealing entire map...', 'system');
        }
        // TODO: Implement map reveal
    }
    
    handleDebugGodMode() {
        if (!CONFIG.DEBUG_MODE) return;
        if (this.game && this.game.player) {
            this.game.player.godMode = !this.game.player.godMode;
            if (this.game.messageLog) {
                this.game.messageLog.add(`God mode: ${this.game.player.godMode ? 'ON' : 'OFF'}`, 'system');
            }
        }
    }
    
    handleDebugSpawn() {
        if (!CONFIG.DEBUG_MODE) return;
        if (this.game && this.game.messageLog) {
            this.game.messageLog.add('Spawning debug items...', 'system');
        }
        // TODO: Implement item spawning
    }
    
    // ========== Mouse Handlers ==========
    
    handleClick(event) {
        if (!this.enabled || !this.game || !this.game.renderer) return;
        
        // Get canvas position
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert to tile coordinates
        const tileSize = this.game.renderer.tileSize || 24;
        const tileX = Math.floor(x / tileSize) + (this.game.renderer.cameraX || 0);
        const tileY = Math.floor(y / tileSize) + (this.game.renderer.cameraY || 0);
        
        // Emit click event if events are defined
        if (EVENTS && EVENTS.UI_CLICK) {
            EventBus.emit(EVENTS.UI_CLICK, {
                x: tileX,
                y: tileY,
                screenX: x,
                screenY: y,
                button: event.button
            });
        }
        
        // Log for debugging
        if (CONFIG.DEBUG_MODE) {
            console.log(`Click at tile (${tileX}, ${tileY})`);
        }
    }
    
    handleMouseMove(event) {
        // TODO: Implement tooltips and tile highlighting
    }
    
    handleRightClick(event) {
        event.preventDefault();
        // TODO: Implement context menu
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Set input mode
     */
    setMode(mode) {
        this.mode = mode;
        if (CONFIG.DEBUG_MODE) {
            console.log(`Input mode: ${mode}`);
        }
    }
    
    /**
     * Check if key should prevent default
     */
    shouldPreventDefault(key) {
        // Prevent default for arrow keys, space, and game keys
        const preventKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            ' ', '.', ',', '/', '?', '<', '>'
        ];
        return preventKeys.includes(key);
    }
    
    /**
     * Close current modal
     */
    closeCurrentModal() {
        if (EVENTS) {
            if (EVENTS.UI_CLOSE_INVENTORY) EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
            if (EVENTS.UI_CLOSE_EQUIPMENT) EventBus.emit(EVENTS.UI_CLOSE_EQUIPMENT);
        }
        this.setMode('normal');
    }
    
    /**
     * Enable/disable input
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.removeEventListener('click', this.handleClick);
            canvas.removeEventListener('mousemove', this.handleMouseMove);
            canvas.removeEventListener('contextmenu', this.handleRightClick);
        }
    }
}