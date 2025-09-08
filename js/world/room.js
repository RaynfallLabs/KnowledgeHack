/**
 * room.js - Room representation and management
 * Handles dungeon rooms, their properties, connections, and special features
 */

import { EventBus, EVENTS } from '../core/event-bus.js';

/**
 * Room types and their properties
 */
export const ROOM_TYPES = {
    NORMAL: {
        name: 'normal',
        description: 'a regular room',
        itemMultiplier: 1.0,
        monsterMultiplier: 1.0,
        trapChance: 0.1
    },
    SHOP: {
        name: 'shop',
        description: 'a shop',
        itemMultiplier: 3.0,
        monsterMultiplier: 0.1,  // Shopkeeper only
        trapChance: 0,
        special: true,
        requiresPayment: true
    },
    LIBRARY: {
        name: 'library',
        description: 'a library',
        itemMultiplier: 0.5,  // Books and scrolls
        monsterMultiplier: 0.5,
        trapChance: 0.05,
        special: true,
        bookChance: 0.8
    },
    ARMORY: {
        name: 'armory',
        description: 'an armory',
        itemMultiplier: 2.0,  // Weapons and armor
        monsterMultiplier: 1.2,
        trapChance: 0.15,
        special: true,
        equipmentOnly: true
    },
    TREASURY: {
        name: 'treasury',
        description: 'a treasury',
        itemMultiplier: 2.5,
        monsterMultiplier: 1.5,
        trapChance: 0.25,
        special: true,
        goldMultiplier: 5.0
    },
    TEMPLE: {
        name: 'temple',
        description: 'a temple',
        itemMultiplier: 0.3,
        monsterMultiplier: 0.2,
        trapChance: 0,
        special: true,
        hasAltar: true,
        peaceful: true
    },
    VAULT: {
        name: 'vault',
        description: 'a vault',
        itemMultiplier: 4.0,
        monsterMultiplier: 2.0,
        trapChance: 0.3,
        special: true,
        locked: true,
        goldMultiplier: 10.0
    },
    GRAVEYARD: {
        name: 'graveyard',
        description: 'a graveyard',
        itemMultiplier: 0.5,
        monsterMultiplier: 1.5,  // Undead
        trapChance: 0.1,
        special: true,
        undeadOnly: true
    },
    THRONE_ROOM: {
        name: 'throne_room',
        description: 'a throne room',
        itemMultiplier: 1.5,
        monsterMultiplier: 1.0,
        trapChance: 0.1,
        special: true,
        hasThrone: true
    },
    BARRACKS: {
        name: 'barracks',
        description: 'barracks',
        itemMultiplier: 0.8,
        monsterMultiplier: 2.0,  // Soldiers
        trapChance: 0.05,
        special: true,
        organizedMonsters: true
    },
    LABORATORY: {
        name: 'laboratory',
        description: 'a laboratory',
        itemMultiplier: 1.0,  // Potions
        monsterMultiplier: 0.8,
        trapChance: 0.2,
        special: true,
        potionChance: 0.7
    },
    PRISON: {
        name: 'prison',
        description: 'a prison',
        itemMultiplier: 0.2,
        monsterMultiplier: 0.5,
        trapChance: 0.15,
        special: true,
        hasCells: true
    },
    BOSS_CHAMBER: {
        name: 'boss_chamber',
        description: 'a boss chamber',
        itemMultiplier: 0,  // Boss drops only
        monsterMultiplier: 0,  // Boss only
        trapChance: 0,
        special: true,
        isBossRoom: true
    }
};

/**
 * Room class representing a dungeon room
 */
export class Room {
    constructor(x, y, width, height, type = 'NORMAL') {
        // Position and dimensions
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Center point
        this.centerX = Math.floor(x + width / 2);
        this.centerY = Math.floor(y + height / 2);
        
        // Room type and properties
        this.type = type;
        const typeData = ROOM_TYPES[type] || ROOM_TYPES.NORMAL;
        Object.assign(this, typeData);
        
        // Connections to other rooms
        this.connections = [];
        this.doors = [];
        
        // Contents
        this.monsters = [];
        this.items = [];
        this.features = [];
        
        // State
        this.explored = false;
        this.lit = false;
        this.locked = false;
        this.sealed = false;  // Magically sealed
        
        // Special properties
        this.id = null;
        this.theme = null;
        this.difficulty = 1.0;
    }
    
