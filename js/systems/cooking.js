/**
 * cooking.js - Cooking system
 * Handles cooking food items with escalator chain quizzes
 * and applies stat/effect bonuses based on performance
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class CookingSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.quizEngine = game.quizEngine;
        
        // Load food data
        this.foodData = null;
        this.loadFoodData();
        
        // Currently cooking item
        this.cookingItem = null;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Load food data from JSON
     */
    async loadFoodData() {
        try {
            // FIXED: Use correct path for GitHub Pages
            const basePath = window.location.hostname === 'localhost' 
                ? '/data/items' 
                : '/KnowledgeHack/data/items';
            
            const response = await fetch(`${basePath}/food.json`);
            const data = await response.json();
            this.foodData = new Map();
            
            // Index foods by ID for quick lookup
            // FIXED: Handle both 'foods' and 'food' array names
            const foodArray = data.foods || data.food || [];
            foodArray.forEach(food => {
                this.foodData.set(food.id, food);
            });
            
            console.log(`✅ Loaded ${this.foodData.size} food types`);
        } catch (error) {
            console.error('Failed to load food data:', error);
        }
    }
    
    /**
     * Check if an item can be cooked
     */
    canCook(item) {
        if (!item || !item.id) return false;
        return this.foodData && this.foodData.has(item.id);
    }
    
    /**
     * Start cooking a food item
     */
    startCooking(item) {
        // Validate item
        if (!this.canCook(item)) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: `${item.name || 'That'} cannot be cooked!`,
                type: 'warning'
            });
            return false;
        }
        
        // Check if player has the item
        const inventoryItem = this.player.inventory.find(i => i.id === item.id);
        if (!inventoryItem) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: `You don't have any ${item.name}!`,
                type: 'warning'
            });
            return false;
        }
        
        // Store the item being cooked
        this.cookingItem = item;
        
        // Start escalator chain quiz
        // Cooking quizzes always start at Tier 1 and can go up to Tier 5
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'cooking',
            type: 'escalator',
            startTier: 1,
            maxTier: 5,
            context: {
                action: 'cooking',
                item: item.name
            }
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You begin preparing the ${item.name}...`,
            type: 'info'
        });
        
        return true;
    }
    
    /**
     * Handle cooking quiz completion
     */
    handleCookingComplete(result) {
        if (!this.cookingItem) {
            console.error('No item being cooked!');
            return;
        }
        
        const food = this.foodData.get(this.cookingItem.id);
        if (!food) {
            console.error('Food data not found for:', this.cookingItem.id);
            return;
        }
        
        // Get the cooking outcome based on score (0-5)
        const score = Math.min(result.score || 0, 5);
        const outcome = food.cookingOutcomes[score];
        
        if (!outcome) {
            console.error('No outcome for score:', score);
            return;
        }
        
        // Remove the raw food from inventory
        this.removeFromInventory(this.cookingItem);
        
        // Display the result message
        EventBus.emit(EVENTS.MESSAGE, {
            text: outcome.message,
            type: score === 0 ? 'danger' : 'success'
        });
        
        // Apply all effects
        if (outcome.effects && outcome.effects.length > 0) {
            this.applyFoodEffects(outcome.effects, outcome.name);
        }
        
        // Emit cooking complete event
        EventBus.emit(EVENTS.COOKING_COMPLETE, {
            food: food.name,
            dish: outcome.name,
            score: score,
            effects: outcome.effects
        });
        
        // Clear cooking item
        this.cookingItem = null;
    }
    
    /**
     * Apply food effects to the player
     */
    applyFoodEffects(effects, dishName) {
        effects.forEach(effect => {
            switch (effect.type) {
                case 'restoreSP':
                    this.player.restoreSP(effect.value);
                    EventBus.emit(EVENTS.MESSAGE, {
                        text: `You recover ${effect.value} SP!`,
                        type: 'heal'
                    });
                    break;
                    
                case 'restoreHP':
                    this.player.heal(effect.value);
                    EventBus.emit(EVENTS.MESSAGE, {
                        text: `You recover ${effect.value} HP!`,
                        type: 'heal'
                    });
                    break;
                    
                case 'restoreMP':
                    this.player.restoreMP(effect.value);
                    EventBus.emit(EVENTS.MESSAGE, {
                        text: `You recover ${effect.value} MP!`,
                        type: 'heal'
                    });
                    break;
                    
                case 'increaseAttribute':
                    this.player.increaseAttribute(effect.attribute, effect.value);
                    const attrName = this.getAttributeDisplayName(effect.attribute);
                    EventBus.emit(EVENTS.MESSAGE, {
                        text: `Your ${attrName} increases by ${effect.value}!`,
                        type: 'success'
                    });
                    break;
                    
                case 'effect':
                    this.applyTemporaryEffect(effect);
                    break;
                    
                default:
                    console.warn('Unknown effect type:', effect.type);
            }
        });
    }
    
    /**
     * Apply a temporary effect
     */
    applyTemporaryEffect(effect) {
        // Add the effect to the player
        this.player.addEffect(effect.name, effect.duration, effect.properties || {});
        
        // Get effect description for message
        const effectDesc = this.getEffectDescription(effect.name);
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You gain ${effectDesc} for ${effect.duration} turns!`,
            type: 'buff'
        });
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
     * Get display name for attribute
     */
    getAttributeDisplayName(attribute) {
        const names = {
            strength: 'Strength',
            constitution: 'Constitution',
            dexterity: 'Dexterity',
            intelligence: 'Intelligence',
            wisdom: 'Wisdom',
            perception: 'Perception'
        };
        return names[attribute] || attribute;
    }
    
    /**
     * Get description for temporary effect
     */
    getEffectDescription(effectName) {
        const descriptions = {
            // Detection abilities
            detectTraps: 'Trap Detection',
            trapDetection: 'Enhanced Trap Detection',
            seeInvisible: 'See Invisible',
            telepathy: 'Telepathy',
            echolocation: 'Echolocation',
            
            // Resistances
            poisonResistance: 'Poison Resistance',
            acidResistance: 'Acid Resistance',
            electricResistance: 'Electric Resistance',
            stoneResistance: 'Stone Resistance',
            acidImmunity: 'Acid Immunity',
            undeadResistance: 'Undead Resistance',
            
            // Combat buffs
            berserkRage: 'Berserk Rage',
            tacticalAwareness: 'Tactical Awareness',
            packInstinct: 'Pack Hunter Instincts',
            hiveStrength: 'Strength of the Hive',
            
            // Movement/utility
            swiftness: 'Increased Speed',
            carryBoost: 'Increased Carrying Capacity',
            regeneration: 'Regeneration',
            lifeDrain: 'Life Drain',
            
            // Magical
            minorIllusion: 'Minor Illusion',
            majorIllusion: 'Major Illusion',
            electricAura: 'Electric Aura',
            corrosiveTouch: 'Corrosive Touch',
            earthPower: 'Power of the Earth',
            metalDetection: 'Metal Detection'
        };
        
        return descriptions[effectName] || effectName;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for cook action
        EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
            if (action.type === 'cook' && action.item) {
                this.startCooking(action.item);
            }
        });
        
        // Listen for quiz completion
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            if (result.context && result.context.action === 'cooking') {
                this.handleCookingComplete(result);
            }
        });
        
        // Listen for inventory cook command
        EventBus.on(EVENTS.INVENTORY_USE, (data) => {
            if (data.action === 'cook') {
                this.startCooking(data.item);
            }
        });
    }
    
    /**
     * Get cooking statistics
     */
    getStats() {
        // Could track cooking stats if desired
        return {
            totalCooked: 0,
            perfectDishes: 0,
            failedAttempts: 0
        };
    }
}