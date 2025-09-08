/**
 * tile.js - Tile representation and management
 * Handles individual dungeon tiles, their types, properties, and interactions
 */

import { COLORS, TILES } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

/**
 * Tile types and their properties
 */
export const TILE_TYPES = {
    WALL: {
        symbol: '#',
        color: COLORS.GRAY,
        blocked: true,
        blocksVision: true,
        description: 'a stone wall'
    },
    FLOOR: {
        symbol: '.',
        color: COLORS.DARKGRAY,
        blocked: false,
        blocksVision: false,
        description: 'the floor'
    },
    CORRIDOR: {
        symbol: '.',
        color: COLORS.DARKGRAY,
        blocked: false,
        blocksVision: false,
        description: 'a corridor'
    },
    DOOR: {
        symbol: '+',
        color: COLORS.BROWN,
        blocked: true,
        blocksVision: true,
        description: 'a door',
        interactable: true
    },
    DOOR_OPEN: {
        symbol: '/',
        color: COLORS.BROWN,
        blocked: false,
        blocksVision: false,
        description: 'an open door',
        interactable: true
    },
    STAIRS_UP: {
        symbol: '<',
        color: COLORS.WHITE,
        blocked: false,
        blocksVision: false,
        description: 'stairs leading up',
        interactable: true
    },
    STAIRS_DOWN: {
        symbol: '>',
        color: COLORS.WHITE,
        blocked: false,
        blocksVision: false,
        description: 'stairs leading down',
        interactable: true
    },
    TRAP: {
        symbol: '^',
        color: COLORS.RED,
        blocked: false,
        blocksVision: false,
        description: 'a trap',
        hidden: true
    },
    FOUNTAIN: {
        symbol: '{',
        color: COLORS.BLUE,
        blocked: false,
        blocksVision: false,
        description: 'a fountain',
        interactable: true
    },
    ALTAR: {
        symbol: '_',
        color: COLORS.WHITE,
        blocked: false,
        blocksVision: false,
        description: 'an altar',
        interactable: true
    },
    THRONE: {
        symbol: '\\',
        color: COLORS.YELLOW,
        blocked: false,
        blocksVision: false,
        description: 'a throne',
        interactable: true
    },
    SINK: {
        symbol: '#',
        color: COLORS.CYAN,
        blocked: false,
        blocksVision: false,
        description: 'a sink',
        interactable: true
    },
    LAVA: {
        symbol: '~',
        color: COLORS.RED,
        blocked: false,
        blocksVision: false,
        description: 'lava',
        dangerous: true,
        damagePerTurn: 10
    },
    WATER: {
        symbol: '~',
        color: COLORS.BLUE,
        blocked: false,
        blocksVision: false,
        description: 'water',
        swim: true
    },
    ICE: {
        symbol: '.',
        color: COLORS.CYAN,
        blocked: false,
        blocksVision: false,
        description: 'ice',
        slippery: true
    },
    GRASS: {
        symbol: '"',
        color: COLORS.GREEN,
        blocked: false,
        blocksVision: false,
        description: 'grass'
    },
    TREE: {
        symbol: '#',
        color: COLORS.GREEN,
        blocked: true,
        blocksVision: true,
        description: 'a tree'
    },
    BOULDER: {
        symbol: '0',
        color: COLORS.GRAY,
        blocked: true,
        blocksVision: true,
        description: 'a boulder',
        pushable: true
    },
    PIT: {
        symbol: '^',
        color: COLORS.DARKGRAY,
        blocked: false,
        blocksVision: false,
        description: 'a pit',
        fallDamage: 5
    },
    SPIKED_PIT: {
        symbol: '^',
        color: COLORS.RED,
        blocked: false,
        blocksVision: false,
        description: 'a spiked pit',
        fallDamage: 15
    },
    WEB: {
        symbol: '"',
        color: COLORS.GRAY,
        blocked: false,
        blocksVision: false,
        description: 'a web',
        sticky: true
    },
    GRAVE: {
        symbol: '+',
        color: COLORS.DARKGRAY,
        blocked: false,
        blocksVision: false,
        description: 'a grave',
        interactable: true
    },
    BARS: {
        symbol: '#',
        color: COLORS.CYAN,
        blocked: true,
        blocksVision: false,
        description: 'iron bars'
    }
};

/**
 * Tile class representing a single dungeon tile
 */
export class Tile {
    constructor(x, y, type = 'WALL') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Copy properties from tile type
        const typeData = TILE_TYPES[type] || TILE_TYPES.WALL;
        Object.assign(this, typeData);
        
        // Visibility states
        this.visible = false;
        this.explored = false;
        this.lit = false;
        
        // Optional properties
        this.trap = null;
        this.graffiti = null;
        this.blood = false;
        this.special = null;  // Shop, temple, etc.
        this.locked = false;
        this.secret = false;
        this.roomId = null;
        
        // Door-specific
        this.open = false;
        
