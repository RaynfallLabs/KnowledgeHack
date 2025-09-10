/**
 * player.js - Player entity with 6-stat RPG system
 * Handles all player state, attributes, and derived statistics
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
        this.carryCapacity = this.calculateCarryCapacity();
        this.sightRadius = this.calculateSightRadius();
        
        // Saving Throws
        this.fortitude = 0;  // CON-based
        this.reflex = 0;     // DEX-based
        this.will = 0;       // WIS-based
        
        // Inventory & Equipment
        this.inventory = [];
        this.equipment = {
            weapon: null,
            armor: null,
            helmet: null,
            gloves: null,
            boots: null,
            ring: null,
            amulet: null
        };
        
        // Status
        this.burden = 0;
        this.effects = [];  // Status effects (poisoned, blessed, etc.)
        this.starving = false;
        
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
        this.carryCapacity = this.calculateCarryCapacity();
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
        
        // Update burden
        this.updateBurden();
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            player: this
        });
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
     * Move player to new position
     */
    move(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Consume SP (for movement and actions)
     */
    consumeSP(amount) {
        this.sp -= amount;
        
        if (this.sp <= 0) {
            this.sp = 0;
            
            if (!this.starving) {
                this.starving = true;
                EventBus.emit(EVENTS.PLAYER_STARVING);
            }
            
            // Start taking HP damage from starvation
            const overflow = Math.abs(this.sp);
            this.hp -= overflow;
        }
        
        EventBus.emit(EVENTS.PLAYER_SP_CHANGE, {
            current: this.sp,
            max: this.maxSp,
            starving: this.starving
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
    addEffect(effect) {
        // Check if effect already exists
        const existing = this.effects.find(e => e.type === effect.type);
        if (existing) {
            // Refresh duration
            existing.duration = Math.max(existing.duration, effect.duration);
        } else {
            this.effects.push(effect);
            EventBus.emit(EVENTS.EFFECT_ADDED, { effect, target: this });
        }
    }
    
    /**
     * Remove an effect
     */
    removeEffect(effectType) {
        const index = this.effects.findIndex(e => e.type === effectType);
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
            if (effect.duration !== undefined) {
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
     * Calculate total weight of inventory
     */
    calculateWeight() {
        let weight = 0;
        
        // Add inventory weight
        for (const item of this.inventory) {
            weight += item.weight || 1;
        }
        
        // Add equipped items weight
        for (const slot in this.equipment) {
            if (this.equipment[slot]) {
                weight += this.equipment[slot].weight || 1;
            }
        }
        
        return weight;
    }
    
    /**
     * Update burden status
     */
    updateBurden() {
        const weight = this.calculateWeight();
        this.burden = weight;
        
        // Check if overburdened
        if (weight > this.carryCapacity) {
            if (!this.hasEffect('overburdened')) {
                this.addEffect({
                    type: 'overburdened',
                    name: 'Overburdened',
                    description: 'Carrying too much weight'
                });
            }
        } else {
            this.removeEffect('overburdened');
        }
    }
    
    /**
     * Check if player has a specific effect
     */
    hasEffect(effectType) {
        return this.effects.some(e => e.type === effectType);
    }
    
    /**
     * Update method (called each frame/turn)
     */
    update() {
        // This method is called each game loop iteration
        // Currently doesn't need to do anything per-frame
        // Effects are processed per-turn in processEffects()
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
    
    /**
     * Serialize player data for saving
     */
    serialize() {
        return {
            name: this.name,
            x: this.x,
            y: this.y,
            strength: this.strength,
            constitution: this.constitution,
            dexterity: this.dexterity,
            intelligence: this.intelligence,
            wisdom: this.wisdom,
            perception: this.perception,
            hp: this.hp,
            sp: this.sp,
            mp: this.mp,
            inventory: this.inventory,
            equipment: this.equipment,
            effects: this.effects
        };
    }
    
    /**
     * Deserialize player data for loading
     */
    deserialize(data) {
        this.name = data.name || this.name;
        this.x = data.x || 0;
        this.y = data.y || 0;
        
        this.strength = data.strength || 10;
        this.constitution = data.constitution || 10;
        this.dexterity = data.dexterity || 10;
        this.intelligence = data.intelligence || 10;
        this.wisdom = data.wisdom || 10;
        this.perception = data.perception || 10;
        
        this.updateDerivedStats();
        
        this.hp = data.hp || this.maxHp;
        this.sp = data.sp || this.maxSp;
        this.mp = data.mp || this.maxMp;
        
        this.inventory = data.inventory || [];
        this.equipment = data.equipment || {};
        this.effects = data.effects || [];
    }
}