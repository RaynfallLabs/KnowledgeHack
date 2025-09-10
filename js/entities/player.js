/**
 * player.js - Player entity with full RPG stat system
 * Handles the player character and all its attributes
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Player {
    constructor(name = 'Scholar') {
        // Identity
        this.name = name;
        this.x = 0;
        this.y = 0;
        
        // Base Attributes (start at 10)
        this.strength = 10;      // Affects carrying capacity
        this.constitution = 10;  // Affects HP/SP
        this.dexterity = 10;     // Affects AC and reflex saves
        this.intelligence = 10;  // Affects spell capacity
        this.wisdom = 10;        // Affects quiz timer and will saves
        this.perception = 10;    // Affects sight radius and detection
        
        // Calculate derived stats
        this.calculateDerivedStats();
        
        // Current values start at max
        this.hp = this.maxHp;
        this.sp = this.maxSp;
        this.mp = this.maxMp;
        
        // Equipment slots
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
        
        // Inventory
        this.inventory = [];
        this.gold = 0;
        
        // Status effects (temporary buffs/debuffs)
        this.effects = new Map(); // effect name -> effect object
        
        // Knowledge tracking
        this.identifiedItems = new Set();
        this.knownSpells = [];
        this.recipesLearned = new Set();
        
        // Game progress
        this.level = 1;
        this.turnsSurvived = 0;
        this.monstersKilled = 0;
        this.questionsAnswered = 0;
        this.questionsCorrect = 0;
    }
    
    /**
     * Calculate all derived stats from base attributes
     */
    calculateDerivedStats() {
        // HP: Base 10 + Constitution bonus
        this.maxHp = Math.floor(10 + (this.constitution - 10) / 2);
        
        // SP: Base 100 + Constitution bonus
        this.maxSp = Math.floor(100 + (this.constitution - 10) * 2);
        
        // MP: Base 10 + Intelligence bonus
        this.maxMp = Math.floor(10 + (this.intelligence - 10) / 2);
        
        // Carrying capacity: Base 50 + Strength bonus
        this.carryingCapacity = 50 + (this.strength * 2);
        
        // AC: Base 10 + Dexterity bonus
        this.baseAC = Math.floor(10 + (this.dexterity - 10) / 2);
        this.ac = this.baseAC; // Will be modified by armor
        
        // Sight radius: Base 3 + Perception bonus
        this.sightRadius = Math.floor(3 + this.perception / 5);
        
        // Quiz timer: Wisdom in seconds
        this.quizTimer = this.wisdom;
        
        // Max spells: Intelligence / 3
        this.maxSpells = Math.floor(this.intelligence / 3);
        
        // Saving throws
        this.saves = {
            fortitude: Math.floor((this.constitution - 10) / 2),
            reflex: Math.floor((this.dexterity - 10) / 2),
            will: Math.floor((this.wisdom - 10) / 2)
        };
    }
    
    /**
     * Increase a base attribute permanently
     */
    increaseAttribute(attribute, amount) {
        const validAttributes = ['strength', 'constitution', 'dexterity', 
                                'intelligence', 'wisdom', 'perception'];
        
        if (!validAttributes.includes(attribute)) {
            console.warn(`Invalid attribute: ${attribute}`);
            return false;
        }
        
        const oldValue = this[attribute];
        this[attribute] += amount;
        
        // Recalculate derived stats
        const oldMaxHp = this.maxHp;
        const oldMaxSp = this.maxSp;
        const oldMaxMp = this.maxMp;
        
        this.calculateDerivedStats();
        
        // If max values increased, increase current values too
        if (this.maxHp > oldMaxHp) {
            this.hp += (this.maxHp - oldMaxHp);
        }
        if (this.maxSp > oldMaxSp) {
            this.sp += (this.maxSp - oldMaxSp);
        }
        if (this.maxMp > oldMaxMp) {
            this.mp += (this.maxMp - oldMaxMp);
        }
        
        EventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
            attribute: attribute,
            oldValue: oldValue,
            newValue: this[attribute],
            change: amount
        });
        
        return true;
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, source = 'unknown') {
        const actualDamage = Math.max(0, amount - this.getArmorReduction());
        this.hp = Math.max(0, this.hp - actualDamage);
        
        EventBus.emit(EVENTS.PLAYER_DAMAGE, {
            amount: actualDamage,
            source: source,
            currentHp: this.hp,
            maxHp: this.maxHp
        });
        
        if (this.hp <= 0) {
            this.die();
        }
        
        return actualDamage;
    }
    
    /**
     * Heal HP
     */
    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const healed = this.hp - oldHp;
        
        if (healed > 0) {
            EventBus.emit(EVENTS.PLAYER_HEAL, {
                amount: healed,
                currentHp: this.hp,
                maxHp: this.maxHp
            });
        }
        
        return healed;
    }
    
    /**
     * Restore SP
     */
    restoreSP(amount) {
        const oldSp = this.sp;
        this.sp = Math.min(this.maxSp, this.sp + amount);
        const restored = this.sp - oldSp;
        
        if (restored > 0) {
            EventBus.emit(EVENTS.PLAYER_SP_CHANGE, {
                amount: restored,
                currentSp: this.sp,
                maxSp: this.maxSp
            });
        }
        
        return restored;
    }
    
    /**
     * Restore MP
     */
    restoreMP(amount) {
        const oldMp = this.mp;
        this.mp = Math.min(this.maxMp, this.mp + amount);
        const restored = this.mp - oldMp;
        
        if (restored > 0) {
            EventBus.emit(EVENTS.PLAYER_MP_CHANGE, {
                amount: restored,
                currentMp: this.mp,
                maxMp: this.maxMp
            });
        }
        
        return restored;
    }
    
    /**
     * Consume SP for actions (hunger system)
     */
    consumeSP(amount = 1) {
        if (this.sp >= amount) {
            this.sp -= amount;
            EventBus.emit(EVENTS.PLAYER_SP_CHANGE, {
                amount: -amount,
                currentSp: this.sp,
                maxSp: this.maxSp
            });
            return true;
        } else {
            // No SP left, consume HP instead
            const hpCost = amount - this.sp;
            this.sp = 0;
            this.takeDamage(hpCost, 'starvation');
            
            EventBus.emit(EVENTS.PLAYER_STARVING, {
                hpLost: hpCost
            });
            
            return false; // Action failed due to starvation
        }
    }
    
    /**
     * Add a temporary effect
     */
    addEffect(effectName, duration, properties = {}) {
        const effect = {
            name: effectName,
            duration: duration,
            properties: properties,
            startTurn: this.turnsSurvived
        };
        
        this.effects.set(effectName, effect);
        
        EventBus.emit(EVENTS.EFFECT_ADDED, {
            target: 'player',
            effect: effect
        });
    }
    
    /**
     * Remove an effect
     */
    removeEffect(effectName) {
        if (this.effects.has(effectName)) {
            const effect = this.effects.get(effectName);
            this.effects.delete(effectName);
            
            EventBus.emit(EVENTS.EFFECT_REMOVED, {
                target: 'player',
                effect: effect
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * Process effects each turn
     */
    processEffects() {
        const expiredEffects = [];
        
        this.effects.forEach((effect, name) => {
            // Reduce duration
            if (effect.duration > 0) {
                effect.duration--;
                
                // Apply per-turn effects
                if (effect.properties.damagePerTurn) {
                    this.takeDamage(effect.properties.damagePerTurn, `effect:${name}`);
                }
                if (effect.properties.healPerTurn) {
                    this.heal(effect.properties.healPerTurn);
                }
                if (effect.properties.spPerTurn) {
                    this.restoreSP(effect.properties.spPerTurn);
                }
                if (effect.properties.mpPerTurn) {
                    this.restoreMP(effect.properties.mpPerTurn);
                }
                
                // Check if expired
                if (effect.duration <= 0) {
                    expiredEffects.push(name);
                }
            }
        });
        
        // Remove expired effects
        expiredEffects.forEach(name => this.removeEffect(name));
    }
    
    /**
     * Make a saving throw
     */
    makeSavingThrow(type, dc) {
        const roll = Math.floor(Math.random() * 20) + 1; // d20
        const bonus = this.saves[type] || 0;
        const total = roll + bonus;
        
        const success = total >= dc;
        
        EventBus.emit(EVENTS.SAVING_THROW, {
            type: type,
            dc: dc,
            roll: roll,
            bonus: bonus,
            total: total,
            success: success
        });
        
        return success;
    }
    
    /**
     * Get total armor reduction
     */
    getArmorReduction() {
        let reduction = 0;
        
        // Add armor piece reductions
        Object.values(this.equipped.armor).forEach(piece => {
            if (piece && piece.armorValue) {
                reduction += piece.armorValue;
            }
        });
        
        // Add shield
        if (this.equipped.armor.shield && this.equipped.armor.shield.blockValue) {
            reduction += this.equipped.armor.shield.blockValue;
        }
        
        return reduction;
    }
    
    /**
     * Get current AC including equipment
     */
    getTotalAC() {
        let ac = this.baseAC;
        
        // Add armor AC bonuses
        Object.values(this.equipped.armor).forEach(piece => {
            if (piece && piece.acBonus) {
                ac += piece.acBonus;
            }
        });
        
        // Add shield AC
        if (this.equipped.armor.shield && this.equipped.armor.shield.acBonus) {
            ac += this.equipped.armor.shield.acBonus;
        }
        
        // Apply effects that modify AC
        this.effects.forEach(effect => {
            if (effect.properties.acBonus) {
                ac += effect.properties.acBonus;
            }
        });
        
        return ac;
    }
    
    /**
     * Check if player can see a position
     */
    canSee(x, y) {
        const distance = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
        return distance <= this.sightRadius;
    }
    
    /**
     * Check if player can detect traps
     */
    canDetectTraps() {
        return this.effects.has('detectTraps') || 
               this.effects.has('trapDetection') ||
               this.perception >= 15; // High perception auto-detects
    }
    
    /**
     * Check if player can see invisible
     */
    canSeeInvisible() {
        return this.effects.has('seeInvisible') || 
               this.effects.has('trueSeeing') ||
               this.perception >= 20; // Very high perception sees invisible
    }
    
    /**
     * Get burden level based on current weight
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
     * Get current total weight
     */
    getCurrentWeight() {
        let weight = 0;
        
        // Inventory items
        this.inventory.forEach(item => {
            weight += (item.weight || 1) * (item.quantity || 1);
        });
        
        // Equipped items
        if (this.equipped.weapon) {
            weight += this.equipped.weapon.weight || 0;
        }
        
        Object.values(this.equipped.armor).forEach(item => {
            if (item) weight += item.weight || 0;
        });
        
        Object.values(this.equipped.accessories).forEach(item => {
            if (item) weight += item.weight || 0;
        });
        
        return weight;
    }
    
    /**
     * Move player
     */
    move(x, y) {
        this.x = x;
        this.y = y;
        
        // Consume SP for movement
        this.consumeSP(1);
        
        // Increment turns
        this.turnsSurvived++;
        
        // Process per-turn effects
        this.processEffects();
        
        EventBus.emit(EVENTS.PLAYER_MOVE, {
            x: this.x,
            y: this.y
        });
    }
    
    /**
     * Die
     */
    die() {
        EventBus.emit(EVENTS.PLAYER_DEATH, {
            turnsSurvived: this.turnsSurvived,
            level: this.level,
            monstersKilled: this.monstersKilled
        });
    }
    
    /**
     * Serialize for saving
     */
    serialize() {
        return {
            // Identity
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
            sp: this.sp,
            mp: this.mp,
            
            // Equipment (needs item serialization)
            equipped: {
                weapon: this.equipped.weapon?.id || null,
                armor: Object.fromEntries(
                    Object.entries(this.equipped.armor).map(([slot, item]) => 
                        [slot, item?.id || null]
                    )
                ),
                accessories: Object.fromEntries(
                    Object.entries(this.equipped.accessories).map(([slot, item]) => 
                        [slot, item?.id || null]
                    )
                )
            },
            
            // Inventory (item IDs)
            inventory: this.inventory.map(item => ({
                id: item.id,
                quantity: item.quantity || 1
            })),
            
            gold: this.gold,
            
            // Effects
            effects: Array.from(this.effects.entries()),
            
            // Knowledge
            identifiedItems: Array.from(this.identifiedItems),
            knownSpells: this.knownSpells,
            recipesLearned: Array.from(this.recipesLearned),
            
            // Progress
            level: this.level,
            turnsSurvived: this.turnsSurvived,
            monstersKilled: this.monstersKilled,
            questionsAnswered: this.questionsAnswered,
            questionsCorrect: this.questionsCorrect
        };
    }
    
    /**
     * Deserialize from save data
     */
    deserialize(data) {
        // Identity
        this.name = data.name;
        this.x = data.x;
        this.y = data.y;
        
        // Attributes
        this.strength = data.strength;
        this.constitution = data.constitution;
        this.dexterity = data.dexterity;
        this.intelligence = data.intelligence;
        this.wisdom = data.wisdom;
        this.perception = data.perception;
        
        // Recalculate derived stats
        this.calculateDerivedStats();
        
        // Current stats
        this.hp = data.hp;
        this.sp = data.sp;
        this.mp = data.mp;
        
        // Other saved data
        this.gold = data.gold;
        this.effects = new Map(data.effects);
        this.identifiedItems = new Set(data.identifiedItems);
        this.knownSpells = data.knownSpells;
        this.recipesLearned = new Set(data.recipesLearned);
        
        // Progress
        this.level = data.level;
        this.turnsSurvived = data.turnsSurvived;
        this.monstersKilled = data.monstersKilled;
        this.questionsAnswered = data.questionsAnswered;
        this.questionsCorrect = data.questionsCorrect;
        
        // Note: Equipment and inventory need to be restored by game.js
        // using the item IDs stored in the save data
    }
}