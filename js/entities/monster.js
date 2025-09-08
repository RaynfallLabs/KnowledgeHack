/**
 * monster.js - Complete monster system with NetHack-inspired mechanics
 * Handles monster instances, combat, movement, and behavior
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';
import { MonsterAI } from './monster-ai.js';
import { MonsterAbilities } from './monster-abilities.js';
import { rollDice } from '../utils/dice.js';

export class Monster {
    constructor(monsterData, x, y) {
        // Core identity
        this.id = monsterData.id;
        this.name = monsterData.name;
        this.symbol = monsterData.symbol;
        this.color = monsterData.color;
        
        // Position
        this.x = x;
        this.y = y;
        
        // Stats from data
        this.level = monsterData.level || 1;
        this.difficulty = monsterData.difficulty;
        this.size = monsterData.size;
        this.weight = monsterData.weight;
        
        // Combat stats
        this.speed = monsterData.stats.speed;
        this.thac0 = monsterData.stats.thac0;
        this.maxHp = rollDice(monsterData.stats.hp);
        this.hp = this.maxHp;
        this.mr = monsterData.stats.mr || 0;
        
        // Attacks
        this.attacks = monsterData.attacks || [];
        
        // Flags and properties
        this.flags = monsterData.flags || {};
        this.resistances = monsterData.resistances || [];
        this.abilities = monsterData.abilities || [];
        
        // AI and behavior
        this.aiType = monsterData.ai || 'hostile_basic';
        this.ai = MonsterAI.create(this.aiType, this);
        
        // State
        this.hostile = this.flags.hostile !== false;
        this.peaceful = this.flags.peaceful || false;
        this.tame = false;
        this.fleeing = false;
        this.confused = false;
        this.stunned = false;
        this.sleeping = monsterData.sleeping || false;
        this.invisible = this.flags.invisible || false;
        
        // Identification
        this.identified = false;
        this.seenByPlayer = false;
        
        // Inventory (for intelligent monsters)
        this.inventory = [];
        this.wielding = null;
        this.wearing = null;
        
        // Movement tracking
        this.movePoints = 0;
        this.lastMove = 0;
        
        // Special ability cooldowns
        this.abilityCooldowns = {};
        
        // Loot table reference
        this.loot = monsterData.loot;
        
        // Original data for reference
        this.data = monsterData;
    }
    
    /**
     * Process monster's turn
     */
    takeTurn(game) {
        // Check if can act
        if (this.hp <= 0) return;
        if (this.sleeping) {
            // Check if wakes up
            if (this.checkWakeUp(game)) {
                this.sleeping = false;
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${this.name} wakes up!`, 'warning');
            }
            return;
        }
        
        if (this.stunned) {
            this.stunned = false;
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${this.name} is stunned!`, 'info');
            return;
        }
        
        if (this.confused) {
            // Random movement when confused
            const dirs = [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            this.tryMove(game, this.x + dir[0], this.y + dir[1]);
            if (Math.random() < 0.25) this.confused = false;
            return;
        }
        
        // Use AI to decide action
        this.ai.act(game);
    }
    
    /**
     * Try to move to a position
     */
    tryMove(game, newX, newY) {
        // Check bounds
        if (newX < 0 || newX >= CONFIG.MAP_WIDTH || 
            newY < 0 || newY >= CONFIG.MAP_HEIGHT) {
            return false;
        }
        
        // Check if blocked
        if (!game.dungeon.isWalkable(newX, newY)) {
            // Some monsters can pass through walls
            if (!this.flags.wallPass) {
                return false;
            }
        }
        
        // Check for player
        if (game.player.x === newX && game.player.y === newY) {
            if (this.hostile) {
                this.meleeAttack(game.player, game);
            }
            return true; // Turn used attacking
        }
        
        // Check for other monsters
        const targetMonster = game.getMonsterAt(newX, newY);
        if (targetMonster) {
            // Monsters usually don't attack each other unless special circumstances
            if (this.flags.aggressive && targetMonster.hostile !== this.hostile) {
                this.meleeAttack(targetMonster, game);
                return true;
            }
            return false; // Blocked by another monster
        }
        
        // Move
        this.x = newX;
        this.y = newY;
        
        // Pick up items if intelligent
        if (this.flags.intelligent || this.flags.collector) {
            this.checkForItems(game);
        }
        
        return true;
    }
    
    /**
     * Perform melee attack
     */
    meleeAttack(target, game) {
        // Process each attack
        for (const attack of this.attacks) {
            if (attack.type === 'weapon' || attack.type === 'bite' || 
                attack.type === 'claw' || attack.type === 'kick') {
                
                // Roll to hit using THAC0
                const hitRoll = Math.floor(Math.random() * 20) + 1;
                const targetAC = target.getAC ? target.getAC() : 10;
                const needed = this.thac0 - targetAC;
                
                if (hitRoll >= needed) {
                    // Hit! Roll damage
                    const damage = rollDice(attack.damage);
                    
                    // Apply damage type effects
                    this.applyDamageType(target, damage, attack.damageType, game);
                    
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `The ${this.name} hits${target.name ? ' the ' + target.name : ''}!`, 
                        'combat');
                } else {
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `The ${this.name} misses${target.name ? ' the ' + target.name : ''}.`, 
                        'combat');
                }
            }
        }
    }
    
    /**
     * Apply damage and special effects based on damage type
     */
    applyDamageType(target, damage, damageType, game) {
        // Check resistances
        if (target.resistances && target.resistances.includes(damageType)) {
            damage = Math.floor(damage / 2);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `${target.name || 'The target'} resists!`, 'info');
        }
        
        // Apply damage
        target.takeDamage(damage);
        
        // Special damage type effects
        switch (damageType) {
            case 'poison':
                if (!target.resistances?.includes('poison')) {
                    // TODO: Apply poison effect
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `${target.name || 'The target'} is poisoned!`, 'danger');
                }
                break;
            case 'fire':
                // Could destroy scrolls/potions
                break;
            case 'cold':
                // Could destroy potions
                break;
            case 'drain':
                // Level drain
                if (!target.resistances?.includes('drain')) {
                    // TODO: Implement level drain
                    EventBus.emit(EVENTS.UI_MESSAGE, 
                        `${target.name || 'The target'} feels weaker!`, 'danger');
                }
                break;
        }
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        this.hp -= amount;
        
        if (this.hp <= 0) {
            this.die();
        } else if (this.hp < this.maxHp / 4 && !this.fleeing) {
            // Start fleeing if low on health (for some monsters)
            if (!this.flags.noflee && !this.flags.mindless) {
                this.fleeing = true;
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${this.name} turns to flee!`, 'info');
            }
        }
    }
    
    /**
     * Monster death
     */
    die() {
        EventBus.emit(EVENTS.MONSTER_DIED, this);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${this.name} dies!`, 'success');
        
        // Drop loot
        this.dropLoot();
    }
    
    /**
     * Generate and drop loot
     */
    dropLoot() {
        const loot = [];
        
        // Always drop corpse unless disintegrated/exploded
        if (!this.disintegrated && !this.exploded) {
            // TODO: Validate corpse item exists in items.json
            loot.push({
                id: this.loot.corpse,
                type: 'corpse',
                weight: Math.floor(this.weight * 0.8),
                x: this.x,
                y: this.y
            });
        }
        
        // Drop carried items
        for (const item of this.inventory) {
            item.x = this.x;
            item.y = this.y;
            loot.push(item);
        }
        
        // Roll for additional loot
        if (this.loot.guaranteed) {
            for (const item of this.loot.guaranteed) {
                loot.push(this.generateLootItem(item));
            }
        }
        
        if (this.loot.common) {
            for (const item of this.loot.common) {
                if (Math.random() < (item.chance || 0.5)) {
                    loot.push(this.generateLootItem(item));
                }
            }
        }
        
        if (this.loot.rare) {
            for (const item of this.loot.rare) {
                if (Math.random() < (item.chance || 0.1)) {
                    loot.push(this.generateLootItem(item));
                }
            }
        }
        
        EventBus.emit(EVENTS.ITEMS_DROPPED, loot);
    }
    
    /**
     * Generate a loot item
     */
    generateLootItem(lootDef) {
        const item = {
            id: lootDef.item,
            x: this.x,
            y: this.y
        };
        
        if (lootDef.amount) {
            // For gold or stackables
            item.quantity = rollDice(lootDef.amount);
        }
        
        return item;
    }
    
    /**
     * Check if monster wakes up
     */
    checkWakeUp(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.x) + Math.abs(player.y - this.y);
        
        // Wake up if player is adjacent
        if (dist <= 1) return true;
        
        // Wake up if player makes noise (based on distance)
        if (dist <= 3 && Math.random() < 0.5) return true;
        if (dist <= 5 && Math.random() < 0.2) return true;
        
        return false;
    }
    
    /**
     * Check for and pick up items
     */
    checkForItems(game) {
        const items = game.getItemsAt(this.x, this.y);
        
        for (const item of items) {
            // Decide if monster wants this item
            if (this.wantsItem(item)) {
                this.pickUpItem(item, game);
            }
        }
    }
    
    /**
     * Determine if monster wants an item
     */
    wantsItem(item) {
        // Gold lovers always want gold
        if (item.type === 'gold' && this.flags.greedy) return true;
        
        // Weapon users want weapons
        if (item.type === 'weapon' && this.flags.weaponUser) {
            // Only if better than current
            if (!this.wielding || item.damage > this.wielding.damage) {
                return true;
            }
        }
        
        // Armor wearers want armor
        if (item.type === 'armor' && this.flags.armorUser) {
            if (!this.wearing || item.ac < this.wearing.ac) {
                return true;
            }
        }
        
        // Collectors take everything
        if (this.flags.collector) return true;
        
        return false;
    }
    
    /**
     * Pick up an item
     */
    pickUpItem(item, game) {
        this.inventory.push(item);
        
        // Automatically equip if better
        if (item.type === 'weapon' && this.flags.weaponUser) {
            if (!this.wielding || item.damage > this.wielding.damage) {
                this.wielding = item;
            }
        }
        
        if (item.type === 'armor' && this.flags.armorUser) {
            if (!this.wearing || item.ac < this.wearing.ac) {
                this.wearing = item;
            }
        }
        
        EventBus.emit(EVENTS.MONSTER_PICKUP, { monster: this, item: item });
    }
    
    /**
     * Use a special ability
     */
    useAbility(abilityName, target, game) {
        // Check cooldown
        if (this.abilityCooldowns[abilityName] > 0) {
            return false;
        }
        
        // Find ability
        const ability = this.abilities.find(a => a.type === abilityName);
        if (!ability) return false;
        
        // Use ability (handled by MonsterAbilities)
        const success = MonsterAbilities.use(this, ability, target, game);
        
        if (success) {
            // Set cooldown
            this.abilityCooldowns[abilityName] = ability.cooldown || 3;
        }
        
        return success;
    }
    
    /**
     * Reduce ability cooldowns
     */
    tickCooldowns() {
        for (const ability in this.abilityCooldowns) {
            if (this.abilityCooldowns[ability] > 0) {
                this.abilityCooldowns[ability]--;
            }
        }
    }
    
    /**
     * Get movement points based on speed
     */
    getMovementPoints() {
        // NetHack speed system
        // Speed 12 = normal (1 move per turn)
        // Speed 24 = fast (2 moves per turn)
        // Speed 6 = slow (1 move every 2 turns)
        return this.speed / 12;
    }
    
    /**
     * Check if monster can see target
     */
    canSee(target, game) {
        // Check distance
        const dist = Math.abs(target.x - this.x) + Math.abs(target.y - this.y);
        
        // Base sight range
        let sightRange = 5;
        if (this.flags.keen) sightRange = 8;
        if (this.flags.blind) return false;
        
        if (dist > sightRange) return false;
        
        // Check line of sight (simplified)
        // TODO: Implement proper line-of-sight algorithm
        return true;
    }
    
    /**
     * Get monster info for identification
     */
    getInfo() {
        if (!this.identified) {
            return {
                name: this.name,
                symbol: this.symbol,
                hostile: this.hostile
            };
        }
        
        // Full info when identified
        return {
            name: this.name,
            symbol: this.symbol,
            hp: `${this.hp}/${this.maxHp}`,
            ac: this.ac,
            attacks: this.attacks,
            speed: this.speed,
            resistances: this.resistances,
            abilities: this.abilities,
            description: this.data.description
        };
    }
}

