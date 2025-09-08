/**
 * effect.js - Status effect entity
 * Handles temporary and permanent effects on entities
 */

export class Effect {
    constructor(config = {}) {
        this.id = config.id || 'unknown';
        this.name = config.name || 'Unknown Effect';
        this.type = config.type || 'neutral'; // buff, debuff, neutral
        this.description = config.description || '';
        
        // Duration (-1 for permanent)
        this.duration = config.duration || 0;
        this.permanent = config.permanent || false;
        
        // Effect properties
        this.modifiers = config.modifiers || {};
        this.damagePerTurn = config.damagePerTurn || 0;
        this.healPerTurn = config.healPerTurn || 0;
        
        // Flags
        this.stackable = config.stackable || false;
        this.maxStacks = config.maxStacks || 1;
        this.currentStacks = 1;
        
        // Visual
        this.color = config.color || '#ffffff';
        this.symbol = config.symbol || '*';
        
        // Callbacks
        this.onApply = config.onApply || null;
        this.onTick = config.onTick || null;
        this.onExpire = config.onExpire || null;
        this.onRemove = config.onRemove || null;
    }
    
    /**
     * Apply effect to a target
     */
    apply(target) {
        // Apply stat modifiers
        for (const [stat, value] of Object.entries(this.modifiers)) {
            if (target[stat] !== undefined) {
                target[stat] += value;
            }
        }
        
        // Call custom apply callback if exists
        if (this.onApply) {
            this.onApply(target, this);
        }
        
        return true;
    }
    
    /**
     * Process effect for one turn
     */
    tick(target) {
        // Apply damage over time
        if (this.damagePerTurn > 0) {
            target.takeDamage(this.damagePerTurn, 'effect');
        }
        
        // Apply healing over time
        if (this.healPerTurn > 0) {
            target.heal(this.healPerTurn);
        }
        
        // Call custom tick callback if exists
        if (this.onTick) {
            this.onTick(target, this);
        }
        
        // Reduce duration if not permanent
        if (!this.permanent && this.duration > 0) {
            this.duration--;
            
            // Check if expired
            if (this.duration === 0) {
                this.expire(target);
                return false; // Effect should be removed
            }
        }
        
        return true; // Effect continues
    }
    
    /**
     * Handle effect expiration
     */
    expire(target) {
        // Remove stat modifiers
        for (const [stat, value] of Object.entries(this.modifiers)) {
            if (target[stat] !== undefined) {
                target[stat] -= value;
            }
        }
        
        // Call custom expire callback if exists
        if (this.onExpire) {
            this.onExpire(target, this);
        }
    }
    
    /**
     * Force remove effect
     */
    remove(target) {
        this.expire(target);
        
        // Call custom remove callback if exists
        if (this.onRemove) {
            this.onRemove(target, this);
        }
    }
    
    /**
     * Add a stack to the effect
     */
    addStack() {
        if (this.stackable && this.currentStacks < this.maxStacks) {
            this.currentStacks++;
            
            // Refresh duration on stack
            if (this.duration > 0) {
                this.duration = this.getBaseDuration();
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Get base duration for the effect
     */
    getBaseDuration() {
        // Override in subclasses
        return 10;
    }
    
    /**
     * Check if effect has expired
     */
    isExpired() {
        return !this.permanent && this.duration <= 0;
    }
    
    /**
     * Get display name with stacks
     */
    getDisplayName() {
        if (this.stackable && this.currentStacks > 1) {
            return `${this.name} x${this.currentStacks}`;
        }
        return this.name;
    }
    
    /**
     * Clone the effect
     */
    clone() {
        return new Effect({
            ...this,
            modifiers: { ...this.modifiers }
        });
    }
}

// Common effect presets
export const EFFECT_TYPES = {
    // Buffs
    BLESSED: {
        id: 'blessed',
        name: 'Blessed',
        type: 'buff',
        description: 'Divine protection increases defense',
        duration: 50,
        modifiers: { defense: 3 },
        color: '#ffff00'
    },
    
    STRENGTH: {
        id: 'strength',
        name: 'Strength',
        type: 'buff',
        description: 'Increased physical power',
        duration: 30,
        modifiers: { strength: 5 },
        color: '#ff8800'
    },
    
    HASTE: {
        id: 'haste',
        name: 'Haste',
        type: 'buff',
        description: 'Increased speed',
        duration: 20,
        modifiers: { speed: 2 },
        color: '#00ffff'
    },
    
    // Debuffs
    POISONED: {
        id: 'poisoned',
        name: 'Poisoned',
        type: 'debuff',
        description: 'Taking damage over time',
        duration: 10,
        damagePerTurn: 2,
        color: '#00ff00'
    },
    
    WEAKENED: {
        id: 'weakened',
        name: 'Weakened',
        type: 'debuff',
        description: 'Reduced strength',
        duration: 20,
        modifiers: { strength: -3 },
        color: '#808080'
    },
    
    CONFUSED: {
        id: 'confused',
        name: 'Confused',
        type: 'debuff',
        description: 'Random movement',
        duration: 5,
        color: '#ff00ff'
    },
    
    BURNING: {
        id: 'burning',
        name: 'Burning',
        type: 'debuff',
        description: 'On fire!',
        duration: 5,
        damagePerTurn: 3,
        color: '#ff0000'
    },
    
    // Neutral
    REGENERATING: {
        id: 'regenerating',
        name: 'Regenerating',
        type: 'neutral',
        description: 'Healing over time',
        duration: 20,
        healPerTurn: 1,
        color: '#ff00ff'
    },
    
    IDENTIFIED: {
        id: 'identified',
        name: 'Identified',
        type: 'neutral',
        description: 'Knowledge of items',
        permanent: true,
        color: '#0066ff'
    }
};

/**
 * Create effect from preset
 */
export function createEffect(type, overrides = {}) {
    const preset = EFFECT_TYPES[type];
    if (!preset) {
        console.warn(`Unknown effect type: ${type}`);
        return null;
    }
    
    return new Effect({
        ...preset,
        ...overrides
    });
}