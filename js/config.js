/**
 * config.js - Game configuration constants
 * Central configuration for Philosopher's Quest
 */

const CONFIG = {
    // Map dimensions
    MAP_WIDTH: 120, 
    MAP_HEIGHT: 80,
    VIEWPORT_WIDTH: 50, 
    VIEWPORT_HEIGHT: 33,
    CANVAS_WIDTH: 900, 
    CANVAS_HEIGHT: 600, 
    TILE_SIZE: 18,
    
    // Player stats
    STARTING_WISDOM: 15,
    SIGHT_RADIUS: 3,
    MAX_MESSAGES: 50,
    CARRYING_CAPACITY_BASE: 50,
    TURN_REGEN_RATE: 10,  // Regenerate HP/SP every 10 turns
    
    // Game progression
    MAX_LEVEL: 100,
    BOSS_LEVELS: [15, 30, 45, 60, 75, 90, 100],
    
    // System settings
    DEBUG_MODE: false,
    SAVE_KEY: 'philosophers-quest-save',
    
    // Event names for EventBus
    EVENTS: {
        // Player events
        PLAYER_MOVE: 'player:move',
        PLAYER_ACTION: 'player:action',
        PLAYER_DAMAGED: 'player:damaged',
        PLAYER_HEALED: 'player:healed',
        PLAYER_DIED: 'player:died',
        PLAYER_LEVEL_UP: 'player:levelup',
        
        // Quiz events
        QUIZ_START: 'quiz:start',
        QUIZ_COMPLETE: 'quiz:complete',
        QUIZ_FAILED: 'quiz:failed',
        QUIZ_QUESTION: 'quiz:question',
        
        // Combat events
        COMBAT_START: 'combat:start',
        COMBAT_END: 'combat:end',
        MONSTER_KILLED: 'monster:killed',
        
        // Item events
        ITEM_PICKUP: 'item:pickup',
        ITEM_DROP: 'item:drop',
        ITEM_EQUIP: 'item:equip',
        ITEM_UNEQUIP: 'item:unequip',
        ITEM_IDENTIFIED: 'item:identified',
        
        // Game state events
        GAME_START: 'game:start',
        GAME_PAUSE: 'game:pause',
        GAME_RESUME: 'game:resume',
        GAME_OVER: 'game:over',
        GAME_VICTORY: 'game:victory',
        SAVE_GAME: 'game:save',
        LOAD_GAME: 'game:load',
        
        // Level events
        LEVEL_ENTER: 'level:enter',
        LEVEL_EXIT: 'level:exit',
        LEVEL_GENERATED: 'level:generated'
    }
};

const TILES = {
    PLAYER: '@',
    WALL: '#',
    FLOOR: '.',
    DOOR: '+',
    FOOD: '%',
    WEAPON: ')',
    ARMOR: '[',
    SCROLL: '?',
    POTION: '!',
    WAND: '/'
};

const COLORS = {
    WHITE: '#ffffff',
    GRAY: '#808080',
    DARKGRAY: '#404040',
    BROWN: '#8B4513',
    GREEN: '#00ff00',
    BLUE: '#0066ff',
    RED: '#ff0000',
    YELLOW: '#ffff00',
    MAGENTA: '#ff00ff',
    CYAN: '#00ffff',
    ORANGE: '#ff8800'
};

const QUIZ_SUBJECTS = {
    math: 'Mathematics',
    science: 'Science', 
    philosophy: 'Philosophy',
    geography: 'Geography',
    history: 'History',
    economics: 'Economics',
    cooking: 'Cooking & Nutrition',
    grammar: 'Grammar & Language',
    animal: 'Animal Facts'
};

// Export all configuration objects
export { CONFIG, TILES, COLORS, QUIZ_SUBJECTS };