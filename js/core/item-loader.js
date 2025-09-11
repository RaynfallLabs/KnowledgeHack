/**
 * item-loader.js - Fixed to handle food.json structure
 * Loads all item data from JSON files with proper path handling
 */

import { EventBus, EVENTS } from './event-bus.js';

export class ItemLoader {
    constructor() {
        // Determine base path based on environment
        this.basePath = window.location.hostname === 'localhost' 
            ? '/data/items' 
            : '/KnowledgeHack/data/items';
            
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
            artifacts: [],
            ammo: [],
            containers: []
        };
        
        this.loaded = false;
    }
    
    async loadAllItems() {
        console.log('📦 Loading item data...');
        
        try {
            // Load all item categories
            await Promise.all([
                this.loadItemCategory('weapons'),
                this.loadItemCategory('armor'),
                this.loadItemCategory('accessories'),
                this.loadItemCategory('potions'),
                this.loadItemCategory('scrolls'),
                this.loadItemCategory('wands'),
                this.loadItemCategory('books'),
                this.loadItemCategory('food'),
                this.loadItemCategory('corpses'),
                this.loadItemCategory('tools'),
                this.loadItemCategory('artifacts'),
                this.loadItemCategory('ammo'),
                this.loadItemCategory('containers')
            ]);
            
            // Calculate total items
            const totalItems = Object.values(this.items).reduce((sum, category) => sum + category.length, 0);
            console.log(`✅ Loaded ${totalItems} items across ${Object.keys(this.items).length} categories`);
            
            EventBus.emit(EVENTS.ITEMS_LOADED, { items: this.items });
            this.loaded = true;
            
            return this.items;
        } catch (error) {
            console.error('Failed to load items:', error);
            throw error;
        }
    }
    
    async loadItemCategory(category) {
        try {
            const response = await fetch(`${this.basePath}/${category}.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Handle different JSON structures
                if (category === 'food' && data.foods) {
                    // Food.json has a 'foods' array
                    this.items[category] = data.foods;
                } else if (Array.isArray(data)) {
                    // Direct array format
                    this.items[category] = data;
                } else if (data[category]) {
                    // Wrapped in category name
                    this.items[category] = data[category];
                } else {
                    // Assume empty if structure unknown
                    this.items[category] = [];
                }
                
                console.log(`  ✓ Loaded ${this.items[category].length} ${category}`);
            } else {
                console.warn(`  ✗ Could not load ${category}.json`);
                this.items[category] = [];
            }
        } catch (error) {
            console.warn(`  ✗ Error loading ${category}:`, error.message);
            this.items[category] = [];
        }
    }
    
    getItemsByCategory(category) {
        return this.items[category] || [];
    }
    
    getItemById(id, category = null) {
        if (category) {
            return this.items[category]?.find(item => item.id === id);
        }
        
        // Search all categories
        for (const cat of Object.keys(this.items)) {
            const item = this.items[cat].find(item => item.id === id);
            if (item) return item;
        }
        
        return null;
    }
    
    getRandomItem(category = null, tier = null) {
        let pool = [];
        
        if (category) {
            pool = this.items[category] || [];
        } else {
            // Pool from all categories
            pool = Object.values(this.items).flat();
        }
        
        // Filter by tier if specified
        if (tier !== null) {
            pool = pool.filter(item => item.tier === tier);
        }
        
        if (pool.length === 0) return null;
        
        return pool[Math.floor(Math.random() * pool.length)];
    }
    
    getWeaponsByType(weaponType) {
        return this.items.weapons.filter(weapon => weapon.weaponType === weaponType);
    }
    
    getArmorBySlot(slot) {
        return this.items.armor.filter(armor => armor.slot === slot);
    }
    
    getItemsByTier(tier) {
        const tieredItems = [];
        
        for (const category of Object.keys(this.items)) {
            const categoryItems = this.items[category].filter(item => item.tier === tier);
            tieredItems.push(...categoryItems);
        }
        
        return tieredItems;
    }
    
    isLoaded() {
        return this.loaded;
    }
}

// Create singleton instance
export const itemLoader = new ItemLoader();