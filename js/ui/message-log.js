/**
 * message-log.js - Game message display and history system
 * Handles message formatting, combining, and display
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class MessageLog {
    constructor(elementId = 'messages') {
        this.element = document.getElementById(elementId);
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
     * Add a message to the log
     * @param {string} text - Message text
     * @param {string} type - Message type for coloring
     * @param {Object} options - Additional options
     */
    add(text, type = 'action', options = {}) {
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
     * @param {Object} message - Message object
     * @returns {string} HTML formatted message
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
     * Show message history in a modal
     */
    showHistory() {
        // Create modal backdrop
        const historyModal = document.createElement('div');
        historyModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        // Create content area
        const content = document.createElement('div');
        content.style.cssText = `
            background: #000;
            border: 2px solid #888;
            width: 80%;
            height: 80%;
            padding: 20px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 14px;
            color: #fff;
        `;
        
        // Add close button
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = 'Press ESC or click here to close';
        closeBtn.style.cssText = `
            color: #888;
            cursor: pointer;
            margin-bottom: 10px;
            text-align: right;
        `;
        closeBtn.onclick = () => historyModal.remove();
        content.appendChild(closeBtn);
        
        // Add all messages
        const messageContainer = document.createElement('div');
        messageContainer.innerHTML = this.messages.map(msg => this.formatMessage(msg)).join('');
        content.appendChild(messageContainer);
        
        historyModal.appendChild(content);
        document.body.appendChild(historyModal);
        
        // ESC to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                historyModal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
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
        // UI Messages
        EventBus.on(EVENTS.UI_MESSAGE, (text, type) => {
            this.add(text, type);
        });
        
        // Combat messages
        EventBus.on(EVENTS.PLAYER_DAMAGED, (data) => {
            const source = data.source === 'exhaustion' ? 
                'exhaustion' : `the ${data.source}`;
            this.add(`You take ${data.damage} damage from ${source}!`, 'danger');
        });
        
        EventBus.on(EVENTS.MONSTER_DIED, (data) => {
            this.add(`The ${data.monster.name} dies!`, 'combat');
        });
        
        // Movement messages
        EventBus.on(EVENTS.PLAYER_MOVE, (data) => {
            if (data.blocked) {
                this.add('You cannot move there.', 'warning');
            }
        });
        
        // Item messages
        EventBus.on(EVENTS.ITEM_PICKUP, (data) => {
            this.add(`You pick up ${data.item.getDisplayName()}.`, 'item');
        });
        
        EventBus.on(EVENTS.ITEM_DROP, (data) => {
            this.add(`You drop ${data.item.getDisplayName()}.`, 'item');
        });
        
        EventBus.on(EVENTS.ITEM_EQUIP, (data) => {
            this.add(`You equip ${data.item.getDisplayName()}.`, 'item');
        });
        
        EventBus.on(EVENTS.ITEM_UNEQUIP, (data) => {
            this.add(`You unequip ${data.item.getDisplayName()}.`, 'item');
        });
        
        EventBus.on(EVENTS.ITEM_IDENTIFIED, (data) => {
            this.add(`${data.item.commonName} is ${data.item.trueName}!`, 'discovery');
        });
        
        // Quiz messages
        EventBus.on(EVENTS.QUIZ_START, (data) => {
            this.add(`Quiz started: ${data.subject}`, 'magic');
        });
        
        EventBus.on(EVENTS.QUIZ_CORRECT, (data) => {
            this.add('Correct! Your knowledge guides you.', 'success');
        });
        
        EventBus.on(EVENTS.QUIZ_WRONG, (data) => {
            this.add('Incorrect. You stumble in your ignorance.', 'danger');
        });
        
        EventBus.on(EVENTS.QUIZ_TIMEOUT, (data) => {
            this.add('Time runs out! You fail to act.', 'warning');
        });
        
        // Discovery messages
        EventBus.on(EVENTS.DUNGEON_SECRET_FOUND, (data) => {
            this.add(`You discover ${data.secret}!`, 'discovery');
        });
        
        // System messages
        EventBus.on(EVENTS.GAME_START, () => {
            this.add('Your quest begins! Seek the Philosopher\'s Stone!', 'system');
        });
        
        EventBus.on(EVENTS.GAME_WIN, () => {
            this.add('Victory! You have found the Philosopher\'s Stone!', 'success');
        });
        
        EventBus.on(EVENTS.GAME_OVER, () => {
            this.add('Game Over. Your quest has ended.', 'danger');
        });
        
        EventBus.on(EVENTS.SAVE_GAME, () => {
            this.add('Game saved.', 'system');
        });
        
        EventBus.on(EVENTS.LOAD_GAME, () => {
            this.add('Game loaded.', 'system');
        });
        
        EventBus.on(EVENTS.DEBUG_MESSAGE, (text) => {
            if (CONFIG.DEBUG_MODE) {
                this.add(`[DEBUG] ${text}`, 'system');
            }
        });
    }
    
    /**
     * Get message history as text
     * @returns {string} Plain text message history
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
