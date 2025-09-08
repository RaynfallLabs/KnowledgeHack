/**
 * monster-ai.js - Monster AI patterns and behaviors
 * Implements NetHack-inspired AI strategies
 */

import { EventBus, EVENTS } from '../core/event-bus.js';

/**
 * Base AI class
 */
class BaseAI {
    constructor(monster) {
        this.monster = monster;
    }
    
    /**
     * Main AI action
     */
    act(game) {
        // Override in subclasses
    }
    
    /**
     * Get path to target (simplified A*)
     */
    getPathTo(targetX, targetY, game) {
        // Simple direct path for now
        // TODO: Implement proper A* pathfinding
        const dx = Math.sign(targetX - this.monster.x);
        const dy = Math.sign(targetY - this.monster.y);
        return { dx, dy };
    }
    
    /**
     * Check if should flee
     */
    shouldFlee() {
        return this.monster.fleeing || 
               (this.monster.hp < this.monster.maxHp / 4 && !this.monster.flags.noflee);
    }
    
    /**
     * Flee from target
     */
    fleeFrom(targetX, targetY, game) {
        // Move away from target
        const dx = Math.sign(this.monster.x - targetX);
        const dy = Math.sign(this.monster.y - targetY);
        
        // Try to move away
        if (!this.monster.tryMove(game, this.monster.x + dx, this.monster.y + dy)) {
            // If can't move directly away, try perpendicular
            if (dx === 0) {
                this.monster.tryMove(game, this.monster.x + 1, this.monster.y) ||
                this.monster.tryMove(game, this.monster.x - 1, this.monster.y);
            } else {
                this.monster.tryMove(game, this.monster.x, this.monster.y + 1) ||
                this.monster.tryMove(game, this.monster.x, this.monster.y - 1);
            }
        }
    }
    
