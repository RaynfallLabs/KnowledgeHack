/**
 * config.js - Complete configuration with all events defined
 */

export const CONFIG = {
    // Map dimensions
    MAP_WIDTH: 80,
    MAP_HEIGHT: 25,
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
    
    // Game mechanics
    MAX_LEVEL: 100,
    BOSS_LEVELS: [15, 30, 45, 60, 75, 90, 100],
    SP_DECAY_RATE: 100, // Turns between SP loss
    TURN_REGEN_RATE: 20, // Turns between HP regen
    
    // Debug
    DEBUG_MODE: false,
    SHOW_DEBUG_UI: false,
    
    // Save
    SAVE_KEY: 'philosophers-quest-save',
    
    // Events - Complete list
    EVENTS: {
        // Game lifecycle
        GAME_START: 'game_start',
        GAME_PAUSE: 'game_pause',
        GAME_RESUME: 'game_resume',
        GAME_OVER: 'game_over',
        GAME_WIN: 'game_win',
        SAVE_GAME: 'save_game',
        LOAD_GAME: 'load_game',
        
        // Player events
        PLAYER_MOVE: 'player_move',
        PLAYER_MOVED: 'player_moved',
        PLAYER_ACTION: 'player_action',
        PLAYER_DAMAGED: 'player_damaged',
        PLAYER_HEALED: 'player_healed',
        PLAYER_DIED: 'player_died',
        PLAYER_STAT_CHANGE: 'player_stat_change',
        PLAYER_EFFECT_ADDED: 'player_effect_added',
        PLAYER_EFFECT_REMOVED: 'player_effect_removed',
        PLAYER_LEVEL_UP: 'player_level_up',
        
        // Monster events
        MONSTER_SPAWNED: 'monster_spawned',
        MONSTER_MOVED: 'monster_moved',
        MONSTER_DAMAGED: 'monster_damaged',
        MONSTER_DIED: 'monster_died',
        MONSTER_DEATH: 'monster_death',
        MONSTER_REMOVED: 'monster_removed',
        MONSTER_ALERTED: 'monster_alerted',
        
        // Item events
        ITEM_SPAWNED: 'item_spawned',
        ITEM_PICKED_UP: 'item_picked_up',
        ITEM_DROPPED: 'item_dropped',
        ITEM_EQUIPPED: 'item_equipped',
        ITEM_UNEQUIPPED: 'item_unequipped',
        ITEM_USED: 'item_used',
        ITEM_CONSUMED: 'item_consumed',
        ITEM_IDENTIFIED: 'item_identified',
        ITEM_REMOVED: 'item_removed',
        ITEM_PICKUP: 'item_pickup', // Alias
        ITEM_DROP: 'item_drop', // Alias
        ITEM_EQUIP: 'item_equip', // Alias
        ITEM_UNEQUIP: 'item_unequip', // Alias
        
        // Inventory events
        INVENTORY_UPDATED: 'inventory_updated',
        INVENTORY_FULL: 'inventory_full',
        
        // Quiz events
        QUIZ_START: 'quiz_start',
        QUIZ_QUESTION: 'quiz_question',
        QUIZ_ANSWER: 'quiz_answer',
        QUIZ_CORRECT: 'quiz_correct',
        QUIZ_WRONG: 'quiz_wrong',
        QUIZ_COMPLETE: 'quiz_complete',
        QUIZ_TIMEOUT: 'quiz_timeout',
        QUIZ_CHAIN_BONUS: 'quiz_chain_bonus',
        
        // Combat events
        COMBAT_START: 'combat_start',
        COMBAT_END: 'combat_end',
        COMBAT_ATTACK: 'combat_attack',
        COMBAT_HIT: 'combat_hit',
        COMBAT_MISS: 'combat_miss',
        COMBAT_CRITICAL: 'combat_critical',
        
        // Dungeon events
        DUNGEON_GENERATE: 'dungeon_generate',
        DUNGEON_LOADED: 'dungeon_loaded',
        DUNGEON_UPDATED: 'dungeon_updated',
        DUNGEON_SECRET_FOUND: 'dungeon_secret_found',
        LEVEL_CHANGE: 'level_change',
        STAIRS_USED: 'stairs_used',
        
        // UI events
        UI_MESSAGE: 'ui_message',
        UI_UPDATE_STATS: 'ui_update_stats',
        UI_UPDATE_INVENTORY: 'ui_update_inventory',
        UI_UPDATE_EQUIPMENT: 'ui_update_equipment',
        UI_RENDER: 'ui_render',
        UI_OPEN_QUIZ: 'ui_open_quiz',
        UI_CLOSE_QUIZ: 'ui_close_quiz',
        UI_OPEN_INVENTORY: 'ui_open_inventory',
        UI_CLOSE_INVENTORY: 'ui_close_inventory',
        UI_MODAL_OPEN: 'ui_modal_open',
        UI_MODAL_CLOSE: 'ui_modal_close',
        
        // System events
        DATA_LOADED: 'data_loaded',
        ITEMS_LOADED: 'items_loaded',
        MONSTERS_LOADED: 'monsters_loaded',
        QUESTIONS_LOADED: 'questions_loaded',
        
        // Effect events
        EFFECT_ADDED: 'effect_added',
        EFFECT_REMOVED: 'effect_removed',
        EFFECT_EXPIRED: 'effect_expired',
        
        // Cooking/Harvesting events
        COOKING_START: 'cooking_start',
        COOKING_COMPLETE: 'cooking_complete',
        COOKING_FAILED: 'cooking_failed',
        HARVEST_START: 'harvest_start',
        HARVEST_COMPLETE: 'harvest_complete',
        HARVEST_FAILED: 'harvest_failed',
        
        // Identification events
        IDENTIFY_START: 'identify_start',
        IDENTIFY_COMPLETE: 'identify_complete',
        IDENTIFY_FAILED: 'identify_failed',
        
        // Vision events
        VISION_UPDATED: 'vision_updated',
        FOG_REVEALED: 'fog_revealed',
        
        // Game state
        GAME_STATE_UPDATE: 'game_state_update',
        TURN_END: 'turn_end',
        
        // Debug events
        DEBUG_MESSAGE: 'debug_message',
        DEBUG_COMMAND: 'debug_command'
    },
    
    // Inventory settings
    INVENTORY: {
        MAX_ITEMS: 52, // a-z, A-Z
        DEFAULT_STACK_SIZE: 20,
        MAX_WEIGHT: 100
    }
};

