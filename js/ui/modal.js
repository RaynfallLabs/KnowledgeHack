/**
 * modal.js - Modal dialog and menu system
 * Handles popups, menus, inventory screens, and other UI overlays
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { CONFIG, COLORS } from '../config.js';

/**
 * Modal types
 */
export const MODAL_TYPES = {
    MENU: 'menu',
    INVENTORY: 'inventory',
    EQUIPMENT: 'equipment',
    STATS: 'stats',
    HELP: 'help',
    QUIZ: 'quiz',
    SHOP: 'shop',
    CONTAINER: 'container',
    SPELLBOOK: 'spellbook',
    CONFIRM: 'confirm',
    MESSAGE: 'message',
    DEATH: 'death',
    VICTORY: 'victory',
    SETTINGS: 'settings'
};

/**
 * Modal class for UI overlays
 */
export class Modal {
    constructor(type, options = {}) {
        this.type = type;
        this.title = options.title || this.getDefaultTitle();
        this.content = options.content || '';
        this.items = options.items || [];
        this.callback = options.callback || null;
        this.cancelable = options.cancelable !== false;
        
        // Visual properties
        this.x = options.x || null;
        this.y = options.y || null;
        this.width = options.width || this.getDefaultWidth();
        this.height = options.height || this.getDefaultHeight();
        this.centered = options.centered !== false;
        
        // State
        this.visible = false;
        this.selectedIndex = 0;
        this.scrollOffset = 0;
        this.maxVisibleItems = 10;
        
        // Elements
        this.element = null;
        this.contentElement = null;
        this.itemsElement = null;
        
        this.create();
    }
    
    /**
     * Get default title based on type
     */
    getDefaultTitle() {
        const titles = {
            [MODAL_TYPES.MENU]: 'Main Menu',
            [MODAL_TYPES.INVENTORY]: 'Inventory',
            [MODAL_TYPES.EQUIPMENT]: 'Equipment',
            [MODAL_TYPES.STATS]: 'Character Stats',
            [MODAL_TYPES.HELP]: 'Help',
            [MODAL_TYPES.QUIZ]: 'Knowledge Challenge',
            [MODAL_TYPES.SHOP]: 'Shop',
            [MODAL_TYPES.CONTAINER]: 'Container',
            [MODAL_TYPES.SPELLBOOK]: 'Spellbook',
            [MODAL_TYPES.CONFIRM]: 'Confirm',
            [MODAL_TYPES.MESSAGE]: 'Message',
            [MODAL_TYPES.DEATH]: 'You Have Died',
            [MODAL_TYPES.VICTORY]: 'Victory!',
            [MODAL_TYPES.SETTINGS]: 'Settings'
        };
        
        return titles[this.type] || 'Modal';
    }
    
    /**
     * Get default width based on type
     */
    getDefaultWidth() {
        const widths = {
            [MODAL_TYPES.MENU]: 300,
            [MODAL_TYPES.INVENTORY]: 500,
            [MODAL_TYPES.EQUIPMENT]: 400,
            [MODAL_TYPES.STATS]: 350,
            [MODAL_TYPES.HELP]: 600,
            [MODAL_TYPES.QUIZ]: 500,
            [MODAL_TYPES.SHOP]: 550,
            [MODAL_TYPES.CONTAINER]: 450,
            [MODAL_TYPES.SPELLBOOK]: 400,
            [MODAL_TYPES.CONFIRM]: 300,
            [MODAL_TYPES.MESSAGE]: 350,
            [MODAL_TYPES.DEATH]: 400,
            [MODAL_TYPES.VICTORY]: 400,
            [MODAL_TYPES.SETTINGS]: 400
        };
        
        return widths[this.type] || 400;
    }
    
