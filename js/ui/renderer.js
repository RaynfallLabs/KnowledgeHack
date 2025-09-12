/**
 * renderer.js - Fixed canvas rendering system
 * Handles ASCII display with fog of war, smooth scrolling, and dirty rectangle optimization
 * FIXED: Compatible with dungeon-generator's getTile() method
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element '${canvasId}' not found`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Auto-size canvas based on window
        this.setupCanvas();
        
        // Tile settings (optimized for pixel art)
        this.tileSize = 24; // Perfect for 24x24 sprite sheets
        this.viewportWidth = Math.floor(this.canvas.width / this.tileSize);
        this.viewportHeight = Math.floor(this.canvas.height / this.tileSize);
        
        // Camera and smooth scrolling
        this.cameraX = 0;
        this.cameraY = 0;
        this.targetCameraX = 0;
        this.targetCameraY = 0;
        this.scrollSpeed = 0.2; // Smooth but responsive
        
        // Font settings
        this.font = `${Math.floor(this.tileSize * 0.8)}px monospace`;
        this.ctx.font = this.font;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Visibility and fog of war
        this.exploredTiles = new Set();
        this.visibleTiles = new Set();
        this.lastPlayerPos = { x: -1, y: -1 };
        
        // Dirty rectangle optimization
        this.dirtyRegions = [];
        this.lastFrameData = null;
        
        // Tile cache for performance
        this.tileCache = new Map();
        this.cacheDirty = false;
        
        // Animation
        this.animationId = null;
        this.lastRenderTime = 0;
        this.needsRedraw = true;
        
        // NetHack colors (classic palette)
        this.colors = {
            // Basic colors
            BLACK: '#000000',
            RED: '#ff0000',
            GREEN: '#00ff00',
            YELLOW: '#ffff00',
            BLUE: '#0000ff',
            MAGENTA: '#ff00ff',
            CYAN: '#00ffff',
            WHITE: '#ffffff',
            
            // Grays
            GRAY: '#808080',
            DARK_GRAY: '#404040',
            LIGHT_GRAY: '#c0c0c0',
            
            // Browns/oranges
            BROWN: '#a0522d',
            ORANGE: '#ff8000',
            
            // Special
            BRIGHT_GREEN: '#00ff80',
            BRIGHT_BLUE: '#4080ff',
            BRIGHT_RED: '#ff4040'
        };
        
        // ASCII symbols (NetHack style)
        this.symbols = {
            // Terrain
            WALL: '#',
            FLOOR: '.',
            CORRIDOR: '#',
            DOOR_OPEN: '/',
            DOOR_CLOSED: '+',
            STAIRS_DOWN: '>',
            STAIRS_UP: '<',
            
            // Liquids
            WATER: '}',
            LAVA: '}',
            ICE: '.',
            
            // Special
            TRAP: '^',
            ALTAR: '_',
            FOUNTAIN: '{',
            
            // Player
            PLAYER: '@',
            
            // Items
            WEAPON: ')',
            ARMOR: '[',
            RING: '=',
            AMULET: '"',
            POTION: '!',
            SCROLL: '?',
            WAND: '/',
            TOOL: '(',
            FOOD: '%',
            GOLD: '$',
            GEM: '*',
            ROCK: '`',
            
            // Monsters (examples)
            ANT: 'a',
            BAT: 'B',
            DRAGON: 'D',
            GOBLIN: 'g',
            HUMAN: '@',
            ZOMBIE: 'Z'
        };
        
        // Setup
        this.setupEventListeners();
        this.generateTileCache();
        
        // Start render loop automatically
        this.startRenderLoop();
        
        console.log(`🎨 Renderer initialized: ${this.viewportWidth}x${this.viewportHeight} tiles (${this.canvas.width}x${this.canvas.height}px)`);
    }
    
    /**
     * Setup responsive canvas
     */
    setupCanvas() {
        // Get container size or use window
        const container = this.canvas.parentElement;
        const maxWidth = container ? container.clientWidth : window.innerWidth - 400; // Leave room for sidebar
        const maxHeight = container ? container.clientHeight : window.innerHeight - 200; // Leave room for UI
        
        // Use 3:2 aspect ratio, but fit in available space
        let width = Math.min(1200, maxWidth);
        let height = Math.min(800, maxHeight);
        
        // Maintain aspect ratio
        const aspectRatio = 3/2;
        if (width / height > aspectRatio) {
            width = height * aspectRatio;
        } else {
            height = width / aspectRatio;
        }
        
        this.canvas.width = Math.floor(width);
        this.canvas.height = Math.floor(height);
        
        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        if (dpr > 1) {
            this.canvas.style.width = this.canvas.width + 'px';
            this.canvas.style.height = this.canvas.height + 'px';
            this.canvas.width *= dpr;
            this.canvas.height *= dpr;
            this.ctx.scale(dpr, dpr);
        }
    }
    
    /**
     * Generate cached tile renders for performance
     */
    generateTileCache() {
        this.tileCache.clear();
        
        // Cache common tile combinations
        const commonTiles = [
            { symbol: this.symbols.WALL, color: this.colors.BROWN, bg: this.colors.BLACK },
            { symbol: this.symbols.FLOOR, color: this.colors.GRAY, bg: this.colors.BLACK },
            { symbol: this.symbols.DOOR_CLOSED, color: this.colors.BROWN, bg: this.colors.BLACK },
            { symbol: this.symbols.STAIRS_DOWN, color: this.colors.YELLOW, bg: this.colors.BLACK },
            { symbol: this.symbols.PLAYER, color: this.colors.WHITE, bg: this.colors.BLACK }
        ];
        
        commonTiles.forEach(tile => {
            const key = `${tile.symbol}_${tile.color}_${tile.bg}`;
            this.tileCache.set(key, this.renderTileToCache(tile.symbol, tile.color, tile.bg));
        });
    }
    
    /**
     * Render a tile to an off-screen canvas for caching
     */
    renderTileToCache(symbol, color, backgroundColor) {
        const offscreen = document.createElement('canvas');
        offscreen.width = this.tileSize;
        offscreen.height = this.tileSize;
        const ctx = offscreen.getContext('2d');
        
        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        
        // Symbol
        ctx.fillStyle = color;
        ctx.font = this.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, this.tileSize / 2, this.tileSize / 2);
        
        return offscreen;
    }
    
    /**
     * Start the optimized render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            const deltaTime = timestamp - this.lastRenderTime;
            this.lastRenderTime = timestamp;
            
            // Update camera smoothly
            this.updateCamera(deltaTime);
            
            // Only render if something changed
            if (this.needsRedraw || this.dirtyRegions.length > 0) {
                this.render();
                this.needsRedraw = false;
                this.dirtyRegions = [];
            }
            
            this.animationId = requestAnimationFrame(render);
        };
        
        this.animationId = requestAnimationFrame(render);
    }
    
    /**
     * Stop render loop
     */
    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Update camera with smooth scrolling
     */
    updateCamera(deltaTime) {
        const dx = this.targetCameraX - this.cameraX;
        const dy = this.targetCameraY - this.cameraY;
        
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.cameraX += dx * this.scrollSpeed;
            this.cameraY += dy * this.scrollSpeed;
            this.needsRedraw = true;
        } else {
            // Snap to target when close enough
            this.cameraX = this.targetCameraX;
            this.cameraY = this.targetCameraY;
        }
    }
    
    /**
     * Center camera on position
     */
    centerCameraOn(x, y) {
        this.targetCameraX = x - Math.floor(this.viewportWidth / 2);
        this.targetCameraY = y - Math.floor(this.viewportHeight / 2);
        
        // Clamp to map bounds
        this.targetCameraX = Math.max(0, Math.min(this.targetCameraX, CONFIG.MAP_WIDTH - this.viewportWidth));
        this.targetCameraY = Math.max(0, Math.min(this.targetCameraY, CONFIG.MAP_HEIGHT - this.viewportHeight));
    }
    
    /**
     * Main render function
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.BLACK;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get game state from events (will be passed in by Game.js)
        const gameState = this.lastGameState;
        if (!gameState) return;
        
        // Render in correct order
        this.renderDungeon(gameState.dungeon, gameState.player);
        this.renderItems(gameState.items);
        this.renderMonsters(gameState.monsters);
        this.renderPlayer(gameState.player);
        
        // Optional: render UI overlay
        if (CONFIG.SHOW_DEBUG_UI) {
            this.renderDebugUI(gameState.player, gameState.currentLevel, gameState.turnNumber);
        }
    }
    
    /**
     * Render the dungeon with fog of war - FIXED to work with getTile()
     */
    renderDungeon(dungeon, player) {
        if (!dungeon || !player) return;
        
        // Update camera to follow player
        this.centerCameraOn(player.x, player.y);
        
        // Update visibility if player moved
        if (player.x !== this.lastPlayerPos.x || player.y !== this.lastPlayerPos.y) {
            this.updateVisibility(player, dungeon);
            this.lastPlayerPos = { x: player.x, y: player.y };
        }
        
        // Calculate render bounds (frustum culling)
        const startX = Math.max(0, Math.floor(this.cameraX));
        const startY = Math.max(0, Math.floor(this.cameraY));
        const endX = Math.min(CONFIG.MAP_WIDTH, startX + this.viewportWidth + 1);
        const endY = Math.min(CONFIG.MAP_HEIGHT, startY + this.viewportHeight + 1);
        
        // Render visible tiles
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                // Use getTile method if available, otherwise try direct access
                let tile = null;
                if (dungeon.getTile) {
                    tile = dungeon.getTile(x, y);
                } else if (dungeon.tiles && dungeon.tiles[y]) {
                    tile = dungeon.tiles[y][x];
                }
                
                if (tile) {
                    this.renderTile(x, y, tile);
                }
            }
        }
    }
    
    /**
     * Update fog of war and visibility - FIXED to work with getTile()
     */
    updateVisibility(player, dungeon) {
        this.visibleTiles.clear();
        
        const sightRadius = player.getSightRadius ? player.getSightRadius() : 
                           (player.sightRadius || CONFIG.SIGHT_RADIUS || 5);
        
        // Bresenham line-of-sight algorithm
        for (let angle = 0; angle < 360; angle += 2) { // Every 2 degrees for performance
            const radians = (angle * Math.PI) / 180;
            const dx = Math.cos(radians);
            const dy = Math.sin(radians);
            
            for (let distance = 0; distance <= sightRadius; distance += 0.5) {
                const x = Math.floor(player.x + dx * distance);
                const y = Math.floor(player.y + dy * distance);
                
                if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) break;
                
                const key = `${x},${y}`;
                this.visibleTiles.add(key);
                this.exploredTiles.add(key);
                
                // Stop if we hit a wall - FIXED to use getTile()
                let tile = null;
                if (dungeon.getTile) {
                    tile = dungeon.getTile(x, y);
                } else if (dungeon.tiles && dungeon.tiles[y]) {
                    tile = dungeon.tiles[y][x];
                }
                
                if (tile && tile.type === 'wall') {
                    break;
                }
            }
        }
    }
    
    /**
     * Render a single tile with caching
     */
    renderTile(x, y, tile) {
        const key = `${x},${y}`;
        const screenX = (x - this.cameraX) * this.tileSize;
        const screenY = (y - this.cameraY) * this.tileSize;
        
        // Frustum culling
        if (screenX < -this.tileSize || screenX > this.canvas.width ||
            screenY < -this.tileSize || screenY > this.canvas.height) {
            return;
        }
        
        // Visibility check
        const isVisible = this.visibleTiles.has(key);
        const isExplored = this.exploredTiles.has(key);
        
        if (!isExplored) return; // Never seen
        
        // Get tile appearance
        const appearance = this.getTileAppearance(tile, isVisible);
        
        // Try cache first
        const cacheKey = `${appearance.symbol}_${appearance.color}_${appearance.backgroundColor}`;
        const cached = this.tileCache.get(cacheKey);
        
        if (cached) {
            this.ctx.drawImage(cached, screenX, screenY);
        } else {
            // Render directly (and cache if common)
            this.renderTileDirect(screenX, screenY, appearance);
        }
    }
    
    /**
     * Get tile visual appearance based on type and visibility
     */
    getTileAppearance(tile, isVisible) {
        let symbol = this.symbols.FLOOR;
        let color = this.colors.GRAY;
        let backgroundColor = this.colors.BLACK;
        
        // Determine symbol and base color
        switch (tile.type) {
            case 'wall':
                symbol = this.symbols.WALL;
                color = this.colors.BROWN;
                break;
            case 'floor':
                symbol = this.symbols.FLOOR;
                color = this.colors.GRAY;
                break;
            case 'corridor':
                symbol = this.symbols.CORRIDOR;
                color = this.colors.DARK_GRAY;
                break;
            case 'door':
                symbol = tile.open ? this.symbols.DOOR_OPEN : this.symbols.DOOR_CLOSED;
                color = this.colors.BROWN;
                break;
            case 'stairs_down':
                symbol = this.symbols.STAIRS_DOWN;
                color = this.colors.YELLOW;
                break;
            case 'stairs_up':
                symbol = this.symbols.STAIRS_UP;
                color = this.colors.YELLOW;
                break;
            case 'water':
                symbol = this.symbols.WATER;
                color = this.colors.BLUE;
                break;
            case 'lava':
                symbol = this.symbols.LAVA;
                color = this.colors.RED;
                break;
            case 'trap':
                if (tile.revealed) {
                    symbol = this.symbols.TRAP;
                    color = this.colors.ORANGE;
                } else {
                    symbol = this.symbols.FLOOR;
                    color = this.colors.GRAY;
                }
                break;
        }
        
        // Apply fog of war
        if (!isVisible) {
            color = this.dimColor(color, 0.4);
            backgroundColor = this.colors.BLACK;
        }
        
        return { symbol, color, backgroundColor };
    }
    
    /**
     * Render tile directly to canvas
     */
    renderTileDirect(screenX, screenY, appearance) {
        // Background
        this.ctx.fillStyle = appearance.backgroundColor;
        this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        
        // Symbol
        this.ctx.fillStyle = appearance.color;
        this.ctx.font = this.font;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            appearance.symbol,
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2
        );
    }
    
    /**
     * Render items on the ground
     */
    renderItems(items) {
        if (!items) return;
        
        for (const item of items) {
            const key = `${item.x},${item.y}`;
            
            // Only render if tile is explored
            if (!this.exploredTiles.has(key)) continue;
            
            const screenX = (item.x - this.cameraX) * this.tileSize;
            const screenY = (item.y - this.cameraY) * this.tileSize;
            
            // Frustum culling
            if (screenX < -this.tileSize || screenX > this.canvas.width ||
                screenY < -this.tileSize || screenY > this.canvas.height) {
                continue;
            }
            
            // Get item appearance
            const appearance = this.getItemAppearance(item);
            const isVisible = this.visibleTiles.has(key);
            
            // Apply fog of war
            let color = appearance.color;
            if (!isVisible) {
                color = this.dimColor(color, 0.4);
            }
            
            // Render item
            this.ctx.fillStyle = color;
            this.ctx.font = this.font;
            this.ctx.fillText(
                appearance.symbol,
                screenX + this.tileSize / 2,
                screenY + this.tileSize / 2
            );
        }
    }
    
    /**
     * Get item visual appearance
     */
    getItemAppearance(item) {
        const appearance = { symbol: '?', color: this.colors.WHITE };
        
        switch (item.type) {
            case 'weapon':
                appearance.symbol = this.symbols.WEAPON;
                appearance.color = this.colors.CYAN;
                break;
            case 'armor':
                appearance.symbol = this.symbols.ARMOR;
                appearance.color = this.colors.GRAY;
                break;
            case 'ring':
                appearance.symbol = this.symbols.RING;
                appearance.color = this.colors.YELLOW;
                break;
            case 'amulet':
                appearance.symbol = this.symbols.AMULET;
                appearance.color = this.colors.MAGENTA;
                break;
            case 'potion':
                appearance.symbol = this.symbols.POTION;
                appearance.color = this.colors.BRIGHT_BLUE;
                break;
            case 'scroll':
                appearance.symbol = this.symbols.SCROLL;
                appearance.color = this.colors.WHITE;
                break;
            case 'food':
                appearance.symbol = this.symbols.FOOD;
                appearance.color = this.colors.GREEN;
                break;
            case 'gold':
                appearance.symbol = this.symbols.GOLD;
                appearance.color = this.colors.YELLOW;
                break;
            case 'wand':
                appearance.symbol = this.symbols.WAND;
                appearance.color = this.colors.BROWN;
                break;
            case 'tool':
                appearance.symbol = this.symbols.TOOL;
                appearance.color = this.colors.LIGHT_GRAY;
                break;
            case 'gem':
                appearance.symbol = this.symbols.GEM;
                appearance.color = this.colors.BRIGHT_RED;
                break;
        }
        
        return appearance;
    }
    
    /**
     * Render monsters
     */
    renderMonsters(monsters) {
        if (!monsters) return;
        
        for (const monster of monsters) {
            if (monster.hp <= 0) continue; // Skip dead
            
            const key = `${monster.x},${monster.y}`;
            
            // Only render if visible
            if (!this.visibleTiles.has(key)) continue;
            
            const screenX = (monster.x - this.cameraX) * this.tileSize;
            const screenY = (monster.y - this.cameraY) * this.tileSize;
            
            // Frustum culling
            if (screenX < -this.tileSize || screenX > this.canvas.width ||
                screenY < -this.tileSize || screenY > this.canvas.height) {
                continue;
            }
            
            // Get monster color
            let color = this.colors.RED; // Default hostile
            if (monster.peaceful) {
                color = this.colors.GREEN;
            } else if (monster.neutral) {
                color = this.colors.YELLOW;
            }
            
            // Use monster's symbol or default
            const symbol = monster.symbol || 'm';
            
            // Render monster
            this.ctx.fillStyle = color;
            this.ctx.font = this.font;
            this.ctx.fillText(
                symbol,
                screenX + this.tileSize / 2,
                screenY + this.tileSize / 2
            );
        }
    }
    
    /**
     * Render the player character
     */
    renderPlayer(player) {
        if (!player) return;
        
        const screenX = (player.x - this.cameraX) * this.tileSize;
        const screenY = (player.y - this.cameraY) * this.tileSize;
        
        // Player is always visible and bright
        this.ctx.fillStyle = this.colors.WHITE;
        this.ctx.font = this.font;
        this.ctx.fillText(
            this.symbols.PLAYER,
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2
        );
    }
    
    /**
     * Render debug UI overlay
     */
    renderDebugUI(player, currentLevel, turnNumber) {
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, 30);
        
        // Debug info
        this.ctx.fillStyle = this.colors.WHITE;
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        const debugText = `Lv:${currentLevel} T:${turnNumber} Pos:(${player.x},${player.y}) HP:${player.hp}/${player.maxHp} SP:${player.sp}/${player.maxSp} Cam:(${Math.floor(this.cameraX)},${Math.floor(this.cameraY)})`;
        this.ctx.fillText(debugText, 5, 5);
        
        // Reset text alignment
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }
    
    /**
     * Dim color for fog of war
     */
    dimColor(color, factor) {
        // Handle both hex and rgb colors
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
        }
        
        return color; // Return as-is if not hex
    }
    
    /**
     * Update game state for rendering
     */
    updateGameState(gameState) {
        this.lastGameState = gameState;
        this.needsRedraw = true;
    }
    
    /**
     * Add dirty region for partial redraws
     */
    addDirtyRegion(x, y, width, height) {
        this.dirtyRegions.push({ x, y, width, height });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player movement
        EventBus.on(EVENTS.PLAYER_MOVE, (data) => {
            this.needsRedraw = true;
        });
        
        // Level changes
        EventBus.on(EVENTS.DUNGEON_GENERATE, () => {
            this.exploredTiles.clear();
            this.visibleTiles.clear();
            this.needsRedraw = true;
        });
        
        // General redraws
        EventBus.on(EVENTS.UI_RENDER, () => {
            this.needsRedraw = true;
        });
        
        EventBus.on(EVENTS.MONSTER_MOVE, () => {
            this.needsRedraw = true;
        });
        
        EventBus.on(EVENTS.ITEM_PICKUP, () => {
            this.needsRedraw = true;
        });
        
        EventBus.on(EVENTS.ITEM_DROP, () => {
            this.needsRedraw = true;
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.generateTileCache();
            this.needsRedraw = true;
        });
        
        // Game state updates
        EventBus.on(EVENTS.GAME_STATE_UPDATE, (gameState) => {
            this.updateGameState(gameState);
        });
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopRenderLoop();
        this.tileCache.clear();
    }
}