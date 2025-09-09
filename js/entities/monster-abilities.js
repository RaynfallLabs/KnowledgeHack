/**
 * monster-abilities.js - Special abilities and attacks for monsters
 * Handles breath weapons, gaze attacks, special abilities, etc.
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class MonsterAbilities {
    constructor() {
        // Ability definitions with their implementations
        this.abilities = {
            // Breath weapons
            'fire_breath': {
                name: 'Fire Breath',
                cooldown: 5,
                range: 5,
                damage: '3d6',
                damageType: 'fire',
                area: 'cone',
                message: 'breathes fire!',
                execute: this.breathWeapon.bind(this)
            },
            'frost_breath': {
                name: 'Frost Breath',
                cooldown: 5,
                range: 5,
                damage: '3d6',
                damageType: 'cold',
                area: 'cone',
                message: 'breathes frost!',
                execute: this.breathWeapon.bind(this)
            },
            'poison_breath': {
                name: 'Poison Breath',
                cooldown: 6,
                range: 4,
                damage: '2d6',
                damageType: 'poison',
                area: 'cone',
                message: 'breathes poisonous gas!',
                execute: this.breathWeapon.bind(this)
            },
            'acid_spit': {
                name: 'Acid Spit',
                cooldown: 3,
                range: 4,
                damage: '2d8',
                damageType: 'acid',
                area: 'single',
                message: 'spits acid!',
                execute: this.rangedAttack.bind(this)
            },
            
            // Gaze attacks
            'petrifying_gaze': {
                name: 'Petrifying Gaze',
                cooldown: 8,
                range: 3,
                damageType: 'petrify',
                message: 'gazes with petrifying eyes!',
                execute: this.gazeAttack.bind(this)
            },
            'paralyzing_gaze': {
                name: 'Paralyzing Gaze',
                cooldown: 5,
                range: 3,
                damageType: 'paralyze',
                message: 'stares with paralyzing intensity!',
                execute: this.gazeAttack.bind(this)
            },
            'confusing_gaze': {
                name: 'Confusing Gaze',
                cooldown: 4,
                range: 4,
                damageType: 'confuse',
                message: 'gazes with maddening eyes!',
                execute: this.gazeAttack.bind(this)
            },
            
            // Movement abilities
            'teleport': {
                name: 'Teleport',
                cooldown: 10,
                range: 15,
                message: 'teleports!',
                execute: this.teleport.bind(this)
            },
            'blink': {
                name: 'Blink',
                cooldown: 3,
                range: 5,
                message: 'blinks out of existence!',
                execute: this.blink.bind(this)
            },
            'charge': {
                name: 'Charge',
                cooldown: 5,
                range: 8,
                damage: '2d6',
                damageType: 'physical',
                message: 'charges forward!',
                execute: this.charge.bind(this)
            },
            
            // Defensive abilities
            'regenerate': {
                name: 'Regeneration',
                cooldown: 0,
                passive: true,
                healAmount: 2,
                message: 'regenerates!',
                execute: this.regenerate.bind(this)
            },
            'stone_skin': {
                name: 'Stone Skin',
                cooldown: 10,
                duration: 5,
                acBonus: -4,
                message: 'skin turns to stone!',
                execute: this.stoneSkin.bind(this)
            },
            'invisibility': {
                name: 'Invisibility',
                cooldown: 8,
                duration: 10,
                message: 'fades from sight!',
                execute: this.goInvisible.bind(this)
            },
            
            // Summoning abilities
            'summon_minions': {
                name: 'Summon Minions',
                cooldown: 15,
                summonType: 'same',
                summonCount: '1d3',
                message: 'calls for reinforcements!',
                execute: this.summonMinions.bind(this)
            },
            'raise_dead': {
                name: 'Raise Dead',
                cooldown: 20,
                range: 5,
                message: 'raises the dead!',
                execute: this.raiseDead.bind(this)
            },
            
            // Special attacks
            'web': {
                name: 'Web',
                cooldown: 4,
                range: 3,
                duration: 3,
                message: 'shoots a sticky web!',
                execute: this.webAttack.bind(this)
            },
            'steal': {
                name: 'Steal',
                cooldown: 5,
                range: 1,
                message: 'attempts to steal!',
                execute: this.stealItem.bind(this)
            },
            'poison': {
                name: 'Poison',
                cooldown: 0,
                passive: true,
                damagePerTurn: 2,
                duration: 5,
                message: 'inflicts poison!',
                execute: this.poisonAttack.bind(this)
            },
            'disease': {
                name: 'Disease',
                cooldown: 10,
                range: 1,
                message: 'spreads disease!',
                execute: this.diseaseAttack.bind(this)
            },
            'drain_life': {
                name: 'Life Drain',
                cooldown: 6,
                range: 1,
                drainAmount: '1d6',
                message: 'drains life force!',
                execute: this.drainLife.bind(this)
            },
            
            // Rage/Berserk abilities
            'rage': {
                name: 'Rage',
                cooldown: 10,
                duration: 5,
                damageMultiplier: 1.5,
                message: 'enters a rage!',
                execute: this.enterRage.bind(this)
            },
            'berserk': {
                name: 'Berserk',
                cooldown: 0,
                trigger: 'lowHealth',
                threshold: 0.3,
                damageMultiplier: 2,
                acPenalty: 2,
                message: 'goes berserk!',
                execute: this.goBerserk.bind(this)
            }
        };
    }
    
    /**
     * Check if monster can use an ability
     */
    canUseAbility(monster, abilityName, target, game) {
        const ability = this.abilities[abilityName];
        if (!ability) return false;
        
        // Check cooldown
        if (monster.abilityCooldowns[abilityName] > 0) return false;
        
        // Check if passive (passives are handled automatically)
        if (ability.passive) return false;
        
        // Check range
        if (ability.range && target) {
            const distance = monster.distanceTo(target);
            if (distance > ability.range) return false;
        }
        
        // Check special triggers
        if (ability.trigger === 'lowHealth') {
            if (monster.hp > monster.maxHp * ability.threshold) return false;
        }
        
        return true;
    }
    
    /**
     * Use an ability
     */
    useAbility(monster, abilityName, target, game) {
        const ability = this.abilities[abilityName];
        if (!ability || !this.canUseAbility(monster, abilityName, target, game)) {
            return false;
        }
        
        // Show message
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.getDisplayName()} ${ability.message}`, 'ability');
        
        // Execute ability
        const result = ability.execute(monster, target, game, ability);
        
        // Set cooldown
        if (ability.cooldown > 0) {
            monster.abilityCooldowns[abilityName] = ability.cooldown;
        }
        
        return result;
    }
    
    /**
     * Update cooldowns and passive abilities
     */
    updateAbilities(monster, game) {
        // Reduce cooldowns
        for (const [ability, cooldown] of Object.entries(monster.abilityCooldowns)) {
            if (cooldown > 0) {
                monster.abilityCooldowns[ability]--;
            }
        }
        
        // Handle passive abilities
        for (const abilityName of monster.abilities) {
            const ability = this.abilities[abilityName];
            if (ability && ability.passive) {
                ability.execute(monster, null, game, ability);
            }
        }
    }
    
    // ===== ABILITY IMPLEMENTATIONS =====
    
    /**
     * Breath weapon attack (cone area)
     */
    breathWeapon(monster, target, game, ability) {
        const affected = this.getConeTargets(monster, target, game, ability.range);
        
        for (const victim of affected) {
            const damage = this.rollDice(ability.damage);
            victim.takeDamage(damage, ability.damageType, 'monster');
        }
        
        return true;
    }
    
    /**
     * Ranged single-target attack
     */
    rangedAttack(monster, target, game, ability) {
        if (!monster.hasLineOfSight(target, game.dungeon)) {
            return false;
        }
        
        const damage = this.rollDice(ability.damage);
        target.takeDamage(damage, ability.damageType, 'monster');
        
        return true;
    }
    
    /**
     * Gaze attack (requires eye contact)
     */
    gazeAttack(monster, target, game, ability) {
        // Check if target is looking away (not implemented yet)
        // In full implementation, would check if player is facing away
        
        if (!monster.hasLineOfSight(target, game.dungeon)) {
            return false;
        }
        
        switch(ability.damageType) {
            case 'petrify':
                // Would turn to stone - for now just massive damage
                target.takeDamage(9999, 'petrify', 'monster');
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You turn to stone!`, 'death');
                break;
                
            case 'paralyze':
                // Set paralyzed status
                target.paralyzed = true;
                target.paralyzedDuration = 5;
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You are paralyzed!`, 'status');
                break;
                
            case 'confuse':
                // Set confused status
                target.confused = true;
                target.confusedDuration = 10;
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `You are confused!`, 'status');
                break;
        }
        
        return true;
    }
    
    /**
     * Teleport ability
     */
    teleport(monster, target, game, ability) {
        // Find random valid position within range
        const positions = [];
        const range = ability.range;
        
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const newX = monster.x + dx;
                const newY = monster.y + dy;
                
                if (game.dungeon.isPassable(newX, newY) && 
                    !game.dungeon.getMonsterAt(newX, newY)) {
                    positions.push({x: newX, y: newY});
                }
            }
        }
        
        if (positions.length > 0) {
            const pos = positions[Math.floor(Math.random() * positions.length)];
            monster.x = pos.x;
            monster.y = pos.y;
            return true;
        }
        
        return false;
    }
    
    /**
     * Short-range teleport
     */
    blink(monster, target, game, ability) {
        return this.teleport(monster, target, game, ability);
    }
    
    /**
     * Charge attack
     */
    charge(monster, target, game, ability) {
        // Move toward target at double speed
        const dx = Math.sign(target.x - monster.x);
        const dy = Math.sign(target.y - monster.y);
        
        // Try to move multiple squares
        let moved = false;
        for (let i = 0; i < 3; i++) {
            const newX = monster.x + dx;
            const newY = monster.y + dy;
            
            if (newX === target.x && newY === target.y) {
                // Hit target
                const damage = this.rollDice(ability.damage);
                target.takeDamage(damage, ability.damageType, 'monster');
                return true;
            }
            
            if (monster.tryMove(game, newX, newY)) {
                moved = true;
            } else {
                break;
            }
        }
        
        return moved;
    }
    
    /**
     * Regeneration (passive)
     */
    regenerate(monster, target, game, ability) {
        if (monster.hp < monster.maxHp) {
            monster.hp = Math.min(monster.maxHp, monster.hp + ability.healAmount);
            
            // Only show message occasionally
            if (Math.random() < 0.2) {
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${monster.getDisplayName()} regenerates!`, 'ability');
            }
        }
        return true;
    }
    
    /**
     * Stone skin defensive buff
     */
    stoneSkin(monster, target, game, ability) {
        monster.tempAC = (monster.tempAC || 0) + ability.acBonus;
        monster.stoneSkinDuration = ability.duration;
        return true;
    }
    
    /**
     * Go invisible
     */
    goInvisible(monster, target, game, ability) {
        monster.invisible = true;
        monster.invisibilityDuration = ability.duration;
        return true;
    }
    
    /**
     * Summon minions
     */
    summonMinions(monster, target, game, ability) {
        const count = this.rollDice(ability.summonCount);
        const summonedMonsters = [];
        
        for (let i = 0; i < count; i++) {
            // Find empty adjacent square
            const positions = this.getAdjacentPositions(monster, game);
            if (positions.length > 0) {
                const pos = positions[Math.floor(Math.random() * positions.length)];
                
                // Create monster of same type or specified type
                const monsterData = ability.summonType === 'same' ? 
                    monster.data : 
                    monsterLoader.getMonster(ability.summonType);
                
                if (monsterData) {
                    const summoned = new Monster(monsterData, pos.x, pos.y);
                    summoned.status = 'hostile';
                    summoned.awareOfPlayer = true;
                    game.dungeon.monsters.push(summoned);
                    summonedMonsters.push(summoned);
                }
            }
        }
        
        if (summonedMonsters.length > 0) {
            EventBus.emit(EVENTS.MONSTERS_SUMMONED, summonedMonsters);
            return true;
        }
        
        return false;
    }
    
    /**
     * Raise dead (animate corpses)
     */
    raiseDead(monster, target, game, ability) {
        // Find corpses in range
        const corpses = game.dungeon.items.filter(item => 
            item.type === 'corpse' &&
            Math.sqrt((item.x - monster.x) ** 2 + (item.y - monster.y) ** 2) <= ability.range
        );
        
        for (const corpse of corpses) {
            // Create skeleton at corpse location
            const skeletonData = monsterLoader.getMonster('skeleton');
            if (skeletonData) {
                const skeleton = new Monster(skeletonData, corpse.x, corpse.y);
                skeleton.status = 'hostile';
                skeleton.awareOfPlayer = true;
                game.dungeon.monsters.push(skeleton);
                
                // Remove corpse
                const index = game.dungeon.items.indexOf(corpse);
                if (index > -1) {
                    game.dungeon.items.splice(index, 1);
                }
            }
        }
        
        return corpses.length > 0;
    }
    
    /**
     * Web attack (immobilize)
     */
    webAttack(monster, target, game, ability) {
        if (!monster.hasLineOfSight(target, game.dungeon)) {
            return false;
        }
        
        target.webbed = true;
        target.webbedDuration = ability.duration;
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You are caught in a web!`, 'status');
        
        return true;
    }
    
    /**
     * Steal item from target
     */
    stealItem(monster, target, game, ability) {
        if (!target.inventory || target.inventory.length === 0) {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${monster.getDisplayName()} finds nothing to steal!`, 'ability');
            return false;
        }
        
        // Pick random item
        const item = target.inventory[Math.floor(Math.random() * target.inventory.length)];
        
        // Remove from player, add to monster inventory
        const index = target.inventory.indexOf(item);
        if (index > -1) {
            target.inventory.splice(index, 1);
            monster.inventory = monster.inventory || [];
            monster.inventory.push(item);
            
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${monster.getDisplayName()} steals your ${item.getDisplayName()}!`, 'theft');
            EventBus.emit(EVENTS.ITEM_STOLEN, { monster, item });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Poison attack (passive on hit)
     */
    poisonAttack(monster, target, game, ability) {
        // This is called after a successful melee attack
        if (!target.poisoned) {
            target.poisoned = true;
            target.poisonDuration = ability.duration;
            target.poisonDamage = ability.damagePerTurn;
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You are poisoned!`, 'status');
        }
        return true;
    }
    
    /**
     * Disease attack
     */
    diseaseAttack(monster, target, game, ability) {
        target.diseased = true;
        // Disease effects: reduced stats, can't heal naturally
        target.diseasedStrengthPenalty = 2;
        target.diseasedConstitutionPenalty = 2;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You feel very sick!`, 'status');
        
        return true;
    }
    
    /**
     * Life drain
     */
    drainLife(monster, target, game, ability) {
        const drainAmount = this.rollDice(ability.drainAmount);
        
        // Damage target
        target.takeDamage(drainAmount, 'necrotic', 'monster');
        
        // Heal monster
        monster.hp = Math.min(monster.maxHp, monster.hp + drainAmount);
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.getDisplayName()} drains your life force!`, 'ability');
        
        return true;
    }
    
    /**
     * Enter rage
     */
    enterRage(monster, target, game, ability) {
        monster.raged = true;
        monster.rageDuration = ability.duration;
        monster.rageDamageMultiplier = ability.damageMultiplier;
        
        return true;
    }
    
    /**
     * Go berserk (triggered at low health)
     */
    goBerserk(monster, target, game, ability) {
        if (!monster.berserk) {
            monster.berserk = true;
            monster.berserkDamageMultiplier = ability.damageMultiplier;
            monster.berserkACPenalty = ability.acPenalty;
            
            return true;
        }
        return false;
    }
    
    // ===== HELPER METHODS =====
    
    /**
     * Get targets in cone area
     */
    getConeTargets(monster, target, game, range) {
        const targets = [];
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        
        // Normalize direction
        const length = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / length;
        const dirY = dy / length;
        
        // Check all positions in cone
        for (let distance = 1; distance <= range; distance++) {
            const width = Math.ceil(distance / 2);
            
            for (let offset = -width; offset <= width; offset++) {
                const checkX = Math.round(monster.x + dirX * distance + dirY * offset);
                const checkY = Math.round(monster.y + dirY * distance - dirX * offset);
                
                // Check for player
                if (game.player.x === checkX && game.player.y === checkY) {
                    targets.push(game.player);
                }
                
                // Check for other monsters (friendly fire possible)
                const otherMonster = game.dungeon.getMonsterAt(checkX, checkY);
                if (otherMonster && otherMonster !== monster) {
                    targets.push(otherMonster);
                }
            }
        }
        
        return targets;
    }
    
    /**
     * Get adjacent empty positions
     */
    getAdjacentPositions(monster, game) {
        const positions = [];
        const adjacent = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dy] of adjacent) {
            const x = monster.x + dx;
            const y = monster.y + dy;
            
            if (game.dungeon.isPassable(x, y) && 
                !game.dungeon.getMonsterAt(x, y) &&
                !(game.player.x === x && game.player.y === y)) {
                positions.push({x, y});
            }
        }
        
        return positions;
    }
    
    /**
     * Roll dice notation
     */
    rollDice(notation) {
        if (typeof notation === 'number') return notation;
        if (!notation) return 0;
        
        const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return parseInt(notation) || 0;
        
        const [, num, sides, mod] = match;
        let total = 0;
        
        for (let i = 0; i < parseInt(num); i++) {
            total += Math.floor(Math.random() * parseInt(sides)) + 1;
        }
        
        if (mod) {
            total += parseInt(mod);
        }
        
        return Math.max(0, total);
    }
}

// Export singleton instance
export const monsterAbilities = new MonsterAbilities();