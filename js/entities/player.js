/**
 * player.js - Player entity with 6-stat RPG system
 * Handles all player state, attributes, and derived statistics
 * CORRECTED VERSION - Fixed all compatibility issues
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Player {
    constructor(name = 'Scholar') {
        this.name = name;
        
        // Position
        this.x = 0;
        this.y = 0;
        
        // Base Attributes (all start at 10)
        this.strength = 10;      // STR - Affects carrying capacity
        this.constitution = 10;   // CON - Affects HP and SP
        this.dexterity = 10;     // DEX - Affects AC
        this.intelligence = 10;  // INT - Affects max spells
        this.wisdom = 10;        // WIS - Affects quiz timer
        this.perception = 10;    // PER - Affects sight radius
        
        // Derived Stats (calculated from attributes)
        this.maxHp = this.calculateMaxHp();
        this.hp = this.maxHp;
        
        this.maxSp = this.calculateMaxSp();
        this.sp = this.maxSp;
        
        this.maxMp = this.calculateMaxMp();
        this.mp = this.maxMp;
        
        this.ac = this.calculateAC();
        this.carryingCapacity = this.calculateCarryCapacity(); // Use single name
        this.sightRadius = this.calculateSightRadius();
        
        // Saving Throws
        this.fortitude = 0;  // CON-based
        this.reflex = 0;     // DEX-based
        this.will = 0;       // WIS-based
        
        // Inventory & Equipment - CORRECTED structure
        this.inventory = [];
        
        // Use 'equipped' for compatibility with other systems
        this.equipped = {
            weapon: null,
            armor: {
                head: null,
                body: null,
                cloak: null,
                gloves: null,
                boots: null,
                shield: null
            },
            accessories: {
                ring1: null,
                ring2: null,
                amulet: null
            }
        };
        
        // Keep old 'equipment' as alias for backwards compatibility
        this.equipment = this.equipped;
        
        // Status
        this.currentWeight = 0;
        this.effects = [];  // Status effects (poisoned, blessed, etc.)
        this.starving = false;
        
        // Detection cooldowns (for hidden object detection)
        this.detectCooldowns = {};
        
        // Game progress tracking
        this.level = 1;
        this.turnsSurvived = 0;
        
        this.updateDerivedStats();
    }
    
    /**
     * Calculate maximum HP based on Constitution
     */
    calculateMaxHp() {
        // Base 10 + (CON-10)/2, minimum 1
        return Math.max(1, 10 + Math.floor((this.constitution - 10) / 2));
    }
    
    /**
     * Calculate maximum SP based on Constitution
     */
    calculateMaxSp() {
        // Base 100 + (CON-10)*2
        return 100 + (this.constitution - 10) * 2;
    }
    
    /**
     * Calculate maximum MP based on Intelligence
     */
    calculateMaxMp() {
        // INT * 2
        return this.intelligence * 2;
    }
    
    /**
     * Calculate Armor Class based on Dexterity
     */
    calculateAC() {
        // Base 10 + (DEX-10)/2
        return 10 + Math.floor((this.dexterity - 10) / 2);
    }
    
    /**
     * Get current AC (for UI compatibility)
     */
    getAC() {
        return this.ac;
    }
    
    /**
     * Get total AC including equipment bonuses
     */
    getTotalAC() {
        let totalAC = this.ac;
        
        // Add armor bonuses
        if (this.equipped.armor) {
            Object.values(this.equipped.armor).forEach(item => {
                if (item && item.acBonus) {
                    totalAC += item.acBonus;
                }
            });
        }
        
        // Add shield bonus
        if (this.equipped.armor.shield && this.equipped.armor.shield.acBonus) {
            totalAC += this.equipped.armor.shield.acBonus;
        }
        
        // Add accessory bonuses
        if (this.equipped.accessories) {
            Object.values(this.equipped.accessories).forEach(item => {
                if (item && item.acBonus) {
                    totalAC += item.acBonus;
                }
            });
        }
        
        return totalAC;
    }
    
    /**
     * Calculate carrying capacity based on Strength
     */
    calculateCarryCapacity() {
        // Base 50 + STR*2
        return 50 + this.strength * 2;
    }
    
    /**
     * Calculate sight radius based on Perception
     */
    calculateSightRadius() {
        // Base 3 + PER/5
        return 3 + Math.floor(this.perception / 5);
    }
    
    /**
     * Get current sight radius (public method)
     */
    getSightRadius() {
        return this.sightRadius;
    }
    
    /**
     * Update all derived statistics
     */
    updateDerivedStats() {
        // Recalculate all derived stats
        const oldMaxHp = this.maxHp;
        const oldMaxSp = this.maxSp;
        const oldMaxMp = this.maxMp;
        
        this.maxHp = this.calculateMaxHp();
        this.maxSp = this.calculateMaxSp();
        this.maxMp = this.calculateMaxMp();
        this.ac = this.calculateAC();
        this.carryingCapacity = this.calculateCarryCapacity();
        this.sightRadius = this.calculateSightRadius();
        
        // Adjust current values if max increased
        if (this.maxHp > oldMaxHp) {
            this.hp += (this.maxHp - oldMaxHp);
        }
        if (this.maxSp > oldMaxSp) {
            this.sp += (this.maxSp - oldMaxSp);
        }
        if (this.maxMp > oldMaxMp) {
            this.mp += (this.maxMp - oldMaxMp);
        }
        
        // Calculate saving throws
        this.fortitude = Math.floor((this.constitution - 10) / 2);
        this.reflex = Math.floor((this.dexterity - 10) / 2);
        this.will = Math.floor((this.wisdom - 10) / 2);
        
        // Update weight and burden
        this.updateWeight();
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            player: this
        });
    }
    
    /**
     * Update stats (alias for equipment system compatibility)
     */
    updateStats() {
        this.updateDerivedStats();
    }
    
    /**
     * Increase an attribute permanently
     */
    increaseAttribute(attribute, amount = 1) {
        const validAttributes = ['strength', 'constitution', 'dexterity', 'intelligence', 'wisdom', 'perception'];
        
        if (!validAttributes.includes(attribute)) {
            console.warn(`Invalid attribute: ${attribute}`);
            return false;
        }
        
        this[attribute] += amount;
        this.updateDerivedStats();
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            attribute: attribute,
            newValue: this[attribute],
            change: amount
        });
        
        return true;
    }
    
    /**
     * Move player to new position and emit events
     */
    move(x, y) {
        this.x = x;
        this.y = y;
        
        // Emit movement event for other systems
        EventBus.emit(EVENTS.PLAYER_MOVE, {
            x: this.x,
            y: this.y,
            blocked: false
        });
    }
    
    /**
     * Consume SP (for movement and actions) - FIXED overflow calculation
     */
    consumeSP(amount) {
        const previousSP = this.sp;
        this.sp -= amount;
        
        if (this.sp < 0) {
            // Calculate overflow BEFORE setting SP to 0
            const overflow = Math.abs(this.sp);
            this.sp = 0;
            
            if (!this.starving) {
                this.starving = true;
                EventBus.emit(EVENTS.PLAYER_STARVING);
            }
            
            // HP damage from starvation
            this.hp -= overflow;
            
            if (this.hp <= 0) {
                this.hp = 0;
                EventBus.emit(EVENTS.PLAYER_DEATH);
            }
        }
        
        EventBus.emit(EVENTS.PLAYER_SP_CHANGE, {
            current: this.sp,
            max: this.maxSp,
            starving: this.starving,
            consumed: amount
        });
    }
    
    /**
     * Restore SP (from eating)
     */
    restoreSP(amount) {
        this.sp = Math.min(this.maxSp, this.sp + amount);
        
        if (this.sp > 0 && this.starving) {
            this.starving = false;
        }
        
        EventBus.emit(EVENTS.PLAYER_SP_CHANGE, {
            current: this.sp,
            max: this.maxSp,
            starving: this.starving
        });
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        this.hp -= amount;
        
        if (this.hp <= 0) {
            this.hp = 0;
            EventBus.emit(EVENTS.PLAYER_DEATH);
        }
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            stat: 'hp',
            current: this.hp,
            max: this.maxHp
        });
    }
    
    /**
     * Heal HP
     */
    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            stat: 'hp',
            current: this.hp,
            max: this.maxHp
        });
    }
    
    /**
     * Restore MP
     */
    restoreMP(amount) {
        this.mp = Math.min(this.maxMp, this.mp + amount);
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            stat: 'mp',
            current: this.mp,
            max: this.maxMp
        });
    }
    
    /**
     * Add an effect
     */
    addEffect(effect, duration = undefined) {
        // Handle both effect objects and simple string effects
        if (typeof effect === 'string') {
            effect = {
                type: effect,
                name: effect,
                duration: duration
            };
        }
        
        // Check if effect already exists
        const existing = this.effects.find(e => e.type === effect.type);
        if (existing) {
            // Refresh duration
            existing.duration = Math.max(existing.duration || 0, effect.duration || 0);
        } else {
            this.effects.push(effect);
            EventBus.emit(EVENTS.EFFECT_ADDED, { effect, target: this });
        }
    }
    
    /**
     * Remove an effect
     */
    removeEffect(effectType) {
        const index = this.effects.findIndex(e => 
            e.type === effectType || e.name === effectType
        );
        if (index !== -1) {
            const effect = this.effects.splice(index, 1)[0];
            EventBus.emit(EVENTS.EFFECT_REMOVED, { effect, target: this });
        }
    }
    
    /**
     * Process effects (called each turn)
     */
    processEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            
            // Apply effect
            if (effect.onTurn) {
                effect.onTurn(this);
            }
            
            // Decrease duration
            if (effect.duration !== undefined && effect.duration > 0) {
                effect.duration--;
                
                if (effect.duration <= 0) {
                    this.removeEffect(effect.type);
                }
            }
        }
    }
    
    /**
     * Make a saving throw
     */
    makeSavingThrow(type, dc) {
        let bonus = 0;
        
        switch (type) {
            case 'fortitude':
                bonus = this.fortitude;
                break;
            case 'reflex':
                bonus = this.reflex;
                break;
            case 'will':
                bonus = this.will;
                break;
            default:
                console.warn(`Unknown saving throw type: ${type}`);
        }
        
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + bonus;
        const success = total >= dc;
        
        EventBus.emit(EVENTS.SAVING_THROW, {
            type,
            roll,
            bonus,
            total,
            dc,
            success
        });
        
        return success;
    }
    
    /**
     * Get current total weight carried
     */
    getCurrentWeight() {
        let totalWeight = 0;
        
        // Count inventory items
        this.inventory.forEach(item => {
            const weight = item.weight || 1;
            const quantity = item.quantity || 1;
            totalWeight += weight * quantity;
        });
        
        // Count equipped items
        if (this.equipped.weapon) {
            totalWeight += this.equipped.weapon.weight || 1;
        }
        
        Object.values(this.equipped.armor).forEach(item => {
            if (item) totalWeight += item.weight || 1;
        });
        
        Object.values(this.equipped.accessories).forEach(item => {
            if (item) totalWeight += item.weight || 1;
        });
        
        return totalWeight;
    }
    
    /**
     * Update weight (called when inventory changes)
     */
    updateWeight() {
        this.currentWeight = this.getCurrentWeight();
        this.applyBurdenEffects();
    }
    
    /**
     * Check if player is burdened by weight
     */
    getBurdenLevel() {
        const weight = this.currentWeight;
        const capacity = this.carryingCapacity;
        
        if (weight <= capacity * 0.5) return 'none';
        if (weight <= capacity * 0.75) return 'burdened';
        if (weight <= capacity) return 'stressed';
        if (weight <= capacity * 1.25) return 'strained';
        if (weight <= capacity * 1.5) return 'overtaxed';
        return 'overloaded';
    }
    
    /**
     * Apply burden effects based on weight
     */
    applyBurdenEffects() {
        const burden = this.getBurdenLevel();
        
        // Remove all burden effects first
        this.removeEffect('burdened');
        this.removeEffect('stressed');
        this.removeEffect('strained');
        this.removeEffect('overtaxed');
        this.removeEffect('overloaded');
        
        // Apply new burden effect if needed
        if (burden !== 'none') {
            this.addEffect(burden, 999); // Permanent while over-weight
        }
    }
    
    /**
     * Check if player has a specific effect
     */
    hasEffect(effectType) {
        return this.effects.some(e => 
            e.type === effectType || e.name === effectType
        );
    }
    
    /**
     * Update method (called each game loop/turn)
     */
    update() {
        // Reduce detection cooldowns
        Object.keys(this.detectCooldowns).forEach(type => {
            if (this.detectCooldowns[type] > 0) {
                this.detectCooldowns[type]--;
            }
        });
        
        // Process status effects (reduce durations)
        const expiredEffects = [];
        this.effects.forEach(effect => {
            // If effect has duration, reduce it
            if (effect.duration !== undefined && effect.duration > 0) {
                effect.duration--;
                if (effect.duration <= 0) {
                    expiredEffects.push(effect);
                }
            }
        });
        
        // Remove expired effects
        expiredEffects.forEach(effect => this.removeEffect(effect.type || effect.name));
    }
    
    /**
     * Regenerate (called periodically)
     */
    regenerate() {
        // Slowly regenerate HP if not starving
        if (!this.starving && this.hp < this.maxHp) {
            this.heal(1);
        }
        
        // Slowly regenerate MP
        if (this.mp < this.maxMp) {
            this.restoreMP(1);
        }
    }
    
    /**
     * Get quiz timer based on Wisdom
     */
    getQuizTimer() {
        return this.wisdom;
    }
    
    /**
     * Get max spells based on Intelligence
     */
    getMaxSpells() {
        return Math.floor(this.intelligence / 3);
    }
    
    // ========== INVENTORY MANAGEMENT ==========
    
    /**
     * Add item to inventory
     */
    addToInventory(item) {
        // Check if we can stack with existing item
        if (item.stackable) {
            const existing = this.inventory.find(i => 
                i.id === item.id && 
                i.canStackWith && 
                i.canStackWith(item)
            );
            
            if (existing) {
                existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
                this.updateWeight();
                return true;
            }
        }
        
        // Add as new item
        this.inventory.push(item);
        this.updateWeight();
        
        EventBus.emit(EVENTS.ITEM_PICKED_UP, { item });
        return true;
    }
    
    /**
     * Remove item from inventory
     */
    removeFromInventory(item) {
        const index = this.inventory.indexOf(item);
        if (index > -1) {
            this.inventory.splice(index, 1);
            this.updateWeight();
            return true;
        }
        return false;
    }
    
    /**
     * Drop item at current position
     */
    dropItem(item) {
        if (this.removeFromInventory(item)) {
            item.x = this.x;
            item.y = this.y;
            EventBus.emit(EVENTS.ITEM_DROPPED, { item, x: this.x, y: this.y });
            return true;
        }
        return false;
    }
    
    /**
     * Equip an item
     */
    equipItem(item) {
        if (!item || !item.equipSlot) return false;
        
        // Check if cursed item is blocking the slot
        let currentItem = null;
        
        if (item.type === 'weapon') {
            currentItem = this.equipped.weapon;
        } else if (item.type === 'armor') {
            currentItem = this.equipped.armor[item.equipSlot];
        } else if (item.type === 'ring') {
            // Find empty ring slot or replace first
            if (!this.equipped.accessories.ring1) {
                this.equipped.accessories.ring1 = item;
            } else if (!this.equipped.accessories.ring2) {
                this.equipped.accessories.ring2 = item;
            } else {
                currentItem = this.equipped.accessories.ring1;
                this.equipped.accessories.ring1 = item;
            }
        } else if (item.type === 'amulet') {
            currentItem = this.equipped.accessories.amulet;
            this.equipped.accessories.amulet = item;
        }
        
        // Can't unequip cursed items
        if (currentItem && currentItem.cursed) {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${currentItem.name} is cursed and cannot be removed!`, 'warning');
            return false;
        }
        
        // Unequip current item if any
        if (currentItem) {
            this.unequipItem(currentItem);
        }
        
        // Equip new item
        item.equipped = true;
        
        if (item.type === 'weapon') {
            this.equipped.weapon = item;
        } else if (item.type === 'armor') {
            this.equipped.armor[item.equipSlot] = item;
        }
        
        // Remove from inventory
        this.removeFromInventory(item);
        
        // Update stats for equipment bonuses
        this.updateDerivedStats();
        
        EventBus.emit(EVENTS.ITEM_EQUIPPED, { item });
        return true;
    }
    
    /**
     * Unequip an item
     */
    unequipItem(item) {
        if (!item || !item.equipped) return false;
        
        item.equipped = false;
        
        // Remove from equipped slots
        if (this.equipped.weapon === item) {
            this.equipped.weapon = null;
        }
        
        Object.keys(this.equipped.armor).forEach(slot => {
            if (this.equipped.armor[slot] === item) {
                this.equipped.armor[slot] = null;
            }
        });
        
        Object.keys(this.equipped.accessories).forEach(slot => {
            if (this.equipped.accessories[slot] === item) {
                this.equipped.accessories[slot] = null;
            }
        });
        
        // Add back to inventory
        this.addToInventory(item);
        
        // Update stats
        this.updateDerivedStats();
        
        EventBus.emit(EVENTS.ITEM_UNEQUIPPED, { item });
        return true;
    }
    
    // ========== SERIALIZATION ==========
    
    /**
     * Serialize player data for saving
     */
    serialize() {
        return {
            // Core identity
            name: this.name,
            x: this.x,
            y: this.y,
            
            // Attributes
            strength: this.strength,
            constitution: this.constitution,
            dexterity: this.dexterity,
            intelligence: this.intelligence,
            wisdom: this.wisdom,
            perception: this.perception,
            
            // Current stats
            hp: this.hp,
            maxHp: this.maxHp,
            sp: this.sp,
            maxSp: this.maxSp,
            mp: this.mp,
            maxMp: this.maxMp,
            
            // Derived stats
            ac: this.ac,
            carryingCapacity: this.carryingCapacity,
            
            // Equipment (serialize equipped items)
            equipped: {
                weapon: this.equipped.weapon?.serialize ? this.equipped.weapon.serialize() : this.equipped.weapon,
                armor: {
                    head: this.equipped.armor.head?.serialize ? this.equipped.armor.head.serialize() : this.equipped.armor.head,
                    body: this.equipped.armor.body?.serialize ? this.equipped.armor.body.serialize() : this.equipped.armor.body,
                    cloak: this.equipped.armor.cloak?.serialize ? this.equipped.armor.cloak.serialize() : this.equipped.armor.cloak,
                    gloves: this.equipped.armor.gloves?.serialize ? this.equipped.armor.gloves.serialize() : this.equipped.armor.gloves,
                    boots: this.equipped.armor.boots?.serialize ? this.equipped.armor.boots.serialize() : this.equipped.armor.boots,
                    shield: this.equipped.armor.shield?.serialize ? this.equipped.armor.shield.serialize() : this.equipped.armor.shield
                },
                accessories: {
                    ring1: this.equipped.accessories.ring1?.serialize ? this.equipped.accessories.ring1.serialize() : this.equipped.accessories.ring1,
                    ring2: this.equipped.accessories.ring2?.serialize ? this.equipped.accessories.ring2.serialize() : this.equipped.accessories.ring2,
                    amulet: this.equipped.accessories.amulet?.serialize ? this.equipped.accessories.amulet.serialize() : this.equipped.accessories.amulet
                }
            },
            
            // Inventory (serialize all items)
            inventory: this.inventory.map(item => 
                item.serialize ? item.serialize() : item
            ),
            
            // Status effects
            effects: Array.from(this.effects),
            
            // Detection cooldowns
            detectCooldowns: this.detectCooldowns,
            
            // Game progress
            level: this.level,
            turnsSurvived: this.turnsSurvived,
            
            // Status flags
            starving: this.starving
        };
    }
    
    /**
     * Deserialize player data for loading
     */
    deserialize(data) {
        // Core identity
        this.name = data.name || this.name;
        this.x = data.x || 0;
        this.y = data.y || 0;
        
        // Attributes
        this.strength = data.strength || 10;
        this.constitution = data.constitution || 10;
        this.dexterity = data.dexterity || 10;
        this.intelligence = data.intelligence || 10;
        this.wisdom = data.wisdom || 10;
        this.perception = data.perception || 10;
        
        // Recalculate derived stats first
        this.updateDerivedStats();
        
        // Then restore current values
        this.hp = data.hp || this.maxHp;
        this.sp = data.sp || this.maxSp;
        this.mp = data.mp || this.maxMp;
        
        // Equipment (deserialize equipped items if Item class available)
        if (data.equipped) {
            if (data.equipped.weapon) {
                this.equipped.weapon = data.equipped.weapon;
            }
            
            Object.keys(data.equipped.armor || {}).forEach(slot => {
                if (data.equipped.armor[slot]) {
                    this.equipped.armor[slot] = data.equipped.armor[slot];
                }
            });
            
            Object.keys(data.equipped.accessories || {}).forEach(slot => {
                if (data.equipped.accessories[slot]) {
                    this.equipped.accessories[slot] = data.equipped.accessories[slot];
                }
            });
        }
        
        // Inventory (deserialize all items)
        this.inventory = data.inventory || [];
        
        // Status effects
        this.effects = data.effects || [];
        
        // Detection cooldowns
        this.detectCooldowns = data.detectCooldowns || {};
        
        // Game progress
        this.level = data.level || 1;
        this.turnsSurvived = data.turnsSurvived || 0;
        
        // Status flags
        this.starving = data.starving || false;
        
        // Update weight after loading inventory
        this.updateWeight();
        
        // Emit restoration event
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE);
    }
}