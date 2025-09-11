/**
 * config.js - COMPLETE Configuration File
 * This is the FINAL, COMPLETE version with EVERYTHING the game needs
 */

// Main configuration object
export const CONFIG = {
    // Map dimensions - Adjusted for better gameplay
    MAP_WIDTH: 80,
    MAP_HEIGHT: 25,
    VIEWPORT_WIDTH: 50,
    VIEWPORT_HEIGHT: 33,
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 600,
    TILE_SIZE: 24,
    
    // Player starting stats
    STARTING_HP: 15,
    STARTING_SP: 100,
    STARTING_MP: 10,
    STARTING_WISDOM: 10,
    STARTING_STRENGTH: 10,
    STARTING_DEXTERITY: 10,
    STARTING_CONSTITUTION: 10,
    STARTING_INTELLIGENCE: 10,
    STARTING_PERCEPTION: 10,
    
    // Gameplay mechanics
    SIGHT_RADIUS: 5,
    MAX_MESSAGES: 50,
    CARRYING_CAPACITY_BASE: 50,
    MAX_LEVEL: 100,
    BOSS_LEVELS: [15, 30, 45, 60, 75, 90, 100],
    
    // Hunger/SP system
    SP_DECAY_RATE: 50,      // Turns between SP loss
    SP_DECAY_AMOUNT: 1,     // How much SP lost
    STARVATION_DAMAGE: 1,   // HP damage when starving
    STARVATION_RATE: 10,    // Turns between starvation damage
    
    // Regeneration
    TURN_REGEN_RATE: 20,    // Turns between HP regen
    HP_REGEN_AMOUNT: 1,     // How much HP regenerated
    MP_REGEN_RATE: 10,      // Turns between MP regen
    MP_REGEN_AMOUNT: 1,     // How much MP regenerated
    
    // Combat
    BASE_HIT_CHANCE: 0.75,  // Base chance to hit
    CRITICAL_HIT_CHANCE: 0.05, // Chance for critical hit
    CRITICAL_MULTIPLIER: 2,  // Critical hit damage multiplier
    
    // Quiz settings
    QUIZ_BASE_TIME: 30,      // Base seconds for quiz
    QUIZ_TIME_PER_WIS: 1,    // Bonus seconds per wisdom
    QUIZ_CHAIN_BONUS: 0.2,   // Chain multiplier per correct
    
    // Save/Load
    SAVE_KEY: 'philosophers-quest-save',
    AUTOSAVE_INTERVAL: 100,  // Turns between autosaves
    
    // Debug
    DEBUG_MODE: false,
    SHOW_DEBUG_UI: false,
    LOG_EVENTS: false,
    
    // Inventory settings
    INVENTORY: {
        MAX_ITEMS: 52,        // a-z, A-Z
        DEFAULT_STACK_SIZE: 20,
        MAX_WEIGHT: 100,
        CONTAINER_SIZE: 10    // Items per container
    }
};

