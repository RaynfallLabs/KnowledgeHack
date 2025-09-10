/**
 * game.js - Main game orchestrator
 * Updated with cooking, harvesting, and food progression systems
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from './event-bus.js';
import { QuestionLoader } from './question-loader.js';
import { ItemLoader } from './item-loader.js';
import { MonsterLoader } from './monster-loader.js';
import { Player } from '../entities/player.js';
import { DungeonGenerator } from '../world/dungeon-generator.js';
import { QuizEngine } from '../systems/quiz-engine.js';
import { CombatSystem } from '../systems/combat.js';
import { InventorySystem } from '../systems/inventory.js';
import { EquipmentSystem } from '../systems/equipment.js';
import { IdentificationSystem } from '../systems/identification.js';
import { CookingSystem } from '../systems/cooking.js';
import { HarvestingSystem } from '../systems/harvesting.js';
import { SaveLoadSystem } from '../systems/save-load.js';
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
        
        // Data loaders
        this.questionLoader = null;
        this.itemLoader = null;
        this.monsterLoader = null;
        
        // Systems
        this.quizEngine = null;
        this.combatSystem = null;
        this.inventorySystem = null;
        this.equipmentSystem = null;
        this.identificationSystem = null;
        this.cookingSystem = null;
        this.harvestingSystem = null;
        this.saveLoadSystem = null;
        
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
        
        try {
            // Load all data first
            await this.loadGameData();
            
            // Create player with starting stats
            this.createPlayer();
            
            // Initialize all systems
            this.initializeSystems();
            
            // Initialize UI
            this.initializeUI();
            
            // Generate first level
            await this.generateLevel(1);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial messages
            this.showWelcomeMessages();
            
            // Give starting equipment
            this.giveStartingEquipment();
            
            console.log('✅ Game initialized successfully!');
            
            // Start render loop
            this.renderer.startRenderLoop();
            
            // Start game loop
            this.running = true;
            this.gameLoop();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.messageLog?.add('Failed to initialize game! Check console for errors.', 'danger');
        }
    }
    
    /**
     * Load all game data
     */
    async loadGameData() {
        console.log('📚 Loading game data...');
        
        // Load questions
        this.questionLoader = new QuestionLoader();
        await this.questionLoader.loadAllQuestions();
        
        // Load items
        this.itemLoader = new ItemLoader();
        await this.itemLoader.loadAllItems();
        
        // Load monsters
        this.monsterLoader = new MonsterLoader();
        await this.monsterLoader.loadMonsters();
        
        console.log('✅ All game data loaded');
    }
    
    /**
     * Create player with starting stats
     */
    createPlayer() {
        this.player = new Player(this.playerName);
        
        // Set starting position (will be updated when dungeon generates)
        this.player.x = 0;
        this.player.y = 0;
        
        console.log('👤 Player created:', this.playerName);
    }
    
    /**
     * Initialize all game systems
     */
    initializeSystems() {
        console.log('⚙️ Initializing game systems...');
        
        // Core systems
        this.quizEngine = new QuizEngine(this);
        this.combatSystem = new CombatSystem(this);
        this.inventorySystem = new InventorySystem(this);
        this.equipmentSystem = new EquipmentSystem(this);
        this.identificationSystem = new IdentificationSystem(this);
        
        // Food systems (critical for progression)
        this.cookingSystem = new CookingSystem(this);
        this.harvestingSystem = new HarvestingSystem(this);
        
        // Save/Load
        this.saveLoadSystem = new SaveLoadSystem(this);
        
        console.log('✅ All systems initialized');
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        console.log('🎨 Initializing UI...');
        
        this.renderer = new Renderer('game-canvas');
        this.messageLog = new MessageLog('messages');
        this.uiManager = new UIManager(this);
        this.inputHandler = new InputHandler(this);
        
        console.log('✅ UI initialized');
    }
    
    /**
     * Generate a level
     */
    async generateLevel(levelNumber) {
        console.log(`🏰 Generating level ${levelNumber}...`);
        
        const generator = new DungeonGenerator();
        this.dungeon = await generator.generateLevel(levelNumber);
        
        // Place player at starting position
        const startPos = this.dungeon.getEntrance();
        this.player.x = startPos.x;
        this.player.y = startPos.y;
        
        // Clear and spawn monsters
        this.monsters = [];
        this.spawnMonsters(levelNumber);
        
        // Clear and place items
        this.items = [];
        this.placeItems(levelNumber);
        
        // Update renderer with new dungeon state
        this.updateRendererState();
        
        // Emit level enter event
        EventBus.emit(EVENTS.LEVEL_ENTER, {
            level: levelNumber
        });
        
        console.log(`✅ Level ${levelNumber} generated!`);
    }
    
    /**
     * Spawn monsters for the level
     */
    spawnMonsters(levelNumber) {
        // Use monster loader to get appropriate monsters
        const monsterCount = 5 + Math.floor(levelNumber / 2);
        
        for (let i = 0; i < monsterCount; i++) {
            const monster = this.monsterLoader.spawnMonsterForLevel(levelNumber);
            if (monster) {
                // Find random position
                const pos = this.dungeon.getRandomEmptyPosition();
                if (pos) {
                    monster.x = pos.x;
                    monster.y = pos.y;
                    this.monsters.push(monster);
                }
            }
        }
        
        console.log(`🐾 Spawned ${this.monsters.length} monsters`);
    }
    
    /**
     * Place items on the level
     */
    placeItems(levelNumber) {
        // Place some random items
        const itemCount = 3 + Math.floor(levelNumber / 3);
        
        for (let i = 0; i < itemCount; i++) {
            const item = this.itemLoader.getRandomItem(levelNumber);
            if (item) {
                const pos = this.dungeon.getRandomEmptyPosition();
                if (pos) {
                    item.x = pos.x;
                    item.y = pos.y;
                    this.items.push(item);
                }
            }
        }
        
        // Always place at least one container (for lockpicking)
        const container = this.itemLoader.getContainer(levelNumber);
        if (container) {
            const pos = this.dungeon.getRandomEmptyPosition();
            if (pos) {
                container.x = pos.x;
                container.y = pos.y;
                this.items.push(container);
            }
        }
        
        console.log(`📦 Placed ${this.items.length} items`);
    }
    
    /**
     * Show welcome messages
     */
    showWelcomeMessages() {
        this.messageLog.add(`Welcome ${this.playerName}! Your quest for the Philosopher's Stone begins...`, 'success');
        this.messageLog.add('Use arrow keys or HJKL to move. Press ? for help.', 'info');
        this.messageLog.add('Kill monsters and cook their corpses to grow stronger!', 'info');
        this.messageLog.add('Your SP (Stamina Points) is your hunger - keep it above 0!', 'warning');
    }
    
    /**
     * Give starting equipment
     */
    giveStartingEquipment() {
        // Give a basic weapon
        const startingWeapon = this.itemLoader.getItem('crude_dagger');
        if (startingWeapon) {
            this.inventorySystem.addItem(startingWeapon);
            this.equipmentSystem.equipItem(startingWeapon);
            this.messageLog.add('You start with a crude dagger.', 'info');
        }
        
        // Give some starting food
        const ration = {
            id: 'ration',
            name: 'Food Ration',
            type: 'food',
            weight: 1,
            restoreSP: 50,
            quantity: 2
        };
        this.inventorySystem.addItem(ration);
        this.messageLog.add('You have 2 food rations for emergencies.', 'info');
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.running || this.gameOver) return;
        
        // Don't process if paused (quiz active, etc)
        if (!this.paused) {
            // Process any pending monster turns
            this.processMonsterTurns();
            
            // Check win/lose conditions
            this.checkGameEnd();
        }
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Process a player turn
     */
    processTurn() {
        // Increment turn counter
        this.turnNumber++;
        
        // Process player effects
        this.player.processEffects();
        
        // Update UI
        this.uiManager.updateAll();
        
        // Emit turn end event
        EventBus.emit(EVENTS.TURN_END, {
            turn: this.turnNumber
        });
    }
    
    /**
     * Process monster turns
     */
    processMonsterTurns() {
        // Monsters act after player
        // This will be handled by combat system when ready
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
        if (!this.canMoveTo(newX, newY)) {
            // Check if there's a monster to attack
            const monster = this.getMonsterAt(newX, newY);
            if (monster) {
                this.combatSystem.playerAttack(monster);
                this.processTurn();
            }
            return;
        }
        
        // Move player (consumes SP)
        this.player.move(newX, newY);
        
        // Check for items at new position
        this.checkForItems();
        
        // Process turn
        this.processTurn();
        
        // Update renderer
        this.updateRendererState();
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
        
        // Check for monsters
        if (this.getMonsterAt(x, y)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get monster at position
     */
    getMonsterAt(x, y) {
        return this.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
    }
    
    /**
     * Check for items at player position
     */
    checkForItems() {
        const itemsHere = this.items.filter(item => 
            item.x === this.player.x && item.y === this.player.y
        );
        
        if (itemsHere.length > 0) {
            if (itemsHere.length === 1) {
                this.messageLog.add(`You see here: ${itemsHere[0].name}`, 'info');
            } else {
                this.messageLog.add(`You see here: ${itemsHere.length} items`, 'info');
            }
        }
    }
    
    /**
     * Handle item pickup
     */
    handlePickup() {
        const itemsHere = this.items.filter(item => 
            item.x === this.player.x && item.y === this.player.y
        );
        
        if (itemsHere.length === 0) {
            this.messageLog.add('There is nothing here to pick up.', 'warning');
            return;
        }
        
        // Pick up all items (or show menu if multiple)
        itemsHere.forEach(item => {
            if (this.inventorySystem.addItem(item)) {
                // Remove from world
                const index = this.items.indexOf(item);
                if (index > -1) {
                    this.items.splice(index, 1);
                }
                this.messageLog.add(`You pick up the ${item.name}.`, 'info');
            } else {
                this.messageLog.add(`Your inventory is full!`, 'warning');
            }
        });
        
        this.updateRendererState();
    }
    
    /**
     * Handle monster death
     */
    handleMonsterDeath(monster) {
        this.messageLog.add(`You have slain the ${monster.name}!`, 'success');
        
        // Update player stats
        this.player.monstersKilled++;
        
        // Drop corpse
        const corpseId = monster.lootTable?.corpse;
        if (corpseId) {
            const corpse = {
                id: corpseId,
                name: `${monster.name} corpse`,
                type: 'corpse',
                x: monster.x,
                y: monster.y,
                weight: 50 // Default corpse weight
            };
            
            this.items.push(corpse);
            this.messageLog.add(`The ${monster.name} leaves a corpse.`, 'info');
        }
        
        // Drop gold
        if (monster.lootTable?.gold) {
            const goldAmount = this.rollDice(monster.lootTable.gold);
            if (goldAmount > 0) {
                this.player.gold += goldAmount;
                this.messageLog.add(`You find ${goldAmount} gold pieces!`, 'success');
            }
        }
        
        // Drop items
        if (monster.lootTable?.items) {
            monster.lootTable.items.forEach(itemDrop => {
                if (Math.random() < itemDrop.chance) {
                    const item = this.itemLoader.getItem(itemDrop.id);
                    if (item) {
                        item.x = monster.x;
                        item.y = monster.y;
                        this.items.push(item);
                        this.messageLog.add(`The ${monster.name} drops ${item.name}!`, 'info');
                    }
                }
            });
        }
        
        // Remove from monsters array
        const index = this.monsters.indexOf(monster);
        if (index > -1) {
            this.monsters.splice(index, 1);
        }
        
        // Emit event
        EventBus.emit(EVENTS.MONSTER_DEATH, {
            monster: monster,
            x: monster.x,
            y: monster.y
        });
        
        this.updateRendererState();
    }
    
    /**
     * Roll dice notation (e.g., "2d6+3")
     */
    rollDice(notation) {
        if (typeof notation === 'number') return notation;
        if (!notation) return 0;
        
        const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return parseInt(notation) || 0;
        
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        let total = modifier;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        
        return total;
    }
    
    /**
     * Handle harvest action
     */
    handleHarvest() {
        // Check for corpse at current position
        const corpseHere = this.items.find(item => 
            item.x === this.player.x && 
            item.y === this.player.y && 
            item.type === 'corpse'
        );
        
        if (corpseHere) {
            // Start harvesting from ground
            this.harvestingSystem.startHarvestingFromGround(this.player.x, this.player.y);
        } else {
            // Check inventory for corpses
            const corpses = this.harvestingSystem.getHarvestableItems();
            if (corpses.length > 0) {
                // If only one, harvest it. Otherwise show menu
                if (corpses.length === 1) {
                    this.harvestingSystem.startHarvestingFromInventory(corpses[0]);
                } else {
                    // TODO: Show selection menu
                    this.messageLog.add('Multiple corpses available. Harvesting first one.', 'info');
                    this.harvestingSystem.startHarvestingFromInventory(corpses[0]);
                }
            } else {
                this.messageLog.add('No corpses to harvest here or in inventory.', 'warning');
            }
        }
    }
    
    /**
     * Handle cook action
     */
    handleCook() {
        // Get cookable items from inventory
        const cookableItems = this.player.inventory.filter(item => 
            this.cookingSystem.canCook(item)
        );
        
        if (cookableItems.length === 0) {
            this.messageLog.add('You have no food to cook.', 'warning');
            return;
        }
        
        // If only one, cook it. Otherwise show menu
        if (cookableItems.length === 1) {
            this.cookingSystem.startCooking(cookableItems[0]);
        } else {
            // TODO: Show cooking menu
            this.messageLog.add(`You have ${cookableItems.length} items to cook. Cooking first one.`, 'info');
            this.cookingSystem.startCooking(cookableItems[0]);
        }
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
        
        // Check for victory (found Philosopher's Stone)
        const philosopherStone = this.player.inventory.find(item => 
            item.id === 'philosophers_stone'
        );
        
        if (philosopherStone) {
            this.gameOver = true;
            this.victory = true;
            EventBus.emit(EVENTS.GAME_VICTORY);
            this.messageLog.add('You have found the Philosopher\'s Stone! Victory!', 'success');
            this.messageLog.add(`You won in ${this.turnNumber} turns!`, 'success');
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
        EventBus.on(EVENTS.QUIZ_START, () => {
            this.paused = true;
        });
        
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            this.paused = false;
            // Quiz results are handled by the respective systems
        });
        
        // Monster death
        EventBus.on(EVENTS.MONSTER_DEATH, (data) => {
            this.handleMonsterDeath(data.monster);
        });
        
        // Item removal (for harvesting)
        EventBus.on(EVENTS.ITEM_REMOVED, (data) => {
            const index = this.items.findIndex(item => 
                item === data.item
            );
            if (index > -1) {
                this.items.splice(index, 1);
            }
            this.updateRendererState();
        });
        
        // Level change
        EventBus.on(EVENTS.LEVEL_EXIT, async () => {
            this.currentLevel++;
            await this.generateLevel(this.currentLevel);
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
                
            case 'pickup':
                this.handlePickup();
                break;
                
            case 'harvest':
                this.handleHarvest();
                break;
                
            case 'cook':
                this.handleCook();
                break;
                
            case 'inventory':
                this.uiManager.showInventory();
                break;
                
            case 'equipment':
                this.uiManager.showEquipment();
                break;
                
            case 'save':
                this.saveLoadSystem.save();
                this.messageLog.add('Game saved.', 'success');
                break;
                
            case 'load':
                if (this.saveLoadSystem.load()) {
                    this.messageLog.add('Game loaded.', 'success');
                } else {
                    this.messageLog.add('No save game found.', 'warning');
                }
                break;
                
            default:
                console.warn(`Unknown player action: ${action.type}`);
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
        
        // Cleanup all systems
        // Each system should have its own cleanup if needed
    }
}