/**
 * player.js - Player class for Philosopher's Quest
 * Handles player stats, equipment, inventory, and progression through eating
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Player {
    constructor(name = 'Scholar') {
        // Core identity
        this.name = name;
        this.x = 0;
        this.y = 0;
        
        // Core stats
        this.maxHp = 20;
        this.hp = this.maxHp;
        this.maxMp = 10;
        this.mp = this.maxMp;
        this.maxSp = 100;  // Stamina
        this.sp = this.maxSp;
        
        // Primary attributes
        this.wisdom = CONFIG.STARTING_WISDOM || 15;  // Base timer for quizzes
        this.perception = CONFIG.SIGHT_RADIUS || 3;  // Vision radius
        this.ac = 10;  // Armor class (lower is better in NetHack)
        this.carryingCapacity = CONFIG.CARRYING_CAPACITY_BASE || 50;
        
        // Equipment slots (matches equipment.js structure)
        this.equipment = {
            weapon: null,
            helmet: null,
            armor: null,
            cloak: null,
            gloves: null,
            boots: null,
            amulet: null,
            ring_left: null,
            ring_right: null,
            bracelet: null
        };
        
        // Inventory
        this.inventory = [];
        this.gold = 0;
        
        // Status effects
        this.effects = new Set();
        
        // Detection cooldowns
        this.detectCooldowns = {
            monsters: 0,
            items: 0,
            traps: 0
        };
        
        // Game progress (NO XP - progression through eating)
        this.level = 1;  // Dungeon level, not character level
        this.turnsSurvived = 0;
        this.monstersKilled = 0;
        this.foodEaten = [];  // Track what's been eaten for stat gains
        
        // Equipment bonuses (calculated from equipped items)
        this.equipmentBonus = {
            ac: 0,
            damage: 0,
            hp: 0,
            mp: 0,
            wisdom: 0,
            perception: 0
        };
        
        // Hunger system
        this.nutrition = 900;  // Start well-fed
        this.maxNutrition = 2000;
        
        // Burden tracking
        this.currentWeight = 0;
        this.burdenLevel = 'none';
    }
    
    /**
     * Move player to new position and emit events
     */
    move(x, y) {
        this.x = x;
        this.y = y;
        
        // Hunger from movement
        this.nutrition = Math.max(0, this.nutrition - 1);
        
        // Emit movement event
        EventBus.emit(EVENTS.PLAYER_MOVE, {
            x: this.x,
            y: this.y,
            blocked: false
        });
        
        // Check hunger status
        this.checkHungerStatus();
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
            if (effect.duration !== undefined) {
                effect.duration--;
                if (effect.duration <= 0) {
                    expiredEffects.push(effect);
                }
            }
        });
        
        // Remove expired effects
        expiredEffects.forEach(effect => this.removeEffect(effect.name));
        
        // Update burden level
        this.updateBurdenLevel();
        
        // Increment turn counter
        this.turnsSurvived++;
    }
    
    /**
     * Regenerate HP/MP/SP over time
     */
    regenerate() {
        // Only regenerate if not starving
        if (this.nutrition > 0) {
            // HP regeneration
            if (this.hp < this.getMaxHp()) {
                this.hp = Math.min(this.hp + 1, this.getMaxHp());
                EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, { stat: 'hp', value: this.hp });
            }
            
            // MP regeneration
            if (this.mp < this.getMaxMp()) {
                this.mp = Math.min(this.mp + 1, this.getMaxMp());
                EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, { stat: 'mp', value: this.mp });
            }
        }
        
        // SP always regenerates
        if (this.sp < this.maxSp) {
            this.sp = Math.min(this.sp + 2, this.maxSp);
            EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, { stat: 'sp', value: this.sp });
        }
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, damageType = 'physical', source = null) {
        // Apply armor reduction
        const reduction = Math.max(0, 10 - this.getAC());
        amount = Math.max(1, amount - reduction);
        
        this.hp -= amount;
        
        EventBus.emit(EVENTS.PLAYER_DAMAGED, {
            amount: amount,
            type: damageType,
            source: source,
            hp: this.hp,
            maxHp: this.getMaxHp()
        });
        
        if (this.hp <= 0) {
            this.die();
        }
        
        return amount;
    }
    
    /**
     * Heal HP
     */
    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.hp + amount, this.getMaxHp());
        const healed = this.hp - oldHp;
        
        if (healed > 0) {
            EventBus.emit(EVENTS.PLAYER_HEALED, {
                amount: healed,
                hp: this.hp,
                maxHp: this.getMaxHp()
            });
        }
        
        return healed;
    }
    
    /**
     * Restore MP
     */
    restoreMp(amount) {
        const oldMp = this.mp;
        this.mp = Math.min(this.mp + amount, this.getMaxMp());
        return this.mp - oldMp;
    }
    
    /**
     * Add a status effect
     */
    addEffect(effectName, duration = -1) {
        const effect = {
            name: effectName,
            duration: duration  // -1 = permanent until cured
        };
        
        this.effects.add(effect);
        EventBus.emit(EVENTS.PLAYER_EFFECT_ADDED, effect);
    }
    
    /**
     * Remove a status effect
     */
    removeEffect(effectName) {
        const effect = Array.from(this.effects).find(e => e.name === effectName);
        if (effect) {
            this.effects.delete(effect);
            EventBus.emit(EVENTS.PLAYER_EFFECT_REMOVED, effect);
        }
    }
    
    /**
     * Check if player has a specific effect
     */
    hasEffect(effectName) {
        return Array.from(this.effects).some(e => e.name === effectName);
    }
    
    /**
     * Eat food (primary progression mechanism)
     */
    eatFood(food) {
        // Restore nutrition
        this.nutrition = Math.min(this.nutrition + food.nutrition, this.maxNutrition);
        
        // If it's a cooked monster corpse, gain permanent stats
        if (food.type === 'cooked_corpse') {
            this.gainPermanentStats(food);
        }
        
        // Track what we've eaten
        this.foodEaten.push({
            name: food.name,
            turn: this.turnsSurvived,
            stats: food.statGains || {}
        });
        
        EventBus.emit(EVENTS.PLAYER_ATE_FOOD, food);
    }
    
    /**
     * Gain permanent stats from eating cooked corpses
     */
    gainPermanentStats(food) {
        if (food.statGains) {
            if (food.statGains.hp) {
                this.maxHp += food.statGains.hp;
                this.hp += food.statGains.hp;
            }
            if (food.statGains.mp) {
                this.maxMp += food.statGains.mp;
                this.mp += food.statGains.mp;
            }
            if (food.statGains.wisdom) {
                this.wisdom += food.statGains.wisdom;
            }
            if (food.statGains.perception) {
                this.perception += food.statGains.perception;
            }
            if (food.statGains.carrying) {
                this.carryingCapacity += food.statGains.carrying;
            }
            
            EventBus.emit(EVENTS.PLAYER_STATS_INCREASED, food.statGains);
        }
    }
    
    /**
     * Check hunger status and apply effects
     */
    checkHungerStatus() {
        const oldStatus = this.getHungerStatus();
        const newStatus = this.calculateHungerStatus();
        
        if (oldStatus !== newStatus) {
            // Remove old hunger effect
            this.removeEffect(oldStatus);
            
            // Add new hunger effect
            if (newStatus !== 'normal') {
                this.addEffect(newStatus, -1);
            }
            
            // Emit message about hunger change
            const messages = {
                'satiated': 'You feel very full.',
                'normal': 'You feel satisfied.',
                'hungry': 'You are getting hungry.',
                'weak': 'You feel weak from hunger!',
                'fainting': 'You are fainting from lack of food!',
                'starving': 'You are starving!'
            };
            
            EventBus.emit(EVENTS.UI_MESSAGE, messages[newStatus], 
                ['hungry', 'weak'].includes(newStatus) ? 'warning' : 
                ['fainting', 'starving'].includes(newStatus) ? 'danger' : 'info'
            );
        }
    }
    
    /**
     * Calculate current hunger status
     */
    calculateHungerStatus() {
        if (this.nutrition > 1500) return 'satiated';
        if (this.nutrition > 900) return 'normal';
        if (this.nutrition > 300) return 'hungry';
        if (this.nutrition > 150) return 'weak';
        if (this.nutrition > 0) return 'fainting';
        return 'starving';
    }
    
    /**
     * Get current hunger status
     */
    getHungerStatus() {
        const effects = Array.from(this.effects);
        const hungerEffects = ['satiated', 'normal', 'hungry', 'weak', 'fainting', 'starving'];
        const current = effects.find(e => hungerEffects.includes(e.name));
        return current ? current.name : 'normal';
    }
    
    /**
     * Get current total weight carried
     */
    getCurrentWeight() {
        let totalWeight = 0;
        
        // Count inventory items
        this.inventory.forEach(item => {
            const quantity = item.quantity || 1;
            const weight = item.weight || 1;
            totalWeight += weight * quantity;
        });
        
        // Count equipped items
        Object.values(this.equipment).forEach(item => {
            if (item) {
                totalWeight += item.weight || 1;
            }
        });
        
        this.currentWeight = totalWeight;
        return totalWeight;
    }
    
    /**
     * Check if player is burdened by weight
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
     * Update burden level and apply effects
     */
    updateBurdenLevel() {
        const oldBurden = this.burdenLevel;
        this.burdenLevel = this.getBurdenLevel();
        
        if (oldBurden !== this.burdenLevel) {
            // Remove old burden effect
            if (oldBurden !== 'none') {
                this.removeEffect(oldBurden);
            }
            
            // Add new burden effect
            if (this.burdenLevel !== 'none') {
                this.addEffect(this.burdenLevel, -1);
                
                const messages = {
                    'burdened': 'You feel burdened by your load.',
                    'stressed': 'You are stressed by your heavy load!',
                    'strained': 'You strain under your load!',
                    'overtaxed': 'You are overtaxed!',
                    'overloaded': 'You can barely move!'
                };
                
                EventBus.emit(EVENTS.UI_MESSAGE, messages[this.burdenLevel], 'warning');
            }
        }
    }
    
    /**
     * Update all calculated stats
     */
    updateStats() {
        // This is called after equipment changes
        EventBus.emit(EVENTS.PLAYER_STATS_CHANGED, this.getStats());
    }
    
    /**
     * Get effective AC (with equipment bonuses)
     */
    getAC() {
        return this.ac + this.equipmentBonus.ac;
    }
    
    /**
     * Get effective max HP (with equipment bonuses)
     */
    getMaxHp() {
        return this.maxHp + this.equipmentBonus.hp;
    }
    
    /**
     * Get effective max MP (with equipment bonuses)
     */
    getMaxMp() {
        return this.maxMp + this.equipmentBonus.mp;
    }
    
    /**
     * Get effective wisdom (with equipment bonuses)
     */
    getWisdom() {
        return this.wisdom + this.equipmentBonus.wisdom;
    }
    
    /**
     * Get effective perception (with equipment bonuses)
     */
    getPerception() {
        return this.perception + this.equipmentBonus.perception;
    }
    
    /**
     * Player death
     */
    die() {
        EventBus.emit(EVENTS.PLAYER_DEATH, {
            name: this.name,
            level: this.level,
            turns: this.turnsSurvived,
            kills: this.monstersKilled
        });
    }
    
    /**
     * Get all player stats for UI
     */
    getStats() {
        return {
            name: this.name,
            hp: this.hp,
            maxHp: this.getMaxHp(),
            mp: this.mp,
            maxMp: this.getMaxMp(),
            sp: this.sp,
            maxSp: this.maxSp,
            ac: this.getAC(),
            wisdom: this.getWisdom(),
            perception: this.getPerception(),
            gold: this.gold,
            weight: this.currentWeight,
            capacity: this.carryingCapacity,
            burden: this.burdenLevel,
            hunger: this.getHungerStatus(),
            effects: Array.from(this.effects).map(e => e.name),
            level: this.level,
            turns: this.turnsSurvived
        };
    }
    
    /**
     * Serialize player data for saving
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
            ac: this.ac,
            carryingCapacity: this.carryingCapacity,
            
            // Equipment (serialize equipped items)
            equipment: Object.fromEntries(
                Object.entries(this.equipment).map(([slot, item]) => [
                    slot,
                    item ? this.serializeItem(item) : null
                ])
            ),
            
            // Inventory (serialize all items)
            inventory: this.inventory.map(item => this.serializeItem(item)),
            gold: this.gold,
            
            // Status
            effects: Array.from(this.effects),
            nutrition: this.nutrition,
            
            // Detection cooldowns
            detectCooldowns: this.detectCooldowns,
            
            // Game progress
            level: this.level,
            turnsSurvived: this.turnsSurvived,
            monstersKilled: this.monstersKilled,
            foodEaten: this.foodEaten
        };
    }
    
    /**
     * Restore player data from save
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
        this.ac = data.ac;
        this.carryingCapacity = data.carryingCapacity;
        
        // Equipment
        if (data.equipment) {
            Object.entries(data.equipment).forEach(([slot, itemData]) => {
                this.equipment[slot] = itemData ? this.deserializeItem(itemData) : null;
            });
        }
        
        // Inventory
        this.inventory = (data.inventory || []).map(itemData => this.deserializeItem(itemData));
        this.gold = data.gold || 0;
        
        // Status
        this.effects = new Set(data.effects || []);
        
        // Detection cooldowns
        this.detectCooldowns = data.detectCooldowns || {
            monsters: 0,
            items: 0,
            traps: 0
        };
        
        // Game progress
        this.level = data.level || 1;
        this.turnsSurvived = data.turnsSurvived || 0;
        this.monstersKilled = data.monstersKilled || 0;
        this.foodEaten = data.foodEaten || [];
        
        // Update calculated values
        this.updateBurdenLevel();
        this.updateStats();
        
        // Emit restoration event
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE);
    }
    
    /**
     * Serialize an item for saving
     */
    serializeItem(item) {
        // Basic implementation - can be expanded
        return {
            id: item.id,
            name: item.name,
            type: item.type,
            subType: item.subType,
            quantity: item.quantity || 1,
            weight: item.weight || 1,
            identified: item.identified || false,
            blessed: item.blessed || false,
            cursed: item.cursed || false,
            enchantment: item.enchantment || 0,
            equipped: item.equipped || false,
            equipSlot: item.equipSlot || null
        };
    }
    
    /**
     * Deserialize an item from save data
     */
    deserializeItem(data) {
        // Basic implementation - would integrate with Item class when available
        return { ...data };
    }
}