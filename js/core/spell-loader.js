/**
 * spell-loader.js - Loads and manages spell data
 * Handles loading spell definitions from JSON
 */

export class SpellLoader {
    constructor() {
        this.spells = [];
        this.spellsByType = new Map();
        this.loaded = false;
    }
    
    /**
     * Load spell data
     */
    async loadSpells() {
        console.log('✨ Loading spell data...');
        
        try {
            const response = await fetch('/data/spells.json');
            if (!response.ok) {
                throw new Error(`Failed to load spells: ${response.status}`);
            }
            
            const data = await response.json();
            this.spells = data.spells || [];
            
            // Organize spells by type
            this.organizeByType();
            
            this.loaded = true;
            console.log(`✅ Loaded ${this.spells.length} spells`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load spell data:', error);
            // Provide fallback spells if file is missing
            this.loadFallbackSpells();
            return false;
        }
    }
    
    /**
     * Organize spells by type
     */
    organizeByType() {
        this.spellsByType.clear();
        
        for (const spell of this.spells) {
            const type = spell.type || 'general';
            if (!this.spellsByType.has(type)) {
                this.spellsByType.set(type, []);
            }
            this.spellsByType.get(type).push(spell);
        }
    }
    
    /**
     * Load fallback spells if JSON fails
     */
    loadFallbackSpells() {
        console.log('⚠️ Loading fallback spells...');
        this.spells = [
            {
                id: 'heal',
                name: 'Heal',
                type: 'restoration',
                manaCost: 3,
                effect: 'heal',
                power: '2d6',
                description: 'Restores health',
                minWisdom: 10
            },
            {
                id: 'fireball',
                name: 'Fireball',
                type: 'destruction',
                manaCost: 5,
                effect: 'damage',
                power: '3d6',
                range: 5,
                description: 'Launches a fiery projectile',
                minWisdom: 15
            },
            {
                id: 'identify',
                name: 'Identify',
                type: 'divination',
                manaCost: 2,
                effect: 'identify',
                description: 'Reveals item properties',
                minWisdom: 12
            },
            {
                id: 'teleport',
                name: 'Teleport',
                type: 'alteration',
                manaCost: 8,
                effect: 'teleport',
                range: 10,
                description: 'Instantly move to a visible location',
                minWisdom: 20
            }
        ];
        this.organizeByType();
        this.loaded = true;
    }
    
    /**
     * Get all spells
     */
    getAllSpells() {
        return this.spells;
    }
    
    /**
     * Get spell by ID
     */
    getSpell(id) {
        return this.spells.find(s => s.id === id);
    }
    
    /**
     * Get spells by type
     */
    getSpellsByType(type) {
        return this.spellsByType.get(type) || [];
    }
    
    /**
     * Get spells the player can cast based on wisdom
     */
    getAvailableSpells(wisdom) {
        return this.spells.filter(spell => {
            const minWisdom = spell.minWisdom || 10;
            return wisdom >= minWisdom;
        });
    }
    
    /**
     * Get random spell of a type
     */
    getRandomSpellOfType(type) {
        const spells = this.getSpellsByType(type);
        if (spells.length === 0) return null;
        return spells[Math.floor(Math.random() * spells.length)];
    }
    
    /**
     * Get spell types
     */
    getSpellTypes() {
        return Array.from(this.spellsByType.keys());
    }
    
    /**
     * Check if spells are loaded
     */
    isLoaded() {
        return this.loaded;
    }
}

// Create singleton instance
const spellLoader = new SpellLoader();
export default spellLoader;