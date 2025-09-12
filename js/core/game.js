/**
 * game.js - Main game orchestrator (FINAL WORKING VERSION)
 * Fixed: Turn-based mechanics, SP drain, removed dynamic imports
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
        this.monsters = [];
        this.items = [];
        
        // Systems (will be initialized if available)
        this.quizEngine = null;
        this.combatSystem = null;
        this.inventorySystem = null;
        this.equipmentSystem = null;
        this.identificationSystem = null;
        this.cookingSystem = null;
        this.harvestingSystem = null;
        
        // UI
        this.renderer = null;
        this.messageLog = null;
        this.uiManager = null;
        this.inputHandler = null;
        
        // Game state
        this.currentLevel = 1;
        this.gameOver = false;
        this.victory = false;
        
        // Turn tracking
        this.playerActed = false;
        this.lastTurnTime = Date.now();
        
        // Define missing CONFIG values if needed
        if (!CONFIG.TURN_REGEN_RATE) CONFIG.TURN_REGEN_RATE = 50;
        if (!CONFIG.SAVE_KEY) CONFIG.SAVE_KEY = 'philosophers_quest_save';
        if (!CONFIG.SP_DRAIN_PER_TURN) CONFIG.SP_DRAIN_PER_TURN = 1;
    }
    
    /**
     * Initialize all game systems
     */
    async initialize() {
        console.log('🎮 Initializing game systems...');
        
        try {
            // Create player
            this.player = new Player(this.playerName);
            console.log('✅ Player created');
            
            // Initialize quiz engine
            this.quizEngine = new QuizEngine();
            console.log('✅ Quiz engine initialized');
            
            // Initialize UI
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
            
            // Give starting equipment
            this.giveStartingEquipment();
            
            console.log('✅ Game initialized successfully!');
            
            // Start ONLY the render loop (not game loop)
            this.running = true;
            this.startRenderLoop();
            
            // Initial render
            this.updateRendererState();
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.messageLog?.add('Failed to initialize game: ' + error.message, 'danger');
        }
    }
    
    /**
     * Generate a level
     */
    async generateLevel(levelNumber) {
        console.log(`🏰 Generating level ${levelNumber}...`);
        
        try {
            const generator = new DungeonGenerator();
            this.dungeon = generator.generateLevel(levelNumber);
            
            // Place player at starting position
            const startPos = this.dungeon.getEntrance();
            if (startPos) {
                this.player.x = startPos.x;
                this.player.y = startPos.y;
            } else {
                // Fallback to center if no entrance
                this.player.x = Math.floor(CONFIG.MAP_WIDTH / 2);
                this.player.y = Math.floor(CONFIG.MAP_HEIGHT / 2);
            }
            
            // Clear monsters and items for new level
            this.monsters = [];
            this.items = [];
            
            // Populate level with monsters and items
            this.populateLevel(levelNumber);
            
            // Update renderer with new dungeon state
            this.updateRendererState();
            
            console.log(`✅ Level ${levelNumber} generated!`);
        } catch (error) {
            console.error(`❌ Failed to generate level ${levelNumber}:`, error);
            // Create a basic fallback dungeon
            this.dungeon = {
                tiles: [],
                getEntrance: () => ({ x: 10, y: 10 }),
                getTile: (x, y) => ({ type: 'floor' })
            };
        }
    }
    
    /**
     * Populate level with monsters and items
     */
    populateLevel(levelNumber) {
        // TODO: Add monster and item spawning based on level
        console.log(`Populating level ${levelNumber}...`);
    }
    
    /**
     * Give starting equipment to player
     */
    giveStartingEquipment() {
        // TODO: Give player starting items when inventory system exists
        console.log('Giving starting equipment...');
    }
    
    /**
     * Render loop - ONLY handles visual updates, no game mechanics
     */
    startRenderLoop() {
        const renderFrame = () => {
            if (!this.running) return;
            
            // Only update visual state
            this.updateRendererState();
            
            // Update UI elements
            if (this.uiManager) {
                this.uiManager.update();
            }
            
            // Continue render loop
            requestAnimationFrame(renderFrame);
        };
        
        renderFrame();
    }
    
    /**
     * Process a single game turn - ONLY called when player acts
     */
    processTurn() {
        if (this.gameOver) return;
        
        // Increment turn counter
        this.turnNumber++;
        
        // Drain SP for the turn (hunger system)
        this.player.sp -= CONFIG.SP_DRAIN_PER_TURN;
        
        // Check for starvation
        if (this.player.sp <= 0) {
            this.player.sp = 0;
            // When starving, actions cost HP instead
            this.player.hp -= 1;
            
            // Only show starvation message every 5 turns to avoid spam
            if (this.turnNumber % 5 === 0) {
                this.messageLog.add('You are starving! Find food quickly!', 'danger');
            }
        }
        
        // Player regeneration (if not starving)
        if (this.player.sp > 0 && this.turnNumber % CONFIG.TURN_REGEN_RATE === 0) {
            this.player.regenerate();
        }
        
        // Update player status (cooldowns, effects, etc.)
        if (this.player.update) {
            this.player.update();
        }
        
        // Process monster turns
        this.processMonsterTurns();
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Emit turn event
        EventBus.emit(EVENTS.TURN_END, { turnNumber: this.turnNumber });
    }
    
    /**
     * Process monster turns
     */
    processMonsterTurns() {
        // TODO: Process monster AI when combat system exists
        this.monsters.forEach(monster => {
            if (monster.update) {
                monster.update(this);
            }
        });
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
        
        if (this.renderer) {
            this.renderer.updateGameState(gameState);
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
        
        // Check if movement is valid
        if (this.canMoveTo(newX, newY)) {
            // Check for monster at position
            const monster = this.getMonsterAt(newX, newY);
            if (monster) {
                // Attack monster instead of moving
                this.handleAttack(monster);
            } else {
                // Move player
                this.player.x = newX;
                this.player.y = newY;
                
                // Check for items at new position
                this.checkForItems(newX, newY);
                
                // Emit movement event
                EventBus.emit(EVENTS.PLAYER_MOVE, {
                    x: newX,
                    y: newY,
                    direction,
                    blocked: false
                });
            }
            
            // IMPORTANT: Process turn after movement
            this.processTurn();
        } else {
            // Movement blocked
            this.messageLog.add('You bump into a wall!', 'warning');
            EventBus.emit(EVENTS.PLAYER_MOVE, {
                x: this.player.x,
                y: this.player.y,
                direction,
                blocked: true
            });
        }
    }
    
    /**
     * Handle wait action
     */
    handleWait() {
        if (this.gameOver || this.paused) return;
        
        // Waiting is a valid action that takes a turn
        this.messageLog.add('You wait...', 'info');
        this.processTurn();
    }
    
    /**
     * Handle attack on monster
     */
    handleAttack(monster) {
        // Basic attack without combat system
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
        const itemsHere = this.items.filter(item => item.x === x && item.y === y);
        if (itemsHere.length > 0) {
            if (itemsHere.length === 1) {
                this.messageLog.add(`You see ${itemsHere[0].name} here.`, 'info');
            } else {
                this.messageLog.add(`You see ${itemsHere.length} items here.`, 'info');
            }
        }
    }
    
    /**
     * Get monster at position
     */
    getMonsterAt(x, y) {
        return this.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
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
        
        // Don't block movement for monsters (handle as attack instead)
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
            
            // Apply quiz results based on context
            if (context) {
                switch (context.action) {
                    case 'attack':
                        // Apply damage based on quiz score
                        if (context.target) {
                            const damage = result.score * 2; // Base damage calculation
                            context.target.hp -= damage;
                            this.messageLog.add(`You deal ${damage} damage!`, 'combat');
                            
                            // Check if monster died
                            if (context.target.hp <= 0) {
                                this.handleMonsterDeath(context.target);
                            }
                        }
                        break;
                        
                    case 'identify':
                        // Identify item
                        if (context.item) {
                            context.item.identified = true;
                            this.messageLog.add(`Identified: ${context.item.trueName}!`, 'success');
                        }
                        break;
                        
                    case 'cook':
                        // Cook food
                        if (context.recipe) {
                            this.messageLog.add(`Cooked: ${context.recipe.name}!`, 'success');
                        }
                        break;
                        
                    // Add more quiz result handlers as needed
                }
            }
        } else {
            this.messageLog.add('Quiz failed. Try studying more!', 'warning');
        }
    }
    
    /**
     * Handle monster death
     */
    handleMonsterDeath(monster) {
        this.messageLog.add(`You have defeated the ${monster.name}!`, 'success');
        
        // Remove monster from list
        const index = this.monsters.indexOf(monster);
        if (index > -1) {
            this.monsters.splice(index, 1);
        }
        
        // Drop corpse/loot
        if (monster.corpseType) {
            // TODO: Create corpse item at monster position
        }
        
        EventBus.emit(EVENTS.MONSTER_KILLED, { monster });
    }
    
    /**
     * Handle pickup action
     */
    handlePickup() {
        if (this.gameOver || this.paused) return;
        
        const itemsHere = this.items.filter(item => 
            item.x === this.player.x && item.y === this.player.y
        );
        
        if (itemsHere.length === 0) {
            this.messageLog.add('Nothing to pick up here.', 'info');
            return;
        }
        
        // Pick up items (basic version without inventory system)
        itemsHere.forEach(item => {
            // Add to player inventory
            if (!this.player.inventory) {
                this.player.inventory = [];
            }
            this.player.inventory.push(item);
            
            // Remove from ground
            const index = this.items.indexOf(item);
            if (index > -1) {
                this.items.splice(index, 1);
            }
            this.messageLog.add(`Picked up ${item.name}.`, 'success');
        });
        
        // Picking up takes a turn
        this.processTurn();
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
            this.messageLog.add(`You survived ${this.turnNumber} turns and reached level ${this.currentLevel}.`, 'info');
            return;
        }
        
        // Check for victory (Philosopher's Stone)
        const hasStone = this.player.inventory?.some(item => 
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
            // Quiz completion is handled through callbacks now
            this.paused = false;
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
                
            case 'drop':
                // TODO: Implement drop
                this.processTurn();
                break;
                
            case 'equip':
                // TODO: Implement equip
                this.processTurn();
                break;
                
            case 'unequip':
                // TODO: Implement unequip
                this.processTurn();
                break;
                
            case 'cook':
                // TODO: Implement cooking
                break;
                
            case 'harvest':
                // TODO: Implement harvesting
                break;
                
            case 'quiz':
                this.startQuiz(action.subject, action.tier, action.context);
                break;
                
            default:
                console.warn(`Unknown player action: ${action.type}`);
        }
    }
    
    /**
     * Save game state
     */
    save() {
        const saveData = {
            version: '1.0.0',
            playerName: this.playerName,
            turnNumber: this.turnNumber,
            currentLevel: this.currentLevel,
            player: this.player.serialize ? this.player.serialize() : null,
            monsters: this.monsters.map(m => m.serialize ? m.serialize() : null).filter(m => m),
            items: this.items.map(i => i.serialize ? i.serialize() : null).filter(i => i),
            timestamp: Date.now()
        };
        
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(saveData));
        EventBus.emit(EVENTS.SAVE_GAME);
        this.messageLog.add('Game saved!', 'success');
        return true;
    }
    
    /**
     * Load game state
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
            this.currentLevel = saveData.currentLevel;
            
            // Restore player
            if (this.player.deserialize) {
                this.player.deserialize(saveData.player);
            }
            
            // Restore monsters
            if (saveData.monsters) {
                // TODO: Deserialize monsters when system exists
            }
            
            // Restore items
            if (saveData.items) {
                // TODO: Deserialize items when system exists
            }
            
            // Regenerate current level
            this.generateLevel(this.currentLevel);
            
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
        
        // Remove event listeners
        EventBus.removeAllListeners();
    }
}