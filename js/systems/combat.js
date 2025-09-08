/**
 * combat.js - Combat system with Math quizzes for player attacks and NetHack THAC0 for monsters
 * Player attacks require Math quiz success, monsters use traditional THAC0 system
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

// Temporary weapon examples for testing (will be replaced with proper weapon database later)
const EXAMPLE_WEAPONS = {
    "fists": {
        name: "fists",
        mathTier: 1,
        chainMultipliers: [1, 1, 1, 1, 1, 1], // No progression for unarmed
        baseDamage: 2,
        damageType: "bludgeon"
    },
    "iron_sword": {
        name: "iron sword",
        mathTier: 1,
        chainMultipliers: [1, 2, 4, 6, 8, 10], // High scaling sword
        baseDamage: 8,
        damageType: "slash"
    },
    "steel_dagger": {
        name: "steel dagger",
        mathTier: 2,
        chainMultipliers: [1, 1, 2, 2, 4, 8, 16], // Low start, explosive scaling
        baseDamage: 4,
        damageType: "pierce"
    },
    "oak_staff": {
        name: "oak staff",
        mathTier: 1,
        chainMultipliers: [1, 2, 3, 4, 5, 6], // Steady progression
        baseDamage: 6,
        damageType: "bludgeon",
        stunChance: 0.2 // 20% chance to stun
    },
    "iron_spear": {
        name: "iron spear",
        mathTier: 2,
        chainMultipliers: [1, 2, 3, 4, 5, 6],
        baseDamage: 7,
        damageType: "pierce",
        reach: 2 // Can attack 2 squares away
    }
};

// NetHack THAC0 table (To Hit Armor Class 0)
const THAC0_TABLE = {
    1: 19, 2: 19, 3: 18, 4: 18, 5: 17, 6: 17, 7: 16, 8: 16, 9: 15, 10: 15,
    11: 14, 12: 14, 13: 13, 14: 13, 15: 12, 16: 12, 17: 11, 18: 11, 19: 10, 20: 10,
    21: 9, 22: 9, 23: 8, 24: 8, 25: 7, 26: 7, 27: 6, 28: 6, 29: 5, 30: 5
};

export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.quizEngine = game.quizEngine;
        this.messageLog = game.messageLog;
        
        // Combat state
        this.combatQueue = [];
        this.currentCombat = null;
        this.pendingPlayerAttack = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for player attack attempts
        EventBus.on(EVENTS.PLAYER_ATTACK, (data) => {
            this.handlePlayerAttack(data.targetX, data.targetY, data.direction);
        });
        
        // Listen for quiz completion from player attacks
        EventBus.on(EVENTS.QUIZ_COMPLETE, (result) => {
            if (this.pendingPlayerAttack) {
                this.resolvePlayerAttack(result);
            }
        });
        
        // Listen for monster attacks
        EventBus.on(EVENTS.MONSTER_ATTACK, (data) => {
            this.handleMonsterAttack(data.monster, data.target);
        });
        
        // Listen for turn processing
        EventBus.on(EVENTS.TURN_END, () => {
            this.processCombatQueue();
        });
    }
    
    /**
     * Handle player initiating an attack
     */
    handlePlayerAttack(targetX, targetY, direction = null) {
        const target = this.getTargetAt(targetX, targetY);
        if (!target) {
            this.messageLog.add("There's nothing there to attack.", 'info');
            return false;
        }
        
        if (!target.monster) {
            this.messageLog.add("You can't attack that.", 'info');
            return false;
        }
        
        const weapon = this.getPlayerWeapon();
        const distance = this.getDistance(this.player.x, this.player.y, targetX, targetY);
        
        // Check if weapon can reach target
        if (!this.canWeaponReach(weapon, distance)) {
            this.messageLog.add("You can't reach that far.", 'warning');
            return false;
        }
        
        // Check line of sight for ranged weapons
        if (weapon.reach > 1 && !this.hasLineOfSight(this.player.x, this.player.y, targetX, targetY)) {
            this.messageLog.add("Your attack is blocked.", 'warning');
            return false;
        }
        
        // Store attack details for after quiz
        this.pendingPlayerAttack = {
            target: target.monster,
            weapon: weapon,
            targetX: targetX,
            targetY: targetY
        };
        
        // Start Math quiz for weapon
        this.startWeaponQuiz(weapon);
        return true;
    }
    
    /**
     * Start Math quiz based on weapon properties
     */
    startWeaponQuiz(weapon) {
        const baseTimer = this.player.wisdom;
        const enchantmentBonus = weapon.enchantment || 0;
        const blessedBonus = weapon.blessed ? 2 : 0;
        const quizTimer = baseTimer + enchantmentBonus + blessedBonus;
        
        // Start chain quiz for weapon's math tier
        this.quizEngine.startQuiz({
            subject: 'math',
            tier: weapon.mathTier,
            mode: 'chain',
            timer: quizTimer,
            context: 'combat'
        });
        
        this.messageLog.add(`You attack with your ${weapon.name}!`, 'action');
    }
    
    /**
     * Resolve player attack after quiz completion
     */
    resolvePlayerAttack(quizResult) {
        const attack = this.pendingPlayerAttack;
        this.pendingPlayerAttack = null;
        
        if (!attack || !attack.target) {
            return;
        }
        
        const { target, weapon } = attack;
        
        // Check if complete failure (0 correct answers = miss)
        if (quizResult.score === 0) {
            this.messageLog.add(`You miss the ${target.name}!`, 'combat');
            return;
        }
        
        // Calculate damage based on quiz performance
        const damage = this.calculatePlayerDamage(weapon, quizResult, target);
        
        // Apply damage to target
        target.hp -= damage;
        
        // Show combat message
        const multiplier = weapon.chainMultipliers[Math.min(quizResult.score - 1, weapon.chainMultipliers.length - 1)];
        this.messageLog.add(
            `You hit the ${target.name} for ${damage} damage! (${quizResult.score} correct, ${multiplier}x multiplier)`, 
            'combat'
        );
        
        // Check for special weapon effects
        this.applyWeaponEffects(weapon, target, quizResult);
        
        // Check if target is dead
        if (target.hp <= 0) {
            this.handleMonsterDeath(target);
        }
        
        // Emit combat event
        EventBus.emit(EVENTS.COMBAT_RESOLVED, {
            attacker: 'player',
            target: target,
            damage: damage,
            weapon: weapon,
            quizResult: quizResult
        });
    }
    
    /**
     * Calculate player damage based on weapon and quiz performance
     */
    calculatePlayerDamage(weapon, quizResult, target) {
        // Get chain multiplier based on correct answers
        const chainIndex = Math.min(quizResult.score - 1, weapon.chainMultipliers.length - 1);
        const multiplier = weapon.chainMultipliers[chainIndex];
        
        // Base damage calculation
        let baseDamage = weapon.baseDamage * multiplier;
        
        // Apply blessed bonus vs unholy creatures
        if (weapon.blessed && this.isUnholyMonster(target)) {
            baseDamage = Math.floor(baseDamage * 1.5);
        }
        
        // Add enchantment bonus
        const enchantmentBonus = weapon.enchantment || 0;
        const totalDamage = baseDamage + enchantmentBonus;
        
        return Math.max(1, totalDamage); // Minimum 1 damage
    }
    
    /**
     * Handle monster attacking player or other targets
     */
    handleMonsterAttack(monster, target = null) {
        const actualTarget = target || this.player;
        
        // Use NetHack THAC0 system for monster attacks
        const hitRoll = this.rollD20();
        const monsterThac0 = this.getMonsterThac0(monster);
        const targetAC = actualTarget.ac || 10;
        
        // Calculate if hit succeeds: d20 + target_AC >= THAC0
        const hitSuccess = (hitRoll + targetAC) >= monsterThac0;
        
        if (!hitSuccess) {
            this.messageLog.add(`The ${monster.name} misses you!`, 'combat');
            return;
        }
        
        // Calculate monster damage (traditional dice rolls)
        const damage = this.calculateMonsterDamage(monster);
        
        // Apply damage
        actualTarget.hp -= damage;
        
        this.messageLog.add(
            `The ${monster.name} hits you for ${damage} damage!`, 
            'danger'
        );
        
        // Check for special attack effects
        this.applyMonsterAttackEffects(monster, actualTarget, damage);
        
        // Check if player died
        if (actualTarget === this.player && actualTarget.hp <= 0) {
            this.handlePlayerDeath();
        }
        
        EventBus.emit(EVENTS.COMBAT_RESOLVED, {
            attacker: monster,
            target: actualTarget,
            damage: damage,
            hitRoll: hitRoll,
            thac0: monsterThac0
        });
    }
    
    /**
     * Get monster's THAC0 value
     */
    getMonsterThac0(monster) {
        const level = monster.level || 1;
        return THAC0_TABLE[Math.min(level, 30)] || 19;
    }
    
    /**
     * Calculate monster damage using dice rolls
     */
    calculateMonsterDamage(monster) {
        if (!monster.attacks || monster.attacks.length === 0) {
            return 1; // Default punch
        }
        
        // Use first attack for now (can be expanded for multiple attacks)
        const attack = monster.attacks[0];
        return this.rollDamage(attack.damage);
    }
    
    /**
     * Roll damage from dice notation (e.g., "2d6+3")
     */
    rollDamage(diceNotation) {
        const match = diceNotation.match(/(\d+)d(\d+)(\+(\d+))?/);
        if (!match) {
            return parseInt(diceNotation) || 1;
        }
        
        const numDice = parseInt(match[1]);
        const dieSize = parseInt(match[2]);
        const bonus = parseInt(match[4]) || 0;
        
        let total = bonus;
        for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * dieSize) + 1;
        }
        
        return total;
    }
    
    /**
     * Get player's current weapon
     */
    getPlayerWeapon() {
        // Check if player has equipped weapon
        const equippedWeapon = this.player.equipment?.weapon;
        if (equippedWeapon && EXAMPLE_WEAPONS[equippedWeapon.id]) {
            // Merge equipped weapon properties with base weapon stats
            const baseWeapon = { ...EXAMPLE_WEAPONS[equippedWeapon.id] };
            baseWeapon.enchantment = equippedWeapon.enchantment || 0;
            baseWeapon.blessed = equippedWeapon.blessed || false;
            baseWeapon.cursed = equippedWeapon.cursed || false;
            return baseWeapon;
        }
        
        // Default to fists if no weapon equipped
        return { ...EXAMPLE_WEAPONS.fists };
    }
    
    /**
     * Check if weapon can reach target distance
     */
    canWeaponReach(weapon, distance) {
        const reach = weapon.reach || 1;
        return distance <= reach;
    }
    
    /**
     * Calculate distance between two points
     */
    getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    }
    
    /**
     * Check line of sight between two points
     */
    hasLineOfSight(x1, y1, x2, y2) {
        // Simplified line of sight - can be enhanced with proper Bresenham later
        return true; // For now, assume clear line
    }
    
    /**
     * Get target at specific coordinates
     */
    getTargetAt(x, y) {
        // This would interface with the dungeon/monster system
        // For now, return placeholder
        return this.game.dungeon?.getMonsterAt(x, y);
    }
    
    /**
     * Check if monster is unholy (for blessed weapon bonus)
     */
    isUnholyMonster(monster) {
        return monster.flags?.demonic || monster.flags?.undead || false;
    }
    
    /**
     * Apply special weapon effects
     */
    applyWeaponEffects(weapon, target, quizResult) {
        // Stun effect for staves
        if (weapon.stunChance && Math.random() < weapon.stunChance) {
            target.stunned = true;
            target.stunnedTurns = 2;
            this.messageLog.add(`The ${target.name} is stunned!`, 'effect');
        }
    }
    
    /**
     * Apply special monster attack effects
     */
    applyMonsterAttackEffects(monster, target, damage) {
        // Placeholder for poison, paralysis, etc.
    }
    
    /**
     * Handle monster death
     */
    handleMonsterDeath(monster) {
        this.messageLog.add(`The ${monster.name} dies!`, 'success');
        
        // Remove monster from dungeon
        if (this.game.dungeon) {
            this.game.dungeon.removeMonster(monster);
        }
        
        // Drop loot
        this.dropMonsterLoot(monster);
        
        EventBus.emit(EVENTS.MONSTER_DEATH, { monster: monster });
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath() {
        this.messageLog.add("You die!", 'danger');
        EventBus.emit(EVENTS.PLAYER_DEATH);
    }
    
    /**
     * Drop loot from dead monster
     */
    dropMonsterLoot(monster) {
        // Always drop corpse for harvesting
        if (monster.loot?.corpse) {
            this.game.dungeon?.addItem(monster.x, monster.y, {
                id: monster.loot.corpse,
                type: 'corpse',
                name: `${monster.name} corpse`,
                weight: monster.weight || 100
            });
        }
        
        // Drop other loot based on chance
        if (monster.loot?.common) {
            monster.loot.common.forEach(lootItem => {
                if (Math.random() < lootItem.chance) {
                    this.game.dungeon?.addItem(monster.x, monster.y, {
                        id: lootItem.item,
                        type: 'weapon', // Placeholder
                        name: lootItem.item.replace('_', ' ')
                    });
                }
            });
        }
    }
    
    /**
     * Process combat queue for turn-based combat
     */
    processCombatQueue() {
        // Process any queued combat actions
        while (this.combatQueue.length > 0) {
            const action = this.combatQueue.shift();
            this.executeQueuedAction(action);
        }
    }
    
    /**
     * Execute a queued combat action
     */
    executeQueuedAction(action) {
        switch (action.type) {
            case 'monster_attack':
                this.handleMonsterAttack(action.monster, action.target);
                break;
        }
    }
    
    /**
     * Roll a d20
     */
    rollD20() {
        return Math.floor(Math.random() * 20) + 1;
    }
    
    /**
     * Queue a combat action for later processing
     */
    queueCombatAction(action) {
        this.combatQueue.push(action);
    }
    
    /**
     * Get combat statistics for UI display
     */
    getCombatStats() {
        const weapon = this.getPlayerWeapon();
        return {
            weapon: weapon.name,
            baseDamage: weapon.baseDamage,
            mathTier: weapon.mathTier,
            chainMultipliers: weapon.chainMultipliers,
            reach: weapon.reach || 1,
            stunChance: weapon.stunChance || 0
        };
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        EventBus.off(EVENTS.PLAYER_ATTACK);
        EventBus.off(EVENTS.QUIZ_COMPLETE);
        EventBus.off(EVENTS.MONSTER_ATTACK);
        EventBus.off(EVENTS.TURN_END);
    }
}