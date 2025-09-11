/**
 * event-bus.js - Fixed with loop prevention and undefined handling
 * All event names now come from CONFIG.EVENTS for consistency
 */

import { CONFIG } from '../config.js';

class EventBusClass {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistory = 100;
        this.activeEvents = new Set(); // Track currently processing events to prevent loops
        this.maxRecursionDepth = 10; // Maximum depth for nested events
        this.eventDepth = 0; // Current recursion depth
    }
    
    /**
     * Register an event listener
     * @param {string} eventName - Event name from CONFIG.EVENTS
     * @param {Function} callback - Event handler function
     */
    on(eventName, callback) {
        // Validate event name
        if (!eventName || typeof eventName !== 'string') {
            console.warn('EventBus.on: Invalid event name:', eventName);
            return;
        }
        
        if (!callback || typeof callback !== 'function') {
            console.warn('EventBus.on: Invalid callback for event:', eventName);
            return;
        }
        
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(eventName, callback) {
        if (!eventName || typeof eventName !== 'string') {
            return;
        }
        
        if (this.listeners.has(eventName)) {
            if (callback) {
                const callbacks = this.listeners.get(eventName);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            } else {
                // If no callback specified, remove all listeners for this event
                this.listeners.delete(eventName);
            }
        }
    }
    
    /**
     * Emit an event to all listeners
     * @param {string} eventName - Event name from CONFIG.EVENTS
     * @param {*} data - Event data
     */
    emit(eventName, data = null) {
        // Validate event name
        if (!eventName || typeof eventName !== 'string') {
            console.warn('EventBus.emit: Invalid event name:', eventName);
            return;
        }
        
        // Check for infinite loop
        if (this.activeEvents.has(eventName)) {
            console.warn(`EventBus: Preventing infinite loop for event "${eventName}"`);
            return;
        }
        
        // Check recursion depth
        if (this.eventDepth >= this.maxRecursionDepth) {
            console.warn(`EventBus: Maximum recursion depth reached (${this.maxRecursionDepth})`);
            return;
        }
        
        // Add to history for debugging
        this.eventHistory.push({
            event: eventName,
            data: data,
            timestamp: Date.now()
        });
        
        // Trim history if too long
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
        
        // Mark this event as active to prevent loops
        this.activeEvents.add(eventName);
        this.eventDepth++;
        
        try {
            // Call all listeners
            if (this.listeners.has(eventName)) {
                const callbacks = [...this.listeners.get(eventName)]; // Copy array to avoid modification during iteration
                callbacks.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for "${eventName}":`, error);
                        // Don't let one bad listener break all others
                    }
                });
            }
            
            // Debug logging if enabled (but not for very frequent events)
            if (CONFIG.DEBUG_MODE && !this.isFrequentEvent(eventName)) {
                console.log(`🔔 Event: ${eventName}`, data);
            }
        } finally {
            // Always clean up, even if there's an error
            this.activeEvents.delete(eventName);
            this.eventDepth--;
        }
    }
    
    /**
     * Check if an event is fired frequently (to avoid log spam)
     */
    isFrequentEvent(eventName) {
        const frequentEvents = [
            'PLAYER_MOVED',
            'UI_UPDATE_STATS',
            'RENDERER_FRAME',
            'GAME_TICK'
        ];
        return frequentEvents.includes(eventName);
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.listeners.delete(eventName);
        } else {
            // Clear all if no event name specified
            this.listeners.clear();
        }
    }
    
    /**
     * Clear all listeners and reset state
     */
    clear() {
        this.listeners.clear();
        this.eventHistory = [];
        this.activeEvents.clear();
        this.eventDepth = 0;
    }
    
    /**
     * Get event history for debugging
     * @returns {Array} Recent events
     */
    getHistory() {
        return [...this.eventHistory];
    }
    
    /**
     * Get all registered event names
     * @returns {Array} Event names
     */
    getRegisteredEvents() {
        return Array.from(this.listeners.keys());
    }
    
    /**
     * Get listener count for an event
     */
    getListenerCount(eventName) {
        if (!this.listeners.has(eventName)) {
            return 0;
        }
        return this.listeners.get(eventName).length;
    }
    
    /**
     * Debug: List all listeners
     */
    debug() {
        console.group('EventBus Debug Info');
        console.log('Registered Events:', this.getRegisteredEvents());
        console.log('Active Events:', Array.from(this.activeEvents));
        console.log('Event Depth:', this.eventDepth);
        console.log('Listener Counts:');
        this.listeners.forEach((callbacks, eventName) => {
            console.log(`  ${eventName}: ${callbacks.length} listeners`);
        });
        console.log('Recent History:', this.eventHistory.slice(-10));
        console.groupEnd();
    }
}

// Create singleton instance
export const EventBus = new EventBusClass();

// Export standardized event constants from CONFIG
// This ensures all modules use the same event names
export const EVENTS = CONFIG.EVENTS || {};

// Add emergency kill switch for debugging
if (typeof window !== 'undefined') {
    window.EventBusDebug = EventBus;
}