/**
 * game.js - Main game orchestrator
 * Coordinates all game systems and manages game state
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuestionLoader } from '../core/question-loader.js';
import { ItemLoader } from '../core/item-loader.js';
import { monsterLoader } from '../core/monster-loader.js';
import { Player } from '../entities/player.js';
import { Monster } from '../entities/monster.js';
import { DungeonGenerator } from '../world/dungeon-generator.js';
import { Dungeon } from '../world/dungeon.js';
import { QuizEngine } from '../systems/quiz-engine.js';
import { CombatSystem } from '../systems/combat.js';
import { InventorySystem } from '../systems/inventory.js';
import { EquipmentSystem } from '../systems/equipment.js';
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
        this.currentLevel = 1;
        
        // Data loaders
        this.questionLoader = new QuestionLoader();
        this.itemLoader = new ItemLoader();
        this.monsterLoader = monsterLoader; // Use the singleton instance
        
        // Game systems
        this.quizEngine = null;
        this.combatSystem = null;
        this.inventorySystem = null;
        this.equipmentSystem = null;
        this.cookingSystem = null;
        this.harvestingSystem = null;
        
        // UI components
        this.renderer = null;
        this.messageLog = null;
        this.uiManager = null;
        this.inputHandler = null;
        
        // Game state
        this.gameOver = false;
        this.victory = false;
    }
    
    /**
     * Initialize all game systems
     */
    async initialize() {
        try {
            console.log('🎮 Initializing game systems...');
            
            // Load all game data first
            await this.loadGameData();
            
            // Create player with 6-stat system
            this.player = new Player(this.playerName);
            
            // Initialize dungeon systems
            this.dungeonGenerator = new DungeonGenerator();
            this.dungeon = new Dungeon(this);
            
            // Initialize game systems
            this.quizEngine = new QuizEngine();
            
            // Initialize systems that exist
            try {
                this.combatSystem = new CombatSystem(this);
            } catch (e) {
                console.log('Combat system not ready:', e.message);
            }
            
            try {
                this.inventorySystem = new InventorySystem(this);
            } catch (e) {
                console.log('Inventory system not ready:', e.message);
            }
            
            try {
                this.equipmentSystem = new EquipmentSystem(this);
            } catch (e) {
                console.log('Equipment system not ready:', e.message);
            }
            
            try {
                this.cookingSystem = new CookingSystem(this);
            } catch (e) {
                console.log('Cooking system not ready:', e.message);
            }
            
            try {
                this.harvestingSystem = new HarvestingSystem(this);
            } catch (e) {
                console.log('Harvesting system not ready:', e.message);
            }
            
            // Initialize UI components
            this.initializeUI();
            
            // Generate first level
            await this.generateLevel(1);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start the game
            this.start();
            
            console.log('✅ Game initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.messageLog?.add('Failed to initialize game. Please refresh.', 'danger');
        }
    }
    
    /**
     * Load all game data
     */
    async loadGameData() {
        console.log('📚 Loading game data...');
        
        // Load questions
        await this.questionLoader.loadAllQuestions();
        
        // Load items
        await this.itemLoader.loadAllItems();
        
        // Load monsters - use the correct method name
        await this.monsterLoader.load(); // Changed from loadMonsters() to load()
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        this.renderer = new Renderer('game-canvas');
        this.messageLog = new MessageLog('messages');
        this.uiManager = new UIManager(this);
        this.inputHandler = new InputHandler(this);
        
        // Initial messages
        this.messageLog.add(`Welcome ${this.playerName}! Your quest for the Philosopher's Stone begins...`, 'success');
        this.messageLog.add('Use arrow keys or HJKL to move. Press ? for help.', 'info');
        this.messageLog.add('Knowledge is power - every action requires answering questions!', 'warning');
    }
    
    /**
     * Generate a dungeon level
     */
    async generateLevel(levelNumber) {
        console.log(`🏰 Generating level ${levelNumber}...`);
        
        this.currentLevel = levelNumber;
        await this.dungeon.generateLevel(levelNumber);
        
        // Update UI
        this.uiManager?.updateLevel(levelNumber);
        
        console.log(`✅ Level ${levelNumber} generated!`);
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.running = true;
        this.gameLoop();
        
        // Start renderer
        if (this.renderer) {
            this.renderer.startRenderLoop();
        }
        
        EventBus.emit(EVENTS.GAME_START);
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.running || this.gameOver) return;
        
        // Update game state
        this.update();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update game state
     */
    update() {
        // Update player
        this.player?.update();
        
        // Update dungeon (monsters, effects, etc.)
        this.dungeon?.update();
        
        // Update renderer with current state
        this.updateRenderer();
    }
    
    /**
     * Process a game turn
     */
    processTurn() {
        this.turnNumber++;
        
        // Process player effects
        this.player?.processEffects();
        
        // Process monster turns
        this.dungeon?.processMonsterTurns();
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Emit turn end event
        EventBus.emit(EVENTS.TURN_END, { turn: this.turnNumber });
    }
    
    /**
     * Update renderer with current game state
     */
    updateRenderer() {
        if (!this.renderer || !this.dungeon) return;
        
        const renderData = this.dungeon.getRenderData();
        this.renderer.updateGameState({
            player: this.player,
            dungeon: renderData,
            currentLevel: this.currentLevel,
            turnNumber: this.turnNumber
        });
    }
    
    /**
     * Handle player movement
     */
    handlePlayerMove(direction) {
        if (this.gameOver || this.paused) return;
        
        const movements = {
            'north': { dx: 0, dy: -1 },
            'south': { dx: 0, dy: 1 },
            'east': { dx: 1, dy: 0 },
            'west': { dx: -1, dy: 0 },
            'northeast': { dx: 1, dy: -1 },
            'northwest': { dx: -1, dy: -1 },
            'southeast': { dx: 1, dy: 1 },
            'southwest': { dx: -1, dy: 1 }
        };
        
        const move = movements[direction];
        if (!move) return;
        
        const newX = this.player.x + move.dx;
        const newY = this.player.y + move.dy;
        
        // Check if movement is valid
        if (!this.dungeon.isWalkable(newX, newY)) {
            // Check if there's a monster to attack
            const monster = this.dungeon.getMonsterAt(newX, newY);
            if (monster && this.combatSystem) {
                EventBus.emit(EVENTS.PLAYER_ATTACK, {
                    targetX: newX,
                    targetY: newY,
                    direction: direction
                });
            } else {
                this.messageLog.add("You can't go that way.", 'info');
            }
            return;
        }
        
        // Move player
        this.player.move(newX, newY);
        
        // Consume SP for movement
        this.player.consumeSP(1);
        
        // Update vision
        this.dungeon.updatePlayerVision(newX, newY);
        
        // Check for items at new position
        const items = this.dungeon.getItemsAt(newX, newY);
        if (items.length > 0) {
            this.messageLog.add(`You see here: ${items.map(i => i.name).join(', ')}`, 'info');
        }
        
        // Process turn
        this.processTurn();
        
        EventBus.emit(EVENTS.PLAYER_MOVED, { x: newX, y: newY });
    }
    
    /**
     * Check game end conditions
     */
    checkGameEnd() {
        // Check player death
        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.victory = false;
            this.messageLog.add('You have died. Game Over.', 'danger');
            EventBus.emit(EVENTS.GAME_OVER);
        }
        
        // Check victory (has Philosopher's Stone and on level 1)
        if (this.currentLevel === 1 && this.playerHasPhilosophersStone()) {
            this.gameOver = true;
            this.victory = true;
            this.messageLog.add('Victory! You have retrieved the Philosopher\'s Stone!', 'success');
            EventBus.emit(EVENTS.GAME_OVER);
        }
    }
    
    /**
     * Check if player has the Philosopher's Stone
     */
    playerHasPhilosophersStone() {
        // TODO: Check inventory for Philosopher's Stone
        return false;
    }
    
    /**
     * Handle monster death
     */
    handleMonsterDeath(monster) {
        // Drop corpse for food system
        const corpseId = `${monster.id}_corpse`;
        const corpse = this.itemLoader.getItem('corpses', corpseId);
        
        if (corpse) {
            this.dungeon.addItem(monster.x, monster.y, {
                ...corpse,
                x: monster.x,
                y: monster.y
            });
            this.messageLog.add(`The ${monster.name} leaves a corpse.`, 'info');
        }
        
        // Remove monster from dungeon
        this.dungeon.removeMonster(monster);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player actions
        EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
            switch (action.type) {
                case 'move':
                    this.handlePlayerMove(action.direction);
                    break;
                case 'pickup':
                    this.handlePickup();
                    break;
                case 'drop':
                    this.handleDrop();
                    break;
                case 'inventory':
                    this.openInventory();
                    break;
                case 'harvest':
                    this.handleHarvest();
                    break;
                case 'cook':
                    this.handleCook();
                    break;
            }
        });
        
        // Combat events
        EventBus.on(EVENTS.MONSTER_DEATH, (data) => {
            this.handleMonsterDeath(data.monster);
        });
        
        // Quiz events
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            this.paused = false;
        });
        
        EventBus.on(EVENTS.QUIZ_START, () => {
            this.paused = true;
        });
    }
    
    /**
     * Handle pickup action
     */
    handlePickup() {
        const items = this.dungeon.getItemsAt(this.player.x, this.player.y);
        if (items.length === 0) {
            this.messageLog.add("There's nothing here to pick up.", 'info');
            return;
        }
        
        // For now, pick up first item
        const item = items[0];
        if (this.inventorySystem) {
            this.inventorySystem.addItem(item);
            this.dungeon.removeItem(this.player.x, this.player.y, item);
            this.messageLog.add(`Picked up ${item.name}.`, 'success');
        }
    }
    
    /**
     * Handle drop action
     */
    handleDrop() {
        if (this.inventorySystem) {
            this.inventorySystem.openDropMenu();
        }
    }
    
    /**
     * Open inventory
     */
    openInventory() {
        if (this.inventorySystem) {
            this.inventorySystem.openInventory();
        }
    }
    
    /**
     * Handle harvest action
     */
    handleHarvest() {
        if (this.harvestingSystem) {
            this.harvestingSystem.startHarvest();
        }
    }
    
    /**
     * Handle cook action
     */
    handleCook() {
        if (this.cookingSystem) {
            this.cookingSystem.startCooking();
        }
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.paused = true;
        EventBus.emit(EVENTS.GAME_PAUSE);
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.paused = false;
        EventBus.emit(EVENTS.GAME_RESUME);
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
            player: this.player.serialize(),
            dungeon: this.dungeon.save()
        };
        
        localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(saveData));
        this.messageLog.add('Game saved.', 'success');
        EventBus.emit(EVENTS.SAVE_GAME);
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
            this.player.deserialize(saveData.player);
            this.dungeon.load(saveData.dungeon);
            
            this.messageLog.add('Game loaded.', 'success');
            EventBus.emit(EVENTS.LOAD_GAME);
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.messageLog.add('Failed to load save game.', 'danger');
            return false;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.running = false;
        
        // Clean up systems
        this.renderer?.destroy();
        this.combatSystem?.destroy();
        this.dungeon?.destroy();
        
        // Clear event listeners
        EventBus.clear();
    }
}