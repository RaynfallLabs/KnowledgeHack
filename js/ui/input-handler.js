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
        
        // Modal/menu states
        this.modalStack = [];
        
        // Setup listeners
        this.setupEventListeners();
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
    
    // ========== Extended Command Handlers ==========
    
    handlePray() {
        EventBus.emit(EVENTS.UI_MESSAGE, "You begin to pray...", 'action');
        // Philosophy quiz for divine favor
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'philosophy',
            type: 'threshold',
            difficulty: 2,
            threshold: 1,
            reason: 'prayer',
            callback: (result) => {
                if (result.success) {
                    this.game.player.sp = Math.min(this.game.player.sp + 20, this.game.player.maxSp);
                    EventBus.emit(EVENTS.UI_MESSAGE, "You feel refreshed!", 'success');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, "Your prayers go unanswered.", 'warning');
                }
            }
        });
    }
    
    handleMeditate() {
        EventBus.emit(EVENTS.UI_MESSAGE, "You enter a meditative trance...", 'action');
        // Philosophy quiz for wisdom gain
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'philosophy',
            type: 'threshold',
            difficulty: 3,
            threshold: 2,
            reason: 'meditation',
            callback: (result) => {
                if (result.success) {
                    this.game.player.wisdom += 1;
                    EventBus.emit(EVENTS.UI_MESSAGE, "Your wisdom increases!", 'success');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, "Your mind wanders.", 'warning');
                }
            }
        });
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
        // Check if on altar
        EventBus.emit(EVENTS.UI_MESSAGE, "There is no altar here.", 'warning');
    }
    
    handleChat() {
        EventBus.emit(EVENTS.UI_MESSAGE, "Talk in which direction?", 'prompt');
        this.setMode('direction');
        this.nextAction = 'chat';
    }
    
    handleSit() {
        EventBus.emit(EVENTS.PLAYER_MOVE, 0, 0); // Sitting takes a turn
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
            
            // Inventory letter keys (a-z)
            // These are handled dynamically in handleInventoryKey
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
        
        // Check if it's an inventory letter (a-z)
        if (key.length === 1 && key >= 'a' && key <= 'z') {
            // Check if there's an item in that slot
            const index = key.charCodeAt(0) - 'a'.charCodeAt(0);
            if (this.game.inventorySystem && 
                this.game.inventorySystem.hasItemAtIndex(index)) {
                this.handleInventoryKey(key);
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
     * Handle inventory letter key
     */
    handleInventoryKey(letter) {
        const index = letter.charCodeAt(0) - 'a'.charCodeAt(0);
        EventBus.emit(EVENTS.PLAYER_USE_ITEM, index);
    }
    
    // ========== Action Handlers ==========
    
    handleMove(dx, dy) {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_MOVE, dx, dy);
    }
    
    handleWait() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_MOVE, 0, 0); // Wait is move with 0,0
    }
    
    handlePickup() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_PICKUP);
    }
    
    handleDrop() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.PLAYER_DROP);
    }
    
    handleDropMany() {
        if (this.mode !== 'normal') return;
        // Open drop menu
        this.setMode('menu');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'drop' });
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
        // Check if player has Philosopher's Amulet
        if (this.game.inventorySystem.hasPhilosophersAmulet()) {
            this.setMode('identification');
            EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'identify' });
        } else {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                "You need the Philosopher's Amulet to identify items!", 'warning');
        }
    }
    
    handleApply() {
        if (this.mode !== 'normal') return;
        // Apply/use tool
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'apply' });
    }
    
    handleRead() {
        if (this.mode !== 'normal') return;
        // Read scroll/book
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'read' });
    }
    
    handleQuaff() {
        if (this.mode !== 'normal') return;
        // Drink potion
        this.setMode('inventory');
        EventBus.emit(EVENTS.UI_OPEN_INVENTORY, { mode: 'quaff' });
    }
    
    handleCast() {
        if (this.mode !== 'normal') return;
        // Cast spell
        EventBus.emit(EVENTS.PLAYER_CAST_SPELL);
    }
    
    handleFire() {
        if (this.mode !== 'normal') return;
        // Fire ranged weapon
        // TODO: Implement targeting
    }
    
    handleThrow() {
        if (this.mode !== 'normal') return;
        // Throw item
        // TODO: Implement targeting
    }
    
    handleOpen() {
        if (this.mode !== 'normal') return;
        // Open door/chest
        // TODO: Implement direction selection
    }
    
    handleClose() {
        if (this.mode !== 'normal') return;
        // Close door
        // TODO: Implement direction selection
    }
    
    handleSearch() {
        if (this.mode !== 'normal') return;
        // Search for hidden things
        EventBus.emit(EVENTS.PLAYER_MOVE, 0, 0); // Search takes a turn
        EventBus.emit(EVENTS.UI_MESSAGE, "You search carefully...", 'info');
    }
    
    handleEscape() {
        // Context-dependent escape
        if (this.mode === 'inventory' || this.mode === 'menu' || 
            this.mode === 'identification') {
            this.closeCurrentModal();
        } else if (this.mode === 'paused') {
            this.game.togglePause();
        }
    }
    
    handleHelp() {
        // Show help screen
        EventBus.emit(EVENTS.UI_MESSAGE, "Help not yet implemented", 'info');
        // TODO: Implement help modal
    }
    
    handleSave() {
        if (this.mode !== 'normal') return;
        EventBus.emit(EVENTS.SAVE_GAME);
    }
    
    handleQuit() {
        if (confirm("Really quit? Your progress will be saved.")) {
            EventBus.emit(EVENTS.SAVE_GAME);
            EventBus.emit(EVENTS.GAME_OVER);
        }
    }
    
    handlePause() {
        this.game.togglePause();
    }
    
    // ========== Debug Handlers ==========
    
    handleDebugToggle() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_MESSAGE, "Debug mode toggled");
    }
    
    handleDebugReveal() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_MESSAGE, "Revealing map");
        // TODO: Reveal entire map
    }
    
    handleDebugGodMode() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_MESSAGE, "God mode toggled");
        // TODO: Toggle invincibility
    }
    
    handleDebugSpawn() {
        if (!CONFIG.DEBUG_MODE) return;
        EventBus.emit(EVENTS.DEBUG_MESSAGE, "Spawning items");
        // TODO: Spawn debug items
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
        EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
        EventBus.emit(EVENTS.UI_CLOSE_EQUIPMENT);
        this.setMode('normal');
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
}