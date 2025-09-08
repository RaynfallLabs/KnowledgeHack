/**
 * corridor.js - Corridor generation and management
 * Handles creation of corridors connecting rooms in the dungeon
 */

import { EventBus, EVENTS } from '../core/event-bus.js';

/**
 * Corridor types
 */
export const CORRIDOR_TYPES = {
    STRAIGHT: 'straight',
    L_SHAPED: 'l_shaped',
    Z_SHAPED: 'z_shaped',
    MAZE: 'maze',
    WIDE: 'wide',
    SECRET: 'secret'
};

/**
 * Corridor class representing a connection between rooms
 */
export class Corridor {
    constructor(startX, startY, endX, endY, type = CORRIDOR_TYPES.L_SHAPED) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.type = type;
        
        // Path of corridor tiles
        this.path = [];
        
        // Connected rooms
        this.room1 = null;
        this.room2 = null;
        
        // Properties
        this.width = 1;  // Can be wider for main corridors
        this.secret = false;
        this.trapped = false;
        this.lit = false;
        
        // Doors at endpoints
        this.doors = [];
    }
    
    /**
     * Generate the corridor path
     */
    generate() {
        switch(this.type) {
            case CORRIDOR_TYPES.STRAIGHT:
                this.generateStraight();
                break;
                
            case CORRIDOR_TYPES.L_SHAPED:
                this.generateLShaped();
                break;
                
            case CORRIDOR_TYPES.Z_SHAPED:
                this.generateZShaped();
                break;
                
            case CORRIDOR_TYPES.MAZE:
                this.generateMaze();
                break;
                
            case CORRIDOR_TYPES.WIDE:
                this.generateWide();
                break;
                
            case CORRIDOR_TYPES.SECRET:
                this.generateSecret();
                break;
                
            default:
                this.generateLShaped();
        }
        
        return this.path;
    }
    
    /**
     * Generate a straight corridor
     */
    generateStraight() {
        this.path = [];
        
        const dx = Math.sign(this.endX - this.startX);
        const dy = Math.sign(this.endY - this.startY);
        
        let x = this.startX;
        let y = this.startY;
        
        while (x !== this.endX || y !== this.endY) {
            this.path.push({ x, y });
            
            if (x !== this.endX) x += dx;
            if (y !== this.endY) y += dy;
        }
        
        this.path.push({ x: this.endX, y: this.endY });
    }
    
    /**
     * Generate an L-shaped corridor (most common in NetHack)
     */
    generateLShaped() {
        this.path = [];
        
        const horizontalFirst = Math.random() < 0.5;
        
        if (horizontalFirst) {
            // Go horizontal first, then vertical
            this.addHorizontalSegment(this.startX, this.startY, this.endX);
            this.addVerticalSegment(this.endX, this.startY, this.endY);
        } else {
            // Go vertical first, then horizontal
            this.addVerticalSegment(this.startX, this.startY, this.endY);
            this.addHorizontalSegment(this.startX, this.endY, this.endX);
        }
    }
    
    /**
     * Generate a Z-shaped corridor (with a middle section)
     */
    generateZShaped() {
        this.path = [];
        
        const midX = Math.floor((this.startX + this.endX) / 2);
        const midY = Math.floor((this.startY + this.endY) / 2);
        
        // Random offset for the middle section
        const offsetX = Math.floor(Math.random() * 5) - 2;
        const offsetY = Math.floor(Math.random() * 5) - 2;
        
        if (Math.random() < 0.5) {
            // Horizontal-vertical-horizontal
            this.addHorizontalSegment(this.startX, this.startY, midX + offsetX);
            this.addVerticalSegment(midX + offsetX, this.startY, this.endY);
            this.addHorizontalSegment(midX + offsetX, this.endY, this.endX);
        } else {
            // Vertical-horizontal-vertical
            this.addVerticalSegment(this.startX, this.startY, midY + offsetY);
            this.addHorizontalSegment(this.startX, midY + offsetY, this.endX);
            this.addVerticalSegment(this.endX, midY + offsetY, this.endY);
        }
    }
    
    /**
     * Generate a maze-like corridor (for special levels)
     */
    generateMaze() {
        this.path = [];
        
        // Use a simple maze algorithm with random turns
        let x = this.startX;
        let y = this.startY;
        
        const visited = new Set();
        visited.add(`${x},${y}`);
        
        while (x !== this.endX || y !== this.endY) {
            this.path.push({ x, y });
            
            // Calculate direction to target
            const dx = Math.sign(this.endX - x);
            const dy = Math.sign(this.endY - y);
            
            // Randomly decide whether to move towards target or perpendicular
            const choices = [];
            
            if (dx !== 0) choices.push([dx, 0]);
            if (dy !== 0) choices.push([0, dy]);
            
            // Add perpendicular options for maze effect
            if (Math.random() < 0.3) {
                if (dx === 0) {
                    choices.push([1, 0], [-1, 0]);
                } else {
                    choices.push([0, 1], [0, -1]);
                }
            }
            
            if (choices.length === 0) break;
            
            // Choose a direction
            const [moveX, moveY] = choices[Math.floor(Math.random() * choices.length)];
            x += moveX;
            y += moveY;
            
            // Prevent infinite loops
            const key = `${x},${y}`;
            if (visited.has(key)) {
                // Backtrack or break
                x = this.endX;
                y = this.endY;
                break;
            }
            visited.add(key);
        }
        
        // Ensure we reach the end
        if (x !== this.endX || y !== this.endY) {
            this.addHorizontalSegment(x, y, this.endX);
            this.addVerticalSegment(this.endX, y, this.endY);
        }
        
        this.path.push({ x: this.endX, y: this.endY });
    }
    
    /**
     * Generate a wide corridor (2-3 tiles wide)
     */
    generateWide() {
        this.width = 2 + Math.floor(Math.random() * 2);  // 2 or 3 wide
        
        // Generate base path
        this.generateLShaped();
        
        // Expand path to width
        const widePath = [];
        
        for (const tile of this.path) {
            widePath.push(tile);
            
            // Add adjacent tiles for width
            for (let w = 1; w < this.width; w++) {
                // Determine direction to expand
                const horizontal = this.isHorizontalAt(tile);
                
                if (horizontal) {
                    widePath.push({ x: tile.x, y: tile.y + w });
                } else {
                    widePath.push({ x: tile.x + w, y: tile.y });
                }
            }
        }
        
        this.path = widePath;
    }
    
    /**
     * Generate a secret corridor (hidden walls)
     */
    generateSecret() {
        this.secret = true;
        
        // Generate as normal L-shaped but mark as secret
        this.generateLShaped();
        
        // Mark path tiles as secret
        this.path.forEach(tile => {
            tile.secret = true;
        });
    }
    
    /**
     * Add a horizontal segment to the path
     */
    addHorizontalSegment(startX, y, endX) {
        const dx = Math.sign(endX - startX);
        
        if (dx === 0) return;
        
        for (let x = startX; x !== endX; x += dx) {
            if (!this.pathContains(x, y)) {
                this.path.push({ x, y });
            }
        }
    }
    
    /**
     * Add a vertical segment to the path
     */
    addVerticalSegment(x, startY, endY) {
        const dy = Math.sign(endY - startY);
        
        if (dy === 0) return;
        
        for (let y = startY; y !== endY; y += dy) {
            if (!this.pathContains(x, y)) {
                this.path.push({ x, y });
            }
        }
    }
    
    /**
     * Check if path contains a position
     */
    pathContains(x, y) {
        return this.path.some(tile => tile.x === x && tile.y === y);
    }
    
    /**
     * Check if corridor is horizontal at a given tile
     */
    isHorizontalAt(tile) {
        const index = this.path.findIndex(t => t.x === tile.x && t.y === tile.y);
        
        if (index === -1) return false;
        
        // Check adjacent tiles
        const prev = this.path[index - 1];
        const next = this.path[index + 1];
        
        if (prev && prev.y === tile.y) return true;
        if (next && next.y === tile.y) return true;
        
        return false;
    }
    
    /**
     * Connect this corridor to rooms
     */
    connectRooms(room1, room2) {
        this.room1 = room1;
        this.room2 = room2;
        
        // Add doors at connection points
        this.addDoorsAtRoomConnections();
    }
    
    /**
     * Add doors where corridor meets rooms
     */
    addDoorsAtRoomConnections() {
        if (!this.room1 || !this.room2 || this.path.length === 0) return;
        
        // Check first tile (connection to room1)
        const firstTile = this.path[0];
        if (this.isAdjacentToRoom(firstTile, this.room1)) {
            this.addDoor(firstTile.x, firstTile.y, this.room1);
        }
        
        // Check last tile (connection to room2)
        const lastTile = this.path[this.path.length - 1];
        if (this.isAdjacentToRoom(lastTile, this.room2)) {
            this.addDoor(lastTile.x, lastTile.y, this.room2);
        }
    }
    
    /**
     * Check if a tile is adjacent to a room
     */
    isAdjacentToRoom(tile, room) {
        // Check all four directions
        const adjacent = [
            { x: tile.x + 1, y: tile.y },
            { x: tile.x - 1, y: tile.y },
            { x: tile.x, y: tile.y + 1 },
            { x: tile.x, y: tile.y - 1 }
        ];
        
        return adjacent.some(pos => room.containsPoint(pos.x, pos.y));
    }
    
    /**
     * Add a door at position
     */
    addDoor(x, y, room) {
        const door = {
            x: x,
            y: y,
            type: 'door',
            open: false,
            locked: room.locked || Math.random() < 0.1,
            secret: this.secret || Math.random() < 0.2
        };
        
        this.doors.push(door);
        
        EventBus.emit(EVENTS.DOOR_CREATED, {
            door: door,
            corridor: this,
            room: room
        });
        
        return door;
    }
    
    /**
     * Get the length of the corridor
     */
    getLength() {
        return this.path.length;
    }
    
    /**
     * Get all positions in the corridor
     */
    getPositions() {
        return this.path.slice();
    }
    
    /**
     * Check if corridor contains a position
     */
    containsPosition(x, y) {
        return this.pathContains(x, y);
    }
    
    /**
     * Place traps along the corridor
     */
    placeTraps(trapChance = 0.05) {
        const traps = [];
        
        for (const tile of this.path) {
            if (Math.random() < trapChance) {
                const trap = {
                    x: tile.x,
                    y: tile.y,
                    type: this.randomTrapType(),
                    revealed: false,
                    triggered: false
                };
                
                traps.push(trap);
                tile.trap = trap;
            }
        }
        
        this.trapped = traps.length > 0;
        return traps;
    }
    
    /**
     * Get a random trap type
     */
    randomTrapType() {
        const types = ['pit', 'arrow', 'dart', 'boulder', 'teleport'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Light or darken the corridor
     */
    setLit(lit) {
        this.lit = lit;
        
        this.path.forEach(tile => {
            tile.lit = lit;
        });
        
        EventBus.emit(EVENTS.CORRIDOR_LIT_CHANGED, {
            corridor: this,
            lit: lit
        });
    }
    
    /**
     * Convert corridor to plain object for serialization
     */
    toJSON() {
        return {
            startX: this.startX,
            startY: this.startY,
            endX: this.endX,
            endY: this.endY,
            type: this.type,
            path: this.path,
            width: this.width,
            secret: this.secret,
            trapped: this.trapped,
            lit: this.lit,
            doors: this.doors,
            room1: this.room1 ? this.room1.id : null,
            room2: this.room2 ? this.room2.id : null
        };
    }
    
    /**
     * Create corridor from plain object
     */
    static fromJSON(data) {
        const corridor = new Corridor(
            data.startX,
            data.startY,
            data.endX,
            data.endY,
            data.type
        );
        
        corridor.path = data.path || [];
        corridor.width = data.width || 1;
        corridor.secret = data.secret || false;
        corridor.trapped = data.trapped || false;
        corridor.lit = data.lit || false;
        corridor.doors = data.doors || [];
        
        // Room connections will be resolved after loading
        corridor._room1Id = data.room1;
        corridor._room2Id = data.room2;
        
        return corridor;
    }
    
    /**
     * Resolve room connections after loading
     */
    resolveRooms(roomMap) {
        if (this._room1Id) {
            this.room1 = roomMap.get(this._room1Id);
            delete this._room1Id;
        }
        
        if (this._room2Id) {
            this.room2 = roomMap.get(this._room2Id);
            delete this._room2Id;
        }
    }
}

/**
 * Corridor generator utility class
 */
export class CorridorGenerator {
    /**
     * Generate optimal corridor between two points
     */
    static generate(startX, startY, endX, endY, type = null) {
        // Determine best corridor type if not specified
        if (!type) {
            type = this.determineBestType(startX, startY, endX, endY);
        }
        
        const corridor = new Corridor(startX, startY, endX, endY, type);
        corridor.generate();
        
        return corridor;
    }
    
    /**
     * Determine the best corridor type based on positions
     */
    static determineBestType(startX, startY, endX, endY) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        
        // Straight corridor for aligned positions
        if (dx === 0 || dy === 0) {
            return CORRIDOR_TYPES.STRAIGHT;
        }
        
        // Z-shaped for long distances
        if (dx > 20 && dy > 20) {
            return CORRIDOR_TYPES.Z_SHAPED;
        }
        
        // Default to L-shaped
        return CORRIDOR_TYPES.L_SHAPED;
    }
    
    /**
     * Connect two rooms with a corridor
     */
    static connectRooms(room1, room2, type = null) {
        // Find best connection points
        const points = this.findConnectionPoints(room1, room2);
        
        if (!points) {
            console.warn('Could not find connection points for rooms');
            return null;
        }
        
        // Generate corridor
        const corridor = this.generate(
            points.start.x,
            points.start.y,
            points.end.x,
            points.end.y,
            type
        );
        
        // Connect to rooms
        corridor.connectRooms(room1, room2);
        
        return corridor;
    }
    
    /**
     * Find optimal connection points between two rooms
     */
    static findConnectionPoints(room1, room2) {
        // Use room centers for simple implementation
        // Can be enhanced to find nearest edges
        return {
            start: {
                x: room1.centerX,
                y: room1.centerY
            },
            end: {
                x: room2.centerX,
                y: room2.centerY
            }
        };
    }
    
    /**
     * Generate a maze of corridors
     */
    static generateMaze(width, height, density = 0.3) {
        const corridors = [];
        const grid = [];
        
        // Initialize grid
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                grid[y][x] = false;
            }
        }
        
        // Generate maze using recursive backtracking
        const stack = [];
        let current = { x: 0, y: 0 };
        grid[0][0] = true;
        
        while (stack.length > 0 || current) {
            const neighbors = this.getUnvisitedNeighbors(current, grid);
            
            if (neighbors.length > 0) {
                // Choose random neighbor
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Create corridor
                const corridor = new Corridor(
                    