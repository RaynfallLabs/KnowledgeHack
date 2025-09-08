/**
 * game.js - Main game orchestrator (with fixed imports)
 * Coordinates all game systems and manages game state
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from './event-bus.js';
import { QuestionLoader } from './question-loader.js';
import { Player } from '../entities/player.js';
import { DungeonGenerator } from '../world/dungeon-generator.js';
import { QuizEngine } from '../systems/quiz-engine.js';
// TODO: Add these when they exist:
// import { CombatSystem } from '../systems/combat.js';
// import { InventorySystem } from '../systems/inventory.js';
// import { EquipmentSystem } from '../systems/equipment.js';
// import { IdentificationSystem } from '../systems/identification.js';
import { Renderer } from '../ui/renderer.js';
import { MessageLog } from '../ui/message-log.js';
import { UIManager } from '../ui/ui-manager.js';
import { InputHandler } from '../ui/input-handler.js';

export class Game {
    constructor(playerName = 'Scholar') {
        this.playerName = playerName;
        this.running = false;
        this.paused = false;
        this.turnNumber = 0;
        
        // Core components
        this.player = null;
        this.dungeon = null;
        this.monsters = [];
        this.items = [];
        
        // Systems (initialized when available)
        this.quizEngine = null;
        this.combatSystem = null;      // TODO: Initialize when CombatSystem exists
        this.inventorySystem = null;   // TODO: Initialize when InventorySystem exists
        this.equipmentSystem = null;   // TODO: Initialize when EquipmentSystem exists
        this.identificationSystem = null; // TODO: Initialize when IdentificationSystem exists
        
        // UI
        this.renderer = null;
        this.messageLog = null;
        this.uiManager = null;
        this.inputHandler = null;
        
        // Game state
        this.currentLevel = 1;
        this.gameOver = false;
        this.victory = false;
    }
    
    /**
     * Initialize all game systems
     */
    async initialize() {
        console.log('🎮 Initializing game systems...');
        
        // Load questions first
        const questionLoader = new QuestionLoader();
        await questionLoader.loadAllQuestions();
        
        // Create player
        this.player = new Player(this.playerName);
        
        // Initialize available systems
        this.quizEngine = new QuizEngine();
        
        // TODO: Initialize these when they exist:
        // this.combatSystem = new CombatSystem(this);
        // this.inventorySystem = new InventorySystem(this);
        // this.equipmentSystem = new EquipmentSystem(this);
        // this.identificationSystem = new IdentificationSystem(this);
        
        // Initialize UI
        this.renderer = new Renderer('game-canvas');
        this.messageLog = new MessageLog('messages');
        this.uiManager = new UIManager(this);
        this.inputHandler = new InputHandler(this);
        
        // Generate first level
        await this.generateLevel(1);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial messages
        this.messageLog.add(`Welcome ${this.playerName}! Your quest for the Philosopher's Stone begins...`, 'success');
        this.messageLog.add('Use arrow keys or HJKL to move. Press ? for help.', 'info');
        
        // Give starting equipment (when equipment system exists)
        // this.giveStartingEquipment();
        
        console.log('✅ Game initialized successfully!');
        
        // Start render loop
        this.renderer.startRenderLoop();
        
        // Start game loop
        this.running = true;
        this.gameLoop();
    }
    
    /**
     * Start the game (wrapper for compatibility with index.html)
     */
    start() {
        console.log("🎮 Starting Philosopher's Quest...");
        this.running = true;
        // The game loop is already started in initialize()
        // This method exists for compatibility with index.html
    }
    
    /**
     * Generate a level
     */
    async generateLevel(levelNumber) {
        console.log(`🏰 Generating level ${levelNumber}...`);
        
        const generator = new DungeonGenerator();
        this.dungeon = generator.generateLevel(levelNumber);
        
        // Place player at starting position
        const startPos = this.dungeon.getEntrance();
        this.player.x = startPos.x;
        this.player.y = startPos.y;
        
        // Clear monsters and items for new level
        this.monsters = [];
        this.items = [];
        
        // TODO: Populate monsters and items when those systems exist
        
        // Update renderer with new dungeon state
        this.updateRendererState();
        
        console.log(`✅ Level ${levelNumber} generated!`);
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.running || this.gameOver) return;
        
        // Update game state
        this.updateGameState();
        
        // Process turn-based mechanics
        this.processTurn();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update game state
     */
    updateGameState() {
        // Update player
        this.player.update();
        
        // Update monsters (when monster system exists)
        // this.monsters.forEach(monster => monster.update());
        
        // Update renderer
        this.updateRendererState();
    }
    
    /**
     * Process a single turn
     */
    processTurn() {
        // Increment turn counter
        this.turnNumber++;
        
        // Player regeneration
        if (this.turnNumber % CONFIG.TURN_REGEN_RATE === 0) {
            this.player.regenerate();
        }
        
        // TODO: Monster turns when combat system exists
        
        // Check win/lose conditions
        this.checkGameEnd();
    }
    
    /**
     * Update renderer with current game state
     */
    updateRendererState() {
        const gameState = {
            player: this.player,
            dungeon: this.dungeon,
            monsters: this.monsters,
            items: this.items,
            currentLevel: this.currentLevel,
            turnNumber: this.turnNumber
        };
        
        this.renderer.updateGameState(gameState);
    }
    
    /**
     * Handle player movement
     */
    handlePlayerMove(direction) {
        if (this.gameOver || this.paused) return;
        
        const { dx, dy } = this.getDirectionVector(direction);
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // Check if movement is valid
        if (this.canMoveTo(newX, newY)) {
            // Move player
            this.player.move(newX, newY);
            
            // Emit movement event
            EventBus.emit(EVENTS.PLAYER_MOVE, {
                x: newX,
                y: newY,
                direction,
                blocked: false
            });
            
            // Process turn
            this.processTurn();
        } else {
            // Movement blocked
            EventBus.emit(EVENTS.PLAYER_MOVE, {
                x: this.player.x,
                y: this.player.y,
                direction,
                blocked: true
            });
        }
    }
    
    /**
     * Check if player can move to position
     */
    canMoveTo(x, y) {
        // Check bounds
        if (x < 0 || y < 0 || x >= CONFIG.MAP_WIDTH || y >= CONFIG.MAP_HEIGHT) {
            return false;
        }
        
        // Check dungeon walls
        if (this.dungeon) {
            const tile = this.dungeon.getTile(x, y);
            if (tile && tile.type === 'wall') {
                return false;
            }
        }
        
        // TODO: Check for monsters when combat system exists
        
        return true;
    }
    
    /**
     * Get direction vector from direction string
     */
    getDirectionVector(direction) {
        const directions = {
            'north': { dx: 0, dy: -1 },
            'south': { dx: 0, dy: 1 },
            'east': { dx: 1, dy: 0 },
            'west': { dx: -1, dy: 0 },
            'northeast': { dx: 1, dy: -1 },
            'northwest': { dx: -1, dy: -1 },
            'southeast': { dx: 1, dy: 1 },
            'southwest': { dx: -1, dy: 1 }
        };
        
        return directions[direction] || { dx: 0, dy: 0 };
    }
    
    /**
     * Start a quiz
     */
    startQuiz(subject, tier = 1, context = {}) {
        if (this.quizEngine) {
            this.paused = true;
            this.quizEngine.startQuiz(subject, tier, context);
        }
    }
    
    /**
     * Handle quiz completion
     */
    handleQuizComplete(result) {
        this.paused = false;
        
        if (result.success) {
            this.messageLog.add(`Quiz completed! Score: ${result.score}`, 'success');
        } else {
            this.messageLog.add('Quiz failed. Try studying more!', 'warning');
        }
        
        // TODO: Apply quiz results to game actions when systems exist
    }
    
    /**
     * Check for game end conditions
     */
    checkGameEnd() {
        // Check player death
        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.victory = false;
            EventBus.emit(EVENTS.GAME_OVER);
            this.messageLog.add('You have died. Game Over.', 'danger');
            return;
        }
        
        // TODO: Check for victory conditions when item system exists
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player actions
        EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
            this.handlePlayerAction(action);
        });
        
        // Quiz events
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            this.handleQuizComplete(result);
        });
        
        // UI events
        EventBus.on(EVENTS.GAME_PAUSE, () => {
            this.paused = true;
        });
        
        EventBus.on(EVENTS.GAME_RESUME, () => {
            this.paused = false;
        });
    }
    
    /**
     * Handle player actions
     */
    handlePlayerAction(action) {
        switch (action.type) {
            case 'move':
                this.handlePlayerMove(action.direction);
                break;
                
            case 'quiz':
                this.startQuiz(action.subject, action.tier, action.context);
                break;
                
            // TODO: Add more action types when systems exist:
            // case 'pickup':
            // case 'drop':
            // case 'equip':
            // case 'attack':
            
            default:
                console.warn(`Unknown player action: ${action.type}`);
        }
    }
    
    /**
     * Save game state
     */
    save() {
        const saveData = {
            playerName: this.playerName,
            turnNumber: this.turnNumber,
            currentLevel: this.currentLevel,
            player: this.player.serialize(),
            // TODO: Add monsters, items, etc. when those systems exist
        };
        
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(saveData));
        EventBus.emit(EVENTS.SAVE_GAME);
        return true;
    }
    
    /**
     * Load game state
     */
    load() {
        try {
            const saveData = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
            if (!saveData) return false;
            
            this.playerName = saveData.playerName;
            this.turnNumber = saveData.turnNumber;
            this.currentLevel = saveData.currentLevel;
            
            // Restore player
            this.player.deserialize(saveData.player);
            
            // TODO: Restore monsters, items, etc. when those systems exist
            
            EventBus.emit(EVENTS.LOAD_GAME);
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.running = false;
        
        if (this.renderer) {
            this.renderer.destroy();
        }
        
        // TODO: Cleanup other systems when they exist
    }
}