/**
 * item-loader.js - Loads and manages item data
 * Handles loading all item types from JSON files
 */

export class ItemLoader {
    constructor() {
        this.items = {
            weapons: [],
            armor: [],
            accessories: [],
            potions: [],
            scrolls: [],
            wands: [],
            books: [],
            food: [],
            corpses: [],
            tools: [],
            artifacts: []
        };
        this.loaded = false;
    }
    
    /**
     * Load all item data files
     */
    async loadAllItems() {
        console.log('📦 Loading item data...');
        
        const itemTypes = [
            'weapons', 'armor', 'accessories', 'potions', 
            'scrolls', 'wands', 'books', 'food', 
            'corpses', 'tools', 'artifacts'
        ];
        
        try {
            for (const type of itemTypes) {
                await this.loadItemType(type);
            }
            
            this.loaded = true;
            console.log(`✅ Loaded ${this.getTotalItemCount()} items across ${itemTypes.length} categories`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load item data:', error);
            return false;
        }
    }
    
    /**
     * Load a specific item type
     */
    async loadItemType(type) {
        try {
            const response = await fetch(`/data/items/${type}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${type}: ${response.status}`);
            }
            
            const data = await response.json();
            this.items[type] = data[type] || [];
            console.log(`  - Loaded ${this.items[type].length} ${type}`);
        } catch (error) {
            console.warn(`⚠️ Could not load ${type}:`, error.message);
            this.items[type] = [];
        }
    }
    
    /**
     * Get items by type
     */
    getItemsByType(type) {
        return this.items[type] || [];
    }
    
    /**
     * Get a specific item by type and ID
     */
    getItem(type, id) {
        const items = this.getItemsByType(type);
        return items.find(item => item.id === id);
    }
    
    /**
     * Get a random item of a specific type
     */
    getRandomItem(type) {
        const items = this.getItemsByType(type);
        if (items.length === 0) return null;
        return items[Math.floor(Math.random() * items.length)];
    }
    
    /**
     * Get items appropriate for a dungeon level
     */
    getItemsForLevel(level) {
        const appropriate = [];
        
        for (const type in this.items) {
            const items = this.items[type].filter(item => {
                const minLevel = item.minLevel || 1;
                const maxLevel = item.maxLevel || 100;
                return level >= minLevel && level <= maxLevel;
            });
            appropriate.push(...items.map(item => ({ ...item, type })));
        }
        
        return appropriate;
    }
    
    /**
     * Get total count of all items
     */
    getTotalItemCount() {
        let total = 0;
        for (const type in this.items) {
            total += this.items[type].length;
        }
        return total;
    }
    
    /**
     * Check if items are loaded
     */
    isLoaded() {
        return this.loaded;
    }
}

// Create singleton instance
const itemLoader = new ItemLoader();
export default itemLoader;