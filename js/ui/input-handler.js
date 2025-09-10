/**
 * input-handler.js - Handles all keyboard and mouse input
 * Updated with harvesting, cooking, and all game commands
 */

import { EventBus, EVENTS } from '../core/event-bus.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        
        // Input state
        this.keysPressed = new Set();
        this.shiftPressed = false;
        this.ctrlPressed = false;
        this.altPressed = false;
        
        // Modal/menu state
        this.modalActive = false;
        this.menuActive = false;
        
        // Setup event listeners
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        this.setupGameEventListeners();
        
        console.log('🎮 Input handler initialized');
    }
    
    /**
     * Setup keyboard event listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    /**
     * Setup mouse event listeners
     */
    setupMouseListeners() {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => this.handleClick(e));
            canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        }
    }
    
    /**
     * Setup game event listeners
     */
    setupGameEventListeners() {
        // Track when modals/menus are open
        EventBus.on(EVENTS.UI_MODAL_OPEN, () => {
            this.modalActive = true;
        });
        
        EventBus.on(EVENTS.UI_MODAL_CLOSE, () => {
            this.modalActive = false;
        });
        
        EventBus.on(EVENTS.QUIZ_START, () => {
            this.modalActive = true;
        });
        
        EventBus.on(EVENTS.QUIZ_COMPLETE, () => {
            this.modalActive = false;
        });
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(e) {
        // Track modifier keys
        this.shiftPressed = e.shiftKey;
        this.ctrlPressed = e.ctrlKey;
        this.altPressed = e.altKey;
        
        // Don't process if typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Special handling for quiz modal
        if (this.modalActive) {
            this.handleModalInput(e);
            return;
        }
        
        // Prevent default for game keys
        if (this.isGameKey(e.key)) {
            e.preventDefault();
        }
        
        // Track key state
        this.keysPressed.add(e.key);
        
        // Handle the input
        this.processInput(e.key, e);
    }
    
    /**
     * Handle key up events
     */
    handleKeyUp(e) {
        this.keysPressed.delete(e.key);
        
        // Update modifier state
        this.shiftPressed = e.shiftKey;
        this.ctrlPressed = e.ctrlKey;
        this.altPressed = e.altKey;
    }
    
    /**
     * Process input based on key
     */
    processInput(key, event) {
        // Don't process during game over
        if (this.game.gameOver) {
            if (key === 'r' || key === 'R') {
                location.reload(); // Restart game
            }
            return;
        }
        
        // Movement keys (arrows, numpad, vi-keys)
        if (this.handleMovement(key)) {
            return;
        }
        
        // Action keys
        switch(key.toLowerCase()) {
            // Pickup
            case ',':
            case 'g': // Alternative pickup key
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'pickup' });
                break;
                
            // Harvest corpse
            case 'h':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'harvest' });
                break;
                
            // Cook food
            case 'c':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'cook' });
                break;
                
            // Inventory
            case 'i':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'inventory' });
                break;
                
            // Equipment
            case 'e':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'equipment' });
                break;
                
            // Drop item
            case 'd':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'drop' });
                break;
                
            // Wear/Wield
            case 'w':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'wear' });
                break;
                
            // Take off
            case 't':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'takeoff' });
                break;
                
            // Apply/Use
            case 'a':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'apply' });
                break;
                
            // Quaff potion
            case 'q':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'quaff' });
                break;
                
            // Read scroll/book
            case 'r':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'read' });
                break;
                
            // Zap wand
            case 'z':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'zap' });
                break;
                
            // Open door/container
            case 'o':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'open' });
                break;
                
            // Close door
            case 'c':
                if (this.shiftPressed) {
                    EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'close' });
                }
                break;
                
            // Search
            case 's':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'search' });
                break;
                
            // Look/Examine
            case 'l':
            case 'x':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'look' });
                break;
                
            // Wait/Rest
            case '.':
            case ' ':
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'wait' });
                break;
                
            // Save game
            case 's':
                if (this.ctrlPressed) {
                    EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'save' });
                }
                break;
                
            // Load game
            case 'l':
                if (this.ctrlPressed) {
                    EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'load' });
                }
                break;
                
            // Help
            case '?':
            case 'h':
                if (this.shiftPressed || key === '?') {
                    this.showHelp();
                }
                break;
                
            // Stats/Character screen
            case '@':
            case 'c':
                if (this.shiftPressed || key === '@') {
                    EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'stats' });
                }
                break;
                
            // Message history
            case 'm':
                if (this.ctrlPressed) {
                    EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'messages' });
                }
                break;
                
            // Escape - close modals
            case 'Escape':
                EventBus.emit(EVENTS.UI_CLOSE_MODAL);
                break;
        }
    }
    
    /**
     * Handle movement input
     */
    handleMovement(key) {
        let direction = null;
        
        // Arrow keys
        switch(key) {
            case 'ArrowUp':
                direction = 'north';
                break;
            case 'ArrowDown':
                direction = 'south';
                break;
            case 'ArrowLeft':
                direction = 'west';
                break;
            case 'ArrowRight':
                direction = 'east';
                break;
        }
        
        // Numpad (including diagonals)
        const numpadMap = {
            '7': 'northwest',
            '8': 'north',
            '9': 'northeast',
            '4': 'west',
            '5': 'wait', // Numpad 5 waits
            '6': 'east',
            '1': 'southwest',
            '2': 'south',
            '3': 'southeast'
        };
        
        if (numpadMap[key]) {
            if (key === '5') {
                EventBus.emit(EVENTS.PLAYER_ACTION, { type: 'wait' });
                return true;
            }
            direction = numpadMap[key];
        }
        
        // Vi keys (hjkl and yubn for diagonals)
        const viKeyMap = {
            'h': 'west',
            'j': 'south',
            'k': 'north',
            'l': 'east',
            'y': 'northwest',
            'u': 'northeast',
            'b': 'southwest',
            'n': 'southeast'
        };
        
        // Only use vi keys if not holding shift (shift+h = help)
        if (!this.shiftPressed && viKeyMap[key]) {
            direction = viKeyMap[key];
        }
        
        // Emit movement if we have a direction
        if (direction) {
            EventBus.emit(EVENTS.PLAYER_ACTION, {
                type: 'move',
                direction: direction
            });
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle input while modal is active
     */
    handleModalInput(e) {
        // Allow escape to close modals
        if (e.key === 'Escape') {
            EventBus.emit(EVENTS.UI_CLOSE_MODAL);
            e.preventDefault();
            return;
        }
        
        // Allow Enter for quiz submission
        if (e.key === 'Enter') {
            // Quiz system handles this
            return;
        }
        
        // Allow number keys for multiple choice
        if (e.key >= '1' && e.key <= '9') {
            // Quiz system handles this
            return;
        }
    }
    
    /**
     * Check if key is a game key
     */
    isGameKey(key) {
        const gameKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'h', 'j', 'k', 'l', 'y', 'u', 'b', 'n',
            '1', '2', '3', '4', '5', '6', '7', '8', '9',
            ',', '.', ' ', '?', '@',
            'i', 'e', 'd', 'w', 't', 'a', 'q', 'r', 'z', 'o', 's', 'x',
            'g', 'c', 'h'
        ];
        
        return gameKeys.includes(key) || gameKeys.includes(key.toLowerCase());
    }
    
    /**
     * Handle mouse click
     */
    handleClick(e) {
        // Could implement click-to-move in future
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to tile coordinates
        // This would need renderer's tile size and camera position
        
        EventBus.emit(EVENTS.UI_CLICK, {
            x: x,
            y: y,
            screenX: e.clientX,
            screenY: e.clientY
        });
    }
    
    /**
     * Handle right click
     */
    handleRightClick(e) {
        e.preventDefault(); // Prevent context menu
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        EventBus.emit(EVENTS.UI_RIGHT_CLICK, {
            x: x,
            y: y,
            screenX: e.clientX,
            screenY: e.clientY
        });
    }
    
    /**
     * Show help screen
     */
    showHelp() {
        const helpText = `
PHILOSOPHER'S QUEST - CONTROLS
==============================

MOVEMENT:
  Arrow Keys or Numpad - Move in 8 directions
  hjkl - Move (vi-keys)
  yubn - Diagonal movement (vi-keys)
  . or Space - Wait one turn
  
ACTIONS:
  , or g - Pick up items
  h - Harvest corpse (Animal quiz)
  c - Cook food (Cooking quiz)
  i - Open inventory
  e - Show equipment
  d - Drop item
  w - Wear/wield item
  t - Take off equipment
  
ITEMS:
  a - Apply/use item
  q - Quaff potion
  r - Read scroll/book
  z - Zap wand
  
DUNGEON:
  o - Open door/container
  C - Close door (Shift+C)
  s - Search for hidden things
  l or x - Look/examine
  
GAME:
  Ctrl+S - Save game
  Ctrl+L - Load game
  @ - Character stats
  ? - This help screen
  Esc - Close menus
  
FOOD SYSTEM:
  1. Kill monsters to get corpses
  2. Harvest corpses (h) - Animal quiz
  3. Cook food (c) - Cooking quiz
  4. Better cooking = better stat gains!
  
SP (Stamina) is your hunger!
Keep it above 0 or you'll starve!
        `;
        
        EventBus.emit(EVENTS.UI_SHOW_HELP, { text: helpText });
        
        // Also log to message log
        EventBus.emit(EVENTS.MESSAGE, {
            text: 'Press ? to see controls',
            type: 'info'
        });
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
    hasModifier() {
        return this.shiftPressed || this.ctrlPressed || this.altPressed;
    }
    
    /**
     * Clear all pressed keys
     */
    clearKeys() {
        this.keysPressed.clear();
        this.shiftPressed = false;
        this.ctrlPressed = false;
        this.altPressed = false;
    }
}