    /**
     * Wander randomly
     */
    wander(game) {
        const dirs = [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        this.monster.tryMove(game, this.monster.x + dir[0], this.monster.y + dir[1]);
    }
}

/**
 * Basic hostile AI - move toward player and attack
 */
class HostileBasicAI extends BaseAI {
    act(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
        
        // Check if should flee
        if (this.shouldFlee()) {
            this.fleeFrom(player.x, player.y, game);
            return;
        }
        
        // If player is adjacent, attack
        if (dist === 1) {
            this.monster.meleeAttack(player, game);
            return;
        }
        
        // If can see player, move toward them
        if (this.monster.canSee(player, game)) {
            const path = this.getPathTo(player.x, player.y, game);
            if (!this.monster.tryMove(game, 
                this.monster.x + path.dx, 
                this.monster.y + path.dy)) {
                // Try alternate path
                if (path.dx !== 0 && path.dy !== 0) {
                    // Was trying diagonal, try orthogonal
                    this.monster.tryMove(game, this.monster.x + path.dx, this.monster.y) ||
                    this.monster.tryMove(game, this.monster.x, this.monster.y + path.dy);
                }
            }
        } else {
            // Can't see player, wander
            this.wander(game);
        }
    }
}

/**
 * Intelligent hostile AI - uses items, better tactics
 */
class IntelligentHostileAI extends HostileBasicAI {
    act(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
        
        // Check if should use ranged attack or ability
        if (dist > 1 && dist <= 8) {
            // Try breath weapon
            if (this.monster.abilities.find(a => a.type === 'breath_weapon')) {
                if (this.monster.useAbility('breath_weapon', player, game)) {
                    return;
                }
            }
            
            // Try wand/spell
            if (this.monster.inventory.find(i => i.type === 'wand')) {
                // TODO: Use wand
            }
        }
        
        // Check if should flee (smarter about it)
        if (this.monster.hp < this.monster.maxHp / 3) {
            // Look for healing items
            const potion = this.monster.inventory.find(i => 
                i.type === 'potion' && i.subtype === 'healing'
            );
            if (potion) {
                // TODO: Drink potion
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${this.monster.name} drinks a potion!`, 'warning');
                return;
            }
            
            // Otherwise flee
            if (!this.monster.flags.noflee) {
                this.fleeFrom(player.x, player.y, game);
                return;
            }
        }
        
        // Otherwise use basic hostile AI
        super.act(game);
    }
}

/**
 * Covetous AI - teleports, seeks specific items
 */
class CovetousAI extends IntelligentHostileAI {
    act(game) {
        // Covetous monsters want specific items (Amulet, artifacts)
        // They teleport frequently
        
        // Check if player has desired item
        const hasDesiredItem = this.checkForDesiredItems(game.player);
        
        if (hasDesiredItem) {
            // Aggressive pursuit
            const dist = Math.abs(game.player.x - this.monster.x) + 
                        Math.abs(game.player.y - this.monster.y);
            
            // Teleport closer if far away
            if (dist > 5 && Math.random() < 0.3) {
                this.teleportNearPlayer(game);
                return;
            }
        }
        
        // Use intelligent hostile AI
        super.act(game);
    }
    
    checkForDesiredItems(player) {
        // Check for Amulet of Yendor or artifacts
        // TODO: Implement when items are ready
        return false;
    }
    
    teleportNearPlayer(game) {
        // Teleport within 3 squares of player
        const positions = [];
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = game.player.x + dx;
                const y = game.player.y + dy;
                if (game.dungeon.isWalkable(x, y) && !game.getMonsterAt(x, y)) {
                    positions.push({x, y});
                }
            }
        }
        
        if (positions.length > 0) {
            const pos = positions[Math.floor(Math.random() * positions.length)];
            this.monster.x = pos.x;
            this.monster.y = pos.y;
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${this.monster.name} teleports!`, 'warning');
        }
    }
}

/**
 * Animal AI - pack behavior, fight or flight
 */
class AnimalAI extends BaseAI {
    act(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
        
        // Pack behavior - if other similar monsters are fighting, join in
        const allies = this.findNearbyAllies(game);
        const alliesFighting = allies.some(m => 
            Math.abs(m.x - player.x) + Math.abs(m.y - player.y) === 1
        );
        
        if (alliesFighting) {
            // Join the fight
            const path = this.getPathTo(player.x, player.y, game);
            this.monster.tryMove(game, 
                this.monster.x + path.dx, 
                this.monster.y + path.dy);
            return;
        }
        
        // Fight or flight based on health and numbers
        const shouldFight = this.monster.hp > this.monster.maxHp / 2 || 
                          allies.length > 2;
        
        if (shouldFight && dist <= 5) {
            // Attack
            if (dist === 1) {
                this.monster.meleeAttack(player, game);
            } else {
                const path = this.getPathTo(player.x, player.y, game);
                this.monster.tryMove(game, 
                    this.monster.x + path.dx, 
                    this.monster.y + path.dy);
            }
        } else if (dist <= 3) {
            // Too close, flee
            this.fleeFrom(player.x, player.y, game);
        } else {
            // Wander
            this.wander(game);
        }
    }
    
    findNearbyAllies(game) {
        return game.monsters.filter(m => 
            m !== this.monster &&
            m.id === this.monster.id &&
            Math.abs(m.x - this.monster.x) + Math.abs(m.y - this.monster.y) <= 5
        );
    }
}

/**
 * Peaceful AI - avoids blocking, may become hostile
 */
class PeacefulAI extends BaseAI {
    act(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
        
        // If player attacks peaceful monster, become hostile
        // (This would be triggered by event, not here)
        
        // Move out of player's way
        if (dist === 1) {
            // Step aside
            const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
            for (const dir of dirs) {
                const newX = this.monster.x + dir[0];
                const newY = this.monster.y + dir[1];
                if (newX !== player.x || newY !== player.y) {
                    if (this.monster.tryMove(game, newX, newY)) {
                        break;
                    }
                }
            }
        } else {
            // Wander peacefully
            if (Math.random() < 0.3) {
                this.wander(game);
            }
        }
    }
}

/**
 * Shopkeeper AI - guards shop, trades
 */
class ShopkeeperAI extends PeacefulAI {
    constructor(monster) {
        super(monster);
        this.shopArea = null; // Define shop boundaries
    }
    