/**
 * Static monster data management
 */
export class MonsterData {
    static monsters = {};
    static spawnTables = {};
    
    /**
     * Load monster data from JSON files
     */
    static async loadMonsterData() {
        // TODO: Load from actual JSON files
        // For now, embedded data structure
        
        // This would load from:
        // data/monsters-novice.json (60 monsters)
        // data/monsters-apprentice.json (55 monsters)
        // data/monsters-journeyman.json (55 monsters)
        // data/monsters-expert.json (50 monsters)
        // data/monsters-master.json (50 monsters)
        // data/monsters-legendary.json (45 monsters)
        // data/monsters-mythic.json (35 monsters)
        // data/monsters-special.json (10 monsters)
        
        console.log('Loading monster data...');
    }
    
    /**
     * Get valid monsters for a dungeon level
     */
    static getMonstersForLevel(level) {
        const validMonsters = [];
        
        for (const monsterId in this.monsters) {
            const monster = this.monsters[monsterId];
            const range = monster.spawnRange;
            
            if (level >= range.minLevel && level <= range.maxLevel) {
                // Calculate adjusted weight based on distance from peak
                const basedWeight = monster.generation.spawnWeight;
                const distFromPeak = Math.abs(level - range.peakLevel);
                const maxDist = Math.max(
                    range.peakLevel - range.minLevel,
                    range.maxLevel - range.peakLevel
                );
                
                // Weight decreases as we get further from peak level
                const weightMultiplier = Math.max(0.1, 1 - (distFromPeak / maxDist) * 0.8);
                const adjustedWeight = Math.floor(basedWeight * weightMultiplier);
                
                validMonsters.push({
                    id: monsterId,
                    weight: adjustedWeight,
                    data: monster
                });
            }
        }
        
        return validMonsters;
    }
    
    /**
     * Create a monster instance
     */
    static createMonster(monsterId, x, y) {
        const data = this.monsters[monsterId];
        if (!data) {
            console.error(`Unknown monster: ${monsterId}`);
            return null;
        }
        
        return new Monster(data, x, y);
    }
}