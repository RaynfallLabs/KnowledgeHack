/**
 * harvesting.js - Harvesting system
 * Handles harvesting corpses into food items using Animal Facts quizzes
 * with threshold-based success
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class HarvestingSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.quizEngine = game.quizEngine;
        
        // Load corpse data
        this.corpseData = null;
        this.loadCorpseData();
        
        // Currently harvesting corpse
        this.harvestingCorpse = null;
        this.harvestLocation = null; // 'inventory' or 'ground'
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Load corpse data from JSON
     */
    async loadCorpseData() {
        try {
            const response = await fetch('/data/items/corpses.json');
            const data = await response.json();
            this.corpseData = new Map();
            
            // Index corpses by ID for quick lookup
            data.corpses.forEach(corpse => {
                this.corpseData.set(corpse.id, corpse);
            });
            
            console.log(`✅ Loaded ${this.corpseData.size} corpse types`);
        } catch (error) {
            console.error('Failed to load corpse data:', error);
        }
    }
    
    /**
     * Check if an item can be harvested
     */
    canHarvest(item) {
        if (!item || !item.id) return false;
        return this.corpseData && this.corpseData.has(item.id);
    }
    
    /**
     * Start harvesting a corpse from inventory
     */
    startHarvestingFromInventory(item) {
        // Validate corpse
        if (!this.canHarvest(item)) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: `${item.name || 'That'} cannot be harvested!`,
                type: 'warning'
            });
            return false;
        }
        
        // Check if player has the corpse
        const inventoryItem = this.player.inventory.find(i => i.id === item.id);
        if (!inventoryItem) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: `You don't have any ${item.name}!`,
                type: 'warning'
            });
            return false;
        }
        
        // Store the corpse being harvested
        this.harvestingCorpse = item;
        this.harvestLocation = 'inventory';
        
        // Get corpse data
        const corpseData = this.corpseData.get(item.id);
        
        // Start threshold quiz
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'animal',
            type: 'threshold',
            tier: corpseData.harvestTier,
            threshold: corpseData.harvestThreshold,
            context: {
                action: 'harvesting',
                item: item.name,
                location: 'inventory'
            }
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You begin carefully harvesting the ${item.name}...`,
            type: 'info'
        });
        
        return true;
    }
    
    /**
     * Start harvesting a corpse from the ground
     */
    startHarvestingFromGround(x, y) {
        // Get items at location
        const tile = this.game.dungeon.getTile(x, y);
        if (!tile || !tile.items || tile.items.length === 0) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: 'There is nothing here to harvest!',
                type: 'warning'
            });
            return false;
        }
        
        // Find first harvestable corpse
        const corpse = tile.items.find(item => this.canHarvest(item));
        if (!corpse) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: 'No harvestable corpses here!',
                type: 'warning'
            });
            return false;
        }
        
        // Store the corpse being harvested
        this.harvestingCorpse = corpse;
        this.harvestLocation = 'ground';
        
        // Get corpse data
        const corpseData = this.corpseData.get(corpse.id);
        
        // Start threshold quiz
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'animal',
            type: 'threshold',
            tier: corpseData.harvestTier,
            threshold: corpseData.harvestThreshold,
            context: {
                action: 'harvesting',
                item: corpse.name,
                location: 'ground',
                x: x,
                y: y
            }
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You begin carefully harvesting the ${corpse.name}...`,
            type: 'info'
        });
        
        return true;
    }
    
    /**
     * Handle harvesting quiz completion
     */
    handleHarvestingComplete(result) {
        if (!this.harvestingCorpse) {
            console.error('No corpse being harvested!');
            return;
        }
        
        const corpseData = this.corpseData.get(this.harvestingCorpse.id);
        if (!corpseData) {
            console.error('Corpse data not found for:', this.harvestingCorpse.id);
            return;
        }
        
        // Check if harvesting succeeded (met threshold)
        const success = result.correctAnswers >= corpseData.harvestThreshold;
        
        if (success) {
            // Success! Create food item
            this.handleHarvestSuccess(corpseData);
        } else {
            // Failure - corpse is ruined
            this.handleHarvestFailure(corpseData);
        }
        
        // Clear harvesting state
        this.harvestingCorpse = null;
        this.harvestLocation = null;
    }
    
    /**
     * Handle successful harvest
     */
    handleHarvestSuccess(corpseData) {
        // Remove corpse from original location
        if (this.harvestLocation === 'inventory') {
            this.removeFromInventory(this.harvestingCorpse);
        } else {
            this.removeFromGround(this.harvestingCorpse, result.context.x, result.context.y);
        }
        
        // Create food item
        const foodItem = {
            id: corpseData.harvestFood,
            name: this.getFoodName(corpseData.harvestFood),
            type: 'food',
            weight: Math.floor(corpseData.weight / 3), // Food weighs less than corpse
            quantity: 1
        };
        
        // Add food to inventory
        this.addToInventory(foodItem);
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You successfully harvest ${foodItem.name} from the corpse!`,
            type: 'success'
        });
        
        EventBus.emit(EVENTS.HARVEST_SUCCESS, {
            corpse: this.harvestingCorpse.name,
            food: foodItem.name
        });
    }
    
    /**
     * Handle failed harvest
     */
    handleHarvestFailure(corpseData) {
        // Remove corpse from original location (it's ruined)
        if (this.harvestLocation === 'inventory') {
            this.removeFromInventory(this.harvestingCorpse);
        } else {
            this.removeFromGround(this.harvestingCorpse, result.context.x, result.context.y);
        }
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You butcher the corpse badly, ruining the meat!`,
            type: 'danger'
        });
        
        EventBus.emit(EVENTS.HARVEST_FAILURE, {
            corpse: this.harvestingCorpse.name
        });
    }
    
    /**
     * Get food name from ID
     */
    getFoodName(foodId) {
        // Map of food IDs to display names
        const foodNames = {
            'rat_meat': 'Rat Meat',
            'goblin_meat': 'Goblin Meat',
            'bat_wings': 'Bat Wings',
            'jackal_meat': 'Jackal Meat',
            'kobold_meat': 'Kobold Meat',
            'newt_tail': 'Newt Tail',
            'electric_thorax': 'Electric Thorax',
            'hobgoblin_meat': 'Hobgoblin Meat',
            'orc_meat': 'Orc Meat',
            'preserved_flesh': 'Preserved Flesh',
            'eye_jelly': 'Eye Jelly',
            'neutralized_gel': 'Neutralized Gel',
            'ant_thorax': 'Ant Thorax',
            'dwarf_meat': 'Dwarf Meat',
            'gnome_meat': 'Gnome Meat'
        };
        
        return foodNames[foodId] || 'Unknown Food';
    }
    
    /**
     * Remove item from inventory
     */
    removeFromInventory(item) {
        const index = this.player.inventory.findIndex(i => i.id === item.id);
        if (index !== -1) {
            const invItem = this.player.inventory[index];
            
            // If stacked, reduce quantity
            if (invItem.quantity > 1) {
                invItem.quantity--;
            } else {
                // Remove completely
                this.player.inventory.splice(index, 1);
            }
            
            EventBus.emit(EVENTS.INVENTORY_CHANGE, {
                action: 'remove',
                item: item
            });
        }
    }
    
    /**
     * Remove item from ground
     */
    removeFromGround(item, x, y) {
        const tile = this.game.dungeon.getTile(x, y);
        if (tile && tile.items) {
            const index = tile.items.findIndex(i => i.id === item.id);
            if (index !== -1) {
                tile.items.splice(index, 1);
                
                EventBus.emit(EVENTS.ITEM_REMOVED, {
                    item: item,
                    x: x,
                    y: y
                });
            }
        }
    }
    
    /**
     * Add item to inventory
     */
    addToInventory(item) {
        // Check if item already exists and can stack
        const existingItem = this.player.inventory.find(i => i.id === item.id);
        
        if (existingItem && item.quantity) {
            // Stack with existing
            existingItem.quantity = (existingItem.quantity || 1) + item.quantity;
        } else {
            // Add new item
            this.player.inventory.push(item);
        }
        
        EventBus.emit(EVENTS.INVENTORY_CHANGE, {
            action: 'add',
            item: item
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for harvest action from inventory
        EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
            if (action.type === 'harvest') {
                if (action.item) {
                    this.startHarvestingFromInventory(action.item);
                } else if (action.x !== undefined && action.y !== undefined) {
                    this.startHarvestingFromGround(action.x, action.y);
                }
            }
        });
        
        // Listen for quiz completion
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            if (result.context && result.context.action === 'harvesting') {
                this.handleHarvestingComplete(result);
            }
        });
        
        // Listen for inventory harvest command
        EventBus.on(EVENTS.INVENTORY_USE, (data) => {
            if (data.action === 'harvest') {
                this.startHarvestingFromInventory(data.item);
            }
        });
        
        // Listen for ground harvest command (standing over corpse)
        EventBus.on(EVENTS.GROUND_ACTION, (data) => {
            if (data.action === 'harvest') {
                this.startHarvestingFromGround(data.x, data.y);
            }
        });
    }
    
    /**
     * Quick harvest at player's position
     */
    harvestHere() {
        return this.startHarvestingFromGround(this.player.x, this.player.y);
    }
    
    /**
     * Get list of harvestable items in inventory
     */
    getHarvestableItems() {
        return this.player.inventory.filter(item => this.canHarvest(item));
    }
    
    /**
     * Get harvesting statistics
     */
    getStats() {
        // Could track harvesting stats if desired
        return {
            totalHarvested: 0,
            successfulHarvests: 0,
            failedHarvests: 0
        };
    }
}