    /**
     * Get default height based on type
     */
    getDefaultHeight() {
        const heights = {
            [MODAL_TYPES.MENU]: 400,
            [MODAL_TYPES.INVENTORY]: 400,
            [MODAL_TYPES.EQUIPMENT]: 350,
            [MODAL_TYPES.STATS]: 400,
            [MODAL_TYPES.HELP]: 500,
            [MODAL_TYPES.QUIZ]: 300,
            [MODAL_TYPES.SHOP]: 400,
            [MODAL_TYPES.CONTAINER]: 350,
            [MODAL_TYPES.SPELLBOOK]: 400,
            [MODAL_TYPES.CONFIRM]: 150,
            [MODAL_TYPES.MESSAGE]: 200,
            [MODAL_TYPES.DEATH]: 300,
            [MODAL_TYPES.VICTORY]: 300,
            [MODAL_TYPES.SETTINGS]: 350
        };
        
        return heights[this.type] || 300;
    }
    
    /**
     * Create the modal DOM element
     */
    create() {
        // Create modal container
        this.element = document.createElement('div');
        this.element.className = 'modal';
        this.element.setAttribute('data-type', this.type);
        
        // Apply styles
        this.applyStyles();
        
        // Create header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h2>${this.title}</h2>
            ${this.cancelable ? '<button class="modal-close">&times;</button>' : ''}
        `;
        this.element.appendChild(header);
        
        // Create content area
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'modal-content';
        this.element.appendChild(this.contentElement);
        
        // Populate content based on type
        this.populateContent();
        
        // Create footer if needed
        if (this.needsFooter()) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            this.populateFooter(footer);
            this.element.appendChild(footer);
        }
        
        // Add event listeners
        this.attachEventListeners();
    }
    
    /**
     * Apply styles to modal
     */
    applyStyles() {
        const styles = {
            position: 'fixed',
            width: `${this.width}px`,
            height: `${this.height}px`,
            backgroundColor: '#1a1a1a',
            border: '2px solid #444',
            borderRadius: '8px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '14px',
            zIndex: '1000',
            display: 'none',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
        };
        
        // Position modal
        if (this.centered) {
            styles.left = '50%';
            styles.top = '50%';
            styles.transform = 'translate(-50%, -50%)';
        } else if (this.x !== null && this.y !== null) {
            styles.left = `${this.x}px`;
            styles.top = `${this.y}px`;
        }
        
        // Apply styles
        Object.assign(this.element.style, styles);
    }
    
    /**
     * Populate content based on modal type
     */
    populateContent() {
        switch(this.type) {
            case MODAL_TYPES.MENU:
                this.populateMenu();
                break;
                
            case MODAL_TYPES.INVENTORY:
                this.populateInventory();
                break;
                
            case MODAL_TYPES.EQUIPMENT:
                this.populateEquipment();
                break;
                
            case MODAL_TYPES.STATS:
                this.populateStats();
                break;
                
            case MODAL_TYPES.HELP:
                this.populateHelp();
                break;
                
            case MODAL_TYPES.QUIZ:
                this.populateQuiz();
                break;
                
            case MODAL_TYPES.SHOP:
                this.populateShop();
                break;
                
            case MODAL_TYPES.CONTAINER:
                this.populateContainer();
                break;
                
            case MODAL_TYPES.SPELLBOOK:
                this.populateSpellbook();
                break;
                
            case MODAL_TYPES.CONFIRM:
                this.populateConfirm();
                break;
                
            case MODAL_TYPES.MESSAGE:
                this.populateMessage();
                break;
                
            case MODAL_TYPES.DEATH:
                this.populateDeath();
                break;
                
            case MODAL_TYPES.VICTORY:
                this.populateVictory();
                break;
                
            case MODAL_TYPES.SETTINGS:
                this.populateSettings();
                break;
                
            default:
                this.contentElement.innerHTML = this.content;
        }
    }
    
    /**
     * Populate main menu
     */
    populateMenu() {
        const menuItems = [
            { label: 'Resume Game', action: 'resume' },
            { label: 'New Game', action: 'new' },
            { label: 'Save Game', action: 'save' },
            { label: 'Load Game', action: 'load' },
            { label: 'Settings', action: 'settings' },
            { label: 'Help', action: 'help' },
            { label: 'Quit', action: 'quit' }
        ];
        
        this.createItemList(menuItems);
    }
    
    /**
     * Populate inventory display
     */
    populateInventory() {
        if (this.items.length === 0) {
            this.contentElement.innerHTML = '<p>Your inventory is empty.</p>';
            return;
        }
        
        const categories = this.categorizeItems(this.items);
        let html = '';
        
        for (const [category, items] of Object.entries(categories)) {
            html += `<div class="inventory-category">`;
            html += `<h3>${category}</h3>`;
            html += '<ul class="inventory-list">';
            
            for (const item of items) {
                const equipped = item.equipped ? ' (equipped)' : '';
                const identified = item.identified === false ? ' (unidentified)' : '';
                html += `<li data-item-id="${item.id}">`;
                html += `<span class="item-symbol" style="color: ${item.color}">${item.symbol}</span> `;
                html += `<span class="item-name">${item.name}${equipped}${identified}</span>`;
                if (item.quantity > 1) {
                    html += ` <span class="item-quantity">(${item.quantity})</span>`;
                }
                html += '</li>';
            }
            
            html += '</ul>';
            html += '</div>';
        }
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Categorize items for display
     */
    categorizeItems(items) {
        const categories = {
            'Weapons': [],
            'Armor': [],
            'Potions': [],
            'Scrolls': [],
            'Wands': [],
            'Books': [],
            'Food': [],
            'Tools': [],
            'Other': []
        };
        
        for (const item of items) {
            let category = 'Other';
            
            if (item.type === 'weapon') category = 'Weapons';
            else if (item.type === 'armor') category = 'Armor';
            else if (item.type === 'potion') category = 'Potions';
            else if (item.type === 'scroll') category = 'Scrolls';
            else if (item.type === 'wand') category = 'Wands';
            else if (item.type === 'book') category = 'Books';
            else if (item.type === 'food') category = 'Food';
            else if (item.type === 'tool') category = 'Tools';
            
            categories[category].push(item);
        }
        
        // Remove empty categories
        for (const key of Object.keys(categories)) {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        }
        
        return categories;
    }
    
    /**
     * Populate equipment display
     */
    populateEquipment() {
        const slots = [
            { slot: 'weapon', label: 'Weapon' },
            { slot: 'armor', label: 'Armor' },
            { slot: 'helmet', label: 'Helmet' },
            { slot: 'gloves', label: 'Gloves' },
            { slot: 'boots', label: 'Boots' },
            { slot: 'ring_left', label: 'Left Ring' },
            { slot: 'ring_right', label: 'Right Ring' },
            { slot: 'amulet', label: 'Amulet' }
        ];
        
        let html = '<div class="equipment-slots">';
        
        for (const { slot, label } of slots) {
            const equipped = this.items.find(item => item.slot === slot);
            html += `<div class="equipment-slot" data-slot="${slot}">`;
            html += `<span class="slot-label">${label}:</span> `;
            
            if (equipped) {
                html += `<span class="equipped-item" style="color: ${equipped.color}">`;
                html += `${equipped.symbol} ${equipped.name}`;
                html += '</span>';
            } else {
                html += '<span class="empty-slot">(empty)</span>';
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate character stats
     */
    populateStats() {
        const stats = this.content; // Expecting stats object
        
        let html = '<div class="character-stats">';
        html += `<div class="stat-row"><span>Level:</span> <span>${stats.level}</span></div>`;
        html += `<div class="stat-row"><span>HP:</span> <span>${stats.hp}/${stats.maxHp}</span></div>`;
        html += `<div class="stat-row"><span>Wisdom:</span> <span>${stats.wisdom}</span></div>`;
        html += `<div class="stat-row"><span>Knowledge:</span> <span>${stats.knowledge}</span></div>`;
        html += `<div class="stat-row"><span>Experience:</span> <span>${stats.experience}</span></div>`;
        html += '<hr>';
        html += `<div class="stat-row"><span>Strength:</span> <span>${stats.strength}</span></div>`;
        html += `<div class="stat-row"><span>Dexterity:</span> <span>${stats.dexterity}</span></div>`;
        html += `<div class="stat-row"><span>Constitution:</span> <span>${stats.constitution}</span></div>`;
        html += `<div class="stat-row"><span>Intelligence:</span> <span>${stats.intelligence}</span></div>`;
        html += '<hr>';
        html += `<div class="stat-row"><span>AC:</span> <span>${stats.ac}</span></div>`;
        html += `<div class="stat-row"><span>Damage:</span> <span>${stats.damage}</span></div>`;
        html += `<div class="stat-row"><span>Speed:</span> <span>${stats.speed}</span></div>`;
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate help screen
     */
    populateHelp() {
        const helpText = `
            <div class="help-content">
                <h3>Controls</h3>
                <ul>
                    <li><kbd>Arrow Keys</kbd> or <kbd>WASD</kbd> - Move</li>
                    <li><kbd>g</kbd> - Get/Pick up item</li>
                    <li><kbd>i</kbd> - Inventory</li>
                    <li><kbd>e</kbd> - Equipment</li>
                    <li><kbd>d</kbd> - Drop item</li>
                    <li><kbd>u</kbd> - Use item</li>
                    <li><kbd>r</kbd> - Read scroll/book</li>
                    <li><kbd>q</kbd> - Quaff potion</li>
                    <li><kbd>z</kbd> - Zap wand</li>
                    <li><kbd>c</kbd> - Cast spell</li>
                    <li><kbd>o</kbd> - Open door</li>
                    <li><kbd>s</kbd> - Search</li>
                    <li><kbd>&lt;</kbd> - Go up stairs</li>
                    <li><kbd>&gt;</kbd> - Go down stairs</li>
                    <li><kbd>?</kbd> - Help</li>
                    <li><kbd>ESC</kbd> - Menu</li>
                </ul>
                
                <h3>Game Mechanics</h3>
                <p>Answer trivia questions to power your actions!</p>
                <ul>
                    <li>Combat damage - Math questions</li>
                    <li>Item identification - Philosophy questions</li>
                    <li>Spell casting - Science questions</li>
                    <li>Equipment - Geography/History questions</li>
                    <li>Special abilities - Various subjects</li>
                </ul>
            </div>
        `;
        
        this.contentElement.innerHTML = helpText;
    }
    
    /**
     * Populate quiz modal
     */
    populateQuiz() {
        const quiz = this.content; // Expecting quiz object
        
        let html = '<div class="quiz-content">';
        html += `<p class="quiz-question">${quiz.question}</p>`;
        html += '<div class="quiz-answers">';
        
        quiz.answers.forEach((answer, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            html += `<button class="quiz-answer" data-index="${index}">`;
            html += `<span class="answer-letter">${letter}.</span> ${answer}`;
            html += '</button>';
        });
        
        html += '</div>';
        
        if (quiz.hint) {
            html += `<p class="quiz-hint">Hint: ${quiz.hint}</p>`;
        }
        
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate shop interface
     */
    populateShop() {
        const shopItems = this.items;
        const playerGold = this.content.gold || 0;
        
        let html = '<div class="shop-content">';
        html += `<p class="player-gold">Your gold: ${playerGold}</p>`;
        html += '<div class="shop-items">';
        
        if (shopItems.length === 0) {
            html += '<p>The shop is empty.</p>';
        } else {
            html += '<ul class="shop-list">';
            
            for (const item of shopItems) {
                const affordable = playerGold >= item.price ? '' : ' disabled';
                html += `<li class="shop-item${affordable}" data-item-id="${item.id}">`;
                html += `<span class="item-symbol" style="color: ${item.color}">${item.symbol}</span> `;
                html += `<span class="item-name">${item.name}</span>`;
                html += `<span class="item-price">${item.price} gold</span>`;
                html += '</li>';
            }
            
            html += '</ul>';
        }
        
        html += '</div>';
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate container interface
     */
    populateContainer() {
        const containerItems = this.items;
        
        let html = '<div class="container-content">';
        
        if (containerItems.length === 0) {
            html += '<p>The container is empty.</p>';
        } else {
            html += '<p>Container contents:</p>';
            html += '<ul class="container-list">';
            
            for (const item of containerItems) {
                html += `<li class="container-item" data-item-id="${item.id}">`;
                html += `<span class="item-symbol" style="color: ${item.color}">${item.symbol}</span> `;
                html += `<span class="item-name">${item.name}</span>`;
                if (item.quantity > 1) {
                    html += ` <span class="item-quantity">(${item.quantity})</span>`;
                }
                html += '</li>';
            }
            
            html += '</ul>';
            html += '<p>Press Space to take all, or click items to take individually.</p>';
        }
        
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate spellbook
     */
    populateSpellbook() {
        const spells = this.items;
        
        let html = '<div class="spellbook-content">';
        
        if (spells.length === 0) {
            html += '<p>You know no spells.</p>';
        } else {
            html += '<ul class="spell-list">';
            
            for (const spell of spells) {
                const canCast = spell.manaCost <= this.content.currentMana;
                const className = canCast ? 'spell-available' : 'spell-unavailable';
                
                html += `<li class="${className}" data-spell-id="${spell.id}">`;
                html += `<span class="spell-name">${spell.name}</span>`;
                html += `<span class="spell-cost">${spell.manaCost} MP</span>`;
                html += `<div class="spell-description">${spell.description}</div>`;
                html += '</li>';
            }
            
            html += '</ul>';
        }
        
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate confirm dialog
     */
    populateConfirm() {
        let html = '<div class="confirm-content">';
        html += `<p>${this.content}</p>`;
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate message dialog
     */
    populateMessage() {
        let html = '<div class="message-content">';
        html += `<p>${this.content}</p>`;
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate death screen
     */
    populateDeath() {
        const deathInfo = this.content;
        
        let html = '<div class="death-content">';
        html += '<p class="death-message">You have died!</p>';
        
        if (deathInfo.cause) {
            html += `<p>Killed by: ${deathInfo.cause}</p>`;
        }
        
        html += `<p>Score: ${deathInfo.score || 0}</p>`;
        html += `<p>Dungeon Level: ${deathInfo.level || 1}</p>`;
        html += `<p>Turns Survived: ${deathInfo.turns || 0}</p>`;
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate victory screen
     */
    populateVictory() {
        const victoryInfo = this.content;
        
        let html = '<div class="victory-content">';
        html += '<p class="victory-message">Congratulations!</p>';
        html += '<p>You have retrieved the Philosopher\'s Stone!</p>';
        html += `<p>Final Score: ${victoryInfo.score || 0}</p>`;
        html += `<p>Turns Taken: ${victoryInfo.turns || 0}</p>`;
        html += `<p>Knowledge Gained: ${victoryInfo.knowledge || 0}</p>`;
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Populate settings screen
     */
    populateSettings() {
        const settings = this.content || {};
        
        let html = '<div class="settings-content">';
        html += '<div class="setting-item">';
        html += '<label>Sound: ';
        html += `<input type="checkbox" ${settings.sound ? 'checked' : ''} data-setting="sound">`;
        html += '</label>';
        html += '</div>';
        
        html += '<div class="setting-item">';
        html += '<label>Auto-pickup: ';
        html += `<input type="checkbox" ${settings.autoPickup ? 'checked' : ''} data-setting="autoPickup">`;
        html += '</label>';
        html += '</div>';
        
        html += '<div class="setting-item">';
        html += '<label>Confirm Quit: ';
        html += `<input type="checkbox" ${settings.confirmQuit ? 'checked' : ''} data-setting="confirmQuit">`;
        html += '</label>';
        html += '</div>';
        
        html += '<div class="setting-item">';
        html += '<label>Font Size: ';
        html += `<select data-setting="fontSize">`;
        html += `<option value="12" ${settings.fontSize === 12 ? 'selected' : ''}>Small</option>`;
        html += `<option value="14" ${settings.fontSize === 14 ? 'selected' : ''}>Medium</option>`;
        html += `<option value="16" ${settings.fontSize === 16 ? 'selected' : ''}>Large</option>`;
        html += '</select>';
        html += '</label>';
        html += '</div>';
        
        html += '</div>';
        
        this.contentElement.innerHTML = html;
    }
    
    /**
     * Check if modal needs footer
     */
    needsFooter() {
        return [
            MODAL_TYPES.CONFIRM,
            MODAL_TYPES.DEATH,
            MODAL_TYPES.VICTORY,
            MODAL_TYPES.SETTINGS
        ].includes(this.type);
    }
    
    /**
     * Populate footer
     */
    populateFooter(footer) {
        let html = '';
        
        switch(this.type) {
            case MODAL_TYPES.CONFIRM:
                html = `
                    <button class="btn-confirm">Yes</button>
                    <button class="btn-cancel">No</button>
                `;
                break;
                
            case MODAL_TYPES.DEATH:
            case MODAL_TYPES.VICTORY:
                html = `
                    <button class="btn-new-game">New Game</button>
                    <button class="btn-main-menu">Main Menu</button>
                `;
                break;
                
            case MODAL_TYPES.SETTINGS:
                html = `
                    <button class="btn-save">Save Settings</button>
                    <button class="btn-cancel">Cancel</button>
                `;
                break;
        }
        
        footer.innerHTML = html;
    }
    
    /**
     * Create item list UI
     */
    createItemList(items) {
        this.itemsElement = document.createElement('ul');
        this.itemsElement.className = 'modal-item-list';
        
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'modal-item';
            li.setAttribute('data-index', index);
            li.setAttribute('data-action', item.action);
            li.textContent = item.label;
            
            if (index === this.selectedIndex) {
                li.classList.add('selected');
            }
            
            this.itemsElement.appendChild(li);
        });
        
        this.contentElement.appendChild(this.itemsElement);
        this.items = items;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        const closeBtn = this.element.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Item selection
        if (this.itemsElement) {
            this.itemsElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-item')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    this.selectItem(index);
                    this.activateItem();
                }
            });
        }
        
        // Quiz answers
        if (this.type === MODAL_TYPES.QUIZ) {
            const answers = this.element.querySelectorAll('.quiz-answer');
            answers.forEach(answer => {
                answer.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.getAttribute('data-index'));
                    this.selectAnswer(index);
                });
            });
        }
        
        // Footer buttons
        const footer = this.element.querySelector('.modal-footer');
        if (footer) {
            footer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    this.handleFooterButton(e.target.className);
                }
            });
        }
        
        // Keyboard navigation
        this.keyHandler = (e) => this.handleKeyPress(e);
        document.addEventListener('keydown', this.keyHandler);
    }
    
    /**
     * Handle keyboard input
     */
    handleKeyPress(e) {
        if (!this.visible) return;
        
        switch(e.key) {
            case 'Escape':
                if (this.cancelable) {
                    this.hide();
                }
                break;
                
            case 'ArrowUp':
                this.selectPrevious();
                e.preventDefault();
                break;
                
            case 'ArrowDown':
                this.selectNext();
                e.preventDefault();
                break;
                
            case 'Enter':
                this.activateItem();
                e.preventDefault();
                break;
                
            case ' ':
                if (this.type === MODAL_TYPES.CONTAINER) {
                    this.takeAll();
                    e.preventDefault();
                }
                break;
        }
    }
    
    /**
     * Select previous item
     */
    selectPrevious() {
        if (this.items.length === 0) return;
        
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.updateSelection();
    }
    
    /**
     * Select next item
     */
    selectNext() {
        if (this.items.length === 0) return;
        
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.updateSelection();
    }
    
    /**
     * Select specific item
     */
    selectItem(index) {
        this.selectedIndex = index;
        this.updateSelection();
    }
    
    /**
     * Update visual selection
     */
    updateSelection() {
        if (!this.itemsElement) return;
        
        const items = this.itemsElement.querySelectorAll('.modal-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                
                // Scroll into view if needed
                if (index < this.scrollOffset || 
                    index >= this.scrollOffset + this.maxVisibleItems) {
                    this.scrollOffset = Math.max(0, 
                        Math.min(index, this.items.length - this.maxVisibleItems));
                }
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    /**
     * Activate selected item
     */
    activateItem() {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) return;
        
        const item = this.items[this.selectedIndex];
        
        if (this.callback) {
            this.callback(item.action || item);
        }
        
        EventBus.emit(EVENTS.MODAL_ACTION, {
            modal: this,
            action: item.action,
            item: item
        });
        
        // Auto-close for certain actions
        if (this.shouldAutoClose(item.action)) {
            this.hide();
        }
    }
    
    /**
     * Select quiz answer
     */
    selectAnswer(index) {
        if (this.callback) {
            this.callback(index);
        }
        
        EventBus.emit(EVENTS.QUIZ_ANSWERED, {
            modal: this,
            answerIndex: index
        });
        
        this.hide();
    }
    
    /**
     * Take all items from container
     */
    takeAll() {
        if (this.callback) {
            this.callback('take_all');
        }
        
        EventBus.emit(EVENTS.CONTAINER_TAKE_ALL, {
            modal: this,
            items: this.items
        });
        
        this.hide();
    }
    
    /**
     * Handle footer button clicks
     */
    handleFooterButton(className) {
        const actions = {
            'btn-confirm': 'confirm',
            'btn-cancel': 'cancel',
            'btn-new-game': 'new_game',
            'btn-main-menu': 'main_menu',
            'btn-save': 'save_settings'
        };
        
        const action = actions[className];
        
        if (action) {
            if (this.callback) {
                this.callback(action);
            }
            
            EventBus.emit(EVENTS.MODAL_ACTION, {
                modal: this,
                action: action
            });
            
            this.hide();
        }
    }
    
    /**
     * Check if should auto-close
     */
    shouldAutoClose(action) {
        const autoCloseActions = [
            'resume',
            'new',
            'save',
            'load',
            'quit'
        ];
        
        return autoCloseActions.includes(action);
    }
    
    /**
     * Show the modal
     */
    show() {
        if (!document.body.contains(this.element)) {
            document.body.appendChild(this.element);
        }
        
        this.element.style.display = 'flex';
        this.visible = true;
        
        EventBus.emit(EVENTS.MODAL_OPENED, {
            modal: this,
            type: this.type
        });
    }
    
    /**
     * Hide the modal
     */
    hide() {
        this.element.style.display = 'none';
        this.visible = false;
        
        EventBus.emit(EVENTS.MODAL_CLOSED, {
            modal: this,
            type: this.type
        });
    }
    
    /**
     * Destroy the modal
     */
    destroy() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.contentElement = null;
        this.itemsElement = null;
    }
}

/**
 * Modal manager for handling multiple modals
 */
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.modalStack = [];
    }
    
    /**
     * Create and show a modal
     */
    show(type, options = {}) {
        // Hide current modal if exists
        if (this.activeModal) {
            this.modalStack.push(this.activeModal);
            this.activeModal.hide();
        }
        
        // Create new modal
        const modal = new Modal(type, options);
        this.modals.set(type, modal);
        this.activeModal = modal;
        
        modal.show();
        
        return modal;
    }
    
    /**
     * Hide current modal
     */
    hide() {
        if (this.activeModal) {
            this.activeModal.hide();
            
            // Restore previous modal from stack
            if (this.modalStack.length > 0) {
                this.activeModal = this.modalStack.pop();
                this.activeModal.show();
            } else {
                this.activeModal = null;
            }
        }
    }
    
    /**
     * Hide all modals
     */
    hideAll() {
        this.modalStack.forEach(modal => modal.hide());
        this.modalStack = [];
        
        if (this.activeModal) {
            this.activeModal.hide();
            this.activeModal = null;
        }
    }
    
    /**
     * Get active modal
     */
    getActive() {
        return this.activeModal;
    }
    
    /**
     * Destroy all modals
     */
    destroy() {
        this.modals.forEach(modal => modal.destroy());
        this.modals.clear();
        this.modalStack = [];
        this.activeModal = null;
    }
}

// Export for use in other modules
export default Modal;