// Tile symbols
export const TILES = {
    PLAYER: '@',
    WALL: '#',
    FLOOR: '.',
    DOOR: '+',
    FOOD: '%',
    WEAPON: ')',
    ARMOR: '[',
    SCROLL: '?',
    POTION: '!',
    WAND: '/',
    RING: '=',
    AMULET: '"',
    GOLD: '$',
    STAIRS_UP: '<',
    STAIRS_DOWN: '>',
    TRAP: '^',
    CORPSE: '%',
    CONTAINER: '8'
};

// Color palette
export const COLORS = {
    WHITE: '#ffffff',
    GRAY: '#808080',
    DARKGRAY: '#404040',
    BLACK: '#000000',
    BROWN: '#8B4513',
    GREEN: '#00ff00',
    BLUE: '#0066ff',
    RED: '#ff0000',
    YELLOW: '#ffff00',
    MAGENTA: '#ff00ff',
    CYAN: '#00ffff',
    ORANGE: '#ff8800',
    PURPLE: '#8000ff',
    LIGHT_GRAY: '#c0c0c0',
    DARK_GREEN: '#008000',
    DARK_BLUE: '#000080',
    DARK_RED: '#800000'
};

// Quiz subjects with display names
export const QUIZ_SUBJECTS = {
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

// Difficulty tiers
export const DIFFICULTY_TIERS = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Journeyman',
    4: 'Expert',
    5: 'Master'
};

// Status effects
export const STATUS_EFFECTS = {
    POISONED: 'poisoned',
    PARALYZED: 'paralyzed',
    CONFUSED: 'confused',
    BLIND: 'blind',
    STUNNED: 'stunned',
    BLESSED: 'blessed',
    CURSED: 'cursed',
    INVISIBLE: 'invisible',
    FAST: 'fast',
    SLOW: 'slow',
    REGENERATING: 'regenerating',
    LEVITATING: 'levitating',
    DETECTING: 'detecting',
    PROTECTED: 'protected'
};

// Equipment slots
export const EQUIPMENT_SLOTS = {
    WEAPON: 'weapon',
    HEAD: 'head',
    BODY: 'body',
    HANDS: 'hands',
    FEET: 'feet',
    RING1: 'ring1',
    RING2: 'ring2',
    AMULET: 'amulet',
    CLOAK: 'cloak',
    SHIELD: 'shield'
};

// Material types
export const MATERIALS = {
    WOOD: 'wood',
    IRON: 'iron',
    STEEL: 'steel',
    SILVER: 'silver',
    GOLD: 'gold',
    MITHRIL: 'mithril',
    ADAMANTINE: 'adamantine',
    LEATHER: 'leather',
    CLOTH: 'cloth',
    CRYSTAL: 'crystal',
    BONE: 'bone',
    STONE: 'stone',
    GLASS: 'glass',
    PAPER: 'paper',
    COPPER: 'copper',
    BRONZE: 'bronze',
    ORGANIC: 'organic'
};

// Damage types
export const DAMAGE_TYPES = {
    PHYSICAL: 'physical',
    FIRE: 'fire',
    ICE: 'ice',
    ELECTRIC: 'electric',
    POISON: 'poison',
    ACID: 'acid',
    HOLY: 'holy',
    UNHOLY: 'unholy',
    PSYCHIC: 'psychic',
    FORCE: 'force'
};

// Export for backward compatibility
export default CONFIG;