// Complete event definitions - EVERY event the game uses
export const EVENTS = {
    // Game lifecycle events
    GAME_START: 'game_start',
    GAME_PAUSE: 'game_pause',
    GAME_RESUME: 'game_resume',
    GAME_OVER: 'game_over',
    GAME_WIN: 'game_win',
    GAME_TICK: 'game_tick',
    TURN_END: 'turn_end',
    
    // Save/Load events
    SAVE_GAME: 'save_game',
    LOAD_GAME: 'load_game',
    AUTOSAVE: 'autosave',
    
    // Player movement and actions
    PLAYER_MOVE: 'player_move',
    PLAYER_MOVED: 'player_moved',
    PLAYER_ACTION: 'player_action',
    PLAYER_WAIT: 'player_wait',
    PLAYER_PICKUP: 'player_pickup',
    PLAYER_DROP: 'player_drop',
    PLAYER_USE_ITEM: 'player_use_item',
    PLAYER_CAST_SPELL: 'player_cast_spell',
    PLAYER_IDENTIFY: 'player_identify',
    
    // Player status events
    PLAYER_DAMAGED: 'player_damaged',
    PLAYER_HEALED: 'player_healed',
    PLAYER_DIED: 'player_died',
    PLAYER_STAT_CHANGE: 'player_stat_change',
    PLAYER_EFFECT_ADDED: 'player_effect_added',
    PLAYER_EFFECT_REMOVED: 'player_effect_removed',
    PLAYER_LEVEL_UP: 'player_level_up',
    PLAYER_STARVING: 'player_starving',
    
    // Monster events
    MONSTER_SPAWNED: 'monster_spawned',
    MONSTER_MOVED: 'monster_moved',
    MONSTER_DAMAGED: 'monster_damaged',
    MONSTER_DIED: 'monster_died',
    MONSTER_DEATH: 'monster_death',
    MONSTER_REMOVED: 'monster_removed',
    MONSTER_ALERTED: 'monster_alerted',
    MONSTER_ATTACK: 'monster_attack',
    MONSTER_MOVE: 'monster_move',
    
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
    ITEM_PICKUP: 'item_pickup',
    ITEM_DROP: 'item_drop',
    ITEM_EQUIP: 'item_equip',
    ITEM_UNEQUIP: 'item_unequip',
    ITEMS_LOADED: 'items_loaded',
    
    // Inventory events
    INVENTORY_UPDATED: 'inventory_updated',
    INVENTORY_FULL: 'inventory_full',
    INVENTORY_ITEM_SELECTED: 'inventory_item_selected',
    
    // Quiz events
    QUIZ_START: 'quiz_start',
    QUIZ_QUESTION: 'quiz_question',
    QUIZ_ANSWER: 'quiz_answer',
    QUIZ_ANSWER_SUBMITTED: 'quiz_answer_submitted',
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
    UI_OPEN_EQUIPMENT: 'ui_open_equipment',
    UI_CLOSE_EQUIPMENT: 'ui_close_equipment',
    UI_OPEN_SPELL_MENU: 'ui_open_spell_menu',
    UI_OPEN_STUDY_MENU: 'ui_open_study_menu',
    UI_OPEN_MONSTER_INFO: 'ui_open_monster_info',
    UI_OPEN_CONDUCT: 'ui_open_conduct',
    UI_OPEN_OVERVIEW: 'ui_open_overview',
    UI_MODAL_OPEN: 'ui_modal_open',
    UI_MODAL_CLOSE: 'ui_modal_close',
    UI_CLICK: 'ui_click',
    
    // System/Data events
    DATA_LOADED: 'data_loaded',
    MONSTERS_LOADED: 'monsters_loaded',
    QUESTIONS_LOADED: 'questions_loaded',
    SPELLS_LOADED: 'spells_loaded',
    
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
    
    // Debug events
    DEBUG_MESSAGE: 'debug_message',
    DEBUG_COMMAND: 'debug_command'
};

// Tile symbols for rendering
export const TILES = {
    // Player
    PLAYER: '@',
    
    // Terrain
    WALL: '#',
    FLOOR: '.',
    CORRIDOR: '#',
    DOOR: '+',
    DOOR_OPEN: '/',
    DOOR_CLOSED: '+',
    
    // Items
    FOOD: '%',
    WEAPON: ')',
    ARMOR: '[',
    SCROLL: '?',
    POTION: '!',
    WAND: '/',
    RING: '=',
    AMULET: '"',
    GOLD: '$',
    GEM: '*',
    BOOK: '+',
    TOOL: '(',
    CORPSE: '%',
    CONTAINER: '8',
    
    // Dungeon features
    STAIRS_UP: '<',
    STAIRS_DOWN: '>',
    TRAP: '^',
    ALTAR: '_',
    FOUNTAIN: '{',
    SINK: '#',
    THRONE: '\\',
    
    // Special
    UNKNOWN: '?',
    EMPTY: ' ',
    FOG: '~'
};

// Color palette for rendering
export const COLORS = {
    // Basic colors
    WHITE: '#ffffff',
    BLACK: '#000000',
    GRAY: '#808080',
    DARKGRAY: '#404040',
    LIGHTGRAY: '#c0c0c0',
    
    // Primary colors
    RED: '#ff0000',
    GREEN: '#00ff00',
    BLUE: '#0066ff',
    YELLOW: '#ffff00',
    MAGENTA: '#ff00ff',
    CYAN: '#00ffff',
    
    // Game colors
    BROWN: '#8B4513',
    ORANGE: '#ff8800',
    PURPLE: '#8000ff',
    PINK: '#ff00ff',
    GOLD: '#ffd700',
    SILVER: '#c0c0c0',
    
    // Dark variants
    DARK_RED: '#800000',
    DARK_GREEN: '#008000',
    DARK_BLUE: '#000080',
    DARK_YELLOW: '#808000',
    DARK_MAGENTA: '#800080',
    DARK_CYAN: '#008080',
    
    // Status colors
    HEALTH: '#ff0000',
    STAMINA: '#ffff00',
    MANA: '#0066ff',
    POISON: '#00ff00',
    BLESSED: '#00ffff',
    CURSED: '#ff00ff'
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

// Difficulty tiers for quizzes
export const DIFFICULTY_TIERS = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Journeyman',
    4: 'Expert',
    5: 'Master'
};

