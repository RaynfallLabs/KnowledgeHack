/**
 * event-bus.js - Centralized event system with standardized event names
 * All event names now come from CONFIG.EVENTS for consistency
 */

import { CONFIG } from '../config.js';

class EventBusClass {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistory = 100;
    }
    
    /**
     * Register an event listener
     * @param {string} eventName - Event name from CONFIG.EVENTS
     * @param {Function} callback - Event handler function
     */
    on(eventName, callback) {
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
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit an event to all listeners
     * @param {string} eventName - Event name from CONFIG.EVENTS
     * @param {*} data - Event data
     */
    emit(eventName, data = null) {
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
        
        // Call all listeners
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
        
        // Debug logging if enabled
        if (CONFIG.DEBUG_MODE) {
            console.log(`🔔 Event: ${eventName}`, data);
        }
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        this.listeners.delete(eventName);
    }
    
    /**
     * Clear all listeners
     */
    clear() {
        this.listeners.clear();
        this.eventHistory = [];
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
}

// Create singleton instance
export const EventBus = new EventBusClass();

// Export standardized event constants from CONFIG
// This ensures all modules use the same event names
export const EVENTS = CONFIG.EVENTS;
