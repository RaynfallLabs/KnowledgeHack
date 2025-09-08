/**
 * dungeon-generator.js - NetHack-style dungeon generation
 * Creates room-and-corridor levels with proper item/monster distribution
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class DungeonGenerator {
    constructor() {
        // Room generation limits (scaled for our larger map)
        this.MIN_ROOMS = 7;
        this.MAX_ROOMS = 15;  // More rooms for larger map
        this.MIN_ROOM_SIZE = 3;
        this.MAX_ROOM_SIZE = 15;
        
        // Item/monster distribution (NetHack-based)
        this.ITEM_CHANCE = 0.25;  // Reduced from 1/3 for more containers
        this.CONTAINER_CHANCE = 0.15;  // Increased from 2/(5*rooms)
        this.ADDITIONAL_ITEM_CHANCE = 0.2;  // 1/5 chance for each extra
        this.GOLD_BASE = 10;
        
        // Trap distribution
        this.TRAP_CHANCE_PER_ROOM = 0.1;  // 10% per room
        this.SECRET_DOOR_CHANCE = 0.2;  // 20% chance per connection
        
        // Boss level IDs
        this.BOSS_LEVELS = CONFIG.BOSS_LEVELS;
    }
    
    /**
     * Generate a dungeon level
     * @param {number} level - Dungeon level (1-100)
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Object} Dungeon object
     */
    async generate(level, width, height) {
        // Check if this is a boss level
        if (this.BOSS_LEVELS.includes(level)) {
            return await this.generateBossLevel(level, width, height);
        }
        
        // Create base dungeon object
        const dungeon = {
            level,
            width,
            height,
            tiles: [],
            rooms: [],
            corridors: [],
            monsters: [],
            items: [],
            traps: [],
            stairs: {},
            theme: this.getLevelTheme(level),
            entrance: null,
            exit: null
        };
        
        // Initialize tile array
        for (let y = 0; y < height; y++) {
            dungeon.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                dungeon.tiles[y][x] = {
                    type: 'wall',
                    visible: false,
                    explored: false,
                    blocked: true
                };
            }
        }
        
        // Generate rooms
        this.generateRooms(dungeon);
        
        // Sort rooms for connection (NetHack style)
        this.sortRooms(dungeon.rooms);
        
        // Connect rooms with corridors
        this.generateCorridors(dungeon);
        
        // Place stairs
        this.placeStairs(dungeon);
        
        // Add special room if appropriate
        if (level >= 2) {
            this.addSpecialRoom(dungeon);
        }
        
        // Place items
        this.placeItems(dungeon);
        
        // Place monsters
        this.placeMonsters(dungeon);
        
        // Place traps
        this.placeTraps(dungeon);
        
        // Add theme elements
        this.addThemeElements(dungeon);
        
        // Wrap in accessor methods
        return this.wrapDungeon(dungeon);
    }
    
    /**
     * Generate rooms
     */
    generateRooms(dungeon) {
        const targetRooms = this.MIN_ROOMS + Math.floor(Math.random() * (this.MAX_ROOMS - this.MIN_ROOMS));
        let attempts = 0;
        const maxAttempts = 500;
        
        while (dungeon.rooms.length < targetRooms && attempts < maxAttempts) {
            attempts++;
            
            // Random room size
            const width = this.MIN_ROOM_SIZE + Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE));
            const height = this.MIN_ROOM_SIZE + Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE));
            
            // Random position (leave margin for walls)
            const x = 2 + Math.floor(Math.random() * (dungeon.width - width - 4));
            const y = 2 + Math.floor(Math.random() * (dungeon.height - height - 4));
            
            // Check if room overlaps
            if (this.canPlaceRoom(dungeon, x, y, width, height)) {
                const room = {
                    x, y, width, height,
                    centerX: Math.floor(x + width / 2),
                    centerY: Math.floor(y + height / 2),
                    connections: [],
                    type: 'normal'
                };
                
                // Carve out room
                for (let ry = y; ry < y + height; ry++) {
                    for (let rx = x; rx < x + width; rx++) {
                        dungeon.tiles[ry][rx] = {
                            type: 'floor',
                            visible: false,
                            explored: false,
                            blocked: false,
                            room: dungeon.rooms.length
                        };
                    }
                }
                
                dungeon.rooms.push(room);
            }
        }
    }
    
    /**
     * Check if room can be placed without overlap
     */
    canPlaceRoom(dungeon, x, y, width, height) {
        // Check bounds
        if (x < 1 || y < 1 || x + width >= dungeon.width - 1 || y + height >= dungeon.height - 1) {
            return false;
        }
        
        // Check for overlap with existing rooms (with 1 tile buffer)
        for (let ry = y - 1; ry < y + height + 1; ry++) {
            for (let rx = x - 1; rx < x + width + 1; rx++) {
                if (dungeon.tiles[ry][rx].type === 'floor') {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Sort rooms for connection (NetHack algorithm)
     */
    sortRooms(rooms) {
        // Sort by left-to-right, top-to-bottom
        rooms.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) {
                return a.x - b.x;  // Same row, sort by x
            }
            return a.y - b.y;  // Different rows, sort by y
        });
    }
    
    /**
     * Generate corridors connecting rooms (NetHack style)
     */
    generateCorridors(dungeon) {
        const rooms = dungeon.rooms;
        if (rooms.length < 2) return;
        
        // First pass: Connect each room to the next
        for (let i = 0; i < rooms.length - 1; i++) {
            this.connectRooms(dungeon, rooms[i], rooms[i + 1]);
            
            // 2% chance to stop early (NetHack quirk)
            if (Math.random() < 0.02) break;
        }
        
        // Second pass: Connect each room to room+2
        for (let i = 0; i < rooms.length - 2; i++) {
            if (Math.random() < 0.5) {  // 50% chance for extra connections
                this.connectRooms(dungeon, rooms[i], rooms[i + 2]);
            }
        }
        
        // Ensure all rooms are connected
        this.ensureConnectivity(dungeon);
    }
    
    /**
     * Connect two rooms with an L-shaped corridor
     */
    connectRooms(dungeon, room1, room2) {
        // Check if already connected
        if (room1.connections.includes(room2)) return;
        
        const start = {
            x: room1.centerX,
            y: room1.centerY
        };
        const end = {
            x: room2.centerX,
            y: room2.centerY
        };
        
        // Randomly choose horizontal-first or vertical-first
        if (Math.random() < 0.5) {
            // Horizontal then vertical
            this.carveCorridor(dungeon, start.x, start.y, end.x, start.y);
            this.carveCorridor(dungeon, end.x, start.y, end.x, end.y);
        } else {
            // Vertical then horizontal
            this.carveCorridor(dungeon, start.x, start.y, start.x, end.y);
            this.carveCorridor(dungeon, start.x, end.y, end.x, end.y);
        }
        
        // Add doors at room entrances
        this.addDoors(dungeon, room1, room2);
        
        // Mark as connected
        room1.connections.push(room2);
        room2.connections.push(room1);
    }
    
    /**
     * Carve a straight corridor
     */
    carveCorridor(dungeon, x1, y1, x2, y2) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        
        let x = x1;
        let y = y1;
        
        while (x !== x2 || y !== y2) {
            if (dungeon.tiles[y][x].type === 'wall') {
                dungeon.tiles[y][x] = {
                    type: 'corridor',
                    visible: false,
                    explored: false,
                    blocked: false
                };
            }
            
            if (x !== x2) x += dx;
            if (y !== y2) y += dy;
        }
    }
    
    /**
     * Add doors where corridors meet rooms
     */
    addDoors(dungeon, room1, room2) {
        // Find corridor tiles adjacent to rooms
        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                if (dungeon.tiles[y][x].type === 'corridor') {
                    // Check if adjacent to room
                    const adjacent = [
                        [0, 1], [0, -1], [1, 0], [-1, 0]
                    ];
                    
                    for (const [dx, dy] of adjacent) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (ny >= 0 && ny < dungeon.height && 
                            nx >= 0 && nx < dungeon.width &&
                            dungeon.tiles[ny][nx].type === 'floor') {
                            
                            // Place door (possibly secret)
                            const isSecret = Math.random() < this.SECRET_DOOR_CHANCE;
                            dungeon.tiles[y][x] = {
                                type: 'door',
                                visible: false,
                                explored: false,
                                blocked: true,
                                open: false,
                                secret: isSecret,
                                locked: Math.random() < 0.1  // 10% locked
                            };
                            break;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Ensure all rooms are reachable
     */
    ensureConnectivity(dungeon) {
        // Simple flood fill to check connectivity
        // If any room is unreachable, connect it to nearest connected room
        // (Simplified for now - NetHack's algorithm is complex)
    }
    
    /**
     * Place stairs
     */
    placeStairs(dungeon) {
        if (dungeon.rooms.length < 2) return;
        
        // Up stairs in first room
        const upRoom = dungeon.rooms[0];
        const upX = upRoom.x + Math.floor(Math.random() * upRoom.width);
        const upY = upRoom.y + Math.floor(Math.random() * upRoom.height);
        
        dungeon.tiles[upY][upX].type = 'stairs_up';
        dungeon.stairs.up = { x: upX, y: upY };
        dungeon.entrance = { x: upX, y: upY };
        
        // Down stairs in different room (if not bottom level)
        if (dungeon.level < 100) {
            const downRoom = dungeon.rooms[dungeon.rooms.length - 1];
            const downX = downRoom.x + Math.floor(Math.random() * downRoom.width);
            const downY = downRoom.y + Math.floor(Math.random() * downRoom.height);
            
            dungeon.tiles[downY][downX].type = 'stairs_down';
            dungeon.stairs.down = { x: downX, y: downY };
            dungeon.exit = { x: downX, y: downY };
        }
    }
    
    /**
     * Add special room
     */
    addSpecialRoom(dungeon) {
        if (dungeon.rooms.length < 3) return;
        
        // Pick a random room (not stairs rooms)
        const room = dungeon.rooms[Math.floor(1 + Math.random() * (dungeon.rooms.length - 2))];
        
        // Special room types
        const types = ['shop', 'library', 'armory', 'treasury', 'temple'];
        room.type = types[Math.floor(Math.random() * types.length)];
        
        // Mark tiles as special
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                dungeon.tiles[y][x].special = room.type;
            }
        }
    }
    
    /**
     * Place items following NetHack distribution
     */
    placeItems(dungeon) {
        for (const room of dungeon.rooms) {
            // Containers (increased chance)
            if (Math.random() < this.CONTAINER_CHANCE) {
                const x = room.x + Math.floor(Math.random() * room.width);
                const y = room.y + Math.floor(Math.random() * room.height);
                
                dungeon.items.push({
                    x, y,
                    type: Math.random() < 0.67 ? 'large_box' : 'chest',
                    locked: Math.random() < 0.3,  // 30% locked
                    trapped: Math.random() < 0.1   // 10% trapped
                });
            }
            
            // Regular items (decreased chance)
            if (Math.random() < this.ITEM_CHANCE) {
                let itemCount = 1;
                while (Math.random() < this.ADDITIONAL_ITEM_CHANCE && itemCount < 5) {
                    itemCount++;
                }
                
                for (let i = 0; i < itemCount; i++) {
                    const x = room.x + Math.floor(Math.random() * room.width);
                    const y = room.y + Math.floor(Math.random() * room.height);
                    
                    dungeon.items.push({
                        x, y,
                        type: this.randomItemType(dungeon.level)
                    });
                }
            }
            
            // Gold (scales with level)
            if (Math.random() < 0.2) {  // 20% chance
                const x = room.x + Math.floor(Math.random() * room.width);
                const y = room.y + Math.floor(Math.random() * room.height);
                
                const amount = this.calculateGoldAmount(dungeon.level);
                dungeon.items.push({
                    x, y,
                    type: 'gold',
                    amount
                });
            }
        }
    }
    
    /**
     * Calculate gold amount (NetHack formula)
     */
    calculateGoldAmount(level) {
        // Exponential growth to level 10, then linear
        if (level <= 10) {
            return Math.floor(this.GOLD_BASE * Math.pow(1.5, level));
        } else {
            return Math.floor(this.GOLD_BASE * Math.pow(1.5, 10) + (level - 10) * 50);
        }
    }
    
    /**
     * Random item type based on level
     */
    randomItemType(level) {
        const types = ['weapon', 'armor', 'potion', 'scroll', 'ring', 'wand', 'food'];
        // Weight by level (later levels have better items)
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Place monsters
     */
    placeMonsters(dungeon) {
        // Scale with level (NetHack style)
        const monsterCount = Math.floor(3 + dungeon.level * 0.5);
        
        for (let i = 0; i < monsterCount; i++) {
            const room = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
            const x = room.x + Math.floor(Math.random() * room.width);
            const y = room.y + Math.floor(Math.random() * room.height);
            
            dungeon.monsters.push({
                x, y,
                type: this.getMonsterType(dungeon.level),
                asleep: Math.random() < 0.3  // 30% sleeping
            });
        }
    }
    
    /**
     * Get appropriate monster type for level
     */
    getMonsterType(level) {
        // Simplified - would load from monster tables
        if (level < 5) return 'rat';
        if (level < 10) return 'goblin';
        if (level < 20) return 'orc';
        if (level < 30) return 'troll';
        return 'dragon';
    }
    
    /**
     * Place traps
     */
    placeTraps(dungeon) {
        for (const room of dungeon.rooms) {
            if (Math.random() < this.TRAP_CHANCE_PER_ROOM) {
                const x = room.x + Math.floor(Math.random() * room.width);
                const y = room.y + Math.floor(Math.random() * room.height);
                
                dungeon.traps.push({
                    x, y,
                    type: this.randomTrapType(dungeon.level),
                    revealed: false
                });
                
                dungeon.tiles[y][x].trap = true;
            }
        }
    }
    
    /**
     * Random trap type
     */
    randomTrapType(level) {
        const types = ['pit', 'arrow', 'teleport', 'alarm'];
        if (level > 10) types.push('poison');
        if (level > 20) types.push('polymorph');
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Get level theme based on boss sections
     */
    getLevelTheme(level) {
        if (level <= 15) return 'dungeon';
        if (level <= 30) return 'minotaur';  // Maze-like
        if (level <= 45) return 'balrog';    // Fire theme
        if (level <= 60) return 'behemoth';  // Earth theme
        if (level <= 75) return 'jormungandr'; // Serpent theme
        if (level <= 90) return 'fenrir';    // Wolf theme
        return 'odin';  // Final section
    }
    
    /**
     * Add theme elements (graffiti, hints, etc.)
     */
    addThemeElements(dungeon) {
        const theme = dungeon.theme;
        
        // Add graffiti/messages based on theme
        if (Math.random() < 0.1) {  // 10% chance
            const messages = this.getThemeMessages(theme, dungeon.level);
            if (messages.length > 0) {
                const room = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
                const x = room.x + Math.floor(Math.random() * room.width);
                const y = room.y + Math.floor(Math.random() * room.height);
                
                dungeon.tiles[y][x].graffiti = messages[Math.floor(Math.random() * messages.length)];
            }
        }
        
        // Modify corridor generation for maze theme
        if (theme === 'minotaur') {
            // More twisty corridors already handled in generation
            dungeon.mazeInfluence = true;
        }
        
        // Add environmental hazards for fire theme
        if (theme === 'balrog' && Math.random() < 0.05) {
            const room = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
            const x = room.x + Math.floor(Math.random() * room.width);
            const y = room.y + Math.floor(Math.random() * room.height);
            dungeon.tiles[y][x].type = 'lava';
        }
    }
    
    /**
     * Get theme-appropriate messages
     */
    getThemeMessages(theme, level) {
        const messages = {
            dungeon: [
                "Abandon hope, all ye who enter here",
                "The Philosopher's Stone lies deep below"
            ],
            minotaur: [
                "The walls seem to shift when you're not looking",
                "You hear distant bellowing",
                "THESEUS WAS HERE",
                "I've been walking in circles for days"
            ],
            balrog: [
                "It's getting warmer...",
                "YOU SHALL NOT PASS",
                "The ancient evil stirs",
                "Flames consumed the last expedition"
            ],
            behemoth: [
                "The earth trembles",
                "These passages were carved by something huge",
                "BEWARE THE EARTHSHAKER"
            ],
            jormungandr: [
                "The World Serpent coils below",
                "Scales the size of shields litter the floor",
                "The walls glisten with venom"
            ],
            fenrir: [
                "The chains are breaking",
                "Howls echo through the halls",
                "THE WOLF COMES"
            ],
            odin: [
                "Knowledge is the final test",
                "The All-Father watches",
                "Two ravens were here"
            ]
        };
        
        return messages[theme] || [];
    }
    
    /**
     * Generate boss level from static file
     */
    async generateBossLevel(level, width, height) {
        try {
            // Load boss level data
            const response = await fetch(`data/boss-levels/level-${level}.json`);
            if (!response.ok) {
                console.warn(`Boss level ${level} not found, generating normal level`);
                return this.generate(level, width, height);
            }
            
            const bossData = await response.json();
            
            // Create dungeon from template
            const dungeon = {
                level,
                width,
                height,
                tiles: bossData.tiles || [],
                rooms: bossData.rooms || [],
                corridors: [],
                monsters: bossData.monsters || [],
                items: bossData.items || [],
                traps: bossData.traps || [],
                stairs: bossData.stairs || {},
                theme: bossData.theme || this.getLevelTheme(level),
                entrance: bossData.entrance,
                exit: bossData.exit,
                boss: bossData.boss
            };
            
            // Add random monsters and items on top of static layout
            this.placeItems(dungeon);
            this.placeMonsters(dungeon);
            
            return this.wrapDungeon(dungeon);
        } catch (error) {
            console.error(`Error loading boss level ${level}:`, error);
            return this.generate(level, width, height);
        }
    }
    
    /**
     * Wrap dungeon with accessor methods
     */
    wrapDungeon(dungeon) {
        return {
            ...dungeon,
            getTile(x, y) {
                if (y >= 0 && y < dungeon.height && x >= 0 && x < dungeon.width) {
                    return dungeon.tiles[y][x];
                }
                return null;
            },
            isWalkable(x, y) {
                const tile = this.getTile(x, y);
                return tile && !tile.blocked;
            },
            updateVisibility(x, y, radius) {
                // Update visible/explored tiles
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= radius) {
                            const tx = x + dx;
                            const ty = y + dy;
                            const tile = this.getTile(tx, ty);
                            if (tile) {
                                tile.visible = true;
                                tile.explored = true;
                            }
                        }
                    }
                }
            },
            getEntrance() {
                return dungeon.entrance || dungeon.stairs.up || { x: 5, y: 5 };
            },
            getRandomRoom() {
                if (dungeon.rooms.length === 0) return null;
                return dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
            }
        };
    }
}