// Status effects that can affect the player
export const STATUS_EFFECTS = {
    // Debuffs
    POISONED: 'poisoned',
    PARALYZED: 'paralyzed',
    CONFUSED: 'confused',
    BLIND: 'blind',
    STUNNED: 'stunned',
    CURSED: 'cursed',
    SLOW: 'slow',
    WEAK: 'weak',
    SICK: 'sick',
    HALLUCINATING: 'hallucinating',
    
    // Buffs
    BLESSED: 'blessed',
    INVISIBLE: 'invisible',
    FAST: 'fast',
    REGENERATING: 'regenerating',
    LEVITATING: 'levitating',
    DETECTING: 'detecting',
    PROTECTED: 'protected',
    STRONG: 'strong',
    ENLIGHTENED: 'enlightened',
    TELEPATHIC: 'telepathic'
};

// Equipment slots for the equipment system
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
    SHIELD: 'shield',
    QUIVER: 'quiver',
    LIGHT: 'light'
};

// Material types for items
export const MATERIALS = {
    // Metals
    IRON: 'iron',
    STEEL: 'steel',
    SILVER: 'silver',
    GOLD: 'gold',
    MITHRIL: 'mithril',
    ADAMANTINE: 'adamantine',
    COPPER: 'copper',
    BRONZE: 'bronze',
    
    // Organic
    WOOD: 'wood',
    LEATHER: 'leather',
    CLOTH: 'cloth',
    BONE: 'bone',
    ORGANIC: 'organic',
    
    // Other
    CRYSTAL: 'crystal',
    STONE: 'stone',
    GLASS: 'glass',
    PAPER: 'paper',
    PLASTIC: 'plastic',
    ENERGY: 'energy'
};

// Damage types for combat
export const DAMAGE_TYPES = {
    PHYSICAL: 'physical',
    SLASH: 'slash',
    PIERCE: 'pierce',
    BLUDGEON: 'bludgeon',
    FIRE: 'fire',
    ICE: 'ice',
    ELECTRIC: 'electric',
    POISON: 'poison',
    ACID: 'acid',
    HOLY: 'holy',
    UNHOLY: 'unholy',
    PSYCHIC: 'psychic',
    FORCE: 'force',
    NECROTIC: 'necrotic',
    RADIANT: 'radiant'
};

// AI behavior patterns for monsters
export const AI_PATTERNS = {
    AGGRESSIVE: 'aggressive',    // Always attacks
    DEFENSIVE: 'defensive',      // Attacks when threatened
    PEACEFUL: 'peaceful',        // Never attacks
    COWARDLY: 'cowardly',       // Runs when hurt
    INTELLIGENT: 'intelligent',  // Uses tactics
    BERSERK: 'berserk',         // Attacks everything
    GUARDIAN: 'guardian',       // Guards area
    PATROL: 'patrol',           // Patrols route
    AMBUSH: 'ambush',           // Waits and attacks
    SWARM: 'swarm'              // Groups together
};

// Item categories
export const ITEM_CATEGORIES = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory',
    CONSUMABLE: 'consumable',
    TOOL: 'tool',
    MAGICAL: 'magical',
    TREASURE: 'treasure',
    QUEST: 'quest',
    JUNK: 'junk'
};

// Directions for movement and actions
export const DIRECTIONS = {
    NORTH: { dx: 0, dy: -1, name: 'north' },
    SOUTH: { dx: 0, dy: 1, name: 'south' },
    EAST: { dx: 1, dy: 0, name: 'east' },
    WEST: { dx: -1, dy: 0, name: 'west' },
    NORTHEAST: { dx: 1, dy: -1, name: 'northeast' },
    NORTHWEST: { dx: -1, dy: -1, name: 'northwest' },
    SOUTHEAST: { dx: 1, dy: 1, name: 'southeast' },
    SOUTHWEST: { dx: -1, dy: 1, name: 'southwest' },
    WAIT: { dx: 0, dy: 0, name: 'wait' }
};

// Make EVENTS available on CONFIG for backward compatibility
CONFIG.EVENTS = EVENTS;

// Export default for backward compatibility
export default CONFIG;