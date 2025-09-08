/**
 * item.js - Complete item system with NetHack-inspired mechanics
 * Handles identification, enchantment, BUC status, and all item interactions
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Item {
    constructor(itemData, x = 0, y = 0) {
        // Core identity
        this.id = itemData.id;
        this.commonName = itemData.commonName; // Unidentified appearance
        this.trueName = itemData.trueName;     // True name when identified
        this.type = itemData.type;             // weapon, armor, potion, etc.
        this.subtype = itemData.subtype;       // specific category
        
        // Position
        this.x = x;
        this.y = y;
        
        // Identification system
        this.identified = itemData.identified || false;
        this.autoIdentifyOnUse = itemData.autoIdentifyOnUse !== false; // Default true
        
        // Enchantment system (-5 to +15 for our 100-level game)
        this.enchantment = itemData.enchantment || 0;
        this.enchantmentKnown = itemData.enchantmentKnown || false;
        
        // BUC system (separate from enchantment)
        this.blessed = itemData.blessed || false;
        this.cursed = itemData.cursed || false;
        this.bucKnown = itemData.bucKnown || false;
        
        // Physical properties
        this.weight = itemData.weight || 0;
        this.value = itemData.value || 0;
        this.material = itemData.material || 'unknown';
        this.color = itemData.color || 'brown';
        this.symbol = itemData.symbol || '?';
        
        // Stacking (for potions, scrolls, etc.)
        this.quantity = itemData.quantity || 1;
        this.stackable = itemData.stackable || false;
        this.maxStack = itemData.maxStack || 20;
        
        // Equipment properties
        this.equipped = false;
        this.equipSlot = itemData.equipSlot; // weapon, body, head, etc.
        
        // Combat properties (weapons/armor)
        this.damage = itemData.damage || 0;
        this.damageType = itemData.damageType || 'physical';
        this.acBonus = itemData.acBonus || 0;
        this.range = itemData.range || 1; // 1 = melee, >1 = ranged
        
        // Quiz integration
        this.quizSubject = itemData.quizSubject; // What quiz to use
        this.quizDifficulty = itemData.quizDifficulty || 1;
        this.quizMode = itemData.quizMode || 'threshold'; // or 'chain'
        this.quizThreshold = itemData.quizThreshold || 1;
        this.chainMultipliers = itemData.chainMultipliers || [1, 2, 3, 4, 5, 6];
        
        // Special properties
        this.flags = itemData.flags || {};
        this.resistances = itemData.resistances || [];
        this.abilities = itemData.abilities || [];
        
        // Consumable properties
        this.charges = itemData.charges; // For wands
        this.maxCharges = itemData.maxCharges;
        this.nutrition = itemData.nutrition; // For food
        this.spellLevel = itemData.spellLevel; // For spellbooks
        
        // Degradation/erosion
        this.erosion = {
            rust: 0,    // 0-3 levels of rust
            burn: 0,    // 0-3 levels of burn damage
            corrode: 0, // 0-3 levels of acid damage
            rot: 0      // 0-3 levels of rot (organic materials)
        };
        this.erosionProof = itemData.erosionProof || false;
        
        // Container properties (for bags, boxes)
        this.container = itemData.container || false;
        this.contents = [];
        this.locked = itemData.locked || false;
        this.trapped = itemData.trapped || false;
        
        // Original data reference
        this.data = itemData;
    }
    
    /**
     * Get the display name based on identification status
     */
    getDisplayName() {
        let name = this.identified ? this.trueName : this.commonName;
        
        // Add quantity for stackables
        if (this.stackable && this.quantity > 1) {
            name = `${this.quantity} ${name}`;
        }
        
        // Add enchantment if known
        if (this.enchantmentKnown && this.enchantment !== 0) {
            const sign = this.enchantment >= 0 ? '+' : '';
            name = `${sign}${this.enchantment} ${name}`;
        }
        
        // Add BUC status if known
        if (this.bucKnown) {
            if (this.blessed) {
                name = `blessed ${name}`;
            } else if (this.cursed) {
                name = `cursed ${name}`;
            } else {
                name = `uncursed ${name}`;
            }
        }
        
        // Add erosion status
        const erosionText = this.getErosionText();
        if (erosionText) {
            name = `${erosionText} ${name}`;
        }
        
        // Add equipment marker
        if (this.equipped) {
            name += ' (equipped)';
        }
        
        // Add charges for wands
        if (this.type === 'wand' && this.identified && this.charges !== undefined) {
            name += ` (${this.charges}:${this.maxCharges})`;
        }
        
        return name;
    }
    
    /**
     * Get erosion description text
     */
    getErosionText() {
        const erosionLevels = ['', 'slightly ', 'very ', 'thoroughly '];
        const erosionTypes = {
            rust: ['', 'rusty', 'rusty', 'rusty'],
            burn: ['', 'burnt', 'burnt', 'burnt'],
            corrode: ['', 'corroded', 'corroded', 'corroded'],
            rot: ['', 'rotted', 'rotted', 'rotted']
        };
        
        // Find the highest erosion level
        let maxErosion = 0;
        let erosionType = '';
        
        for (const [type, level] of Object.entries(this.erosion)) {
            if (level > maxErosion) {
                maxErosion = level;
                erosionType = type;
            }
        }
        
        if (maxErosion > 0) {
            return erosionLevels[maxErosion] + erosionTypes[erosionType][maxErosion];
        }
        
        return '';
    }
    
    /**
     * Identify the item (reveals true name, enchantment, BUC)
     */
    identify(full = false) {
        this.identified = true;
        
        if (full) {
            this.enchantmentKnown = true;
            this.bucKnown = true;
        }
        
        EventBus.emit(EVENTS.ITEM_IDENTIFIED, this);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `This is ${this.getDisplayName()}.`, 'success');
    }
    
    /**
     * Use the item (drinking, reading, wielding, etc.)
     */
    use(user, game) {
        // Auto-identify on use (unless explicitly disabled)
        if (this.autoIdentifyOnUse && !this.identified) {
            this.identify();
        }
        
        // Delegate to type-specific handler
        switch (this.type) {
            case 'weapon':
                return this.wield(user, game);
            case 'armor':
                return this.wear(user, game);
            case 'potion':
                return this.quaff(user, game);
            case 'scroll':
                return this.read(user, game);
            case 'food':
                return this.eat(user, game);
            case 'wand':
                return this.zap(user, game);
            case 'ring':
            case 'amulet':
                return this.putOn(user, game);
            case 'tool':
                return this.apply(user, game);
            default:
                EventBus.emit(EVENTS.UI_MESSAGE, "You can't use that!", 'warning');
                return false;
        }
    }
    
    /**
     * Wield as weapon
     */
    wield(user, game) {
        if (this.type !== 'weapon') {
            EventBus.emit(EVENTS.UI_MESSAGE, "That's not a weapon!", 'warning');
            return false;
        }
        
        // Check if cursed weapon is already equipped
        const currentWeapon = user.equipped.weapon;
        if (currentWeapon && currentWeapon.cursed) {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${currentWeapon.getDisplayName()} is welded to your hand!`, 'warning');
            return false;
        }
        
        // Require Math quiz to wield
        EventBus.emit(EVENTS.QUIZ_START, {
            mode: this.quizMode,
            subject: 'math',
            startingTier: this.quizDifficulty,
            threshold: this.quizThreshold,
            maxChain: this.chainMultipliers.length,
            reason: `wielding ${this.getDisplayName()}`,
            callback: (result) => {
                if (result.success) {
                    this.equip(user);
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You wield the ${this.getDisplayName()}.`, 'success');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You fail to wield the ${this.getDisplayName()}.`, 'warning');
                }
            }
        });
        
        return true;
    }
    
    /**
     * Wear as armor
     */
    wear(user, game) {
        if (this.type !== 'armor') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't wear that!", 'warning');
            return false;
        }
        
        // Check if cursed armor is already equipped in this slot
        const currentArmor = user.equipped.armor[this.equipSlot];
        if (currentArmor && currentArmor.cursed) {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You can't remove the ${currentArmor.getDisplayName()}!`, 'warning');
            return false;
        }
        
        // Require Geography quiz to wear
        EventBus.emit(EVENTS.QUIZ_START, {
            mode: 'threshold',
            subject: 'geography',
            startingTier: this.quizDifficulty,
            threshold: this.quizThreshold,
            reason: `wearing ${this.getDisplayName()}`,
            callback: (result) => {
                if (result.success) {
                    this.equip(user);
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You wear the ${this.getDisplayName()}.`, 'success');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You fail to wear the ${this.getDisplayName()}.`, 'warning');
                }
            }
        });
        
        return true;
    }
    
    /**
     * Put on accessory (ring/amulet)
     */
    putOn(user, game) {
        if (this.type !== 'ring' && this.type !== 'amulet') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't put that on!", 'warning');
            return false;
        }
        
        // Check for cursed accessories
        const slot = this.type === 'ring' ? 'ring1' : 'amulet';
        const currentItem = user.equipped.accessories[slot];
        if (currentItem && currentItem.cursed) {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You can't remove the ${currentItem.getDisplayName()}!`, 'warning');
            return false;
        }
        
        // Require History quiz for accessories
        EventBus.emit(EVENTS.QUIZ_START, {
            mode: 'threshold',
            subject: 'history',
            startingTier: this.quizDifficulty,
            threshold: this.quizThreshold,
            reason: `putting on ${this.getDisplayName()}`,
            callback: (result) => {
                if (result.success) {
                    this.equip(user);
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You put on the ${this.getDisplayName()}.`, 'success');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `You fail to put on the ${this.getDisplayName()}.`, 'warning');
                }
            }
        });
        
        return true;
    }
    
    /**
     * Drink potion
     */
    quaff(user, game) {
        if (this.type !== 'potion') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't drink that!", 'warning');
            return false;
        }
        
        // Auto-identify and apply effects
        if (!this.identified) this.identify();
        
        // Apply potion effects based on subtype
        this.applyPotionEffects(user);
        
        // Consume the potion
        this.quantity--;
        if (this.quantity <= 0) {
            EventBus.emit(EVENTS.ITEM_CONSUMED, this);
        }
        
        return true;
    }
    
    /**
     * Read scroll/book
     */
    read(user, game) {
        if (this.type !== 'scroll' && this.type !== 'spellbook') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't read that!", 'warning');
            return false;
        }
        
        // Require Grammar quiz to read
        EventBus.emit(EVENTS.QUIZ_START, {
            mode: 'threshold',
            subject: 'grammar',
            startingTier: this.quizDifficulty,
            threshold: this.quizThreshold,
            reason: `reading ${this.getDisplayName()}`,
            callback: (result) => {
                if (result.success) {
                    if (!this.identified) this.identify();
                    this.applyScrollEffects(user, game);
                    
                    // Consume scroll (but not spellbooks)
                    if (this.type === 'scroll') {
                        this.quantity--;
                        if (this.quantity <= 0) {
                            EventBus.emit(EVENTS.ITEM_CONSUMED, this);
                        }
                    }
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        "The words blur before your eyes!", 'warning');
                }
            }
        });
        
        return true;
    }
    
    /**
     * Eat food
     */
    eat(user, game) {
        if (this.type !== 'food') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't eat that!", 'warning');
            return false;
        }
        
        // Raw food just restores SP
        if (this.subtype === 'raw' || this.subtype === 'corpse') {
            user.sp = Math.min(user.sp + this.nutrition, user.maxSp);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You eat the ${this.getDisplayName()}. You feel satisfied.`, 'success');
        } else {
            // Prepared food might have special effects
            this.applyFoodEffects(user);
        }
        
        // Consume the food
        this.quantity--;
        if (this.quantity <= 0) {
            EventBus.emit(EVENTS.ITEM_CONSUMED, this);
        }
        
        return true;
    }
    
    /**
     * Zap wand
     */
    zap(user, game) {
        if (this.type !== 'wand') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't zap that!", 'warning');
            return false;
        }
        
        if (this.charges <= 0) {
            EventBus.emit(EVENTS.UI_MESSAGE, "Nothing happens.", 'info');
            return false;
        }
        
        // Require Science quiz to zap
        EventBus.emit(EVENTS.QUIZ_START, {
            mode: 'threshold',
            subject: 'science',
            startingTier: this.quizDifficulty,
            threshold: this.quizThreshold,
            reason: `zapping ${this.getDisplayName()}`,
            callback: (result) => {
                if (result.success) {
                    if (!this.identified) this.identify();
                    this.applyWandEffects(user, game);
                    this.charges--;
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        "The wand fizzles!", 'warning');
                    // Still consume charge on failure
                    this.charges--;
                }
            }
        });
        
        return true;
    }
    
    /**
     * Apply tool/use tool
     */
    apply(user, game) {
        if (this.type !== 'tool') {
            EventBus.emit(EVENTS.UI_MESSAGE, "You can't apply that!", 'warning');
            return false;
        }
        
        // Tool-specific logic
        switch (this.subtype) {
            case 'lockpick':
                // TODO: Implement lockpicking
                EventBus.emit(EVENTS.UI_MESSAGE, "You need something to pick!", 'info');
                break;
            case 'lamp':
                this.toggleLamp(user);
                break;
            default:
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You don't know how to use the ${this.getDisplayName()}.`, 'warning');
        }
        
        return true;
    }
    
    /**
     * Equip the item to the user
     */
    equip(user) {
        // Unequip existing item in slot first
        this.unequipSlot(user);
        
        // Equip this item
        this.equipped = true;
        
        switch (this.type) {
            case 'weapon':
                user.equipped.weapon = this;
                break;
            case 'armor':
                user.equipped.armor[this.equipSlot] = this;
                break;
            case 'ring':
                // Find empty ring slot
                if (!user.equipped.accessories.ring1) {
                    user.equipped.accessories.ring1 = this;
                } else {
                    user.equipped.accessories.ring2 = this;
                }
                break;
            case 'amulet':
                user.equipped.accessories.amulet = this;
                break;
        }
        
        EventBus.emit(EVENTS.ITEM_EQUIPPED, { item: this, user: user });
    }
    
    /**
     * Unequip item from slot
     */
    unequipSlot(user) {
        switch (this.type) {
            case 'weapon':
                if (user.equipped.weapon) {
                    user.equipped.weapon.equipped = false;
                    user.equipped.weapon = null;
                }
                break;
            case 'armor':
                if (user.equipped.armor[this.equipSlot]) {
                    user.equipped.armor[this.equipSlot].equipped = false;
                    user.equipped.armor[this.equipSlot] = null;
                }
                break;
            case 'ring':
                // Remove from whichever ring slot it's in
                if (user.equipped.accessories.ring1 === this) {
                    user.equipped.accessories.ring1 = null;
                } else if (user.equipped.accessories.ring2 === this) {
                    user.equipped.accessories.ring2 = null;
                }
                break;
            case 'amulet':
                if (user.equipped.accessories.amulet) {
                    user.equipped.accessories.amulet.equipped = false;
                    user.equipped.accessories.amulet = null;
                }
                break;
        }
    }
    
    /**
     * Get quiz timer bonus from this item
     */
    getQuizTimerBonus() {
        let bonus = 0;
        
        // Enchantment bonus
        if (this.enchantmentKnown) {
            bonus += this.enchantment;
        }
        
        // Blessed bonus (+2 flat)
        if (this.bucKnown && this.blessed) {
            bonus += 2;
        }
        
        // Cursed penalty
        if (this.bucKnown && this.cursed) {
            bonus -= 1;
        }
        
        return bonus;
    }
    
    /**
     * Get damage bonus from weapon enchantment
     */
    getDamageBonus() {
        let bonus = 0;
        
        // Enchantment bonus
        if (this.enchantmentKnown) {
            bonus += this.enchantment;
        }
        
        return bonus;
    }
    
    /**
     * Get blessed damage multiplier vs unholy creatures
     */
    getBlessedDamageMultiplier(target) {
        if (this.type === 'weapon' && this.bucKnown && this.blessed) {
            if (target.flags?.demonic || target.flags?.undead) {
                return 1.5; // 50% more damage vs unholy
            }
        }
        return 1.0; // Normal damage
    }
    
    /**
     * Apply erosion damage to item
     */
    applyErosion(type, amount = 1) {
        if (this.erosionProof) return false;
        
        // Check material vulnerability
        const vulnerabilities = {
            rust: ['iron', 'steel', 'metal'],
            burn: ['wood', 'paper', 'cloth'],
            corrode: ['copper', 'bronze', 'silver'],
            rot: ['leather', 'organic', 'food']
        };
        
        if (!vulnerabilities[type].includes(this.material)) {
            return false; // Material not vulnerable
        }
        
        this.erosion[type] = Math.min(this.erosion[type] + amount, 3);
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `Your ${this.getDisplayName()} is damaged!`, 'warning');
        
        return true;
    }
    
    /**
     * Stack with another item if possible
     */
    stackWith(otherItem) {
        if (!this.canStackWith(otherItem)) return false;
        
        const totalQuantity = this.quantity + otherItem.quantity;
        const maxCanAdd = this.maxStack - this.quantity;
        
        if (maxCanAdd >= otherItem.quantity) {
            // Can stack completely
            this.quantity = totalQuantity;
            return otherItem.quantity; // All stacked
        } else {
            // Partial stack
            this.quantity = this.maxStack;
            return maxCanAdd; // Amount stacked
        }
    }
    
    /**
     * Check if can stack with another item
     */
    canStackWith(otherItem) {
        return this.stackable &&
               otherItem.stackable &&
               this.id === otherItem.id &&
               this.enchantment === otherItem.enchantment &&
               this.blessed === otherItem.blessed &&
               this.cursed === otherItem.cursed &&
               this.quantity < this.maxStack;
    }
    
    // ========== EFFECT APPLICATIONS ==========
    
    /**
     * Apply potion effects
     */
    applyPotionEffects(user) {
        switch (this.subtype) {
            case 'healing':
                const healAmount = this.blessed ? 20 : this.cursed ? 5 : 10;
                user.hp = Math.min(user.hp + healAmount, user.maxHp);
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You feel better! (+${healAmount} HP)`, 'success');
                break;
            case 'mana':
                const manaAmount = this.blessed ? 15 : this.cursed ? 3 : 8;
                user.mp = Math.min(user.mp + manaAmount, user.maxMp);
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You feel magical! (+${manaAmount} MP)`, 'success');
                break;
            default:
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You drink the ${this.getDisplayName()}.`, 'info');
        }
    }
    
    /**
     * Apply scroll effects
     */
    applyScrollEffects(user, game) {
        switch (this.subtype) {
            case 'identify':
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    "This is an identify scroll! Choose an item to identify.", 'info');
                // TODO: Open identification interface
                break;
            case 'teleport':
                // TODO: Implement teleportation
                EventBus.emit(EVENTS.UI_MESSAGE, "You feel disoriented!", 'info');
                break;
            default:
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${this.getDisplayName()} crumbles to dust.`, 'info');
        }
    }
    
    /**
     * Apply food effects
     */
    applyFoodEffects(user) {
        // Restore SP based on nutrition
        const spRestore = Math.floor(this.nutrition / 10);
        user.sp = Math.min(user.sp + spRestore, user.maxSp);
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You eat the ${this.getDisplayName()}. (+${spRestore} SP)`, 'success');
        
        // Special food effects
        if (this.flags.poisonous && !user.resistances?.includes('poison')) {
            user.addEffect('poisoned', 10);
            EventBus.emit(EVENTS.UI_MESSAGE, 'You feel sick!', 'danger');
        }
    }
    
    /**
     * Apply wand effects
     */
    applyWandEffects(user, game) {
        switch (this.subtype) {
            case 'magic_missile':
                // TODO: Implement targeting and damage
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    "Magic missiles streak from the wand!", 'success');
                break;
            case 'healing':
                user.hp = Math.min(user.hp + 15, user.maxHp);
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    "You feel better! (+15 HP)", 'success');
                break;
            default:
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${this.getDisplayName()} glows briefly.`, 'info');
        }
    }
    
    /**
     * Toggle lamp on/off
     */
    toggleLamp(user) {
        this.lit = !this.lit;
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You ${this.lit ? 'light' : 'extinguish'} the ${this.getDisplayName()}.`, 'info');
        
        if (this.lit) {
            user.addEffect('light_source', 999);
        } else {
            user.removeEffect('light_source');
        }
    }
    
    /**
     * Get item info for display
     */
    getInfo() {
        const info = {
            name: this.getDisplayName(),
            type: this.type,
            weight: this.weight,
            identified: this.identified
        };
        
        if (this.identified) {
            if (this.type === 'weapon') {
                info.damage = this.damage;
                info.quizType = this.quizMode;
                info.difficulty = this.quizDifficulty;
            }
            if (this.type === 'armor') {
                info.acBonus = this.acBonus;
            }
            if (this.charges !== undefined) {
                info.charges = `${this.charges}/${this.maxCharges}`;
            }
        }
        
        return info;
    }
}

/**
 * Static item data management
 */
export class ItemData {
    static items = {};
    
    /**
     * Load item data from JSON files
     */
    static async loadItemData() {
        // TODO: Load from actual JSON files
        // This would load from:
        // data/items/weapons.json
        // data/items/armor.json
        // data/items/accessories.json
        // data/items/consumables.json
        // data/items/tools.json
        
        console.log('Loading item data...');
    }
    
    /**
     * Create an item instance from ID
     */
    static createItem(itemId, x = 0, y = 0, options = {}) {
        const data = this.items[itemId];
        if (!data) {
            console.error(`Unknown item: ${itemId}`);
            return null;
        }
        
        // Apply any overrides
        const itemData = { ...data, ...options };
        
        return new Item(itemData, x, y);
    }
    
    /**
     * Generate random enchantment for item
     */
    static generateEnchantment(itemLevel, itemType) {
        // Higher level areas have better enchantments
        const baseChance = Math.min(itemLevel / 20, 0.8); // Up to 80% at level 20+
        
        if (Math.random() > baseChance) {
            return 0; // No enchantment
        }
        
        // Generate enchantment level (-5 to +15 for our 100-level game)
        const maxEnchant = Math.min(Math.floor(itemLevel / 7) + 1, 15);
        const minEnchant = Math.max(-Math.floor(itemLevel / 20), -5);
        
        // Bias toward positive enchantments
        const range = maxEnchant - minEnchant;
        const roll = Math.random();
        
        if (roll < 0.7) {
            // 70% chance of positive
            return Math.floor(Math.random() * maxEnchant) + 1;
        } else if (roll < 0.9) {
            // 20% chance of zero
            return 0;
        } else {
            // 10% chance of negative
            return Math.floor(Math.random() * Math.abs(minEnchant)) + minEnchant;
        }
    }
    
    /**
     * Generate BUC status for item
     */
    static generateBUC() {
        const roll = Math.random();
        
        if (roll < 0.05) {
            return { blessed: true, cursed: false }; // 5% blessed
        } else if (roll < 0.15) {
            return { blessed: false, cursed: true }; // 10% cursed
        } else {
            return { blessed: false, cursed: false }; // 85% uncursed
        }
    }
}