    act(game) {
        // Check if player is stealing
        if (this.detectTheft(game)) {
            // Become hostile
            this.monster.hostile = true;
            this.monster.peaceful = false;
            this.monster.ai = new IntelligentHostileAI(this.monster);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `"Hey! You didn't pay for that!" The ${this.monster.name} gets angry!`, 
                'danger');
            return;
        }
        
        // Stay in shop area
        if (this.shopArea && !this.inShopArea()) {
            // Return to shop
            const center = this.shopArea.center;
            const path = this.getPathTo(center.x, center.y, game);
            this.monster.tryMove(game, 
                this.monster.x + path.dx, 
                this.monster.y + path.dy);
        } else {
            // Act peaceful
            super.act(game);
        }
    }
    
    detectTheft(game) {
        // TODO: Check if player took items without paying
        return false;
    }
    
    inShopArea() {
        if (!this.shopArea) return true;
        return this.monster.x >= this.shopArea.x1 && 
               this.monster.x <= this.shopArea.x2 &&
               this.monster.y >= this.shopArea.y1 && 
               this.monster.y <= this.shopArea.y2;
    }
}

/**
 * Guardian AI - protects specific area
 */
class GuardianAI extends BaseAI {
    constructor(monster) {
        super(monster);
        this.guardPost = { x: monster.x, y: monster.y };
        this.guardRadius = 3;
    }
    
    act(game) {
        const player = game.player;
        const playerDist = Math.abs(player.x - this.guardPost.x) + 
                          Math.abs(player.y - this.guardPost.y);
        
        // If player enters guard area, attack
        if (playerDist <= this.guardRadius) {
            const dist = Math.abs(player.x - this.monster.x) + 
                        Math.abs(player.y - this.monster.y);
            
            if (dist === 1) {
                this.monster.meleeAttack(player, game);
            } else {
                // Move to intercept
                const path = this.getPathTo(player.x, player.y, game);
                this.monster.tryMove(game, 
                    this.monster.x + path.dx, 
                    this.monster.y + path.dy);
            }
        } else {
            // Return to guard post if too far
            const postDist = Math.abs(this.monster.x - this.guardPost.x) + 
                            Math.abs(this.monster.y - this.guardPost.y);
            
            if (postDist > 1) {
                const path = this.getPathTo(this.guardPost.x, this.guardPost.y, game);
                this.monster.tryMove(game, 
                    this.monster.x + path.dx, 
                    this.monster.y + path.dy);
            }
        }
    }
}

/**
 * Mindless AI - random movement, always attacks
 */
class MindlessAI extends BaseAI {
    act(game) {
        const player = game.player;
        const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
        
        // Attack if adjacent
        if (dist === 1) {
            this.monster.meleeAttack(player, game);
            return;
        }
        
        // Random movement
        this.wander(game);
    }
}

/**
 * Fleeing AI - always runs away
 */
class FleeingAI extends BaseAI {
    act(game) {
        const player = game.player;
        this.fleeFrom(player.x, player.y, game);
    }
}

/**
 * Factory for creating AI instances
 */
export class MonsterAI {
    static create(aiType, monster) {
        switch (aiType) {
            case 'hostile_basic':
                return new HostileBasicAI(monster);
            case 'intelligent_hostile':
                return new IntelligentHostileAI(monster);
            case 'covetous':
                return new CovetousAI(monster);
            case 'animal':
                return new AnimalAI(monster);
            case 'peaceful':
                return new PeacefulAI(monster);
            case 'shopkeeper':
                return new ShopkeeperAI(monster);
            case 'guardian':
                return new GuardianAI(monster);
            case 'mindless':
                return new MindlessAI(monster);
            case 'fleeing':
                return new FleeingAI(monster);
            default:
                console.warn(`Unknown AI type: ${aiType}, using basic`);
                return new HostileBasicAI(monster);
        }
    }
}