/**
 * monster-loader.js - Loads and manages monster data
 * Handles spawn weights, level distribution, and monster creation
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class MonsterLoader {
    constructor() {
        this.monsters = {};
        this.monstersByLevel = new Map(); // Cache for spawn pools
        this.loaded = false;
    }
    
    /**
     * Load monster data from JSON
     */
    async load() {
        if (this.loaded) return;
        
        try {
            console.log('Loading monster data...');
            
            // Use correct path for GitHub Pages
            const basePath = window.location.hostname === 'localhost' 
                ? '/data' 
                : '/KnowledgeHack/data';
            
            const response = await fetch(`${basePath}/monsters.json`);
            if (!response.ok) {
                throw new Error(`Failed to load monsters: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Store monsters by ID for quick lookup
            if (data.monsters) {
                data.monsters.forEach(monster => {
                    this.monsters[monster.id] = monster;
                });
            } else if (Array.isArray(data)) {
                data.forEach(monster => {
                    this.monsters[monster.id] = monster;
                });
            } else {
                // Assume the data is an object with monster IDs as keys
                this.monsters = data;
            }
            
            this.loaded = true;
            console.log(`✓ Loaded ${Object.keys(this.monsters).length} monsters`);
            
            // Pre-calculate spawn pools for each level
            this.precalculateSpawnPools();
            
            EventBus.emit(EVENTS.DATA_LOADED, { type: 'monsters' });
            
        } catch (error) {
            console.error('Failed to load monsters:', error);
            // Load minimal fallback data
            this.loadFallbackMonsters();
        }
    }
    
    /**
     * Fallback monsters if JSON fails to load
     */
    loadFallbackMonsters() {
        console.log('Loading fallback monster data...');
        
        this.monsters = {
            'rat': {
                id: 'rat',
                name: 'giant rat',
                symbol: 'r',
                color: '#8B4513',
                hp: '1d6',
                thac0: 19,
                attacks: [
                    { type: 'bite', damage: '1d3' }
                ],
                speed: 12,
                movementType: 'walk',
                size: 'small',
                defaultStatus: 'wandering',
                sightRange: 4,
                hearingRange: 6,
                alertRadius: 3,
                aiPattern: 'aggressive',
                identTier: 1,
                identThreshold: 1,
                description: 'A rat of unusual size.',
                creatureType: 'animal',
                abilities: [],
                resistances: [],
                weaknesses: [],
                packSize: '1d3',
                spawnRange: {
                    minLevel: 1,
                    maxLevel: 20,
                    weightCurve: {
                        '1-5': 100,
                        '6-10': 60,
                        '11-15': 30,
                        '16-20': 10
                    }
                },
                lootTable: {
                    corpse: 'rat_corpse',
                    gold: '1d3'
                },
                frequency: 'common'
            },
            'goblin': {
                id: 'goblin',
                name: 'goblin',
                symbol: 'g',
                color: '#228B22',
                hp: '2d8',
                thac0: 19,
                attacks: [
                    { type: 'weapon', damage: '1d6' }
                ],
                speed: 10,
                movementType: 'walk',
                size: 'small',
                defaultStatus: 'wandering',
                sightRange: 5,
                hearingRange: 8,
                alertRadius: 5,
                aiPattern: 'intelligent',
                identTier: 1,
                identThreshold: 2,
                description: 'A small, green humanoid with a nasty disposition.',
                creatureType: 'humanoid',
                abilities: ['steal'],
                resistances: [],
                weaknesses: ['fire'],
                packSize: '1d4+1',
                spawnRange: {
                    minLevel: 1,
                    maxLevel: 50,
                    weightCurve: {
                        '1-5': 80,
                        '6-15': 100,
                        '16-25': 60,
                        '26-35': 30,
                        '36-45': 15,
                        '46-50': 5
                    }
                },
                lootTable: {
                    corpse: 'goblin_corpse',
                    gold: '2d10',
                    items: [
                        { id: 'crude_dagger', chance: 0.25 },
                        { id: 'leather_armor', chance: 0.1 }
                    ]
                },
                frequency: 'common'
            },
            'skeleton': {
                id: 'skeleton',
                name: 'skeleton',
                symbol: 's',
                color: '#F5F5DC',
                hp: '3d8',
                thac0: 18,
                attacks: [
                    { type: 'claw', damage: '1d4' },
                    { type: 'claw', damage: '1d4' }
                ],
                speed: 10,
                movementType: 'walk',
                size: 'medium',
                defaultStatus: 'wandering',
                sightRange: 5,
                hearingRange: 0, // Undead don't hear
                alertRadius: 3,
                aiPattern: 'aggressive',
                identTier: 2,
                identThreshold: 2,
                description: 'Animated bones held together by dark magic.',
                creatureType: 'undead',
                abilities: [],
                resistances: ['pierce', 'cold'],
                weaknesses: ['bludgeon', 'holy'],
                packSize: '1',
                spawnRange: {
                    minLevel: 5,
                    maxLevel: 60,
                    weightCurve: {
                        '5-10': 40,
                        '11-20': 80,
                        '21-30': 60,
                        '31-40': 40,
                        '41-50': 20,
                        '51-60': 10
                    }
                },
                lootTable: {
                    corpse: 'pile_of_bones'
                },
                frequency: 'common'
            }
        };
        
        this.loaded = true;
        this.precalculateSpawnPools();
    }
    
    /**
     * Pre-calculate spawn pools for each dungeon level
     */
    precalculateSpawnPools() {
        console.log('Pre-calculating spawn pools...');
        
        for (let level = 1; level <= 100; level++) {
            const pool = [];
            
            Object.values(this.monsters).forEach(monster => {
                const weight = this.getMonsterSpawnWeight(monster, level);
                if (weight > 0) {
                    pool.push({
                        monster: monster,
                        weight: weight
                    });
                }
            });
            
            this.monstersByLevel.set(level, pool);
        }
        
        console.log('✓ Spawn pools calculated for levels 1-100');
    }
    
    /**
     * Get spawn weight for a monster at a specific level
     */
    getMonsterSpawnWeight(monster, level) {
        if (!monster.spawnRange) return 0;
        
        const { minLevel, maxLevel, weightCurve } = monster.spawnRange;
        
        // Outside spawn range?
        if (level < minLevel || level > maxLevel) return 0;
        
        // Find applicable weight from curve
        for (const [range, weight] of Object.entries(weightCurve)) {
            const [min, max] = range.split('-').map(Number);
            if (level >= min && level <= max) {
                return weight;
            }
        }
        
        return 0;
    }
    
    /**
     * Get all monsters that can spawn on a level
     */
    getMonstersForLevel(level) {
        if (!this.loaded) {
            console.warn('Monsters not loaded yet!');
            return [];
        }
        
        return this.monstersByLevel.get(level) || [];
    }
    
    /**
     * Pick a random monster for a level using weighted selection
     */
    getRandomMonsterForLevel(level) {
        const pool = this.getMonstersForLevel(level);
        if (pool.length === 0) {
            console.warn(`No monsters available for level ${level}`);
            return null;
        }
        
        // Calculate total weight
        const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
        
        // Pick random weight
        let random = Math.random() * totalWeight;
        
        // Find selected monster
        for (const entry of pool) {
            random -= entry.weight;
            if (random <= 0) {
                return entry.monster;
            }
        }
        
        // Fallback (shouldn't happen)
        return pool[0].monster;
    }
    
    /**
     * Get multiple monsters for a room/area
     */
    getMonsterGroupForLevel(level, count = 1) {
        const monsters = [];
        
        for (let i = 0; i < count; i++) {
            const monster = this.getRandomMonsterForLevel(level);
            if (monster) {
                monsters.push(monster);
            }
        }
        
        return monsters;
    }
    
    /**
     * Get a specific monster by ID
     */
    getMonster(id) {
        if (!this.loaded) {
            console.warn('Monsters not loaded yet!');
            return null;
        }
        
        return this.monsters[id] || null;
    }
    
    /**
     * Get all monsters of a specific type
     */
    getMonstersByType(creatureType) {
        return Object.values(this.monsters).filter(m => 
            m.creatureType === creatureType
        );
    }
    
    /**
     * Get all unique/boss monsters
     */
    getUniqueMonsters() {
        return Object.values(this.monsters).filter(m => 
            m.frequency === 'unique'
        );
    }
    
    /**
     * Get spawn statistics for debugging
     */
    getSpawnStats(level) {
        const pool = this.getMonstersForLevel(level);
        const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
        
        const stats = {
            level: level,
            totalMonsters: pool.length,
            totalWeight: totalWeight,
            monsters: pool.map(entry => ({
                name: entry.monster.name,
                weight: entry.weight,
                chance: totalWeight > 0 ? `${(entry.weight / totalWeight * 100).toFixed(1)}%` : '0%'
            })).sort((a, b) => b.weight - a.weight)
        };
        
        return stats;
    }
    
    /**
     * Validate monster data structure
     */
    validateMonster(monster) {
        const required = ['id', 'name', 'symbol', 'hp', 'thac0', 'attacks'];
        const missing = required.filter(field => !monster[field]);
        
        if (missing.length > 0) {
            console.warn(`Monster ${monster.id} missing fields:`, missing);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if monsters are loaded
     */
    isLoaded() {
        return this.loaded;
    }
    
    /**
     * Get total monster count
     */
    getMonsterCount() {
        return Object.keys(this.monsters).length;
    }
    
    /**
     * Debug: List all monsters
     */
    listAllMonsters() {
        return Object.values(this.monsters).map(m => ({
            id: m.id,
            name: m.name,
            levels: `${m.spawnRange?.minLevel || 0}-${m.spawnRange?.maxLevel || 0}`,
            type: m.creatureType,
            frequency: m.frequency
        }));
    }
}

// Export singleton instance
export const monsterLoader = new MonsterLoader();