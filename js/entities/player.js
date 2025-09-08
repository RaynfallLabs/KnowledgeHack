/**
 * Missing methods that need to be added to Player.js
 * These are called by Game.js and other modules
 */

// ADD THESE METHODS TO THE PLAYER CLASS:

/**
 * Move player to new position and emit events
 * @param {number} x - New X coordinate
 * @param {number} y - New Y coordinate
 */
move(x, y) {
    this.x = x;
    this.y = y;
    
    // Emit movement event
    EventBus.emit(EVENTS.PLAYER_MOVE, {
        x: this.x,
        y: this.y,
        blocked: false
    });
    
    // Update exploration/visibility will be handled by game
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
        ac: this.ac,
        carryingCapacity: this.carryingCapacity,
        
        // Equipment (serialize equipped items)
        equipped: {
            weapon: this.equipped.weapon?.serialize() || null,
            armor: {
                head: this.equipped.armor.head?.serialize() || null,
                body: this.equipped.armor.body?.serialize() || null,
                cloak: this.equipped.armor.cloak?.serialize() || null,
                gloves: this.equipped.armor.gloves?.serialize() || null,
                boots: this.equipped.armor.boots?.serialize() || null,
                shield: this.equipped.armor.shield?.serialize() || null
            },
            accessories: {
                ring1: this.equipped.accessories.ring1?.serialize() || null,
                ring2: this.equipped.accessories.ring2?.serialize() || null,
                amulet: this.equipped.accessories.amulet?.serialize() || null
            }
        },
        
        // Inventory (serialize all items)
        inventory: this.inventory.map(item => item.serialize()),
        
        // Status effects
        effects: Array.from(this.effects),
        
        // Detection cooldowns
        detectCooldowns: this.detectCooldowns,
        
        // Game progress
        level: this.level,
        turnsSurvived: this.turnsSurvived
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
    this.ac = data.ac;
    this.carryingCapacity = data.carryingCapacity;
    
    // Equipment (deserialize equipped items)
    if (data.equipped.weapon) {
        this.equipped.weapon = Item.deserialize(data.equipped.weapon);
    }
    
    Object.keys(data.equipped.armor).forEach(slot => {
        if (data.equipped.armor[slot]) {
            this.equipped.armor[slot] = Item.deserialize(data.equipped.armor[slot]);
        }
    });
    
    Object.keys(data.equipped.accessories).forEach(slot => {
        if (data.equipped.accessories[slot]) {
            this.equipped.accessories[slot] = Item.deserialize(data.equipped.accessories[slot]);
        }
    });
    
    // Inventory (deserialize all items)
    this.inventory = data.inventory.map(itemData => Item.deserialize(itemData));
    
    // Status effects
    this.effects = new Set(data.effects);
    
    // Detection cooldowns
    this.detectCooldowns = data.detectCooldowns || {};
    
    // Game progress
    this.level = data.level || 1;
    this.turnsSurvived = data.turnsSurvived || 0;
    
    // Emit restoration event
    EventBus.emit(EVENTS.PLAYER_STAT_CHANGE);
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
        if (effect.duration !== undefined) {
            effect.duration--;
            if (effect.duration <= 0) {
                expiredEffects.push(effect);
            }
        }
    });
    
    // Remove expired effects
    expiredEffects.forEach(effect => this.removeEffect(effect.name));
}

/**
 * Get current total weight carried
 * @returns {number} Total weight
 */
getCurrentWeight() {
    let totalWeight = 0;
    
    // Count inventory items
    this.inventory.forEach(item => {
        totalWeight += item.weight * item.quantity;
    });
    
    // Count equipped items
    if (this.equipped.weapon) {
        totalWeight += this.equipped.weapon.weight;
    }
    
    Object.values(this.equipped.armor).forEach(item => {
        if (item) totalWeight += item.weight;
    });
    
    Object.values(this.equipped.accessories).forEach(item => {
        if (item) totalWeight += item.weight;
    });
    
    return totalWeight;
}

/**
 * Check if player is burdened by weight
 * @returns {string} Burden level: 'none', 'burdened', 'stressed', 'strained', 'overtaxed', 'overloaded'
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