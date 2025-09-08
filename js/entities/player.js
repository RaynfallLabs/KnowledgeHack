/**
 * player.js - Player character class
 * Handles player stats, inventory, equipment, and actions
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Player {
    constructor(name = 'Scholar') {
        // Core identity
        this.name = name;
        this.x = 0;
        this.y = 0;
        
        // Primary stats
        this.hp = 100;
        this.maxHp = 100;
        this.sp = 100;  // Stamina
        this.maxSp = 100;
        this.mp = 20;   // Mana
        this.maxMp = 20;
        
        // Attributes
        this.wisdom = CONFIG.STARTING_WISDOM || 15;
        this.perception = 10;
        this.strength = 10;
        this.dexterity = 10;
        this.constitution = 10;
        this.intelligence = 10;
        this.charisma = 10;
        
        // Combat stats
        this.ac = 10;  // Base armor class
        this.damage = '1d4';  // Base damage
        this.attackBonus = 0;
        
        // Inventory
        this.inventory = [];
        this.carryingCapacity = CONFIG.CARRYING_CAPACITY_BASE || 50;
        this.gold = 0;
        
        // Equipment slots - proper armor slots
        this.equipped = {
            weapon: null,
            armor: {
                head: null,    // Helmet
                body: null,    // Chest armor
                arms: null,    // Gauntlets/bracers
                legs: null,    // Greaves/boots
                shield: null   // Shield (off-hand)
            },
            accessories: {
                ring1: null,
                ring2: null,
                amulet: null,
                cloak: null    // Back slot
            }
        };
        
        // Status effects
        this.effects = new Set();
        
        // Detection cooldowns
        this.detectCooldowns = {
            traps: 0,
            secrets: 0,
            monsters: 0
        };
        
        // Game progress
        this.level = 1;
        this.experience = 0;
        this.knowledge = 0;
        this.turnsSurvived = 0;
        
        // Sight radius
        this.sightRadius = CONFIG.SIGHT_RADIUS || 5;
    }
    
    /**
     * Move player to new position and emit events
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    move(x, y) {
        const oldX = this.x;
        const oldY = this.y;
        
        this.x = x;
        this.y = y;
        
        // Emit movement event
        EventBus.emit(EVENTS.PLAYER_MOVED, {
            oldX: oldX,
            oldY: oldY,
            x: this.x,
            y: this.y,
            blocked: false
        });
        
        // Update turn counter
        this.turnsSurvived++;
    }
    
    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @param {string} source - Damage source
     */
    takeDamage(amount, source = 'unknown') {
        const actualDamage = Math.max(0, amount - this.getDefense());
        this.hp = Math.max(0, this.hp - actualDamage);
        
        EventBus.emit(EVENTS.PLAYER_DAMAGED, {
            damage: actualDamage,
            source: source,
            hp: this.hp,
            maxHp: this.maxHp
        });
        
        if (this.hp <= 0) {
            EventBus.emit(EVENTS.PLAYER_DEATH, {
                cause: source,
                level: this.level,
                turns: this.turnsSurvived
            });
        }
        
        return actualDamage;
    }
    
    /**
     * Heal player
     * @param {number} amount - Healing amount
     */
    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const healed = this.hp - oldHp;
        
        if (healed > 0) {
            EventBus.emit(EVENTS.PLAYER_HEALED, {
                amount: healed,
                hp: this.hp,
                maxHp: this.maxHp
            });
        }
        
        return healed;
    }
    
    /**
     * Regenerate resources over time
     */
    regenerate() {
        // Regenerate HP
        if (this.hp < this.maxHp && !this.hasEffect('poisoned')) {
            this.heal(1);
        }
        
        // Regenerate SP
        if (this.sp < this.maxSp) {
            this.sp = Math.min(this.maxSp, this.sp + 2);
        }
        
        // Regenerate MP based on wisdom
        if (this.mp < this.maxMp) {
            const mpRegen = 1 + Math.floor(this.wisdom / 20);
            this.mp = Math.min(this.maxMp, this.mp + mpRegen);
        }
    }
    
    /**
     * Get total defense value from all armor pieces
     */
    getDefense() {
        let defense = 0;
        
        // Add armor values from all equipped pieces
        if (this.equipped.armor.head) {
            defense += this.equipped.armor.head.defense || 0;
        }
        if (this.equipped.armor.body) {
            defense += this.equipped.armor.body.defense || 0;
        }
        if (this.equipped.armor.arms) {
            defense += this.equipped.armor.arms.defense || 0;
        }
        if (this.equipped.armor.legs) {
            defense += this.equipped.armor.legs.defense || 0;
        }
        if (this.equipped.armor.shield) {
            defense += this.equipped.armor.shield.defense || 0;
        }
        
        // Add dexterity bonus
        defense += Math.floor((this.dexterity - 10) / 2);
        
        return Math.max(0, defense);
    }
    
    /**
     * Get current armor class (AC)
     * This is what UIManager calls
     */
    getAC() {
        let ac = this.ac || 10;  // Base AC
        
        // Add AC bonuses from all armor pieces
        if (this.equipped.armor.head) {
            ac += this.equipped.armor.head.ac || 0;
        }
        if (this.equipped.armor.body) {
            ac += this.equipped.armor.body.ac || 0;
        }
        if (this.equipped.armor.arms) {
            ac += this.equipped.armor.arms.ac || 0;
        }
        if (this.equipped.armor.legs) {
            ac += this.equipped.armor.legs.ac || 0;
        }
        if (this.equipped.armor.shield) {
            ac += this.equipped.armor.shield.ac || 0;
        }
        
        // Add dexterity modifier
        ac += Math.floor((this.dexterity - 10) / 2);
        
        // Add any magical bonuses from accessories
        if (this.equipped.accessories.ring1?.ac) {
            ac += this.equipped.accessories.ring1.ac;
        }
        if (this.equipped.accessories.ring2?.ac) {
            ac += this.equipped.accessories.ring2.ac;
        }
        if (this.equipped.accessories.amulet?.ac) {
            ac += this.equipped.accessories.amulet.ac;
        }
        
        return ac;
    }
    
    /**
     * Get sight radius
     */
    getSightRadius() {
        let radius = this.sightRadius;
        
        // Modify by perception
        radius += Math.floor((this.perception - 10) / 3);
        
        // Check for vision effects
        if (this.hasEffect('blind')) radius = 0;
        if (this.hasEffect('darkness')) radius = Math.max(1, radius - 3);
        if (this.hasEffect('see_invisible')) radius += 2;
        
        // Check for light-giving items
        if (this.equipped.accessories.amulet?.light) {
            radius += this.equipped.accessories.amulet.light;
        }
        
        return Math.max(0, radius);
    }
    
    /**
     * Add item to inventory
     * @param {Object} item - Item to add
     */
    addItem(item) {
        // Check weight limit
        if (this.getCurrentWeight() + (item.weight || 1) > this.carryingCapacity) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: 'You cannot carry that much weight!',
                type: 'warning'
            });
            return false;
        }
        
        // Check for stackable items
        const existing = this.inventory.find(i => 
            i.type === item.type && 
            i.name === item.name && 
            i.stackable
        );
        
        if (existing) {
            existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        } else {
            this.inventory.push(item);
        }
        
        EventBus.emit(EVENTS.ITEM_PICKED_UP, {
            item: item,
            player: this
        });
        
        return true;
    }
    
    /**
     * Remove item from inventory
     * @param {Object} item - Item to remove
     */
    removeItem(item) {
        const index = this.inventory.indexOf(item);
        if (index !== -1) {
            this.inventory.splice(index, 1);
            
            EventBus.emit(EVENTS.ITEM_DROPPED, {
                item: item,
                x: this.x,
                y: this.y
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * Equip an item
     * @param {Object} item - Item to equip
     */
    equip(item) {
        if (!item.equippable) return false;
        
        const slot = this.getEquipmentSlot(item);
        if (!slot) return false;
        
        // Unequip current item in slot
        const current = this.getEquippedInSlot(slot);
        if (current) {
            this.unequip(current);
        }
        
        // Equip new item
        this.setEquippedInSlot(slot, item);
        
        // Remove from inventory
        this.removeItem(item);
        
        EventBus.emit(EVENTS.ITEM_EQUIPPED, {
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Unequip an item
     * @param {Object} item - Item to unequip
     */
    unequip(item) {
        const slot = this.findEquippedSlot(item);
        if (!slot) return false;
        
        // Add to inventory
        if (!this.addItem(item)) {
            return false;  // Can't unequip if inventory full
        }
        
        // Remove from equipment
        this.setEquippedInSlot(slot, null);
        
        EventBus.emit(EVENTS.ITEM_UNEQUIPPED, {
            item: item,
            slot: slot
        });
        
        return true;
    }
    
    /**
     * Get equipment slot for item type
     */
    getEquipmentSlot(item) {
        if (item.type === 'weapon') return 'weapon';
        
        if (item.type === 'armor') {
            // Map armor subtypes to proper slots
            switch(item.subtype) {
                case 'helmet':
                case 'head':
                    return 'armor.head';
                case 'chestplate':
                case 'mail':
                case 'body':
                    return 'armor.body';
                case 'gauntlets':
                case 'gloves':
                case 'arms':
                    return 'armor.arms';
                case 'greaves':
                case 'boots':
                case 'legs':
                    return 'armor.legs';
                case 'shield':
                    return 'armor.shield';
                default:
                    return 'armor.body';  // Default to body
            }
        }
        
        if (item.type === 'accessory') {
            switch(item.subtype) {
                case 'ring':
                    // Try ring1 first, then ring2
                    return !this.equipped.accessories.ring1 ? 'accessories.ring1' : 'accessories.ring2';
                case 'amulet':
                    return 'accessories.amulet';
                case 'cloak':
                    return 'accessories.cloak';
                default:
                    return null;
            }
        }
        
        return null;
    }
    
    /**
     * Get equipped item in slot
     */
    getEquippedInSlot(slot) {
        const parts = slot.split('.');
        let current = this.equipped;
        for (const part of parts) {
            current = current[part];
        }
        return current;
    }
    
    /**
     * Set equipped item in slot
     */
    setEquippedInSlot(slot, item) {
        const parts = slot.split('.');
        let current = this.equipped;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = item;
    }
    
    /**
     * Find which slot an item is equipped in
     */
    findEquippedSlot(item) {
        if (this.equipped.weapon === item) return 'weapon';
        
        for (const [key, value] of Object.entries(this.equipped.armor)) {
            if (value === item) return `armor.${key}`;
        }
        
        for (const [key, value] of Object.entries(this.equipped.accessories)) {
            if (value === item) return `accessories.${key}`;
        }
        
        return null;
    }
    
    /**
     * Add status effect
     * @param {string} effect - Effect name
     * @param {number} duration - Duration in turns (-1 for permanent)
     */
    addEffect(effect, duration = -1) {
        this.effects.add({
            name: effect,
            duration: duration
        });
        
        EventBus.emit(EVENTS.EFFECT_ADDED, {
            entity: this,
            effect: effect,
            duration: duration
        });
    }
    
    /**
     * Remove status effect
     * @param {string} effect - Effect name
     */
    removeEffect(effect) {
        const toRemove = Array.from(this.effects).find(e => e.name === effect);
        if (toRemove) {
            this.effects.delete(toRemove);
            
            EventBus.emit(EVENTS.EFFECT_REMOVED, {
                entity: this,
                effect: effect
            });
        }
    }
    
    /**
     * Check if has status effect
     * @param {string} effect - Effect name
     */
    hasEffect(effect) {
        return Array.from(this.effects).some(e => e.name === effect);
    }
    
    /**
     * Get current total weight carried
     * @returns {number} Total weight
     */
    getCurrentWeight() {
        let totalWeight = 0;
        
        // Count inventory items
        this.inventory.forEach(item => {
            totalWeight += (item.weight || 1) * (item.quantity || 1);
        });
        
        // Count equipped items
        if (this.equipped.weapon) {
            totalWeight += this.equipped.weapon.weight || 1;
        }
        
        // Count all armor pieces
        Object.values(this.equipped.armor).forEach(item => {
            if (item) totalWeight += item.weight || 1;
        });
        
        Object.values(this.equipped.accessories).forEach(item => {
            if (item) totalWeight += item.weight || 1;
        });
        
        return totalWeight;
    }
    
    /**
     * Check if player is burdened by weight
     * @returns {string} Burden level
     */
    getBurdenLevel() {
        const weight = this.getCurrentWeight();
        const capacity = this.carryingCapacity;
        
        if (weight <= capacity * 0.5) return 'none';
        if (weight <= capacity * 0.75) return 'burdened';
        if (weight <= capacity) return 'stressed';
        if (weight <= capacity * 1.25) return 'strained';
        if (weight <= capacity * 1.5) return 'overtaxed';
        return 'overloaded';
    }
    
    /**
     * Apply burden effects to player
     */
    applyBurdenEffects() {
        const burden = this.getBurdenLevel();
        
        // Remove previous burden effects
        this.removeEffect('burdened');
        this.removeEffect('stressed');
        this.removeEffect('strained');
        this.removeEffect('overtaxed');
        this.removeEffect('overloaded');
        
        // Apply new burden effect
        if (burden !== 'none') {
            this.addEffect(burden, 999); // Permanent while over-weight
        }
    }
    
    /**
     * Update method called each game loop
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
                if (effect.duration === 0) {
                    expiredEffects.push(effect);
                }
            }
        });
        
        // Remove expired effects
        expiredEffects.forEach(effect => this.removeEffect(effect.name));
        
        // Apply burden effects
        this.applyBurdenEffects();
    }
    
    /**
     * Serialize player data for saving
     * @returns {Object} Player save data
     */
    serialize() {
        return {
            // Core identity
            name: this.name,
            x: this.x,
            y: this.y,
            
            // Stats
            hp: this.hp,
            maxHp: this.maxHp,
            sp: this.sp,
            maxSp: this.maxSp,
            mp: this.mp,
            maxMp: this.maxMp,
            
            // Attributes
            wisdom: this.wisdom,
            perception: this.perception,
            strength: this.strength,
            dexterity: this.dexterity,
            constitution: this.constitution,
            intelligence: this.intelligence,
            charisma: this.charisma,
            
            // Combat stats
            ac: this.ac,
            damage: this.damage,
            attackBonus: this.attackBonus,
            
            // Inventory
            carryingCapacity: this.carryingCapacity,
            gold: this.gold,
            inventory: this.inventory.map(item => item.serialize ? item.serialize() : item),
            
            // Equipment (serialize equipped items)
            equipped: {
                weapon: this.equipped.weapon?.serialize ? this.equipped.weapon.serialize() : this.equipped.weapon,
                armor: {
                    head: this.equipped.armor.head?.serialize ? this.equipped.armor.head.serialize() : this.equipped.armor.head,
                    body: this.equipped.armor.body?.serialize ? this.equipped.armor.body.serialize() : this.equipped.armor.body,
                    arms: this.equipped.armor.arms?.serialize ? this.equipped.armor.arms.serialize() : this.equipped.armor.arms,
                    legs: this.equipped.armor.legs?.serialize ? this.equipped.armor.legs.serialize() : this.equipped.armor.legs,
                    shield: this.equipped.armor.shield?.serialize ? this.equipped.armor.shield.serialize() : this.equipped.armor.shield
                },
                accessories: {
                    ring1: this.equipped.accessories.ring1?.serialize ? this.equipped.accessories.ring1.serialize() : this.equipped.accessories.ring1,
                    ring2: this.equipped.accessories.ring2?.serialize ? this.equipped.accessories.ring2.serialize() : this.equipped.accessories.ring2,
                    amulet: this.equipped.accessories.amulet?.serialize ? this.equipped.accessories.amulet.serialize() : this.equipped.accessories.amulet,
                    cloak: this.equipped.accessories.cloak?.serialize ? this.equipped.accessories.cloak.serialize() : this.equipped.accessories.cloak
                }
            },
            
            // Status effects
            effects: Array.from(this.effects),
            
            // Detection cooldowns
            detectCooldowns: this.detectCooldowns,
            
            // Game progress
            level: this.level,
            experience: this.experience,
            knowledge: this.knowledge,
            turnsSurvived: this.turnsSurvived,
            
            // Vision
            sightRadius: this.sightRadius
        };
    }
    
    /**
     * Restore player data from save
     * @param {Object} data - Player save data
     */
    deserialize(data) {
        // Core identity
        this.name = data.name;
        this.x = data.x;
        this.y = data.y;
        
        // Stats
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.sp = data.sp;
        this.maxSp = data.maxSp;
        this.mp = data.mp;
        this.maxMp = data.maxMp;
        
        // Attributes
        this.wisdom = data.wisdom;
        this.perception = data.perception;
        this.strength = data.strength || 10;
        this.dexterity = data.dexterity || 10;
        this.constitution = data.constitution || 10;
        this.intelligence = data.intelligence || 10;
        this.charisma = data.charisma || 10;
        
        // Combat stats
        this.ac = data.ac;
        this.damage = data.damage || '1d4';
        this.attackBonus = data.attackBonus || 0;
        
        // Inventory
        this.carryingCapacity = data.carryingCapacity;
        this.gold = data.gold || 0;
        this.inventory = data.inventory || [];
        
        // Equipment - handle both old and new formats
        if (data.equipped) {
            this.equipped = {
                weapon: data.equipped.weapon || null,
                armor: {
                    head: data.equipped.armor?.head || null,
                    body: data.equipped.armor?.body || null,
                    arms: data.equipped.armor?.arms || data.equipped.armor?.gloves || null,
                    legs: data.equipped.armor?.legs || data.equipped.armor?.boots || null,
                    shield: data.equipped.armor?.shield || null
                },
                accessories: {
                    ring1: data.equipped.accessories?.ring1 || null,
                    ring2: data.equipped.accessories?.ring2 || null,
                    amulet: data.equipped.accessories?.amulet || null,
                    cloak: data.equipped.accessories?.cloak || data.equipped.armor?.cloak || null
                }
            };
        }
        
        // Status effects
        this.effects = new Set(data.effects || []);
        
        // Detection cooldowns
        this.detectCooldowns = data.detectCooldowns || {
            traps: 0,
            secrets: 0,
            monsters: 0
        };
        
        // Game progress
        this.level = data.level || 1;
        this.experience = data.experience || 0;
        this.knowledge = data.knowledge || 0;
        this.turnsSurvived = data.turnsSurvived || 0;
        
        // Vision
        this.sightRadius = data.sightRadius || CONFIG.SIGHT_RADIUS || 5;
        
        // Emit restoration event
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE);
    }
}

// Export for use in other modules
export default Player;