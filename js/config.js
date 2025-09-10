/**
 * config.js - Game configuration and constants
 */

const CONFIG = {
    MAP_WIDTH: 120, 
    MAP_HEIGHT: 80,
    VIEWPORT_WIDTH: 50, 
    VIEWPORT_HEIGHT: 33,
    CANVAS_WIDTH: 900, 
    CANVAS_HEIGHT: 600, 
    TILE_SIZE: 18,
    STARTING_WISDOM: 15,
    SIGHT_RADIUS: 3,
    MAX_MESSAGES: 50,
    CARRYING_CAPACITY_BASE: 50,
    MAX_LEVEL: 100,
    BOSS_LEVELS: [15, 30, 45, 60, 75, 90, 100],
    DEBUG_MODE: false,
    SAVE_KEY: 'philosophers_quest_save',
    TURN_REGEN_RATE: 10,
    
    // Inventory settings
    INVENTORY: {
        MAX_ITEMS: 52,  // 26 letters * 2 (lowercase + uppercase)
        DEFAULT_STACK_SIZE: 99
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

const EVENTS = {
    // Player events
    PLAYER_MOVE: 'player_move',
    PLAYER_MOVED: 'player_moved',
    PLAYER_ACTION: 'player_action',
    PLAYER_ATTACK: 'player_attack',
    PLAYER_DEATH: 'player_death',
    PLAYER_STAT_CHANGE: 'player_stat_change',
    PLAYER_SP_CHANGE: 'player_sp_change',
    PLAYER_STARVING: 'player_starving',
    
    // Quiz events
    QUIZ_START: 'quiz_start',
    QUIZ_COMPLETE: 'quiz_complete',
    QUIZ_TIMEOUT: 'quiz_timeout',
    
    // Combat events
    COMBAT_START: 'combat_start',
    COMBAT_RESOLVED: 'combat_resolved',
    MONSTER_ATTACK: 'monster_attack',
    MONSTER_DEATH: 'monster_death',
    MONSTER_SPAWNED: 'monster_spawned',
    MONSTER_REMOVED: 'monster_removed',
    MONSTER_MOVED: 'monster_moved',
    
    // Item events
    ITEM_PICKED_UP: 'item_picked_up',
    ITEM_DROPPED: 'item_dropped',
    ITEM_SPAWNED: 'item_spawned',
    ITEM_REMOVED: 'item_removed',
    ITEM_EQUIPPED: 'item_equipped',
    ITEM_UNEQUIPPED: 'item_unequipped',
    
    // Food/Cooking events
    HARVEST_START: 'harvest_start',
    HARVEST_SUCCESS: 'harvest_success',
    HARVEST_FAILURE: 'harvest_failure',
    COOKING_START: 'cooking_start',
    COOKING_COMPLETE: 'cooking_complete',
    
    // Effect events
    EFFECT_ADDED: 'effect_added',
    EFFECT_REMOVED: 'effect_removed',
    SAVING_THROW: 'saving_throw',
    
    // Dungeon events
    DUNGEON_GENERATE: 'dungeon_generate',
    DUNGEON_LOADED: 'dungeon_loaded',
    DUNGEON_UPDATED: 'dungeon_updated',
    VISION_UPDATED: 'vision_updated',
    
    // UI events
    INVENTORY_OPEN: 'inventory_open',
    INVENTORY_CLOSE: 'inventory_close',
    MESSAGE_LOG: 'message_log',
    
    // Game state events
    GAME_START: 'game_start',
    GAME_PAUSE: 'game_pause',
    GAME_RESUME: 'game_resume',
    GAME_OVER: 'game_over',
    SAVE_GAME: 'save_game',
    LOAD_GAME: 'load_game',
    TURN_END: 'turn_end',
    
    // Data loading events
    DATA_LOADED: 'data_loaded'
};

// Attach EVENTS to CONFIG for backward compatibility
CONFIG.EVENTS = EVENTS;

// Export all constants
export { CONFIG, TILES, COLORS, QUIZ_SUBJECTS };