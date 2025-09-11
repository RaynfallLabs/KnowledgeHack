/**
 * message-log.js - Fixed version without problematic event listeners
 * Handles message formatting, combining, and display
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class MessageLog {
    constructor(elementId = 'message-log') {
        this.element = document.getElementById(elementId);
        if (!this.element) {
            console.warn(`MessageLog: Element with id '${elementId}' not found, creating it`);
            // Try to find or create the element
            this.element = this.createMessageLogElement(elementId);
        }
        
        this.messages = []; // Full history (up to 250)
        this.maxHistory = 250;
        this.displayCount = CONFIG.MAX_MESSAGES || 50;
        
        // Message type colors
        this.messageColors = {
            success: '#00ff00',  // Green
            danger: '#ff0000',   // Red
            warning: '#ffff00',  // Yellow
            info: '#00ffff',     // Cyan
            action: '#ffffff',   // White
            combat: '#ff8800',   // Orange
            magic: '#ff00ff',    // Magenta
            item: '#0088ff',     // Light blue
            discovery: '#ffff88', // Light yellow
            system: '#808080'    // Gray
        };
        
        // For combining repeated messages
        this.lastMessage = null;
        this.repeatCount = 1;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial message
        this.add('Welcome to Philosopher\'s Quest!', 'system');
    }
    
    /**
     * Create message log element if it doesn't exist
     */
    createMessageLogElement(elementId) {
        let element = document.getElementById(elementId);
        if (!element) {
            // Try to find game-messages div
            element = document.getElementById('game-messages');
            if (!element) {
                // Create a default element
                element = document.createElement('div');
                element.id = elementId;
                element.style.cssText = `
                    font-family: monospace;
                    color: #00ff00;
                    background: #000;
                    padding: 10px;
                    height: 100px;
                    overflow-y: auto;
                `;
                // Try to append to body or game container
                const gameContainer = document.getElementById('game-container') || document.body;
                gameContainer.appendChild(element);
            }
        }
        return element;
    }
    
    /**
     * Add a message to the log
     */
    add(text, type = 'action', options = {}) {
        if (!text) return; // Don't add empty messages
        
        // Check for repeated messages
        if (this.lastMessage && this.lastMessage.text === text && 
            this.lastMessage.type === type && !options.noRepeat) {
            this.repeatCount++;
            this.updateLastMessage();
            return;
        }
        
        // Create new message
        const message = {
            text,
            type,
            timestamp: Date.now(),
            turn: options.turn || null,
            count: 1
        };
        
        // Add to history
        this.messages.push(message);
        this.lastMessage = message;
        this.repeatCount = 1;
        
        // Trim history if too long
        if (this.messages.length > this.maxHistory) {
            this.messages.shift();
        }
        
        // Update display
        this.render();
    }
    
    /**
     * Update the last message with repeat count
     */
    updateLastMessage() {
        if (this.lastMessage) {
            this.lastMessage.count = this.repeatCount;
            this.render();
        }
    }
    
    /**
     * Format a message with colors and highlights
     */
    formatMessage(message) {
        let text = message.text;
        
        // Highlight damage numbers
        text = text.replace(/\b(\d+)\s+damage\b/gi, '<strong>$1</strong> damage');
        
        // Highlight HP/SP/MP changes
        text = text.replace(/\b(HP|SP|MP):\s*(\d+)/gi, '<strong>$1: $2</strong>');
        
        // Highlight item names (in quotes)
        text = text.replace(/"([^"]+)"/g, '<em>"$1"</em>');
        
        // Get color for message type
        const color = this.messageColors[message.type] || this.messageColors.action;
        
        // Add repeat count if applicable
        const repeatText = message.count > 1 ? ` <span style="color: #888;">(x${message.count})</span>` : '';
        
        return `<div style="color: ${color};">${text}${repeatText}</div>`;
    }
    
    /**
     * Render messages to the display
     */
    render() {
        if (!this.element) return;
        
        // Get recent messages for display
        const displayMessages = this.messages.slice(-this.displayCount);
        
        // Format and join messages
        const html = displayMessages.map(msg => this.formatMessage(msg)).join('');
        
        // Update element
        this.element.innerHTML = html;
        
        // Auto-scroll to bottom
        this.element.scrollTop = this.element.scrollHeight;
    }
    
    /**
     * Clear all messages
     */
    clear() {
        this.messages = [];
        this.lastMessage = null;
        this.repeatCount = 1;
        this.render();
    }
    
    /**
     * Setup event listeners for game events
     */
    setupEventListeners() {
        // Combat messages
        EventBus.on(EVENTS.PLAYER_DAMAGED, (data) => {
            if (data && data.damage) {
                const source = data.source === 'exhaustion' ? 
                    'exhaustion' : data.source ? `the ${data.source}` : 'something';
                this.add(`You take ${data.damage} damage from ${source}!`, 'danger');
            }
        });
        
        EventBus.on(EVENTS.MONSTER_DEATH, (data) => {
            if (data && data.monster && data.monster.name) {
                this.add(`The ${data.monster.name} dies!`, 'combat');
            }
        });
        
        // Movement messages
        EventBus.on(EVENTS.PLAYER_MOVED, (data) => {
            // Only show message if there's something special about the move
            if (data && data.blocked) {
                this.add('You cannot move there.', 'warning');
            }
        });
        
        // Item messages - Only listen for actual gameplay item events
        EventBus.on(EVENTS.ITEM_PICKED_UP, (data) => {
            if (data && data.item) {
                const itemName = data.item.name || data.item.id || 'something';
                this.add(`You pick up ${itemName}.`, 'item');
            }
        });
        
        EventBus.on(EVENTS.ITEM_DROPPED, (data) => {
            if (data && data.item) {
                const itemName = data.item.name || data.item.id || 'something';
                this.add(`You drop ${itemName}.`, 'item');
            }
        });
        
        EventBus.on(EVENTS.ITEM_EQUIPPED, (data) => {
            if (data && data.item) {
                const itemName = data.item.name || data.item.id || 'something';
                this.add(`You equip ${itemName}.`, 'item');
            }
        });
        
        EventBus.on(EVENTS.ITEM_IDENTIFIED, (data) => {
            if (data && data.item) {
                this.add(`Item identified!`, 'discovery');
            }
        });
        
        // Quiz messages
        EventBus.on(EVENTS.QUIZ_START, (data) => {
            if (data && data.subject) {
                this.add(`Quiz started: ${data.subject}`, 'magic');
            }
        });
        
        EventBus.on(EVENTS.QUIZ_COMPLETE, (data) => {
            if (data) {
                if (data.success) {
                    this.add('Quiz completed successfully!', 'success');
                } else {
                    this.add('Quiz failed. Try again!', 'warning');
                }
            }
        });
        
        // System messages
        EventBus.on(EVENTS.GAME_START, () => {
            this.add('Your quest begins! Seek the Philosopher\'s Stone!', 'system');
        });
        
        EventBus.on(EVENTS.GAME_OVER, (data) => {
            if (data && data.victory) {
                this.add('Victory! You have found the Philosopher\'s Stone!', 'success');
            } else {
                this.add('Game Over. Your quest has ended.', 'danger');
            }
        });
        
        EventBus.on(EVENTS.SAVE_GAME, () => {
            this.add('Game saved.', 'system');
        });
        
        EventBus.on(EVENTS.LOAD_GAME, () => {
            this.add('Game loaded.', 'system');
        });
        
        // Data loading messages (just for debugging)
        EventBus.on(EVENTS.DATA_LOADED, (data) => {
            if (CONFIG.DEBUG_MODE) {
                this.add(`[DEBUG] ${data.type} data loaded`, 'system');
            }
        });
    }
    
    /**
     * Get message history as text
     */
    getHistoryText() {
        return this.messages
            .map(msg => {
                const count = msg.count > 1 ? ` (x${msg.count})` : '';
                return msg.text + count;
            })
            .join('\n');
    }
}