        // Container for temporary effects
        this.effects = [];
    }
    
    /**
     * Get the display symbol for this tile
     */
    getSymbol() {
        // Hidden features
        if (this.secret && !this.explored) {
            return TILE_TYPES.WALL.symbol;
        }
        
        if (this.trap && !this.trap.revealed) {
            return TILE_TYPES.FLOOR.symbol;
        }
        
        // Door state
        if (this.type === 'DOOR' && this.open) {
            return TILE_TYPES.DOOR_OPEN.symbol;
        }
        
        return this.symbol;
    }
    
    /**
     * Get the display color for this tile
     */
    getColor() {
        // Not visible - dark gray
        if (!this.visible && !this.explored) {
            return COLORS.DARKGRAY;
        }
        
        // Explored but not currently visible - darker version
        if (!this.visible && this.explored) {
            return this.dimColor(this.color);
        }
        
        // Blood stains
        if (this.blood) {
            return this.blendColor(this.color, COLORS.RED, 0.3);
        }
        
        // Lit areas are brighter
        if (this.lit) {
            return this.brightenColor(this.color);
        }
        
        return this.color;
    }
    
    /**
     * Interact with this tile
     */
    interact(actor) {
        if (!this.interactable) {
            return false;
        }
        
        switch(this.type) {
            case 'DOOR':
                return this.interactDoor(actor);
                
            case 'STAIRS_UP':
            case 'STAIRS_DOWN':
                return this.interactStairs(actor);
                
            case 'FOUNTAIN':
                return this.interactFountain(actor);
                
            case 'ALTAR':
                return this.interactAltar(actor);
                
            case 'THRONE':
                return this.interactThrone(actor);
                
            case 'SINK':
                return this.interactSink(actor);
                
            case 'GRAVE':
                return this.interactGrave(actor);
                
            default:
                return false;
        }
    }
    
    /**
     * Interact with a door
     */
    interactDoor(actor) {
        if (this.locked) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: 'The door is locked.',
                type: 'info'
            });
            return false;
        }
        
        if (this.open) {
            this.closeDoor();
        } else {
            this.openDoor();
        }
        
        return true;
    }
    
    /**
     * Open this door
     */
    openDoor() {
        if (this.type !== 'DOOR' || this.open) return false;
        
        this.open = true;
        this.blocked = false;
        this.blocksVision = false;
        this.symbol = TILE_TYPES.DOOR_OPEN.symbol;
        
        EventBus.emit(EVENTS.DOOR_OPENED, {
            x: this.x,
            y: this.y
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: 'You open the door.',
            type: 'action'
        });
        
        return true;
    }
    
    /**
     * Close this door
     */
    closeDoor() {
        if (this.type !== 'DOOR' || !this.open) return false;
        
        this.open = false;
        this.blocked = true;
        this.blocksVision = true;
        this.symbol = TILE_TYPES.DOOR.symbol;
        
        EventBus.emit(EVENTS.DOOR_CLOSED, {
            x: this.x,
            y: this.y
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: 'You close the door.',
            type: 'action'
        });
        
        return true;
    }
    
    /**
     * Interact with stairs
     */
    interactStairs(actor) {
        const direction = this.type === 'STAIRS_UP' ? 'up' : 'down';
        
        EventBus.emit(EVENTS.USE_STAIRS, {
            direction: direction,
            x: this.x,
            y: this.y
        });
        
        return true;
    }
    
    /**
     * Interact with fountain
     */
    interactFountain(actor) {
        const effects = [
            { message: 'The water is refreshing!', effect: 'heal', value: 5 },
            { message: 'The water tastes foul.', effect: 'poison', value: 3 },
            { message: 'You see your reflection in the water.', effect: null },
            { message: 'The fountain dries up!', effect: 'dry' }
        ];
        
        const result = effects[Math.floor(Math.random() * effects.length)];
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: result.message,
            type: 'info'
        });
        
        if (result.effect === 'dry') {
            this.type = 'FLOOR';
            this.symbol = TILE_TYPES.FLOOR.symbol;
            this.color = TILE_TYPES.FLOOR.color;
            this.interactable = false;
        }
        
        return true;
    }
    
    /**
     * Interact with altar
     */
    interactAltar(actor) {
        EventBus.emit(EVENTS.MESSAGE, {
            text: 'You feel a divine presence.',
            type: 'special'
        });
        
        EventBus.emit(EVENTS.ALTAR_USED, {
            x: this.x,
            y: this.y,
            actor: actor
        });
        
        return true;
    }
    
    /**
     * Interact with throne
     */
    interactThrone(actor) {
        const effects = [
            'You feel more knowledgeable!',
            'You feel a strange sensation.',
            'The throne vanishes!'
        ];
        
        const message = effects[Math.floor(Math.random() * effects.length)];
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: message,
            type: 'special'
        });
        
        if (message.includes('vanishes')) {
            this.type = 'FLOOR';
            this.symbol = TILE_TYPES.FLOOR.symbol;
            this.color = TILE_TYPES.FLOOR.color;
            this.interactable = false;
        }
        
        return true;
    }
    
    /**
     * Interact with sink
     */
    interactSink(actor) {
        EventBus.emit(EVENTS.MESSAGE, {
            text: 'You wash your hands.',
            type: 'action'
        });
        
        return true;
    }
    
    /**
     * Interact with grave
     */
    interactGrave(actor) {
        if (this.graffiti) {
            EventBus.emit(EVENTS.MESSAGE, {
                text: `The grave reads: "${this.graffiti}"`,
                type: 'info'
            });
        } else {
            EventBus.emit(EVENTS.MESSAGE, {
                text: 'The inscription is worn away.',
                type: 'info'
            });
        }
        
        return true;
    }
    
    /**
     * Step on this tile (for traps, effects, etc.)
     */
    stepOn(actor) {
        // Trigger trap if present
        if (this.trap && !this.trap.revealed) {
            this.triggerTrap(actor);
        }
        
        // Handle special tile effects
        if (this.dangerous) {
            EventBus.emit(EVENTS.TILE_DAMAGE, {
                actor: actor,
                damage: this.damagePerTurn,
                type: this.type
            });
        }
        
        if (this.slippery) {
            EventBus.emit(EVENTS.SLIP, {
                actor: actor,
                x: this.x,
                y: this.y
            });
        }
        
        if (this.sticky) {
            EventBus.emit(EVENTS.STUCK, {
                actor: actor,
                x: this.x,
                y: this.y
            });
        }
        
        if (this.fallDamage) {
            EventBus.emit(EVENTS.FALL, {
                actor: actor,
                damage: this.fallDamage,
                x: this.x,
                y: this.y
            });
        }
    }
    
    /**
     * Trigger a trap
     */
    triggerTrap(actor) {
        if (!this.trap) return;
        
        this.trap.revealed = true;
        
        EventBus.emit(EVENTS.TRAP_TRIGGERED, {
            trap: this.trap,
            actor: actor,
            x: this.x,
            y: this.y
        });
        
        EventBus.emit(EVENTS.MESSAGE, {
            text: `You triggered a ${this.trap.type} trap!`,
            type: 'danger'
        });
    }
    
    /**
     * Search this tile for secrets
     */
    search() {
        let found = false;
        
        if (this.secret && !this.explored) {
            this.secret = false;
            this.explored = true;
            found = true;
            
            EventBus.emit(EVENTS.SECRET_FOUND, {
                x: this.x,
                y: this.y,
                type: this.type
            });
        }
        
        if (this.trap && !this.trap.revealed) {
            this.trap.revealed = true;
            found = true;
            
            EventBus.emit(EVENTS.TRAP_FOUND, {
                trap: this.trap,
                x: this.x,
                y: this.y
            });
        }
        
        return found;
    }
    
    /**
     * Dim a color (for fog of war)
     */
    dimColor(color) {
        // Simple hex color dimming
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const dimmed = {
            r: Math.floor(r * 0.4),
            g: Math.floor(g * 0.4),
            b: Math.floor(b * 0.4)
        };
        
        return `#${dimmed.r.toString(16).padStart(2, '0')}${dimmed.g.toString(16).padStart(2, '0')}${dimmed.b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Brighten a color (for lit areas)
     */
    brightenColor(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const brightened = {
            r: Math.min(255, Math.floor(r * 1.3)),
            g: Math.min(255, Math.floor(g * 1.3)),
            b: Math.min(255, Math.floor(b * 1.3))
        };
        
        return `#${brightened.r.toString(16).padStart(2, '0')}${brightened.g.toString(16).padStart(2, '0')}${brightened.b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Blend two colors
     */
    blendColor(color1, color2, ratio) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const blended = {
            r: Math.floor(r1 * (1 - ratio) + r2 * ratio),
            g: Math.floor(g1 * (1 - ratio) + g2 * ratio),
            b: Math.floor(b1 * (1 - ratio) + b2 * ratio)
        };
        
        return `#${blended.r.toString(16).padStart(2, '0')}${blended.g.toString(16).padStart(2, '0')}${blended.b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Convert tile to plain object for serialization
     */
    toJSON() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            visible: this.visible,
            explored: this.explored,
            lit: this.lit,
            trap: this.trap,
            graffiti: this.graffiti,
            blood: this.blood,
            special: this.special,
            locked: this.locked,
            secret: this.secret,
            roomId: this.roomId,
            open: this.open,
            effects: this.effects
        };
    }
    
    /**
     * Create tile from plain object
     */
    static fromJSON(data) {
        const tile = new Tile(data.x, data.y, data.type);
        
        tile.visible = data.visible || false;
        tile.explored = data.explored || false;
        tile.lit = data.lit || false;
        tile.trap = data.trap || null;
        tile.graffiti = data.graffiti || null;
        tile.blood = data.blood || false;
        tile.special = data.special || null;
        tile.locked = data.locked || false;
        tile.secret = data.secret || false;
        tile.roomId = data.roomId || null;
        tile.open = data.open || false;
        tile.effects = data.effects || [];
        
        return tile;
    }
}

// Export for use in other modules
export default Tile;