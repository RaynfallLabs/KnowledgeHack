/**
 * event-bus.js - Central event system
 * Handles all game events and messaging between systems
 */

export class EventBus {
    constructor() {
        this.events = {};
    }
    
    /**
     * Subscribe to an event
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }
    
    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit an event
     */
    emit(event, data = {}) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Subscribe to an event once
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }
    
    /**
     * Clear all listeners for an event
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

// Create singleton instance
const eventBus = new EventBus();
export { eventBus as EventBus };

// Define all game events
export const EVENTS = {
    // Game State Events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    GAME_VICTORY: 'game:victory',
    SAVE_GAME: 'game:save',
    LOAD_GAME: 'game:load',
    
    // Player Core Events
    PLAYER_MOVE: 'player:move',
    PLAYER_ACTION: 'player:action',
    PLAYER_DAMAGE: 'player:damage',
    PLAYER_HEAL: 'player:heal',
    PLAYER_DEATH: 'player:death',
    PLAYER_LEVEL_UP: 'player:levelup',
    
    // Player Stat Events
    PLAYER_STAT_CHANGE: 'player:stat_change',
    PLAYER_SP_CHANGE: 'player:sp_change',
    PLAYER_HP_CHANGE: 'player:hp_change',
    PLAYER_MP_CHANGE: 'player:mp_change',
    PLAYER_STARVING: 'player:starving',
    
    // Effect Events
    EFFECT_ADDED: 'effect:added',
    EFFECT_REMOVED: 'effect:removed',
    EFFECT_EXPIRED: 'effect:expired',
    EFFECT_TICK: 'effect:tick',
    
    // Combat Events
    COMBAT_START: 'combat:start',
    COMBAT_END: 'combat:end',
    COMBAT_TURN: 'combat:turn',
    ATTACK_HIT: 'attack:hit',
    ATTACK_MISS: 'attack:miss',
    ATTACK_CRITICAL: 'attack:critical',
    SAVING_THROW: 'saving_throw',
    
    // Quiz Events
    QUIZ_START: 'quiz:start',
    QUIZ_QUESTION: 'quiz:question',
    QUIZ_ANSWER: 'quiz:answer',
    QUIZ_COMPLETE: 'quiz:complete',
    QUIZ_TIMEOUT: 'quiz:timeout',
    QUIZ_CANCEL: 'quiz:cancel',
    
    // Inventory Events
    INVENTORY_CHANGE: 'inventory:change',
    INVENTORY_USE: 'inventory:use',
    INVENTORY_DROP: 'inventory:drop',
    INVENTORY_PICKUP: 'inventory:pickup',
    ITEM_EQUIPPED: 'item:equipped',
    ITEM_UNEQUIPPED: 'item:unequipped',
    ITEM_IDENTIFIED: 'item:identified',
    ITEM_REMOVED: 'item:removed',
    
    // Food System Events
    HARVEST_START: 'harvest:start',
    HARVEST_SUCCESS: 'harvest:success',
    HARVEST_FAILURE: 'harvest:failure',
    COOKING_START: 'cooking:start',
    COOKING_COMPLETE: 'cooking:complete',
    FOOD_CONSUMED: 'food:consumed',
    
    // Monster Events
    MONSTER_SPAWN: 'monster:spawn',
    MONSTER_DEATH: 'monster:death',
    MONSTER_MOVE: 'monster:move',
    MONSTER_ALERT: 'monster:alert',
    MONSTER_ABILITY: 'monster:ability',
    
    // Dungeon Events
    LEVEL_ENTER: 'level:enter',
    LEVEL_EXIT: 'level:exit',
    LEVEL_GENERATE: 'level:generate',
    DOOR_OPEN: 'door:open',
    DOOR_CLOSE: 'door:close',
    TRAP_TRIGGERED: 'trap:triggered',
    SECRET_FOUND: 'secret:found',
    
    // Container/Lockpicking Events
    CONTAINER_OPEN: 'container:open',
    CONTAINER_LOCKED: 'container:locked',
    LOCKPICK_START: 'lockpick:start',
    LOCKPICK_SUCCESS: 'lockpick:success',
    LOCKPICK_FAILURE: 'lockpick:failure',
    
    // Magic Events
    SPELL_CAST: 'spell:cast',
    SPELL_LEARNED: 'spell:learned',
    SPELL_FORGOTTEN: 'spell:forgotten',
    SCROLL_READ: 'scroll:read',
    BOOK_READ: 'book:read',
    WAND_USE: 'wand:use',
    
    // UI Events
    UI_UPDATE: 'ui:update',
    UI_MESSAGE: 'ui:message',
    UI_MODAL_OPEN: 'ui:modal:open',
    UI_MODAL_CLOSE: 'ui:modal:close',
    UI_MENU_OPEN: 'ui:menu:open',
    UI_MENU_CLOSE: 'ui:menu:close',
    
    // General Message Event
    MESSAGE: 'message',
    
    // Ground Interaction Events
    GROUND_ACTION: 'ground:action',
    GROUND_EXAMINE: 'ground:examine',
    
    // Equipment Events
    ARMOR_EQUIPPED: 'armor:equipped',
    WEAPON_EQUIPPED: 'weapon:equipped',
    ACCESSORY_EQUIPPED: 'accessory:equipped',
    
    // Knowledge Events
    RECIPE_LEARNED: 'recipe:learned',
    MONSTER_IDENTIFIED: 'monster:identified',
    
    // Turn Events
    TURN_START: 'turn:start',
    TURN_END: 'turn:end',
    TURN_PROCESS: 'turn:process'
};

// Event categories for filtering/debugging
export const EVENT_CATEGORIES = {
    GAME: ['game:start', 'game:pause', 'game:resume', 'game:over', 'game:victory', 'game:save', 'game:load'],
    PLAYER: ['player:move', 'player:action', 'player:damage', 'player:heal', 'player:death', 'player:levelup',
             'player:stat_change', 'player:sp_change', 'player:hp_change', 'player:mp_change', 'player:starving'],
    COMBAT: ['combat:start', 'combat:end', 'combat:turn', 'attack:hit', 'attack:miss', 'attack:critical', 'saving_throw'],
    QUIZ: ['quiz:start', 'quiz:question', 'quiz:answer', 'quiz:complete', 'quiz:timeout', 'quiz:cancel'],
    INVENTORY: ['inventory:change', 'inventory:use', 'inventory:drop', 'inventory:pickup', 
                'item:equipped', 'item:unequipped', 'item:identified', 'item:removed'],
    FOOD: ['harvest:start', 'harvest:success', 'harvest:failure', 'cooking:start', 'cooking:complete', 'food:consumed'],
    MONSTER: ['monster:spawn', 'monster:death', 'monster:move', 'monster:alert', 'monster:ability'],
    DUNGEON: ['level:enter', 'level:exit', 'level:generate', 'door:open', 'door:close', 'trap:triggered', 'secret:found'],
    UI: ['ui:update', 'ui:message', 'ui:modal:open', 'ui:modal:close', 'ui:menu:open', 'ui:menu:close', 'message']
};

// Debug helper to log events
export function enableEventLogging(categories = null) {
    const originalEmit = eventBus.emit.bind(eventBus);
    
    eventBus.emit = function(event, data) {
        // Check if we should log this event
        if (!categories || categories.some(cat => EVENT_CATEGORIES[cat]?.includes(event))) {
            console.log(`🔔 Event: ${event}`, data);
        }
        originalEmit(event, data);
    };
}

// Disable event logging
export function disableEventLogging() {
    const originalEmit = EventBus.prototype.emit;
    eventBus.emit = originalEmit.bind(eventBus);
}