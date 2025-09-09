/**
 * monster-ai.js - AI patterns and behaviors for monsters
 * Handles movement decisions, combat tactics, and state-based behaviors
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class MonsterAI {
    constructor(monster, pattern = 'aggressive') {
        this.monster = monster;
        this.pattern = pattern;
        this.lastPlayerPosition = null;
        this.wanderDirection = null;
        this.guardPost = { x: monster.x, y: monster.y };
        this.fleeThreshold = 0.2; // Flee when below 20% HP for cowardly
    }
    
    /**
     * Main AI action decision
     */
    act(game) {
        // Handle based on monster status
        switch(this.monster.status) {
            case 'sleeping':
                // Do nothing while sleeping
                break;
                
            case 'wandering':
                this.wander(game);
                break;
                
            case 'guarding':
                this.guard(game);
                break;
                
            case 'hostile':
                this.executePattern(game);
                break;
                
            default:
                this.wander(game);
        }
    }
    
    /**
     * Execute AI pattern when hostile
     */
    executePattern(game) {
        const player = game.player;
        const distance = this.monster.distanceTo(player);
        
        // Check if should flee (cowardly or low HP)
        if (this.shouldFlee()) {
            this.flee(game);
            return;
        }
        
        // Execute pattern-specific behavior
        switch(this.pattern) {
            case 'aggressive':
                this.aggressiveBehavior(game, distance);
                break;
                
            case 'defensive':
                this.defensiveBehavior(game, distance);
                break;
                
            case 'ranged':
                this.rangedBehavior(game, distance);
                break;
                
            case 'intelligent':
                this.intelligentBehavior(game, distance);
                break;
                
            case 'cowardly':
                this.cowardlyBehavior(game, distance);
                break;
                
            case 'pack_hunter':
                this.packHunterBehavior(game, distance);
                break;
                
            default:
                this.aggressiveBehavior(game, distance);
        }
    }
    
    /**
     * Aggressive - Always charges and attacks
     */
    aggressiveBehavior(game, distance) {
        const player = game.player;
        
        // Adjacent? Attack!
        if (distance <= 1.5) {
            this.monster.attack(player, game);
            return;
        }
        
        // Otherwise, pursue
        this.pursueTarget(game, player);
    }
    
    /**
     * Defensive - Maintains distance, waits for player approach
     */
    defensiveBehavior(game, distance) {
        const player = game.player;
        
        // Adjacent? Attack and try to back off
        if (distance <= 1.5) {
            this.monster.attack(player, game);
            this.stepBack(game, player);
            return;
        }
        
        // Stay at medium range (3-4 tiles)
        if (distance < 3) {
            this.stepBack(game, player);
        } else if (distance > 4) {
            this.pursueTarget(game, player);
        } else {
            // Wait and watch
            this.circleTarget(game, player);
        }
    }
    
    /**
     * Ranged - Prefers distance attacks
     */
    rangedBehavior(game, distance) {
        const player = game.player;
        
        // Too close? Back away
        if (distance <= 2) {
            this.stepBack(game, player);
            return;
        }
        
        // In range for ranged attack?
        if (distance <= 6 && this.hasLineOfShot(game, player)) {
            // Check if monster has ranged attack
            const rangedAttack = this.monster.attacks.find(a => 
                a.type === 'breath' || a.type === 'gaze' || a.type === 'spell'
            );
            
            if (rangedAttack) {
                this.monster.attack(player, game);
                return;
            }
        }
        
        // Otherwise position for shot
        if (distance > 6) {
            this.pursueTarget(game, player);
        } else {
            this.circleTarget(game, player);
        }
    }
    
    /**
     * Intelligent - Uses items, spells, tactical movement
     */
    intelligentBehavior(game, distance) {
        const player = game.player;
        
        // Low HP? Consider using healing items or fleeing
        if (this.monster.hp < this.monster.maxHp * 0.3) {
            // Would use healing potion if implemented
            // For now, tactical retreat
            if (distance <= 3) {
                this.stepBack(game, player);
                return;
            }
        }
        
        // Use best available attack
        if (distance <= 1.5) {
            this.monster.attack(player, game);
        } else if (distance <= 6 && this.hasLineOfShot(game, player)) {
            // Check for ranged options
            const rangedAttack = this.monster.attacks.find(a => 
                a.type === 'spell' || a.type === 'wand'
            );
            if (rangedAttack) {
                this.monster.attack(player, game);
                return;
            }
            // Otherwise close distance
            this.pursueTarget(game, player);
        } else {
            this.pursueTarget(game, player);
        }
    }
    
    /**
     * Cowardly - Flees when hurt, attacks when cornered
     */
    cowardlyBehavior(game, distance) {
        const player = game.player;
        
        // Hurt? Run away!
        if (this.monster.hp < this.monster.maxHp * 0.7) {
            this.flee(game);
            return;
        }
        
        // Only attack if cornered or player is weak
        if (distance <= 1.5) {
            if (this.isCornered(game) || player.hp < 20) {
                this.monster.attack(player, game);
            } else {
                this.flee(game);
            }
        } else if (distance > 6) {
            // Cautiously approach if player seems weak
            if (player.hp < player.maxHp * 0.3) {
                this.pursueTarget(game, player);
            } else {
                this.wander(game);
            }
        }
    }
    
    /**
     * Pack Hunter - Coordinates with nearby allies
     */
    packHunterBehavior(game, distance) {
        const player = game.player;
        const allies = this.getNearbyAllies(game);
        
        // If multiple allies, try to surround
        if (allies.length >= 2) {
            this.surroundTarget(game, player, allies);
        } else {
            // Otherwise standard aggressive
            this.aggressiveBehavior(game, distance);
        }
    }
    
    /**
     * Wander randomly when not hostile
     */
    wander(game) {
        // Continue in same direction 70% of time
        if (!this.wanderDirection || Math.random() < 0.3) {
            const directions = [
                {x: 0, y: -1}, {x: 1, y: 0}, 
                {x: 0, y: 1}, {x: -1, y: 0},
                {x: -1, y: -1}, {x: 1, y: -1},
                {x: -1, y: 1}, {x: 1, y: 1}
            ];
            this.wanderDirection = directions[Math.floor(Math.random() * directions.length)];
        }
        
        const newX = this.monster.x + this.wanderDirection.x;
        const newY = this.monster.y + this.wanderDirection.y;
        
        if (!this.monster.tryMove(game, newX, newY)) {
            // Hit wall? Pick new direction
            this.wanderDirection = null;
        }
    }
    
    /**
     * Guard behavior - stay near post, attack intruders
     */
    guard(game) {
        const player = game.player;
        const distanceToPlayer = this.monster.distanceTo(player);
        const distanceToPost = this.distanceToPoint(this.guardPost);
        
        // Player too close to guard post?
        if (distanceToPlayer <= 3) {
            this.monster.becomeAware(game.dungeon);
            this.monster.attack(player, game);
            return;
        }
        
        // Too far from post? Return
        if (distanceToPost > 2) {
            this.moveToward(game, this.guardPost);
        }
    }
    
    /**
     * Flee from player
     */
    flee(game) {
        const player = game.player;
        const dx = this.monster.x - player.x;
        const dy = this.monster.y - player.y;
        
        // Normalize and flee in opposite direction
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
            const fleeX = this.monster.x + Math.round(dx / distance);
            const fleeY = this.monster.y + Math.round(dy / distance);
            
            if (!this.monster.tryMove(game, fleeX, fleeY)) {
                // Can't flee directly? Try diagonal
                this.panicMove(game);
            }
        }
    }
    
    /**
     * Pursue target using pathfinding
     */
    pursueTarget(game, target) {
        // Simple pathfinding - move toward target
        this.moveToward(game, target);
    }
    
    /**
     * Move toward a point
     */
    moveToward(game, target) {
        const dx = Math.sign(target.x - this.monster.x);
        const dy = Math.sign(target.y - this.monster.y);
        
        // Try diagonal first (more natural movement)
        if (dx !== 0 && dy !== 0) {
            if (this.monster.tryMove(game, this.monster.x + dx, this.monster.y + dy)) {
                return;
            }
        }
        
        // Try horizontal
        if (dx !== 0) {
            if (this.monster.tryMove(game, this.monster.x + dx, this.monster.y)) {
                return;
            }
        }
        
        // Try vertical
        if (dy !== 0) {
            if (this.monster.tryMove(game, this.monster.x, this.monster.y + dy)) {
                return;
            }
        }
        
        // Blocked? Try to go around
        this.tryDetour(game, target);
    }
    
    /**
     * Step back from target
     */
    stepBack(game, target) {
        const dx = Math.sign(this.monster.x - target.x);
        const dy = Math.sign(this.monster.y - target.y);
        
        this.monster.tryMove(game, this.monster.x + dx, this.monster.y + dy);
    }
    
    /**
     * Circle around target
     */
    circleTarget(game, target) {
        const dx = target.x - this.monster.x;
        const dy = target.y - this.monster.y;
        
        // Move perpendicular to target
        if (Math.abs(dx) > Math.abs(dy)) {
            // Target is more horizontal, move vertical
            const moveY = dy === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(dy);
            this.monster.tryMove(game, this.monster.x, this.monster.y + moveY);
        } else {
            // Target is more vertical, move horizontal
            const moveX = dx === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(dx);
            this.monster.tryMove(game, this.monster.x + moveX, this.monster.y);
        }
    }
    
    /**
     * Try to surround target with allies
     */
    surroundTarget(game, target, allies) {
        // Find best position to surround
        const positions = [
            {x: target.x - 1, y: target.y},
            {x: target.x + 1, y: target.y},
            {x: target.x, y: target.y - 1},
            {x: target.x, y: target.y + 1},
            {x: target.x - 1, y: target.y - 1},
            {x: target.x + 1, y: target.y - 1},
            {x: target.x - 1, y: target.y + 1},
            {x: target.x + 1, y: target.y + 1}
        ];
        
        // Find unoccupied surrounding position
        for (const pos of positions) {
            if (game.dungeon.isPassable(pos.x, pos.y) && 
                !game.dungeon.getMonsterAt(pos.x, pos.y)) {
                this.moveToward(game, pos);
                return;
            }
        }
        
        // All positions taken? Just move closer
        this.moveToward(game, target);
    }
    
    /**
     * Panic move when cornered
     */
    panicMove(game) {
        // Try random adjacent squares
        const directions = [
            {x: 0, y: -1}, {x: 1, y: 0}, 
            {x: 0, y: 1}, {x: -1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1},
            {x: -1, y: 1}, {x: 1, y: 1}
        ];
        
        // Shuffle and try each
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        for (const dir of directions) {
            if (this.monster.tryMove(game, this.monster.x + dir.x, this.monster.y + dir.y)) {
                return;
            }
        }
    }
    
    /**
     * Try alternate path when blocked
     */
    tryDetour(game, target) {
        // Try perpendicular movements
        const dx = Math.sign(target.x - this.monster.x);
        const dy = Math.sign(target.y - this.monster.y);
        
        if (dx !== 0) {
            // Blocked horizontally? Try vertical detour
            if (this.monster.tryMove(game, this.monster.x, this.monster.y + 1)) return;
            if (this.monster.tryMove(game, this.monster.x, this.monster.y - 1)) return;
        }
        
        if (dy !== 0) {
            // Blocked vertically? Try horizontal detour
            if (this.monster.tryMove(game, this.monster.x + 1, this.monster.y)) return;
            if (this.monster.tryMove(game, this.monster.x - 1, this.monster.y)) return;
        }
    }
    
    /**
     * Check if should flee
     */
    shouldFlee() {
        // Cowardly flee at higher HP
        if (this.pattern === 'cowardly') {
            return this.monster.hp < this.monster.maxHp * 0.5;
        }
        
        // Others only flee when very low
        return this.monster.hp < this.monster.maxHp * this.fleeThreshold;
    }
    
    /**
     * Check if cornered
     */
    isCornered(game) {
        let escapeRoutes = 0;
        const directions = [
            {x: 0, y: -1}, {x: 1, y: 0}, 
            {x: 0, y: 1}, {x: -1, y: 0}
        ];
        
        for (const dir of directions) {
            if (game.dungeon.isPassable(this.monster.x + dir.x, this.monster.y + dir.y)) {
                escapeRoutes++;
            }
        }
        
        return escapeRoutes <= 1;
    }
    
    /**
     * Check line of shot for ranged attacks
     */
    hasLineOfShot(game, target) {
        return this.monster.hasLineOfSight(target, game.dungeon);
    }
    
    /**
     * Get nearby allies of same type
     */
    getNearbyAllies(game) {
        const allies = [];
        const checkRadius = 8;
        
        const nearbyMonsters = game.dungeon.getMonstersInRadius(
            this.monster.x, this.monster.y, checkRadius
        );
        
        for (const m of nearbyMonsters) {
            if (m !== this.monster && m.id === this.monster.id && m.status === 'hostile') {
                allies.push(m);
            }
        }
        
        return allies;
    }
    
    /**
     * Distance to a point
     */
    distanceToPoint(point) {
        const dx = point.x - this.monster.x;
        const dy = point.y - this.monster.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}