/**
 * dungeon.js - Dungeon state management system
 * Manages current level state, monster positions, item locations, and player interactions
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Dungeon {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.messageLog = game.messageLog;
        
        // Current level data
        this.currentLevel = null;
        this.levelNumber = 1;
        this.width = 0;
        this.height = 0;
        
        // Game entities
        this.tiles = [];
        this.monsters = [];
        this.items = [];
        this.effects = [];
        
        // Spatial lookup maps for performance
        this.monsterMap = new Map(); // "x,y" -> monster
        this.itemMap = new Map();    // "x,y" -> [items]
        this.effectMap = new Map();  // "x,y" -> [effects]
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for level generation requests
        EventBus.on(EVENTS.DUNGEON_GENERATE, (data) => {
            this.generateLevel(data.level);
        });
        
        // Listen for player movement to update vision
        EventBus.on(EVENTS.PLAYER_MOVED, (data) => {
            this.updatePlayerVision(data.x, data.y);
        });
        
        // Listen for monster deaths to clean up
        EventBus.on(EVENTS.MONSTER_DEATH, (data) => {
            this.removeMonster(data.monster);
        });
        
        // Listen for item pickup/drop
        EventBus.on(EVENTS.ITEM_PICKED_UP, (data) => {
            this.removeItem(data.item.x, data.item.y, data.item);
        });
        
        EventBus.on(EVENTS.ITEM_DROPPED, (data) => {
            this.addItem(data.item.x || this.player.x, data.item.y || this.player.y, data.item);
        });
    }
    
    /**
     * Generate a new dungeon level
     */
    async generateLevel(levelNumber) {
        this.levelNumber = levelNumber;
        
        // Use DungeonGenerator to create level layout
        if (!this.game.dungeonGenerator) {
            console.error('DungeonGenerator not available');
            return;
        }
        
        const generatedLevel = await this.game.dungeonGenerator.generate(
            levelNumber, 
            CONFIG.MAP_WIDTH, 
            CONFIG.MAP_HEIGHT
        );
        
        this.loadLevel(generatedLevel);
        
        // Place player at entrance
        const entrance = this.getEntrance();
        this.player.x = entrance.x;
        this.player.y = entrance.y;
        
        // Update player vision
        this.updatePlayerVision(this.player.x, this.player.y);
        
        EventBus.emit(EVENTS.DUNGEON_LOADED, {
            level: levelNumber,
            width: this.width,
            height: this.height
        });
        
        this.messageLog.add(`Welcome to level ${levelNumber}!`, 'info');
    }
    
    /**
     * Load level data into dungeon
     */
    loadLevel(levelData) {
        this.currentLevel = levelData;
        this.width = levelData.width;
        this.height = levelData.height;
        this.tiles = levelData.tiles;
        
        // Clear existing entities
        this.monsters = [];
        this.items = [];
        this.effects = [];
        this.monsterMap.clear();
        this.itemMap.clear();
        this.effectMap.clear();
        
        // Load monsters from generated level
        if (levelData.monsters) {
            levelData.monsters.forEach(monster => {
                this.addMonster(monster);
            });
        }
        
        // Load items from generated level
        if (levelData.items) {
            levelData.items.forEach(item => {
                this.addItem(item.x, item.y, item);
            });
        }
    }
    
    /**
     * Get tile at coordinates
     */
    getTile(x, y) {
        if (!this.isValidPosition(x, y)) {
            return null;
        }
        return this.tiles[y][x];
    }
    
    /**
     * Check if position is valid
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    /**
     * Check if position is walkable
     */
    isWalkable(x, y) {
        const tile = this.getTile(x, y);
        if (!tile || tile.blocked) {
            return false;
        }
        
        // Check for monsters blocking
        if (this.getMonsterAt(x, y)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if player can see position
     */
    canPlayerSee(x, y) {
        if (!this.isValidPosition(x, y)) return false;
        
        const dx = Math.abs(x - this.player.x);
        const dy = Math.abs(y - this.player.y);
        const distance = Math.max(dx, dy);
        
        if (distance > this.player.getSightRadius()) {
            return false;
        }
        
        // Simple line of sight check (can be enhanced with Bresenham later)
        return this.hasLineOfSight(this.player.x, this.player.y, x, y);
    }
    
    /**
     * Simple line of sight check
     */
    hasLineOfSight(x1, y1, x2, y2) {
        // For now, just check if target is within sight radius
        // Can be enhanced with proper Bresenham line algorithm later
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        return Math.max(dx, dy) <= this.player.getSightRadius();
    }
    
    /**
     * Update player vision and fog of war
     */
    updatePlayerVision(playerX, playerY) {
        const sightRadius = this.player.getSightRadius();
        
        // Mark tiles as visible/explored
        for (let y = playerY - sightRadius; y <= playerY + sightRadius; y++) {
            for (let x = playerX - sightRadius; x <= playerX + sightRadius; x++) {
                if (!this.isValidPosition(x, y)) continue;
                
                const distance = Math.max(Math.abs(x - playerX), Math.abs(y - playerY));
                if (distance <= sightRadius) {
                    const tile = this.getTile(x, y);
                    if (tile) {
                        tile.visible = true;
                        tile.explored = true;
                    }
                }
            }
        }
        
        // Clear visibility for tiles outside current sight
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const distance = Math.max(Math.abs(x - playerX), Math.abs(y - playerY));
                if (distance > sightRadius) {
                    const tile = this.getTile(x, y);
                    if (tile) {
                        tile.visible = false;
                    }
                }
            }
        }
        
        EventBus.emit(EVENTS.VISION_UPDATED, {
            playerX: playerX,
            playerY: playerY,
            sightRadius: sightRadius
        });
    }
    
    /**
     * Add monster to dungeon
     */
    addMonster(monster) {
        // Ensure monster has position
        if (monster.x === undefined || monster.y === undefined) {
            console.warn('Monster added without position:', monster);
            return false;
        }
        
        const key = `${monster.x},${monster.y}`;
        
        // Check if position is already occupied
        if (this.monsterMap.has(key)) {
            console.warn('Position already occupied by monster:', monster.x, monster.y);
            return false;
        }
        
        this.monsters.push(monster);
        this.monsterMap.set(key, monster);
        
        EventBus.emit(EVENTS.MONSTER_SPAWNED, { monster: monster });
        return true;
    }
    
    /**
     * Remove monster from dungeon
     */
    removeMonster(monster) {
        const index = this.monsters.indexOf(monster);
        if (index !== -1) {
            this.monsters.splice(index, 1);
            
            const key = `${monster.x},${monster.y}`;
            this.monsterMap.delete(key);
            
            EventBus.emit(EVENTS.MONSTER_REMOVED, { monster: monster });
            return true;
        }
        return false;
    }
    
    /**
     * Get monster at position
     */
    getMonsterAt(x, y) {
        const key = `${x},${y}`;
        return this.monsterMap.get(key) || null;
    }
    
    /**
     * Move monster to new position
     */
    moveMonster(monster, newX, newY) {
        if (!this.isValidPosition(newX, newY)) {
            return false;
        }
        
        // Check if destination is walkable
        if (!this.isWalkable(newX, newY)) {
            return false;
        }
        
        // Remove from old position
        const oldKey = `${monster.x},${monster.y}`;
        this.monsterMap.delete(oldKey);
        
        // Update monster position
        monster.x = newX;
        monster.y = newY;
        
        // Add to new position
        const newKey = `${newX},${newY}`;
        this.monsterMap.set(newKey, monster);
        
        EventBus.emit(EVENTS.MONSTER_MOVED, {
            monster: monster,
            oldX: parseInt(oldKey.split(',')[0]),
            oldY: parseInt(oldKey.split(',')[1]),
            newX: newX,
            newY: newY
        });
        
        return true;
    }
    
    /**
     * Add item to dungeon
     */
    addItem(x, y, item) {
        if (!this.isValidPosition(x, y)) {
            return false;
        }
        
        // Set item position
        item.x = x;
        item.y = y;
        
        const key = `${x},${y}`;
        
        // Get existing items at position
        let itemsAtPosition = this.itemMap.get(key);
        if (!itemsAtPosition) {
            itemsAtPosition = [];
            this.itemMap.set(key, itemsAtPosition);
        }
        
        itemsAtPosition.push(item);
        this.items.push(item);
        
        EventBus.emit(EVENTS.ITEM_SPAWNED, { item: item, x: x, y: y });
        return true;
    }
    
    /**
     * Remove specific item from position
     */
    removeItem(x, y, item) {
        const key = `${x},${y}`;
        const itemsAtPosition = this.itemMap.get(key);
        
        if (itemsAtPosition) {
            const index = itemsAtPosition.indexOf(item);
            if (index !== -1) {
                itemsAtPosition.splice(index, 1);
                
                // Remove from items array
                const globalIndex = this.items.indexOf(item);
                if (globalIndex !== -1) {
                    this.items.splice(globalIndex, 1);
                }
                
                // Clean up empty position
                if (itemsAtPosition.length === 0) {
                    this.itemMap.delete(key);
                }
                
                EventBus.emit(EVENTS.ITEM_REMOVED, { item: item, x: x, y: y });
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get item at position (first item if multiple)
     */
    getItemAt(x, y) {
        const key = `${x},${y}`;
        const itemsAtPosition = this.itemMap.get(key);
        return itemsAtPosition && itemsAtPosition.length > 0 ? itemsAtPosition[0] : null;
    }
    
    /**
     * Get all items at position
     */
    getItemsAt(x, y) {
        const key = `${x},${y}`;
        return this.itemMap.get(key) || [];
    }
    
    /**
     * Add effect to dungeon
     */
    addEffect(x, y, effect) {
        if (!this.isValidPosition(x, y)) {
            return false;
        }
        
        effect.x = x;
        effect.y = y;
        
        const key = `${x},${y}`;
        let effectsAtPosition = this.effectMap.get(key);
        if (!effectsAtPosition) {
            effectsAtPosition = [];
            this.effectMap.set(key, effectsAtPosition);
        }
        
        effectsAtPosition.push(effect);
        this.effects.push(effect);
        
        EventBus.emit(EVENTS.EFFECT_ADDED, { effect: effect, x: x, y: y });
        return true;
    }
    
    /**
     * Get entrance position
     */
    getEntrance() {
        if (this.currentLevel && this.currentLevel.entrance) {
            return this.currentLevel.entrance;
        }
        
        // Default fallback position
        return { x: 5, y: 5 };
    }
    
    /**
     * Get exit position
     */
    getExit() {
        if (this.currentLevel && this.currentLevel.exit) {
            return this.currentLevel.exit;
        }
        
        // Find stairs down
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.getTile(x, y);
                if (tile && tile.type === 'stairs_down') {
                    return { x, y };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Check if position contains stairs
     */
    hasStairs(x, y) {
        const tile = this.getTile(x, y);
        return tile && (tile.type === 'stairs_up' || tile.type === 'stairs_down');
    }
    
    /**
     * Get all monsters within radius of position
     */
    getMonstersNear(x, y, radius) {
        const nearbyMonsters = [];
        
        for (const monster of this.monsters) {
            const distance = Math.max(
                Math.abs(monster.x - x),
                Math.abs(monster.y - y)
            );
            
            if (distance <= radius) {
                nearbyMonsters.push(monster);
            }
        }
        
        return nearbyMonsters;
    }
    
    /**
     * Get all visible monsters to player
     */
    getVisibleMonsters() {
        return this.monsters.filter(monster => 
            this.canPlayerSee(monster.x, monster.y)
        );
    }
    
    /**
     * Get all visible items to player
     */
    getVisibleItems() {
        return this.items.filter(item => 
            this.canPlayerSee(item.x, item.y)
        );
    }
    
    /**
     * Process monster turns
     */
    processMonsterTurns() {
        for (const monster of this.monsters) {
            if (monster.hp <= 0) continue;
            
            // Process monster AI
            if (monster.ai && this.game.monsterAI) {
                this.game.monsterAI.processMonster(monster, this);
            }
        }
    }
    
    /**
     * Update dungeon state (called each turn)
     */
    update() {
        // Process effects
        this.updateEffects();
        
        // Process monster turns
        this.processMonsterTurns();
        
        EventBus.emit(EVENTS.DUNGEON_UPDATED, {
            level: this.levelNumber,
            monsterCount: this.monsters.length,
            itemCount: this.items.length
        });
    }
    
    /**
     * Update all effects
     */
    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            
            if (effect.duration !== undefined) {
                effect.duration--;
                
                if (effect.duration <= 0) {
                    this.removeEffect(effect);
                }
            }
        }
    }
    
    /**
     * Remove effect
     */
    removeEffect(effect) {
        const index = this.effects.indexOf(effect);
        if (index !== -1) {
            this.effects.splice(index, 1);
            
            const key = `${effect.x},${effect.y}`;
            const effectsAtPosition = this.effectMap.get(key);
            if (effectsAtPosition) {
                const posIndex = effectsAtPosition.indexOf(effect);
                if (posIndex !== -1) {
                    effectsAtPosition.splice(posIndex, 1);
                    
                    if (effectsAtPosition.length === 0) {
                        this.effectMap.delete(key);
                    }
                }
            }
            
            EventBus.emit(EVENTS.EFFECT_REMOVED, { effect: effect });
        }
    }
    
    /**
     * Get dungeon state for renderer
     */
    getRenderData() {
        return {
            level: this.levelNumber,
            width: this.width,
            height: this.height,
            tiles: this.tiles,
            monsters: this.getVisibleMonsters(),
            items: this.getVisibleItems(),
            effects: this.effects.filter(effect => 
                this.canPlayerSee(effect.x, effect.y)
            ),
            player: {
                x: this.player.x,
                y: this.player.y
            }
        };
    }
    
    /**
     * Save dungeon state
     */
    save() {
        return {
            levelNumber: this.levelNumber,
            width: this.width,
            height: this.height,
            tiles: this.tiles,
            monsters: this.monsters,
            items: this.items,
            effects: this.effects,
            currentLevel: this.currentLevel
        };
    }
    
    /**
     * Load dungeon state
     */
    load(data) {
        this.levelNumber = data.levelNumber || 1;
        this.width = data.width || 0;
        this.height = data.height || 0;
        this.tiles = data.tiles || [];
        this.monsters = data.monsters || [];
        this.items = data.items || [];
        this.effects = data.effects || [];
        this.currentLevel = data.currentLevel || null;
        
        // Rebuild lookup maps
        this.rebuildLookupMaps();
    }
    
    /**
     * Rebuild spatial lookup maps
     */
    rebuildLookupMaps() {
        this.monsterMap.clear();
        this.itemMap.clear();
        this.effectMap.clear();
        
        // Rebuild monster map
        for (const monster of this.monsters) {
            const key = `${monster.x},${monster.y}`;
            this.monsterMap.set(key, monster);
        }
        
        // Rebuild item map
        for (const item of this.items) {
            const key = `${item.x},${item.y}`;
            let itemsAtPosition = this.itemMap.get(key);
            if (!itemsAtPosition) {
                itemsAtPosition = [];
                this.itemMap.set(key, itemsAtPosition);
            }
            itemsAtPosition.push(item);
        }
        
        // Rebuild effect map
        for (const effect of this.effects) {
            const key = `${effect.x},${effect.y}`;
            let effectsAtPosition = this.effectMap.get(key);
            if (!effectsAtPosition) {
                effectsAtPosition = [];
                this.effectMap.set(key, effectsAtPosition);
            }
            effectsAtPosition.push(effect);
        }
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        EventBus.off(EVENTS.DUNGEON_GENERATE);
        EventBus.off(EVENTS.PLAYER_MOVED);
        EventBus.off(EVENTS.MONSTER_DEATH);
        EventBus.off(EVENTS.ITEM_PICKED_UP);
        EventBus.off(EVENTS.ITEM_DROPPED);
    }
}