    /**
     * Get the bounds of this room
     */
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width - 1,
            top: this.y,
            bottom: this.y + this.height - 1
        };
    }
    
    /**
     * Check if a point is inside this room
     */
    containsPoint(x, y) {
        return x >= this.x && 
               x < this.x + this.width && 
               y >= this.y && 
               y < this.y + this.height;
    }
    
    /**
     * Check if this room overlaps with another room
     */
    overlaps(other, margin = 0) {
        return !(this.x + this.width + margin <= other.x ||
                 other.x + other.width + margin <= this.x ||
                 this.y + this.height + margin <= other.y ||
                 other.y + other.height + margin <= this.y);
    }
    
    /**
     * Get the distance to another room
     */
    distanceTo(other) {
        const dx = this.centerX - other.centerX;
        const dy = this.centerY - other.centerY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get Manhattan distance to another room
     */
    manhattanDistanceTo(other) {
        return Math.abs(this.centerX - other.centerX) + 
               Math.abs(this.centerY - other.centerY);
    }
    
    /**
     * Connect this room to another
     */
    connectTo(other) {
        if (!this.connections.includes(other)) {
            this.connections.push(other);
            other.connections.push(this);
            
            EventBus.emit(EVENTS.ROOMS_CONNECTED, {
                room1: this,
                room2: other
            });
        }
    }
    
    /**
     * Disconnect from another room
     */
    disconnectFrom(other) {
        const index = this.connections.indexOf(other);
        if (index !== -1) {
            this.connections.splice(index, 1);
            
            const otherIndex = other.connections.indexOf(this);
            if (otherIndex !== -1) {
                other.connections.splice(otherIndex, 1);
            }
        }
    }
    
    /**
     * Check if connected to another room
     */
    isConnectedTo(other) {
        return this.connections.includes(other);
    }
    
    /**
     * Add a door at position
     */
    addDoor(x, y, type = 'normal') {
        const door = {
            x: x,
            y: y,
            type: type,
            open: false,
            locked: this.locked || Math.random() < 0.1,
            secret: Math.random() < 0.2
        };
        
        this.doors.push(door);
        return door;
    }
    
    /**
     * Get all door positions
     */
    getDoorPositions() {
        return this.doors.map(door => ({ x: door.x, y: door.y }));
    }
    
    /**
     * Add a monster to this room
     */
    addMonster(monster) {
        if (!this.peaceful) {
            this.monsters.push(monster);
            monster.room = this;
        }
    }
    
    /**
     * Remove a monster from this room
     */
    removeMonster(monster) {
        const index = this.monsters.indexOf(monster);
        if (index !== -1) {
            this.monsters.splice(index, 1);
            monster.room = null;
        }
    }
    
    /**
     * Add an item to this room
     */
    addItem(item) {
        this.items.push(item);
        item.room = this;
    }
    
    /**
     * Remove an item from this room
     */
    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            item.room = null;
        }
    }
    
    /**
     * Add a special feature to this room
     */
    addFeature(feature) {
        this.features.push(feature);
        
        // Set flags based on feature type
        switch(feature.type) {
            case 'altar':
                this.hasAltar = true;
                break;
            case 'throne':
                this.hasThrone = true;
                break;
            case 'fountain':
                this.hasFountain = true;
                break;
            case 'sink':
                this.hasSink = true;
                break;
        }
    }
    
    /**
     * Get a random position inside this room
     */
    getRandomPosition(margin = 0) {
        return {
            x: this.x + margin + Math.floor(Math.random() * (this.width - 2 * margin)),
            y: this.y + margin + Math.floor(Math.random() * (this.height - 2 * margin))
        };
    }
    
    /**
     * Get all positions inside this room
     */
    getAllPositions(includeWalls = false) {
        const positions = [];
        
        const startX = includeWalls ? this.x : this.x + 1;
        const endX = includeWalls ? this.x + this.width : this.x + this.width - 1;
        const startY = includeWalls ? this.y : this.y + 1;
        const endY = includeWalls ? this.y + this.height : this.y + this.height - 1;
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                positions.push({ x, y });
            }
        }
        
        return positions;
    }
    
    /**
     * Get wall positions
     */
    getWallPositions() {
        const walls = [];
        
        // Top and bottom walls
        for (let x = this.x; x < this.x + this.width; x++) {
            walls.push({ x, y: this.y });
            walls.push({ x, y: this.y + this.height - 1 });
        }
        
        // Left and right walls (excluding corners)
        for (let y = this.y + 1; y < this.y + this.height - 1; y++) {
            walls.push({ x: this.x, y });
            walls.push({ x: this.x + this.width - 1, y });
        }
        
        return walls;
    }
    
    /**
     * Get corner positions
     */
    getCornerPositions() {
        return [
            { x: this.x, y: this.y },
            { x: this.x + this.width - 1, y: this.y },
            { x: this.x, y: this.y + this.height - 1 },
            { x: this.x + this.width - 1, y: this.y + this.height - 1 }
        ];
    }
    
    /**
     * Check if room is empty of monsters
     */
    isEmpty() {
        return this.monsters.length === 0;
    }
    
    /**
     * Check if room has been cleared (no hostile monsters)
     */
    isCleared() {
        return this.monsters.filter(m => m.hostile).length === 0;
    }
    
    /**
     * Mark room as explored
     */
    explore() {
        if (!this.explored) {
            this.explored = true;
            
            EventBus.emit(EVENTS.ROOM_EXPLORED, {
                room: this,
                type: this.type,
                special: this.special
            });
            
            // Special room discovery messages
            if (this.special) {
                EventBus.emit(EVENTS.MESSAGE, {
                    text: `You have discovered ${this.description}!`,
                    type: 'discovery'
                });
            }
        }
    }
    
    /**
     * Light or extinguish the room
     */
    setLit(lit) {
        this.lit = lit;
        
        EventBus.emit(EVENTS.ROOM_LIT_CHANGED, {
            room: this,
            lit: lit
        });
    }
    
    /**
     * Lock or unlock the room
     */
    setLocked(locked) {
        this.locked = locked;
        
        // Update all doors
        this.doors.forEach(door => {
            door.locked = locked;
        });
        
        EventBus.emit(EVENTS.ROOM_LOCK_CHANGED, {
            room: this,
            locked: locked
        });
    }
    
    /**
     * Seal or unseal the room (magical barrier)
     */
    setSealed(sealed) {
        this.sealed = sealed;
        
        EventBus.emit(EVENTS.ROOM_SEAL_CHANGED, {
            room: this,
            sealed: sealed
        });
    }
    
    /**
     * Apply room theme modifications
     */
    applyTheme(theme) {
        this.theme = theme;
        
        // Modify room properties based on theme
        switch(theme) {
            case 'fire':
                this.damagePerTurn = 2;
                this.description += ' (scorching hot)';
                break;
                
            case 'ice':
                this.slippery = true;
                this.description += ' (frozen)';
                break;
                
            case 'darkness':
                this.darkVision = -2;  // Reduced vision
                this.description += ' (shrouded in darkness)';
                break;
                
            case 'poison':
                this.poisonChance = 0.1;
                this.description += ' (toxic atmosphere)';
                break;
        }
    }
    
    /**
     * Generate room description
     */
    getDescription() {
        let desc = this.description;
        
        // Add size description
        const area = this.width * this.height;
        if (area < 20) {
            desc = `a small ${desc}`;
        } else if (area > 100) {
            desc = `a large ${desc}`;
        } else if (area > 200) {
            desc = `a vast ${desc}`;
        }
        
        // Add feature descriptions
        if (this.hasAltar) {
            desc += ' with an altar';
        }
        if (this.hasThrone) {
            desc += ' with a throne';
        }
        if (this.hasFountain) {
            desc += ' with a fountain';
        }
        
        // Add state descriptions
        if (this.lit) {
            desc += ' (lit)';
        }
        if (this.locked) {
            desc += ' (locked)';
        }
        if (this.sealed) {
            desc += ' (magically sealed)';
        }
        
        return desc;
    }
    
    /**
     * Convert room to plain object for serialization
     */
    toJSON() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            centerX: this.centerX,
            centerY: this.centerY,
            type: this.type,
            connections: this.connections.map(r => r.id),
            doors: this.doors,
            monsters: this.monsters.map(m => m.id),
            items: this.items.map(i => i.id),
            features: this.features,
            explored: this.explored,
            lit: this.lit,
            locked: this.locked,
            sealed: this.sealed,
            id: this.id,
            theme: this.theme,
            difficulty: this.difficulty
        };
    }
    
    /**
     * Create room from plain object
     */
    static fromJSON(data, roomMap = new Map()) {
        const room = new Room(data.x, data.y, data.width, data.height, data.type);
        
        room.centerX = data.centerX;
        room.centerY = data.centerY;
        room.doors = data.doors || [];
        room.features = data.features || [];
        room.explored = data.explored || false;
        room.lit = data.lit || false;
        room.locked = data.locked || false;
        room.sealed = data.sealed || false;
        room.id = data.id;
        room.theme = data.theme;
        room.difficulty = data.difficulty || 1.0;
        
        // Connections will be resolved after all rooms are created
        // Store the IDs for now
        room._connectionIds = data.connections || [];
        
        return room;
    }
    
    /**
     * Resolve connections after all rooms are loaded
     */
    resolveConnections(roomMap) {
        if (this._connectionIds) {
            this.connections = this._connectionIds
                .map(id => roomMap.get(id))
                .filter(room => room !== undefined);
            
            delete this._connectionIds;
        }
    }
}

/**
 * Special room layouts (predefined patterns)
 */
export const SPECIAL_LAYOUTS = {
    CROSS: {
        name: 'cross',
        pattern: [
            '  ###  ',
            '  #.#  ',
            '###.###',
            '#.....#',
            '###.###',
            '  #.#  ',
            '  ###  '
        ]
    },
    CIRCLE: {
        name: 'circle',
        pattern: [
            '  ###  ',
            ' ##.## ',
            '##...##',
            '#.....#',
            '##...##',
            ' ##.## ',
            '  ###  '
        ]
    },
    DIAMOND: {
        name: 'diamond',
        pattern: [
            '   #   ',
            '  ###  ',
            ' ##.## ',
            '##...##',
            ' ##.## ',
            '  ###  ',
            '   #   '
        ]
    },
    PILLARS: {
        name: 'pillars',
        pattern: [
            '#######',
            '#.#.#.#',
            '#.....#',
            '#.#.#.#',
            '#.....#',
            '#.#.#.#',
            '#######'
        ]
    }
};

// Export for use in other modules
export default Room;