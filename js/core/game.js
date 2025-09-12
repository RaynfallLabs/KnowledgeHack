/**
 * game.js - Main game orchestrator (NetHack-inspired architecture)
 * Turn-based, no animation loops, direct state management
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from './event-bus.js';
import { QuestionLoader } from './question-loader.js';
import { Player } from '../entities/player.js';
import { DungeonGenerator } from '../world/dungeon-generator.js';
import { QuizEngine } from '../systems/quiz-engine.js';
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
        
        // Current level data (NetHack style - everything is in the level)
        this.level = {
            depth: 1,
            width: CONFIG.MAP_WIDTH,
            height: CONFIG.MAP_HEIGHT,
            tiles: null,      // 2D array of tiles
            monsters: [],     // Active monsters on this level
            items: [],        // Items on the ground
            rooms: [],        // Room definitions
            corridors: [],    // Corridor segments
            stairs: {},       // Stair locations
            entrance: null,   // Where player starts
            exit: null        // Where to go down
        };
        
        // Systems
        this.quizEngine = null;
        this.renderer = null;
        this.messageLog = null;
        this.uiManager = null;
        this.inputHandler = null;
        
        // Game state
        this.gameOver = false;
        this.victory = false;
        
        // Missing CONFIG defaults
        CONFIG.TURN_REGEN_RATE = CONFIG.TURN_REGEN_RATE || 50;
        CONFIG.SAVE_KEY = CONFIG.SAVE_KEY || 'philosophers_quest_save';
        CONFIG.SP_DRAIN_PER_TURN = CONFIG.SP_DRAIN_PER_TURN || 1;
    }
    
    /**
     * Initialize all game systems
     */
    async initialize() {
        console.log('🎮 Initializing game systems...');
        
        try {
            // Create player first
            this.player = new Player(this.playerName);
            console.log('✅ Player created');
            
            // Initialize systems
            this.quizEngine = new QuizEngine();
            console.log('✅ Quiz engine initialized');
            
            // Initialize UI components
            this.renderer = new Renderer('game-canvas');
            this.messageLog = new MessageLog('message-log');
            this.uiManager = new UIManager(this);
            this.inputHandler = new InputHandler(this);
            console.log('✅ UI initialized');
            
            // Generate first level
            await this.generateLevel(1);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial messages
            this.messageLog.add(`Welcome ${this.playerName}! Your quest for the Philosopher's Stone begins...`, 'success');
            this.messageLog.add('Use arrow keys or HJKL to move. Press ? for help.', 'info');
            
            console.log('✅ Game initialized successfully!');
            
            // Mark as running
            this.running = true;
            
            // Initial display update
            this.updateDisplay();
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            if (this.messageLog) {
                this.messageLog.add('Failed to initialize game: ' + error.message, 'danger');
            }
        }
    }
    
    /**
     * Generate a dungeon level (NetHack style)
     */
    async generateLevel(depth) {
        console.log(`🏰 Generating level ${depth}...`);
        
        try {
            const generator = new DungeonGenerator();
            
            // Generate returns a wrapped dungeon with all data
            const generatedDungeon = await generator.generate(depth, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
            
            // Store the full dungeon object (it has getTile methods we need)
            this.dungeon = generatedDungeon;
            
            // Extract level data for our use
            this.level.depth = depth;
            this.level.monsters = generatedDungeon.monsters || [];
            this.level.items = generatedDungeon.items || [];
            this.level.rooms = generatedDungeon.rooms || [];
            this.level.corridors = generatedDungeon.corridors || [];
            this.level.stairs = generatedDungeon.stairs || {};
            this.level.entrance = generatedDungeon.entrance || generatedDungeon.getEntrance();
            this.level.exit = generatedDungeon.exit;
            
            // Place player at entrance
            if (this.level.entrance) {
                this.player.x = this.level.entrance.x;
                this.player.y = this.level.entrance.y;
            } else {
                // Fallback position
                this.player.x = Math.floor(CONFIG.MAP_WIDTH / 2);
                this.player.y = Math.floor(CONFIG.MAP_HEIGHT / 2);
            }
            
            console.log(`✅ Level ${depth} generated with ${this.level.monsters.length} monsters and ${this.level.items.length} items`);
            
        } catch (error) {
            console.error(`❌ Failed to generate level ${depth}:`, error);
            
            // Create emergency fallback dungeon
            this.createFallbackDungeon();
        }
    }
    
    /**
     * Create a basic fallback dungeon if generation fails
     */
    createFallbackDungeon() {
        console.warn('Creating fallback dungeon...');
        
        // Create a simple room
        const tiles = [];
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            tiles[y] = [];
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                // Border walls
                if (x === 0 || x === CONFIG.MAP_WIDTH - 1 || 
                    y === 0 || y === CONFIG.MAP_HEIGHT - 1) {
                    tiles[y][x] = { type: 'wall', blocked: true };
                } else {
                    tiles[y][x] = { type: 'floor', blocked: false };
                }
            }
        }
        
        this.dungeon = {
            tiles: tiles,
            getTile: function(x, y) {
                if (y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[0].length) {
                    return this.tiles[y][x];
                }
                return null;
            },
            getEntrance: () => ({ x: 5, y: 5 }),
            monsters: [],
            items: []
        };
        
        this.level.monsters = [];
        this.level.items = [];
        this.level.entrance = { x: 5, y: 5 };
        
        this.player.x = 5;
        this.player.y = 5;
    }
    
    /**
     * Process a single game turn (NetHack style - only when player acts)
     */
    processTurn() {
        if (this.gameOver) return;
        
        // Increment turn counter
        this.turnNumber++;
        
        // Drain SP (hunger system)
        this.player.sp -= CONFIG.SP_DRAIN_PER_TURN;
        
        // Handle starvation
        if (this.player.sp <= 0) {
            this.player.sp = 0;
            this.player.hp -= 1;
            
            if (this.turnNumber % 5 === 0) {
                this.messageLog.add('You are starving! Find food quickly!', 'danger');
            }
        }
        
        // Regeneration
        if (this.player.sp > 0 && this.turnNumber % CONFIG.TURN_REGEN_RATE === 0) {
            this.player.regenerate();
        }
        
        // Update player (effects, cooldowns)
        if (this.player.update) {
            this.player.update();
        }
        
        // Process monster turns
        this.processMonsterTurns();
        
        // Check game end
        this.checkGameEnd();
        
        // Update display after turn
        this.updateDisplay();
        
        // Emit turn event
        EventBus.emit(EVENTS.TURN_END, { turnNumber: this.turnNumber });
    }
    
    /**
     * Process monster AI turns
     */
    processMonsterTurns() {
        for (const monster of this.level.monsters) {
            if (monster.hp <= 0) continue;
            
            // Basic monster AI - move toward player if close
            const dx = Math.sign(this.player.x - monster.x);
            const dy = Math.sign(this.player.y - monster.y);
            const dist = Math.abs(this.player.x - monster.x) + Math.abs(this.player.y - monster.y);
            
            if (dist <= 5 && dist > 1) {
                // Try to move toward player
                const newX = monster.x + dx;
                const newY = monster.y + dy;
                
                if (this.canMonsterMoveTo(newX, newY)) {
                    monster.x = newX;
                    monster.y = newY;
                }
            }
        }
    }
    
    /**
     * Check if monster can move to position
     */
    canMonsterMoveTo(x, y) {
        // Check bounds
        if (x < 0 || y < 0 || x >= CONFIG.MAP_WIDTH || y >= CONFIG.MAP_HEIGHT) {
            return false;
        }
        
        // Check walls
        const tile = this.dungeon.getTile ? this.dungeon.getTile(x, y) : null;
        if (!tile || tile.type === 'wall') {
            return false;
        }
        
        // Check for other monsters
        for (const m of this.level.monsters) {
            if (m.hp > 0 && m.x === x && m.y === y) {
                return false;
            }
        }
        
        // Check for player
        if (this.player.x === x && this.player.y === y) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Update all displays (NetHack style - called after actions)
     */
    updateDisplay() {
        // Update renderer with current state
        const gameState = {
            player: this.player,
            dungeon: this.dungeon,
            monsters: this.level.monsters,
            items: this.level.items,
            currentLevel: this.level.depth,
            turnNumber: this.turnNumber
        };
        
        if (this.renderer) {
            this.renderer.updateGameState(gameState);
        }
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.update();
        }
    }
    
    /**
     * Handle player movement
     */
    handlePlayerMove(direction) {
        if (this.gameOver || this.paused) return;
        
        const { dx, dy } = this.getDirectionVector(direction);
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // Check what's at the target position
        const tile = this.dungeon.getTile ? this.dungeon.getTile(newX, newY) : null;
        
        if (!tile || tile.type === 'wall') {
            this.messageLog.add('You bump into a wall!', 'warning');
            return;
        }
        
        // Check for monsters
        const monster = this.getMonsterAt(newX, newY);
        if (monster) {
            this.handleAttack(monster);
            this.processTurn();
            return;
        }
        
        // Move player
        this.player.x = newX;
        this.player.y = newY;
        
        // Check for items
        this.checkForItems(newX, newY);
        
        // Check for stairs
        if (tile.type === 'stairs_down' && this.level.depth < 100) {
            this.messageLog.add('You see stairs leading down. Press > to descend.', 'info');
        } else if (tile.type === 'stairs_up' && this.level.depth > 1) {
            this.messageLog.add('You see stairs leading up. Press < to ascend.', 'info');
        }
        
        // Process turn after movement
        this.processTurn();
    }
    
    /**
     * Handle wait action
     */
    handleWait() {
        if (this.gameOver || this.paused) return;
        this.messageLog.add('You wait...', 'info');
        this.processTurn();
    }
    
    /**
     * Handle attack on monster
     */
    handleAttack(monster) {
        this.messageLog.add(`You attack the ${monster.name}!`, 'combat');
        
        // Start math quiz for damage
        this.startQuiz('math', monster.tier || 1, {
            action: 'attack',
            target: monster
        });
    }
    
    /**
     * Check for items at position
     */
    checkForItems(x, y) {
        const itemsHere = this.level.items.filter(item => item.x === x && item.y === y);
        if (itemsHere.length > 0) {
            if (itemsHere.length === 1) {
                this.messageLog.add(`You see ${itemsHere[0].name || itemsHere[0].type} here.`, 'info');
            } else {
                this.messageLog.add(`You see ${itemsHere.length} items here.`, 'info');
            }
        }
    }
    
    /**
     * Get monster at position
     */
    getMonsterAt(x, y) {
        return this.level.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
    }
    
    /**
     * Get direction vector
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
     * Handle pickup action
     */
    handlePickup() {
        if (this.gameOver || this.paused) return;
        
        const itemsHere = this.level.items.filter(item => 
            item.x === this.player.x && item.y === this.player.y
        );
        
        if (itemsHere.length === 0) {
            this.messageLog.add('Nothing to pick up here.', 'info');
            return;
        }
        
        // Pick up items
        itemsHere.forEach(item => {
            if (!this.player.inventory) {
                this.player.inventory = [];
            }
            
            this.player.inventory.push(item);
            
            // Remove from ground
            const index = this.level.items.indexOf(item);
            if (index > -1) {
                this.level.items.splice(index, 1);
            }
            
            this.messageLog.add(`Picked up ${item.name || item.type}.`, 'success');
        });
        
        this.processTurn();
    }
    
    /**
     * Handle stairs
     */
    handleStairs(direction) {
        if (this.gameOver || this.paused) return;
        
        const tile = this.dungeon.getTile ? 
            this.dungeon.getTile(this.player.x, this.player.y) : null;
        
        if (!tile) return;
        
        if (direction === 'down' && tile.type === 'stairs_down') {
            this.messageLog.add('You descend deeper into the dungeon...', 'info');
            this.generateLevel(this.level.depth + 1);
            this.processTurn();
        } else if (direction === 'up' && tile.type === 'stairs_up') {
            if (this.level.depth > 1) {
                this.messageLog.add('You ascend to the previous level...', 'info');
                this.generateLevel(this.level.depth - 1);
                this.processTurn();
            }
        } else {
            this.messageLog.add('There are no stairs here.', 'warning');
        }
    }
    
    /**
     * Start a quiz
     */
    startQuiz(subject, tier = 1, context = {}) {
        if (this.quizEngine) {
            this.paused = true;
            this.quizEngine.startQuiz({
                mode: 'threshold',
                subject: subject,
                startingTier: tier,
                threshold: 1,
                callback: (result) => this.handleQuizComplete(result, context),
                reason: context.reason || 'combat'
            });
        }
    }
    
    /**
     * Handle quiz completion
     */
    handleQuizComplete(result, context) {
        this.paused = false;
        
        if (result.success) {
            this.messageLog.add(`Quiz completed! Score: ${result.score}`, 'success');
            
            if (context && context.action === 'attack' && context.target) {
                const damage = result.score * 2;
                context.target.hp -= damage;
                this.messageLog.add(`You deal ${damage} damage!`, 'combat');
                
                if (context.target.hp <= 0) {
                    this.handleMonsterDeath(context.target);
                }
            }
        } else {
            this.messageLog.add('Quiz failed. Try studying more!', 'warning');
        }
        
        this.updateDisplay();
    }
    
    /**
     * Handle monster death
     */
    handleMonsterDeath(monster) {
        this.messageLog.add(`You have defeated the ${monster.name}!`, 'success');
        
        // Remove from monsters array
        const index = this.level.monsters.indexOf(monster);
        if (index > -1) {
            this.level.monsters.splice(index, 1);
        }
        
        // Drop corpse
        if (monster.corpseType) {
            this.level.items.push({
                x: monster.x,
                y: monster.y,
                type: 'corpse',
                name: `${monster.name} corpse`,
                corpseType: monster.corpseType
            });
        }
        
        EventBus.emit(EVENTS.MONSTER_KILLED, { monster });
    }
    
    /**
     * Check game end conditions
     */
    checkGameEnd() {
        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.victory = false;
            EventBus.emit(EVENTS.GAME_OVER);
            this.messageLog.add('You have died. Game Over.', 'danger');
            this.messageLog.add(`You survived ${this.turnNumber} turns and reached level ${this.level.depth}.`, 'info');
            return;
        }
        
        // Check for Philosopher's Stone
        if (this.player.inventory) {
            const hasStone = this.player.inventory.some(item => 
                item.name === "Philosopher's Stone"
            );
            
            if (hasStone) {
                this.gameOver = true;
                this.victory = true;
                EventBus.emit(EVENTS.VICTORY || EVENTS.GAME_WIN);
                this.messageLog.add('🎉 Victory! You have found the Philosopher\'s Stone!', 'success');
                this.messageLog.add(`You completed the quest in ${this.turnNumber} turns!`, 'success');
            }
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
            this.handlePlayerAction(action);
        });
        
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            this.paused = false;
        });
        
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
        if (this.gameOver || this.paused) return;
        
        switch (action.type) {
            case 'move':
                this.handlePlayerMove(action.direction);
                break;
            case 'wait':
                this.handleWait();
                break;
            case 'pickup':
                this.handlePickup();
                break;
            case 'stairs':
                this.handleStairs(action.direction);
                break;
            case 'quiz':
                this.startQuiz(action.subject, action.tier, action.context);
                break;
            default:
                console.warn(`Unknown player action: ${action.type}`);
        }
    }
    
    /**
     * Save game
     */
    save() {
        const saveData = {
            version: '1.0.0',
            playerName: this.playerName,
            turnNumber: this.turnNumber,
            level: this.level.depth,
            player: this.player.serialize ? this.player.serialize() : null,
            timestamp: Date.now()
        };
        
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(saveData));
        EventBus.emit(EVENTS.SAVE_GAME);
        this.messageLog.add('Game saved!', 'success');
        return true;
    }
    
    /**
     * Load game
     */
    load() {
        try {
            const saveData = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
            if (!saveData) {
                this.messageLog.add('No save game found.', 'warning');
                return false;
            }
            
            this.playerName = saveData.playerName;
            this.turnNumber = saveData.turnNumber;
            
            if (this.player.deserialize) {
                this.player.deserialize(saveData.player);
            }
            
            this.generateLevel(saveData.level || 1);
            
            EventBus.emit(EVENTS.LOAD_GAME);
            this.messageLog.add('Game loaded!', 'success');
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
        
        EventBus.removeAllListeners();
    }
}