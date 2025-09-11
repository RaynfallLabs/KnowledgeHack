/**
 * game.js - Fixed initialization order
 * MessageLog must be created before Dungeon
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from './event-bus.js';
import { QuestionLoader } from './question-loader.js';
import { itemLoader } from './item-loader.js';
import { monsterLoader } from './monster-loader.js';
import { Player } from '../entities/player.js';
import { Dungeon } from '../world/dungeon.js';
import { DungeonGenerator } from '../world/dungeon-generator.js';
import { QuizEngine } from '../systems/quiz-engine.js';
import { CookingSystem } from '../systems/cooking.js';
import { HarvestingSystem } from '../systems/harvesting.js';
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
        this.dungeonGenerator = null;
        
        // Systems
        this.quizEngine = null;
        this.cookingSystem = null;
        this.harvestingSystem = null;
        
        // UI (initialized early)
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
        try {
            console.log('🎮 Initializing game systems...');
            
            // Initialize UI components FIRST (they're needed by other systems)
            this.initializeUI();
            
            // Load all game data
            await this.loadGameData();
            
            // Create player
            this.player = new Player(this.playerName);
            
            // Initialize game systems
            this.initializeSystems();
            
            // Create dungeon with all dependencies available
            this.dungeon = new Dungeon(this);
            
            // Generate first level
            console.log('🏰 Generating level 1...');
            await this.dungeon.generateLevel(1);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial messages
            this.messageLog.add(`Welcome ${this.playerName}! Your quest for the Philosopher's Stone begins...`, 'success');
            this.messageLog.add('Use arrow keys or HJKL to move. Press ? for help.', 'info');
            
            // Update UI with initial state (safe - just stats for now)
            this.uiManager.updateStats();
            
            console.log('✅ Game initialized successfully!');
            
            // Start game loop
            this.running = true;
            this.gameLoop();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            if (this.messageLog) {
                this.messageLog.add('Failed to initialize game. Please refresh the page.', 'danger');
            }
            throw error;
        }
    }
    
    /**
     * Initialize UI components first
     */
    initializeUI() {
        // Create UI components that other systems depend on
        this.renderer = new Renderer('game-canvas');
        this.messageLog = new MessageLog('message-log');
        this.uiManager = new UIManager(this);
        this.inputHandler = new InputHandler(this);
        
        console.log('✅ UI components initialized');
    }
    
    /**
     * Load all game data
     */
    async loadGameData() {
        console.log('📚 Loading game data...');
        
        // Load questions
        const questionLoader = new QuestionLoader();
        await questionLoader.loadAllQuestions();
        
        // Load items
        await itemLoader.loadAllItems();
        
        // Load monsters
        await monsterLoader.load();
        
        console.log('✅ Game data loaded');
    }
    
    /**
     * Initialize game systems
     */
    initializeSystems() {
        // Core systems
        this.dungeonGenerator = new DungeonGenerator();
        this.quizEngine = new QuizEngine();
        
        // Cooking and harvesting systems
        this.cookingSystem = new CookingSystem(this);
        this.harvestingSystem = new HarvestingSystem(this);
        
        console.log('✅ Game systems initialized');
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.running || this.gameOver) return;
        
        // Process player SP/hunger
        this.processPlayerStatus();
        
        // Update UI
        this.updateUI();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Process player status changes
     */
    processPlayerStatus() {
        // SP decreases over time
        if (this.turnNumber % CONFIG.SP_DECAY_RATE === 0 && this.player) {
            this.player.sp--;
            
            // Check for starvation
            if (this.player.sp <= 0) {
                this.player.sp = 0;
                this.player.hp--;
                this.messageLog.add('You are starving! Find food quickly!', 'danger');
            }
            
            // Check for death
            if (this.player.hp <= 0) {
                this.handleGameOver();
            }
        }
    }
    
    /**
     * Update UI components
     */
    updateUI() {
        if (!this.player || !this.dungeon) return;
        
        // Update renderer
        const renderData = this.dungeon.getRenderData();
        this.renderer.render(renderData);
        
        // Update UI manager
        this.uiManager.update();
    }
    
    /**
     * Handle player movement
     */
    handlePlayerMove(direction) {
        if (this.gameOver || this.paused || !this.player || !this.dungeon) return;
        
        const directionVectors = {
            'north': { dx: 0, dy: -1 },
            'south': { dx: 0, dy: 1 },
            'east': { dx: 1, dy: 0 },
            'west': { dx: -1, dy: 0 },
            'northeast': { dx: 1, dy: -1 },
            'northwest': { dx: -1, dy: -1 },
            'southeast': { dx: 1, dy: 1 },
            'southwest': { dx: -1, dy: 1 }
        };
        
        const vector = directionVectors[direction];
        if (!vector) return;
        
        const newX = this.player.x + vector.dx;
        const newY = this.player.y + vector.dy;
        
        // Check if movement is valid
        if (this.dungeon.isWalkable(newX, newY)) {
            // Move player
            this.player.x = newX;
            this.player.y = newY;
            
            // Use SP for movement
            this.player.sp--;
            
            // Update vision
            this.dungeon.updatePlayerVision(newX, newY);
            
            // Check for items at new position
            const items = this.dungeon.getItemsAt(newX, newY);
            if (items.length > 0) {
                this.messageLog.add(`You see: ${items.map(i => i.name).join(', ')}`, 'info');
            }
            
            // Check for stairs
            if (this.dungeon.hasStairs(newX, newY)) {
                const tile = this.dungeon.getTile(newX, newY);
                if (tile.type === 'stairs_down') {
                    this.messageLog.add('You see stairs leading down. Press > to descend.', 'info');
                } else if (tile.type === 'stairs_up') {
                    this.messageLog.add('You see stairs leading up. Press < to ascend.', 'info');
                }
            }
            
            // Process monster turns
            this.dungeon.processMonsterTurns();
            
            // Increment turn
            this.turnNumber++;
            
            EventBus.emit(EVENTS.PLAYER_MOVED, { x: newX, y: newY });
        } else {
            // Check what's blocking
            const monster = this.dungeon.getMonsterAt(newX, newY);
            if (monster) {
                // TODO: Initiate combat
                this.messageLog.add(`You bump into ${monster.name}!`, 'warning');
            } else {
                this.messageLog.add('You cannot move there.', 'info');
            }
        }
    }
    
    /**
     * Handle picking up items
     */
    handlePickup() {
        if (!this.player || !this.dungeon) return;
        
        const items = this.dungeon.getItemsAt(this.player.x, this.player.y);
        if (items.length === 0) {
            this.messageLog.add('There is nothing here to pick up.', 'info');
            return;
        }
        
        // For now, pick up first item
        const item = items[0];
        
        // Add to inventory (when inventory system exists)
        // For now, just remove from dungeon
        this.dungeon.removeItem(this.player.x, this.player.y, item);
        this.messageLog.add(`You pick up ${item.name}.`, 'success');
        
        EventBus.emit(EVENTS.ITEM_PICKED_UP, { item });
    }
    
    /**
     * Handle using stairs
     */
    handleStairs(direction) {
        if (!this.player || !this.dungeon) return;
        
        const tile = this.dungeon.getTile(this.player.x, this.player.y);
        if (!tile) return;
        
        if (direction === 'down' && tile.type === 'stairs_down') {
            this.currentLevel++;
            this.messageLog.add(`Descending to level ${this.currentLevel}...`, 'info');
            this.dungeon.generateLevel(this.currentLevel);
        } else if (direction === 'up' && tile.type === 'stairs_up') {
            if (this.currentLevel > 1) {
                this.currentLevel--;
                this.messageLog.add(`Ascending to level ${this.currentLevel}...`, 'info');
                this.dungeon.generateLevel(this.currentLevel);
            } else {
                this.messageLog.add('You cannot go up from here.', 'info');
            }
        } else {
            this.messageLog.add('There are no stairs here.', 'info');
        }
    }
    
    /**
     * Handle game over
     */
    handleGameOver() {
        this.gameOver = true;
        this.running = false;
        
        EventBus.emit(EVENTS.GAME_OVER, {
            victory: false,
            turnNumber: this.turnNumber,
            level: this.currentLevel
        });
        
        this.messageLog.add('You have died. Game Over.', 'danger');
        this.messageLog.add(`You survived ${this.turnNumber} turns and reached level ${this.currentLevel}.`, 'info');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Quiz completion
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            this.paused = false;
            
            if (result.success) {
                this.messageLog.add(`Quiz completed! Score: ${result.score}/${result.total}`, 'success');
            } else {
                this.messageLog.add('Quiz failed. Try again!', 'warning');
            }
        });
        
        // Combat events
        EventBus.on(EVENTS.MONSTER_DEATH, (data) => {
            this.messageLog.add(`${data.monster.name} has been defeated!`, 'success');
            
            // Drop corpse
            if (data.monster.corpseType) {
                // TODO: Create corpse item
                this.messageLog.add(`${data.monster.name} leaves a corpse.`, 'info');
            }
        });
        
        // Save/Load
        EventBus.on(EVENTS.SAVE_GAME, () => {
            this.save();
        });
        
        EventBus.on(EVENTS.LOAD_GAME, () => {
            this.load();
        });
    }
    
    /**
     * Save game state
     */
    save() {
        const saveData = {
            playerName: this.playerName,
            turnNumber: this.turnNumber,
            currentLevel: this.currentLevel,
            player: this.player ? {
                x: this.player.x,
                y: this.player.y,
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                sp: this.player.sp,
                maxSp: this.player.maxSp,
                attributes: this.player.attributes
            } : null
        };
        
        localStorage.setItem('philosophers-quest-save', JSON.stringify(saveData));
        this.messageLog.add('Game saved.', 'success');
        return true;
    }
    
    /**
     * Load game state
     */
    load() {
        try {
            const saveData = JSON.parse(localStorage.getItem('philosophers-quest-save'));
            if (!saveData) {
                this.messageLog.add('No save game found.', 'warning');
                return false;
            }
            
            // Restore game state
            this.playerName = saveData.playerName;
            this.turnNumber = saveData.turnNumber;
            this.currentLevel = saveData.currentLevel;
            
            // Restore player
            if (saveData.player && this.player) {
                Object.assign(this.player, saveData.player);
            }
            
            // Regenerate current level
            if (this.dungeon) {
                this.dungeon.generateLevel(this.currentLevel);
            }
            
            this.messageLog.add('Game loaded.', 'success');
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.messageLog.add('Failed to load save game.', 'danger');
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
        
        if (this.inputHandler) {
            this.inputHandler.destroy();
        }
        
        // Clean up event listeners
        EventBus.off(EVENTS.QUIZ_COMPLETE);
        EventBus.off(EVENTS.MONSTER_DEATH);
        EventBus.off(EVENTS.SAVE_GAME);
        EventBus.off(EVENTS.LOAD_GAME);
    }
}