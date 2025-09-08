/**
 * equipment.js - Equipment system with subject-specific quizzes
 * Weapons require Math quizzes (handled by CombatSystem)
 * Armor requires Geography quizzes
 * Accessories require History quizzes
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

// Equipment slot definitions
const EQUIPMENT_SLOTS = {
    // Weapons
    weapon: { name: 'Weapon', subject: 'math', quiz: false }, // Math handled by CombatSystem
    
    // Armor slots
    helmet: { name: 'Helmet', subject: 'geography', quiz: true },
    armor: { name: 'Armor', subject: 'geography', quiz: true },
    cloak: { name: 'Cloak', subject: 'geography', quiz: true },
    gloves: { name: 'Gloves', subject: 'geography', quiz: true },
    boots: { name: 'Boots', subject: 'geography', quiz: true },
    
    // Accessory slots
    amulet: { name: 'Amulet', subject: 'history', quiz: true },
    ring_left: { name: 'Left Ring', subject: 'history', quiz: true },
    ring_right: { name: 'Right Ring', subject: 'history', quiz: true },
    bracelet: { name: 'Bracelet', subject: 'history', quiz: true }
};

// Item type to slot mapping
const ITEM_TO_SLOT = {
    // Weapons
    'sword': 'weapon',
    'dagger': 'weapon', 
    'axe': 'weapon',
    'mace': 'weapon',
    'staff': 'weapon',
    'spear': 'weapon',
    'bow': 'weapon',
    
    // Armor
    'helmet': 'helmet',
    'cap': 'helmet',
    'hood': 'helmet',
    'armor': 'armor',
    'robe': 'armor',
    'shirt': 'armor',
    'cloak': 'cloak',
    'gloves': 'gloves',
    'gauntlets': 'gloves',
    'boots': 'boots',
    'shoes': 'boots',
    
    // Accessories
    'amulet': 'amulet',
    'ring': ['ring_left', 'ring_right'], // Can go in either ring slot
    'bracelet': 'bracelet'
};

export class EquipmentSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.quizEngine = game.quizEngine;
        this.inventorySystem = game.inventorySystem;
        this.messageLog = game.messageLog;
        
        // Equipment state
        this.equipment = {};
        this.pendingEquip = null;
        this.pendingUnequip = null;
        
        // Initialize empty equipment slots
        for (const slot in EQUIPMENT_SLOTS) {
            this.equipment[slot] = null;
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for equipment requests from inventory
        EventBus.on(EVENTS.EQUIPMENT_EQUIP, (data) => {
            this.equipItem(data.item, data.slot);
        });
        
        // Listen for unequip requests
        EventBus.on(EVENTS.EQUIPMENT_UNEQUIP, (data) => {
            this.unequipItem(data.item, data.slot);
        });
        
        // Listen for quiz completion
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            if (this.pendingEquip) {
                this.resolveEquipQuiz(result);
            } else if (this.pendingUnequip) {
                this.resolveUnequipQuiz(result);
            }
        });
        
        // Listen for equipment screen request
        EventBus.on(EVENTS.UI_OPEN_EQUIPMENT, () => {
            this.openEquipmentScreen();
        });
        
        // Listen for wear/wield commands
        EventBus.on(EVENTS.PLAYER_WEAR, () => {
            this.showWearableItems();
        });
        
        EventBus.on(EVENTS.PLAYER_WIELD, () => {
            this.showWeapons();
        });
        
        EventBus.on(EVENTS.PLAYER_REMOVE, () => {
            this.showEquippedItems();
        });
    }
    
    /**
     * Attempt to equip an item
     */
    equipItem(item, inventorySlot) {
        if (!item) {
            this.messageLog.add("No item to equip.", 'warning');
            return false;
        }
        
        // Determine equipment slot for this item
        const targetSlot = this.getEquipmentSlot(item);
        if (!targetSlot) {
            this.messageLog.add(`You can't equip ${item.name}.`, 'warning');
            return false;
        }
        
        // Check if slot is already occupied
        if (this.equipment[targetSlot]) {
            const currentItem = this.equipment[targetSlot];
            if (currentItem.cursed) {
                this.messageLog.add(`The ${currentItem.name} is welded to your body!`, 'danger');
                return false;
            }
            
            // Auto-unequip current item if not cursed
            if (!this.unequipToInventory(targetSlot)) {
                return false;
            }
        }
        
        // Check if item requires a quiz
        const slotInfo = EQUIPMENT_SLOTS[targetSlot];
        if (slotInfo.quiz) {
            // Store pending equip info
            this.pendingEquip = {
                item: item,
                inventorySlot: inventorySlot,
                targetSlot: targetSlot
            };
            
            // Start appropriate quiz
            this.startEquipmentQuiz(item, slotInfo);
            return true;
        } else {
            // No quiz needed (weapons use combat quizzes)
            return this.performEquip(item, inventorySlot, targetSlot);
        }
    }
    
    /**
     * Start quiz for equipment
     */
    startEquipmentQuiz(item, slotInfo) {
        const baseTimer = this.player.wisdom;
        const enchantmentBonus = item.enchantment || 0;
        const blessedBonus = item.blessed ? 2 : 0;
        const quizTimer = baseTimer + enchantmentBonus + blessedBonus;
        
        // Determine quiz tier based on item
        const tier = this.getItemQuizTier(item);
        
        this.quizEngine.startQuiz({
            subject: slotInfo.subject,
            tier: tier,
            mode: 'threshold',
            threshold: 1, // Need at least 1 correct answer
            timer: quizTimer,
            context: 'equipment'
        });
        
        const itemName = item.identified ? item.trueName : item.name;
        this.messageLog.add(`You attempt to equip the ${itemName}...`, 'action');
    }
    
    /**
     * Resolve equipment quiz result
     */
    resolveEquipQuiz(quizResult) {
        const pending = this.pendingEquip;
        this.pendingEquip = null;
        
        if (!pending) return;
        
        const { item, inventorySlot, targetSlot } = pending;
        const itemName = item.identified ? item.trueName : item.name;
        
        if (quizResult.success && quizResult.score > 0) {
            // Success - equip the item
            if (this.performEquip(item, inventorySlot, targetSlot)) {
                this.messageLog.add(`You successfully equip the ${itemName}!`, 'success');
                
                // Bonus for perfect score
                if (quizResult.score === quizResult.totalQuestions) {
                    this.messageLog.add("Perfect! The equipment feels especially well-fitted.", 'success');
                    // Could add temporary bonus here
                }
            }
        } else {
            // Failure - item may be damaged or have negative effects
            this.handleEquipmentFailure(item, quizResult);
        }
    }
    
    /**
     * Handle equipment failure
     */
    handleEquipmentFailure(item, quizResult) {
        const itemName = item.identified ? item.trueName : item.name;
        
        if (quizResult.score === 0) {
            // Complete failure - item might break or curse
            if (Math.random() < 0.3) {
                this.messageLog.add(`The ${itemName} crumbles as you try to equip it!`, 'danger');
                // Remove item from inventory
                this.inventorySystem.consumeItem(this.pendingEquip.inventorySlot, 1);
            } else {
                this.messageLog.add(`You fumble with the ${itemName} and fail to equip it.`, 'warning');
                
                // Chance to curse the item
                if (Math.random() < 0.2 && !item.cursed) {
                    item.cursed = true;
                    this.messageLog.add(`The ${itemName} feels ominous...`, 'danger');
                }
            }
        } else {
            // Partial failure - equip with penalties
            this.messageLog.add(`You awkwardly equip the ${itemName}.`, 'warning');
            
            if (this.performEquip(item, this.pendingEquip.inventorySlot, this.pendingEquip.targetSlot)) {
                // Apply temporary penalty for poor performance
                this.applyEquipmentPenalty(item, quizResult.score);
            }
        }
    }
    
    /**
     * Actually perform the equipment change
     */
    performEquip(item, inventorySlot, targetSlot) {
        // Mark item as equipped in inventory
        item.equipped = true;
        item.equipSlot = targetSlot;
        
        // Add to equipment slots
        this.equipment[targetSlot] = { ...item };
        
        // Update player stats based on equipment
        this.updatePlayerStats();
        
        // Update player equipment reference for other systems
        this.player.equipment = { ...this.equipment };
        
        EventBus.emit(EVENTS.ITEM_EQUIPPED, {
            item: item,
            slot: targetSlot,
            inventorySlot: inventorySlot
        });
        
        return true;
    }
    
    /**
     * Unequip item
     */
    unequipItem(item, inventorySlot) {
        if (!item || !item.equipped) {
            this.messageLog.add("That item is not equipped.", 'warning');
            return false;
        }
        
        // Check if cursed
        if (item.cursed) {
            this.messageLog.add(`The ${item.name} is welded to your body!`, 'danger');
            return false;
        }
        
        const targetSlot = item.equipSlot;
        const slotInfo = EQUIPMENT_SLOTS[targetSlot];
        
        // Some items might require quiz to unequip
        if (slotInfo.quiz && this.requiresUnequipQuiz(item)) {
            this.pendingUnequip = {
                item: item,
                inventorySlot: inventorySlot,
                targetSlot: targetSlot
            };
            
            this.startUnequipQuiz(item, slotInfo);
            return true;
        } else {
            return this.performUnequip(item, inventorySlot, targetSlot);
        }
    }
    
    /**
     * Check if item requires quiz to unequip
     */
    requiresUnequipQuiz(item) {
        // Only very complex or magical items require unequip quiz
        return item.magical || (item.enchantment && Math.abs(item.enchantment) > 2);
    }
    
    /**
     * Start unequip quiz
     */
    startUnequipQuiz(item, slotInfo) {
        const tier = Math.max(1, this.getItemQuizTier(item) - 1); // Easier than equipping
        
        this.quizEngine.startQuiz({
            subject: slotInfo.subject,
            tier: tier,
            mode: 'threshold',
            threshold: 1,
            timer: this.player.wisdom + 5, // Extra time for unequipping
            context: 'unequip'
        });
        
        this.messageLog.add(`You carefully try to remove the ${item.name}...`, 'action');
    }
    
    /**
     * Resolve unequip quiz
     */
    resolveUnequipQuiz(quizResult) {
        const pending = this.pendingUnequip;
        this.pendingUnequip = null;
        
        if (!pending) return;
        
        const { item, inventorySlot, targetSlot } = pending;
        
        if (quizResult.success && quizResult.score > 0) {
            this.performUnequip(item, inventorySlot, targetSlot);
            this.messageLog.add(`You successfully remove the ${item.name}.`, 'success');
        } else {
            this.messageLog.add("You struggle to remove the item safely.", 'warning');
            
            if (quizResult.score === 0) {
                // Critical failure - item might get stuck (becomes cursed)
                item.cursed = true;
                this.messageLog.add(`The ${item.name} seems stuck to your body!`, 'danger');
            } else {
                // Partial success - remove with damage
                this.performUnequip(item, inventorySlot, targetSlot);
                this.player.hp -= 2;
                this.messageLog.add("You hurt yourself removing the item.", 'danger');
            }
        }
    }
    
    /**
     * Actually perform unequip
     */
    performUnequip(item, inventorySlot, targetSlot) {
        // Remove from equipment slot
        this.equipment[targetSlot] = null;
        
        // Update inventory item
        item.equipped = false;
        delete item.equipSlot;
        
        // Update player stats
        this.updatePlayerStats();
        this.player.equipment = { ...this.equipment };
        
        EventBus.emit(EVENTS.ITEM_UNEQUIPPED, {
            item: item,
            slot: targetSlot,
            inventorySlot: inventorySlot
        });
        
        return true;
    }
    
    /**
     * Unequip item to inventory automatically
     */
    unequipToInventory(targetSlot) {
        const item = this.equipment[targetSlot];
        if (!item) return true;
        
        // Find the item in inventory
        const inventorySlot = this.inventorySystem.items.findIndex(invItem => 
            invItem && invItem.equipped && invItem.equipSlot === targetSlot
        );
        
        if (inventorySlot === -1) {
            this.messageLog.add("Cannot find equipped item in inventory!", 'danger');
            return false;
        }
        
        return this.unequipItem(item, inventorySlot);
    }
    
    /**
     * Get appropriate equipment slot for item
     */
    getEquipmentSlot(item) {
        const mapping = ITEM_TO_SLOT[item.subType || item.type];
        
        if (Array.isArray(mapping)) {
            // Multiple possible slots (like rings) - find first empty one
            for (const slot of mapping) {
                if (!this.equipment[slot]) {
                    return slot;
                }
            }
            // If all occupied, use first slot (will auto-unequip)
            return mapping[0];
        }
        
        return mapping;
    }
    
    /**
     * Apply penalty for poor equipment performance
     */
    applyEquipmentPenalty(item, score) {
        // Temporary penalty that wears off
        const penalty = {
            type: 'equipment_fumble',
            duration: 10, // turns
            effect: { ac: 1 } // Worse AC from poor fit
        };
        
        // This would integrate with effects system when implemented
        this.messageLog.add("The equipment doesn't fit quite right...", 'warning');
    }
    
    /**
     * Update player stats based on equipped items
     */
    updatePlayerStats() {
        // Reset equipment bonuses
        this.player.equipmentBonus = {
            ac: 0,
            damage: 0,
            hp: 0,
            mp: 0,
            wisdom: 0,
            perception: 0
        };
        
        // Apply bonuses from all equipped items
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item) {
                this.applyItemStats(item);
            }
        }
        
        // Recalculate total stats
        this.player.updateStats();
        
        EventBus.emit(EVENTS.PLAYER_STATS_CHANGED, {
            equipment: this.equipment,
            bonuses: this.player.equipmentBonus
        });
    }
    
    /**
     * Apply stat bonuses from individual item
     */
    applyItemStats(item) {
        const bonus = this.player.equipmentBonus;
        
        // Base item bonuses
        if (item.ac) bonus.ac += item.ac;
        if (item.damage) bonus.damage += item.damage;
        if (item.hp) bonus.hp += item.hp;
        if (item.mp) bonus.mp += item.mp;
        if (item.wisdom) bonus.wisdom += item.wisdom;
        if (item.perception) bonus.perception += item.perception;
        
        // Enchantment bonuses
        if (item.enchantment) {
            switch (item.type) {
                case 'weapon':
                    bonus.damage += item.enchantment;
                    break;
                case 'armor':
                    bonus.ac -= item.enchantment; // Lower AC is better
                    break;
                case 'accessory':
                    // Accessories might affect various stats
                    if (item.subType === 'ring') {
                        bonus.wisdom += item.enchantment;
                    }
                    break;
            }
        }
        
        // BUC effects
        if (item.blessed) {
            // Blessed items provide small bonus
            bonus.ac -= 1;
        } else if (item.cursed) {
            // Cursed items provide penalty
            bonus.ac += 1;
        }
    }
    
    /**
     * Show wearable items from inventory
     */
    showWearableItems() {
        const wearableItems = this.inventorySystem.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item && this.isWearable(item) && !item.equipped);
        
        if (wearableItems.length === 0) {
            this.messageLog.add("You have nothing to wear.", 'info');
            return;
        }
        
        EventBus.emit(EVENTS.UI_SHOW_ITEM_LIST, {
            title: "What do you want to wear?",
            items: wearableItems,
            action: 'wear'
        });
    }
    
    /**
     * Show weapons from inventory
     */
    showWeapons() {
        const weapons = this.inventorySystem.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item && item.type === 'weapon' && !item.equipped);
        
        if (weapons.length === 0) {
            this.messageLog.add("You have no weapons to wield.", 'info');
            return;
        }
        
        EventBus.emit(EVENTS.UI_SHOW_ITEM_LIST, {
            title: "What do you want to wield?",
            items: weapons,
            action: 'wield'
        });
    }
    
    /**
     * Show equipped items for removal
     */
    showEquippedItems() {
        const equipped = Object.entries(this.equipment)
            .filter(([slot, item]) => item !== null)
            .map(([slot, item]) => ({
                item,
                slot,
                index: this.inventorySystem.items.findIndex(invItem => 
                    invItem && invItem.equipped && invItem.equipSlot === slot
                )
            }));
        
        if (equipped.length === 0) {
            this.messageLog.add("You're not wearing anything.", 'info');
            return;
        }
        
        EventBus.emit(EVENTS.UI_SHOW_ITEM_LIST, {
            title: "What do you want to remove?",
            items: equipped,
            action: 'remove'
        });
    }
    
    /**
     * Check if item is wearable
     */
    isWearable(item) {
        return item.type === 'armor' || item.type === 'accessory';
    }
    
    /**
     * Open equipment screen
     */
    openEquipmentScreen() {
        EventBus.emit(EVENTS.UI_SHOW_EQUIPMENT, {
            equipment: this.equipment,
            slots: EQUIPMENT_SLOTS
        });
    }
    
    /**
     * Get equipment status for UI
     */
    getEquipmentStatus() {
        return {
            equipment: { ...this.equipment },
            slots: EQUIPMENT_SLOTS,
            bonuses: this.player.equipmentBonus
        };
    }
    
    /**
     * Save equipment state
     */
    save() {
        return {
            equipment: this.equipment
        };
    }
    
    /**
     * Load equipment state
     */
    load(data) {
        this.equipment = data.equipment || {};
        
        // Ensure all slots exist
        for (const slot in EQUIPMENT_SLOTS) {
            if (!(slot in this.equipment)) {
                this.equipment[slot] = null;
            }
        }
        
        // Update player equipment reference
        this.player.equipment = { ...this.equipment };
        this.updatePlayerStats();
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        EventBus.off(EVENTS.EQUIPMENT_EQUIP);
        EventBus.off(EVENTS.EQUIPMENT_UNEQUIP);
        EventBus.off(EVENTS.QUIZ_COMPLETE);
        EventBus.off(EVENTS.UI_OPEN_EQUIPMENT);
        EventBus.off(EVENTS.PLAYER_WEAR);
        EventBus.off(EVENTS.PLAYER_WIELD);
        EventBus.off(EVENTS.PLAYER_REMOVE);
    }
}