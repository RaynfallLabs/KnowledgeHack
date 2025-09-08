/**
 * inventory.js - Inventory management system with weight-based burden mechanics
 * Handles item storage, pickup, dropping, stacking, and carrying capacity
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class InventorySystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.messageLog = game.messageLog;
        
        // Inventory storage
        this.items = new Array(CONFIG.INVENTORY.MAX_ITEMS).fill(null);
        this.maxItems = CONFIG.INVENTORY.MAX_ITEMS;
        
        // Weight tracking
        this.totalWeight = 0;
        this.burdened = false;
        this.strained = false;
        this.overtaxed = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for pickup attempts
        EventBus.on(EVENTS.PLAYER_PICKUP, (data) => {
            this.pickupItem(data.x, data.y);
        });
        
        // Listen for drop attempts
        EventBus.on(EVENTS.PLAYER_DROP, (data) => {
            this.dropItem(data.slot, data.x, data.y);
        });
        
        // Listen for inventory use
        EventBus.on(EVENTS.INVENTORY_USE, (data) => {
            this.useItem(data.slot);
        });
        
        // Listen for inventory examination
        EventBus.on(EVENTS.INVENTORY_EXAMINE, (data) => {
            this.examineItem(data.slot);
        });
        
        // Listen for inventory open
        EventBus.on(EVENTS.UI_OPEN_INVENTORY, () => {
            this.openInventory();
        });
    }
    
    /**
     * Attempt to pick up item at coordinates
     */
    pickupItem(x, y) {
        const item = this.game.dungeon?.getItemAt(x, y);
        if (!item) {
            this.messageLog.add("There's nothing here to pick up.", 'info');
            return false;
        }
        
        // Check if inventory has space
        const emptySlot = this.findEmptySlot();
        if (emptySlot === -1) {
            // Try to stack with existing item
            const stackSlot = this.findStackableSlot(item);
            if (stackSlot === -1) {
                this.messageLog.add("Your inventory is full.", 'warning');
                return false;
            }
            
            // Stack the item
            return this.stackItem(item, stackSlot);
        }
        
        // Check weight limits
        const newWeight = this.totalWeight + (item.weight * (item.quantity || 1));
        if (newWeight > this.player.carryingCapacity * 2) {
            this.messageLog.add("That's too heavy to carry.", 'warning');
            return false;
        }
        
        // Add item to inventory
        this.items[emptySlot] = { ...item };
        this.updateWeight();
        
        // Remove from dungeon
        this.game.dungeon?.removeItem(x, y, item);
        
        // Show pickup message
        const itemName = item.identified ? item.trueName : item.name;
        const quantityText = item.quantity > 1 ? ` (${item.quantity})` : '';
        this.messageLog.add(`You pick up ${itemName}${quantityText}.`, 'success');
        
        // Emit pickup event
        EventBus.emit(EVENTS.ITEM_PICKED_UP, { item: item, slot: emptySlot });
        
        return true;
    }
    
    /**
     * Drop item from inventory slot
     */
    dropItem(slot, x, y) {
        if (slot < 0 || slot >= this.maxItems || !this.items[slot]) {
            this.messageLog.add("You don't have that item.", 'warning');
            return false;
        }
        
        const item = this.items[slot];
        
        // Check if item is cursed (can't drop cursed equipped items)
        if (item.cursed && item.equipped) {
            this.messageLog.add(`The ${item.name} is welded to your body!`, 'danger');
            return false;
        }
        
        // Check if item is equipped (unequip first)
        if (item.equipped) {
            if (!this.unequipItem(slot)) {
                return false;
            }
        }
        
        // Add to dungeon at player location or specified coordinates
        const dropX = x !== undefined ? x : this.player.x;
        const dropY = y !== undefined ? y : this.player.y;
        
        this.game.dungeon?.addItem(dropX, dropY, { ...item });
        
        // Remove from inventory
        const itemName = item.identified ? item.trueName : item.name;
        const quantityText = item.quantity > 1 ? ` (${item.quantity})` : '';
        this.messageLog.add(`You drop ${itemName}${quantityText}.`, 'info');
        
        this.items[slot] = null;
        this.updateWeight();
        
        EventBus.emit(EVENTS.ITEM_DROPPED, { item: item, slot: slot });
        
        return true;
    }
    
    /**
     * Use item from inventory slot
     */
    useItem(slot) {
        if (slot < 0 || slot >= this.maxItems || !this.items[slot]) {
            this.messageLog.add("You don't have that item.", 'warning');
            return false;
        }
        
        const item = this.items[slot];
        
        // Handle different item types
        switch (item.type) {
            case 'food':
                return this.eatFood(slot);
            case 'potion':
                return this.drinkPotion(slot);
            case 'scroll':
                return this.readScroll(slot);
            case 'weapon':
            case 'armor':
            case 'accessory':
                return this.equipItem(slot);
            case 'tool':
                return this.useTool(slot);
            default:
                this.messageLog.add(`You can't use ${item.name}.`, 'info');
                return false;
        }
    }
    
    /**
     * Examine item details
     */
    examineItem(slot) {
        if (slot < 0 || slot >= this.maxItems || !this.items[slot]) {
            this.messageLog.add("You don't have that item.", 'warning');
            return;
        }
        
        const item = this.items[slot];
        const name = item.identified ? item.trueName : item.name;
        
        let description = `${name}`;
        
        // Add weight and quantity info
        if (item.quantity > 1) {
            description += ` (${item.quantity})`;
        }
        description += ` [${item.weight * (item.quantity || 1)} lbs]`;
        
        // Add enchantment if identified
        if (item.identified && item.enchantment !== undefined) {
            const sign = item.enchantment >= 0 ? '+' : '';
            description += ` ${sign}${item.enchantment}`;
        }
        
        // Add BUC status if identified
        if (item.identified) {
            if (item.blessed) description += ' (blessed)';
            else if (item.cursed) description += ' (cursed)';
        }
        
        // Add equipped status
        if (item.equipped) {
            description += ' (equipped)';
        }
        
        // Add item-specific details
        if (item.description) {
            description += ` - ${item.description}`;
        }
        
        this.messageLog.add(description, 'info');
    }
    
    /**
     * Find empty inventory slot
     */
    findEmptySlot() {
        for (let i = 0; i < this.maxItems; i++) {
            if (this.items[i] === null) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Find slot with stackable item of same type
     */
    findStackableSlot(newItem) {
        if (!newItem.stackable) return -1;
        
        for (let i = 0; i < this.maxItems; i++) {
            const existing = this.items[i];
            if (existing && 
                existing.id === newItem.id &&
                existing.stackable &&
                !existing.equipped &&
                existing.enchantment === newItem.enchantment &&
                existing.blessed === newItem.blessed &&
                existing.cursed === newItem.cursed) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Stack item with existing item
     */
    stackItem(newItem, slot) {
        const existing = this.items[slot];
        const newQuantity = (existing.quantity || 1) + (newItem.quantity || 1);
        const maxStack = newItem.maxStack || CONFIG.INVENTORY.DEFAULT_STACK_SIZE;
        
        if (newQuantity > maxStack) {
            this.messageLog.add("You can't stack any more of those.", 'warning');
            return false;
        }
        
        // Check weight limit
        const additionalWeight = newItem.weight * (newItem.quantity || 1);
        if (this.totalWeight + additionalWeight > this.player.carryingCapacity * 2) {
            this.messageLog.add("That would be too heavy.", 'warning');
            return false;
        }
        
        // Stack the items
        existing.quantity = newQuantity;
        this.updateWeight();
        
        const itemName = existing.identified ? existing.trueName : existing.name;
        this.messageLog.add(`You pick up ${newItem.quantity || 1} more ${itemName}.`, 'success');
        
        return true;
    }
    
    /**
     * Eat food item
     */
    eatFood(slot) {
        const item = this.items[slot];
        
        // Will be handled by cooking system quiz
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'nutrition',
            tier: item.nutritionTier || 1,
            mode: 'threshold',
            threshold: 1,
            context: 'eating',
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Drink potion
     */
    drinkPotion(slot) {
        const item = this.items[slot];
        
        // Apply potion effects immediately (no quiz for drinking)
        this.applyPotionEffects(item);
        
        // Consume the potion
        this.consumeItem(slot, 1);
        
        const itemName = item.identified ? item.trueName : item.name;
        this.messageLog.add(`You drink the ${itemName}.`, 'action');
        
        return true;
    }
    
    /**
     * Read scroll
     */
    readScroll(slot) {
        const item = this.items[slot];
        
        // Scrolls require Grammar quiz
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: 'grammar',
            tier: item.grammarTier || 1,
            mode: 'threshold',
            threshold: 1,
            context: 'reading',
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Equip item (delegates to equipment system)
     */
    equipItem(slot) {
        const item = this.items[slot];
        
        EventBus.emit(EVENTS.EQUIPMENT_EQUIP, {
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Use tool item
     */
    useTool(slot) {
        const item = this.items[slot];
        
        // Tools might have specific use cases
        switch (item.id) {
            case 'lockpick':
                this.messageLog.add("Use the lockpick on what?", 'info');
                // Enter targeting mode for lockpicking
                break;
            default:
                this.messageLog.add(`You're not sure how to use the ${item.name}.`, 'info');
        }
        
        return true;
    }
    
    /**
     * Unequip item
     */
    unequipItem(slot) {
        const item = this.items[slot];
        
        if (!item.equipped) {
            return true;
        }
        
        // Check if cursed
        if (item.cursed) {
            this.messageLog.add(`The ${item.name} is welded to your body!`, 'danger');
            return false;
        }
        
        EventBus.emit(EVENTS.EQUIPMENT_UNEQUIP, {
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Apply potion effects
     */
    applyPotionEffects(potion) {
        // Placeholder for potion effects
        // This will be expanded when we add the effects system
        switch (potion.id) {
            case 'healing_potion':
                this.player.hp = Math.min(this.player.hp + 20, this.player.maxHP);
                this.messageLog.add("You feel better!", 'success');
                break;
            case 'mana_potion':
                this.player.mp = Math.min(this.player.mp + 15, this.player.maxMP);
                this.messageLog.add("Your magical energy is restored!", 'success');
                break;
        }
    }
    
    /**
     * Consume item (reduce quantity or remove)
     */
    consumeItem(slot, amount = 1) {
        const item = this.items[slot];
        if (!item) return;
        
        if (item.quantity > amount) {
            item.quantity -= amount;
        } else {
            this.items[slot] = null;
        }
        
        this.updateWeight();
        
        EventBus.emit(EVENTS.ITEM_CONSUMED, { 
            item: item, 
            slot: slot, 
            amount: amount 
        });
    }
    
    /**
     * Update total weight and burden status
     */
    updateWeight() {
        this.totalWeight = 0;
        
        for (const item of this.items) {
            if (item) {
                this.totalWeight += item.weight * (item.quantity || 1);
            }
        }
        
        const capacity = this.player.carryingCapacity;
        const oldBurdened = this.burdened;
        const oldStrained = this.strained;
        const oldOvertaxed = this.overtaxed;
        
        // Calculate burden levels
        this.burdened = this.totalWeight > capacity;
        this.strained = this.totalWeight > capacity * 1.25;
        this.overtaxed = this.totalWeight > capacity * 1.5;
        
        // Apply burden effects to player
        this.player.burden = {
            burdened: this.burdened,
            strained: this.strained,
            overtaxed: this.overtaxed,
            weight: this.totalWeight,
            capacity: capacity
        };
        
        // Show burden messages when status changes
        if (this.overtaxed && !oldOvertaxed) {
            this.messageLog.add("You are overtaxed and can barely move!", 'danger');
        } else if (this.strained && !oldStrained) {
            this.messageLog.add("You are strained under the weight of your possessions.", 'warning');
        } else if (this.burdened && !oldBurdened) {
            this.messageLog.add("You are burdened by your possessions.", 'warning');
        } else if (!this.burdened && oldBurdened) {
            this.messageLog.add("You feel less burdened.", 'success');
        }
        
        // Emit weight update event
        EventBus.emit(EVENTS.INVENTORY_WEIGHT_CHANGED, {
            weight: this.totalWeight,
            capacity: capacity,
            burdened: this.burdened,
            strained: this.strained,
            overtaxed: this.overtaxed
        });
    }
    
    /**
     * Open inventory UI
     */
    openInventory() {
        EventBus.emit(EVENTS.UI_SHOW_INVENTORY, {
            items: this.items,
            weight: this.totalWeight,
            capacity: this.player.carryingCapacity,
            burden: {
                burdened: this.burdened,
                strained: this.strained,
                overtaxed: this.overtaxed
            }
        });
    }
    
    /**
     * Get item at specific slot
     */
    getItem(slot) {
        if (slot < 0 || slot >= this.maxItems) return null;
        return this.items[slot];
    }
    
    /**
     * Get all items
     */
    getAllItems() {
        return this.items.filter(item => item !== null);
    }
    
    /**
     * Get items by type
     */
    getItemsByType(type) {
        return this.items.filter(item => item && item.type === type);
    }
    
    /**
     * Check if inventory has specific item
     */
    hasItem(itemId) {
        return this.items.some(item => item && item.id === itemId);
    }
    
    /**
     * Count items of specific type
     */
    countItems(itemId) {
        let count = 0;
        for (const item of this.items) {
            if (item && item.id === itemId) {
                count += item.quantity || 1;
            }
        }
        return count;
    }
    
    /**
     * Get inventory status for UI
     */
    getInventoryStatus() {
        const used = this.items.filter(item => item !== null).length;
        return {
            used: used,
            max: this.maxItems,
            weight: this.totalWeight,
            capacity: this.player.carryingCapacity,
            burdened: this.burdened,
            strained: this.strained,
            overtaxed: this.overtaxed
        };
    }
    
    /**
     * Save inventory state
     */
    save() {
        return {
            items: this.items,
            totalWeight: this.totalWeight,
            burdened: this.burdened,
            strained: this.strained,
            overtaxed: this.overtaxed
        };
    }
    
    /**
     * Load inventory state
     */
    load(data) {
        this.items = data.items || new Array(this.maxItems).fill(null);
        this.totalWeight = data.totalWeight || 0;
        this.burdened = data.burdened || false;
        this.strained = data.strained || false;
        this.overtaxed = data.overtaxed || false;
        
        // Recalculate weight to ensure consistency
        this.updateWeight();
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        EventBus.off(EVENTS.PLAYER_PICKUP);
        EventBus.off(EVENTS.PLAYER_DROP);
        EventBus.off(EVENTS.INVENTORY_USE);
        EventBus.off(EVENTS.INVENTORY_EXAMINE);
        EventBus.off(EVENTS.UI_OPEN_INVENTORY);
    }
}