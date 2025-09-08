/**
 * monster-loader.js - Loads and manages monster data
 * Handles loading monster definitions from JSON
 */

export class MonsterLoader {
    constructor() {
        this.monsters = [];
        this.monstersByLevel = new Map();
        this.loaded = false;
    }
    
    /**
     * Load monster data
     */
    async loadMonsters() {
        console.log('👾 Loading monster data...');
        
        try {
            const response = await fetch('/data/monsters.json');
            if (!response.ok) {
                throw new Error(`Failed to load monsters: ${response.status}`);
            }
            
            const data = await response.json();
            this.monsters = data.monsters || [];
            
            // Organize monsters by level for quick lookup
            this.organizeByLevel();
            
            this.loaded = true;
            console.log(`✅ Loaded ${this.monsters.length} monster types`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load monster data:', error);
            // Provide fallback monsters if file is missing
            this.loadFallbackMonsters();
            return false;
        }
    }
    
    /**
     * Organize monsters by appropriate level
     */
    organizeByLevel() {
        this.monstersByLevel.clear();
        
        for (const monster of this.monsters) {
            const minLevel = monster.minLevel || 1;
            const maxLevel = monster.maxLevel || 100;
            
            for (let level = minLevel; level <= maxLevel; level++) {
                if (!this.monstersByLevel.has(level)) {
                    this.monstersByLevel.set(level, []);
                }
                this.monstersByLevel.get(level).push(monster);
            }
        }
    }
    
    /**
     * Load fallback monsters if JSON fails
     */
    loadFallbackMonsters() {
        console.log('⚠️ Loading fallback monsters...');
        this.monsters = [
            {
                id: 'rat',
                name: 'Rat',
                symbol: 'r',
                color: '#8B4513',
                hp: 5,
                damage: '1d3',
                defense: 0,
                xp: 10,
                minLevel: 1,
                maxLevel: 5
            },
            {
                id: 'goblin',
                name: 'Goblin',
                symbol: 'g',
                color: '#00ff00',
                hp: 10,
                damage: '1d6',
                defense: 1,
                xp: 25,
                minLevel: 2,
                maxLevel: 10
            },
            {
                id: 'skeleton',
                name: 'Skeleton',
                symbol: 's',
                color: '#ffffff',
                hp: 15,
                damage: '1d8',
                defense: 2,
                xp: 40,
                minLevel: 5,
                maxLevel: 15
            }
        ];
        this.organizeByLevel();
        this.loaded = true;
    }
    
    /**
     * Get all monsters
     */
    getAllMonsters() {
        return this.monsters;
    }
    
    /**
     * Get monster by ID
     */
    getMonster(id) {
        return this.monsters.find(m => m.id === id);
    }
    
    /**
     * Get monsters appropriate for a level
     */
    getMonstersForLevel(level) {
        return this.monstersByLevel.get(level) || [];
    }
    
    /**
     * Get a random monster for a level
     */
    getRandomMonsterForLevel(level) {
        const monsters = this.getMonstersForLevel(level);
        if (monsters.length === 0) {
            // Try adjacent levels if no exact match
            const nearbyMonsters = [
                ...this.getMonstersForLevel(level - 1),
                ...this.getMonstersForLevel(level + 1)
            ];
            if (nearbyMonsters.length > 0) {
                return nearbyMonsters[Math.floor(Math.random() * nearbyMonsters.length)];
            }
            return null;
        }
        return monsters[Math.floor(Math.random() * monsters.length)];
    }
    
    /**
     * Get boss monster for a level
     */
    getBossForLevel(level) {
        const bosses = this.monsters.filter(m => m.isBoss && m.bossLevel === level);
        if (bosses.length > 0) {
            return bosses[0];
        }
        return null;
    }
    
    /**
     * Check if monsters are loaded
     */
    isLoaded() {
        return this.loaded;
    }
}

// Create singleton instance
const monsterLoader = new MonsterLoader();
export default monsterLoader;