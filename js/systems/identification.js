/**
 * identification.js - Item identification system
 * Handles identifying unknown items through philosophy questions
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class IdentificationSystem {
    constructor(game) {
        this.game = game;
        this.identifiedItems = new Set(); // Track identified item types
        this.quizEngine = new QuizEngine();
        
        this.setupEventListeners();
    }
    
    /**
     * Check if an item type is identified
     */
    isIdentified(itemId) {
        return this.identifiedItems.has(itemId);
    }
    
    /**
     * Start identification process for an item
     */
    async identifyItem(item) {
        if (!item) return false;
        
        // Check if already identified
        if (this.isIdentified(item.id)) {
            this.game.messageLog.add(`You already know this is a ${item.name}.`, 'info');
            return true;
        }
        
        // Start philosophy quiz for identification
        const difficulty = this.getIdentificationDifficulty(item);
        const result = await this.quizEngine.startQuiz('philosophy', difficulty, {
            action: 'identify',
            item: item
        });
        
        if (result.success) {
            this.identifiedItems.add(item.id);
            item.identified = true;
            
            this.game.messageLog.add(`Identified: ${item.name}!`, 'success');
            this.revealItemProperties(item);
            
            EventBus.emit(EVENTS.ITEM_IDENTIFIED, { item });
            return true;
        } else {
            this.game.messageLog.add('Failed to identify the item.', 'warning');
            return false;
        }
    }
    
    /**
     * Get identification difficulty based on item rarity/power
     */
    getIdentificationDifficulty(item) {
        const rarity = item.rarity || 'common';
        const difficultyMap = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'epic': 4,
            'legendary': 5,
            'artifact': 6
        };
        return difficultyMap[rarity] || 1;
    }
    
    /**
     * Reveal item properties after identification
     */
    revealItemProperties(item) {
        const properties = [];
        
        if (item.damage) properties.push(`Damage: ${item.damage}`);
        if (item.defense) properties.push(`Defense: ${item.defense}`);
        if (item.healAmount) properties.push(`Heals: ${item.healAmount} HP`);
        if (item.manaRestore) properties.push(`Restores: ${item.manaRestore} MP`);
        if (item.effect) properties.push(`Effect: ${item.effect}`);
        if (item.charges) properties.push(`Charges: ${item.charges}`);
        
        if (properties.length > 0) {
            this.game.messageLog.add(`Properties: ${properties.join(', ')}`, 'info');
        }
        
        if (item.description) {
            this.game.messageLog.add(item.description, 'info');
        }
    }
    
    /**
     * Identify all items of a type
     */
    identifyType(itemId) {
        this.identifiedItems.add(itemId);
        
        // Update all items of this type in inventory
        if (this.game.inventorySystem) {
            const items = this.game.inventorySystem.getItemsOfType(itemId);
            items.forEach(item => {
                item.identified = true;
            });
        }
    }
    
    /**
     * Use a scroll of identify
     */
    useIdentifyScroll() {
        // Show all unidentified items for selection
        const unidentifiedItems = this.getUnidentifiedItems();
        
        if (unidentifiedItems.length === 0) {
            this.game.messageLog.add('You have no unidentified items.', 'info');
            return false;
        }
        
        // TODO: Show selection UI
        // For now, identify the first unidentified item
        const item = unidentifiedItems[0];
        this.identifiedItems.add(item.id);
        item.identified = true;
        
        this.game.messageLog.add(`Magically identified: ${item.name}!`, 'success');
        this.revealItemProperties(item);
        
        return true;
    }
    
    /**
     * Get all unidentified items in inventory
     */
    getUnidentifiedItems() {
        if (!this.game.inventorySystem) return [];
        
        return this.game.inventorySystem.getItems().filter(item => {
            return !this.isIdentified(item.id);
        });
    }
    
    /**
     * Reset identification knowledge (for new game)
     */
    reset() {
        this.identifiedItems.clear();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on(EVENTS.ITEM_PICKUP, (data) => {
            const item = data.item;
            if (this.isIdentified(item.id)) {
                item.identified = true;
            }
        });
    }
    
    /**
     * Save identification state
     */
    serialize() {
        return {
            identifiedItems: Array.from(this.identifiedItems)
        };
    }
    
    /**
     * Load identification state
     */
    deserialize(data) {
        if (data.identifiedItems) {
            this.identifiedItems = new Set(data.identifiedItems);
        }
    }
}

export default IdentificationSystem;