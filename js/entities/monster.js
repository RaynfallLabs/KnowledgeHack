/**
 * monster.js - Simplified monster system for Philosopher's Quest
 * Handles monster instances with combat, awareness, and identification
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';
import { MonsterAI } from './monster-ai.js';
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
        
        // Combat stats
        this.maxHp = rollDice(monsterData.hp);
        this.hp = this.maxHp;
        this.thac0 = monsterData.thac0;
        this.attacks = monsterData.attacks; // Array of {type, damage}
        
        // Movement
        this.speed = monsterData.speed;
        this.movementType = monsterData.movementType || 'walk';
        this.size = monsterData.size || 'medium';
        
        // Status & Awareness
        this.status = monsterData.defaultStatus || 'wandering';
        this.awareOfPlayer = false;
        this.sightRange = monsterData.sightRange || 5;
        this.hearingRange = monsterData.hearingRange || 8;
        this.alertRadius = monsterData.alertRadius || 5;
        
        // Sleeping monsters have no awareness
        if (this.status === 'sleeping') {
            this.currentSightRange = 0;
            this.currentHearingRange = 0;
        } else {
            this.currentSightRange = this.sightRange;
            this.currentHearingRange = this.hearingRange;
        }
        
        // Identification (Philosophy quiz)
        this.identified = false;
        this.identTier = monsterData.identTier || 1;
        this.identThreshold = monsterData.identThreshold || 2;
        this.description = monsterData.description || "A mysterious creature.";
        
        // Creature type (for blessed weapon damage)
        this.creatureType = monsterData.creatureType || 'normal';
        
        // Special properties
        this.abilities = monsterData.abilities || [];
        this.resistances = monsterData.resistances || [];
        this.weaknesses = monsterData.weaknesses || [];
        
        // Group behavior
        this.packSize = monsterData.packSize;
        
        // Loot
        this.lootTable = monsterData.lootTable;
        
        // AI
        this.ai = new MonsterAI(this, monsterData.aiPattern || 'aggressive');
        
        // Turn tracking
        this.movePoints = 0;
        this.lastAction = null;
    }
    
    /**
     * Get display name based on identification status
     */
    getDisplayName() {
        if (this.identified) {
            return this.name;
        }
        // Unidentified monsters show as "something" or by general type
        switch(this.size) {
            case 'tiny': return 'something tiny';
            case 'small': return 'something small';
            case 'large': return 'something large';
            case 'huge': return 'something huge';
            default: return 'something';
        }
    }
    
    /**
     * Get display symbol
     */
    getDisplaySymbol() {
        return this.identified ? this.symbol : '?';
    }
    
    /**
     * Update awareness based on player actions
     */
    updateAwareness(player, dungeon, noiseLevel = 0) {
        // Already hostile stays hostile unless player escapes far enough
        if (this.status === 'hostile') {
            const distance = this.distanceTo(player);
            if (distance > this.sightRange * 3) {
                this.status = 'wandering';
                this.awareOfPlayer = false;
            }
            return this.awareOfPlayer;
        }
        
        // Sleeping monsters need noise to wake up
        if (this.status === 'sleeping') {
            if (noiseLevel > 0 && this.distanceTo(player) <= noiseLevel) {
                this.wakeUp();
                return true;
            }
            return false;
        }
        
        // Check line of sight
        if (this.hasLineOfSight(player, dungeon) && 
            this.distanceTo(player) <= this.currentSightRange) {
            this.becomeAware(dungeon);
            return true;
        }
        
        // Check for noise (combat or door bashing)
        if (noiseLevel > 0 && this.distanceTo(player) <= this.currentHearingRange) {
            this.becomeAware(dungeon);
            return true;
        }
        
        return this.awareOfPlayer;
    }
    
    /**
     * Wake up from sleeping
     */
    wakeUp() {
        this.status = 'wandering';
        this.currentSightRange = this.sightRange;
        this.currentHearingRange = this.hearingRange;
        EventBus.emit(EVENTS.UI_MESSAGE, `The ${this.getDisplayName()} wakes up!`, 'warning');
    }
    
    /**
     * Become aware of player and alert pack
     */
    becomeAware(dungeon) {
        if (this.status === 'hostile') return; // Already aware
        
        this.awareOfPlayer = true;
        this.status = 'hostile';
        EventBus.emit(EVENTS.UI_MESSAGE, `The ${this.getDisplayName()} notices you!`, 'warning');
        
        // Alert nearby same species
        this.alertPack(dungeon);
    }
    
    /**
     * Alert nearby monsters of same type
     */
    alertPack(dungeon) {
        const nearbyMonsters = dungeon.getMonstersInRadius(this.x, this.y, this.alertRadius);
        nearbyMonsters.forEach(m => {
            if (m.id === this.id && m.status !== 'hostile') {
                m.awareOfPlayer = true;
                m.status = 'hostile';
                EventBus.emit(EVENTS.UI_MESSAGE, `The ${m.getDisplayName()} is alerted!`, 'warning');
            }
        });
    }
    
    /**
     * Process monster's turn
     */
    takeTurn(game) {
        // Dead monsters don't act
        if (this.hp <= 0) return;
        
        // Update awareness
        this.updateAwareness(game.player, game.dungeon);
        
        // Let AI decide action based on status
        this.ai.act(game);
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, damageType = 'physical', source = null) {
        // Apply resistances
        if (this.resistances.includes(damageType)) {
            amount = Math.floor(amount / 2);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${this.getDisplayName()} resists!`, 'combat');
        }
        
        // Apply weaknesses
        if (this.weaknesses.includes(damageType)) {
            amount = Math.floor(amount * 1.5);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${this.getDisplayName()} is vulnerable!`, 'combat');
        }
        
        // Apply damage
        this.hp -= amount;
        
        // Wake up if sleeping
        if (this.status === 'sleeping') {
            this.wakeUp();
        }
        
        // Become hostile if not already
        if (this.status !== 'hostile' && source === 'player') {
            this.becomeAware(game.dungeon);
        }
        
        // Check death
        if (this.hp <= 0) {
            this.die();
        }
        
        return amount;
    }
    
    /**
     * Monster death
     */
    die() {
        EventBus.emit(EVENTS.MONSTER_KILLED, this);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${this.getDisplayName()} dies!`, 'combat');
        
        // Drop loot
        this.dropLoot();
    }
    
    /**
     * Drop loot on death
     */
    dropLoot() {
        const loot = [];
        
        // Always drop corpse
        if (this.lootTable?.corpse) {
            loot.push({
                type: 'corpse',
                id: this.lootTable.corpse,
                x: this.x,
                y: this.y
            });
        }
        
        // Roll for gold
        if (this.lootTable?.gold) {
            const goldAmount = rollDice(this.lootTable.gold);
            if (goldAmount > 0) {
                loot.push({
                    type: 'gold',
                    amount: goldAmount,
                    x: this.x,
                    y: this.y
                });
            }
        }
        
        // Roll for items
        if (this.lootTable?.items) {
            this.lootTable.items.forEach(itemDrop => {
                if (Math.random() < itemDrop.chance) {
                    loot.push({
                        type: 'item',
                        id: itemDrop.id,
                        x: this.x,
                        y: this.y
                    });
                }
            });
        }
        
        EventBus.emit(EVENTS.LOOT_DROPPED, loot);
    }
    
    /**
     * Calculate distance to target
     */
    distanceTo(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check line of sight to target
     */
    hasLineOfSight(target, dungeon) {
        // Simple implementation - can be enhanced with proper raycasting
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.currentSightRange) return false;
        
        // Check if path is blocked by walls
        const steps = Math.ceil(distance);
        for (let i = 1; i < steps; i++) {
            const checkX = Math.round(this.x + (dx * i / steps));
            const checkY = Math.round(this.y + (dy * i / steps));
            
            if (dungeon.isWall(checkX, checkY)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Try to move to position
     */
    tryMove(game, newX, newY) {
        // Check if move is valid
        if (!game.dungeon.isPassable(newX, newY)) {
            return false;
        }
        
        // Check for player collision (attack instead)
        if (game.player.x === newX && game.player.y === newY) {
            this.attack(game.player, game);
            return true;
        }
        
        // Check for monster collision
        if (game.dungeon.getMonsterAt(newX, newY)) {
            return false;
        }
        
        // Move
        this.x = newX;
        this.y = newY;
        return true;
    }
    
    /**
     * Attack target (usually player)
     */
    attack(target, game) {
        // Pick a random attack from available attacks
        const attack = this.attacks[Math.floor(Math.random() * this.attacks.length)];
        
        // Use combat system for resolution
        game.combatSystem.monsterAttack(this, target, attack);
    }
    
    /**
     * Identify this monster
     */
    identify() {
        this.identified = true;
        EventBus.emit(EVENTS.MONSTER_IDENTIFIED, this);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `It's a ${this.name}! ${this.description}`, 'identify');
    }
}