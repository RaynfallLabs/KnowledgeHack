/**
 * ui-manager.js - Fixed to handle missing systems gracefully
 * Handles stat displays, inventory, equipment, and quiz modals
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Create minimal UI elements if they don't exist
        this.ensureUIElements();
        
        // UI Elements
        this.elements = {
            // Stats
            hpBar: document.getElementById('hp-bar'),
            hpText: document.getElementById('hp-text'),
            spBar: document.getElementById('sp-bar'),
            spText: document.getElementById('sp-text'),
            mpBar: document.getElementById('mp-bar'),
            mpText: document.getElementById('mp-text'),
            
            // Info
            dungeonLevel: document.getElementById('dungeon-level'),
            wisdom: document.getElementById('wisdom'),
            armorClass: document.getElementById('armor-class'),
            
            // Equipment
            equippedWeapon: document.getElementById('equipped-weapon'),
            equippedArmor: document.getElementById('equipped-armor'),
            equippedRing: document.getElementById('equipped-ring'),
            equipmentList: document.getElementById('equipment-list'),
            
            // Inventory
            inventoryList: document.getElementById('inventory-list'),
            carryWeight: document.getElementById('carry-weight'),
            
            // Modals
            quizModal: document.getElementById('quiz-modal'),
            inventoryModal: document.getElementById('inventory-modal'),
            
            // Quiz elements
            quizTitle: document.getElementById('quiz-title'),
            quizSubject: document.getElementById('quiz-subject'),
            quizTimer: document.getElementById('quiz-timer'),
            quizQuestion: document.getElementById('quiz-question'),
            quizInputArea: document.getElementById('quiz-input-area'),
            quizFeedback: document.getElementById('quiz-feedback')
        };
        
        // Modal stack for managing multiple modals
        this.modalStack = [];
        
        // Quiz timer
        this.quizTimerInterval = null;
        this.quizTimeRemaining = 0;
        
        // Status effects display
        this.statusEffects = new Set();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial UI update (safe)
        this.updateStats();
    }
    
    /**
     * Ensure basic UI elements exist
     */
    ensureUIElements() {
        // Find or create stats display container
        let statsDisplay = document.getElementById('stats-display');
        if (!statsDisplay) {
            statsDisplay = document.getElementById('game-stats');
            if (!statsDisplay) {
                // Create minimal stats display
                statsDisplay = document.createElement('div');
                statsDisplay.id = 'stats-display';
                statsDisplay.style.cssText = `
                    font-family: monospace;
                    color: #00ff00;
                    padding: 10px;
                    background: #000;
                `;
                
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    gameContainer.appendChild(statsDisplay);
                }
            }
        }
    }
    
    /**
     * Safe update method that checks for required systems
     */
    update() {
        this.updateStats();
        
        // Only update equipment if the system exists
        if (this.game.player && this.game.player.equipped) {
            this.updateEquipment();
        }
        
        // Only update inventory if the system exists
        if (this.game.inventorySystem && this.game.inventorySystem.items) {
            this.updateInventory();
        }
        
        this.updateStatusEffects();
    }
    
    /**
     * Update all UI elements (safe version)
     */
    updateAll() {
        this.update();
    }
    
    /**
     * Update player stats display
     */
    updateStats() {
        const player = this.game.player;
        if (!player) return;
        
        // HP
        if (this.elements.hpBar && this.elements.hpText) {
            const hpPercent = (player.hp / player.maxHp) * 100;
            this.elements.hpBar.style.width = `${hpPercent}%`;
            this.elements.hpText.textContent = `${player.hp}/${player.maxHp}`;
        }
        
        // SP with hunger status
        if (this.elements.spBar && this.elements.spText) {
            const spPercent = (player.sp / player.maxSp) * 100;
            this.elements.spBar.style.width = `${spPercent}%`;
            this.elements.spText.textContent = `${player.sp}/${player.maxSp}`;
            
            // Color code based on hunger
            if (this.elements.spBar) {
                if (player.sp === 0) {
                    this.elements.spBar.style.backgroundColor = '#880000'; // Dark red
                } else if (player.sp <= 20) {
                    this.elements.spBar.style.backgroundColor = '#ff8800'; // Orange
                } else {
                    this.elements.spBar.style.backgroundColor = '#00ff00'; // Green
                }
            }
        }
        
        // MP
        if (this.elements.mpBar && this.elements.mpText) {
            const mpPercent = (player.mp / player.maxMp) * 100;
            this.elements.mpBar.style.width = `${mpPercent}%`;
            this.elements.mpText.textContent = `${player.mp}/${player.maxMp}`;
        }
        
        // Other stats
        if (this.elements.dungeonLevel) {
            this.elements.dungeonLevel.textContent = this.game.currentLevel || 1;
        }
        if (this.elements.wisdom) {
            this.elements.wisdom.textContent = player.wisdom || player.attributes?.wisdom || 10;
        }
        if (this.elements.armorClass) {
            // Use safe method call if available
            const ac = typeof player.getAC === 'function' ? player.getAC() : player.ac || 10;
            this.elements.armorClass.textContent = ac;
        }
        
        // Create basic stats display if no elements exist
        if (!this.elements.hpText && !this.elements.spText) {
            this.createBasicStatsDisplay(player);
        }
    }
    
    /**
     * Create basic stats display for minimal UI
     */
    createBasicStatsDisplay(player) {
        const statsDisplay = document.getElementById('stats-display') || 
                           document.getElementById('game-stats');
        
        if (statsDisplay) {
            const ac = typeof player.getAC === 'function' ? player.getAC() : player.ac || 10;
            statsDisplay.innerHTML = `
                <div style="color: #00ff00;">HP: ${player.hp}/${player.maxHp}</div>
                <div style="color: #ffff00;">SP: ${player.sp}/${player.maxSp}</div>
                <div style="color: #00ffff;">MP: ${player.mp}/${player.maxMp}</div>
                <div style="color: #ffffff;">Level: ${this.game.currentLevel || 1} | AC: ${ac}</div>
            `;
        }
    }
    
    /**
     * Update equipment display
     */
    updateEquipment() {
        const player = this.game.player;
        if (!player || !player.equipped || !this.elements.equipmentList) return;
        
        // Build complete equipment display
        const slots = {
            'Weapon': player.equipped.weapon,
            'Head': player.equipped.armor?.head,
            'Body': player.equipped.armor?.body,
            'Arms': player.equipped.armor?.hands,
            'Legs': player.equipped.armor?.legs,
            'Ring 1': player.equipped.accessories?.ring1,
            'Ring 2': player.equipped.accessories?.ring2
        };
        
        let html = '';
        for (const [slot, item] of Object.entries(slots)) {
            let itemDisplay = 'None';
            let itemClass = 'empty';
            
            if (item) {
                // Use unidentified name unless identified
                itemDisplay = item.identified ? item.trueName : item.name;
                
                // Add enchantment if identified
                if (item.identified && item.enchantment) {
                    const sign = item.enchantment >= 0 ? '+' : '';
                    itemDisplay += ` ${sign}${item.enchantment}`;
                }
                
                // Color code by BUC status if identified
                if (item.identified) {
                    if (item.blessed) itemClass = 'blessed';
                    else if (item.cursed) itemClass = 'cursed';
                    else itemClass = 'uncursed';
                } else {
                    itemClass = 'unidentified';
                }
            }
            
            html += `<div class="equipment-slot">
                <span class="slot-name">${slot}:</span>
                <span class="item-name ${itemClass}">${itemDisplay}</span>
            </div>`;
        }
        
        this.elements.equipmentList.innerHTML = html;
    }
    
    /**
     * Update inventory display
     */
    updateInventory() {
        // Check if inventory system exists
        if (!this.game.inventorySystem || !this.elements.inventoryList) return;
        
        const inventory = this.game.inventorySystem;
        const items = inventory.items || [];
        let html = '';
        let totalWeight = 0;
        
        items.forEach((item, index) => {
            if (!item) return;
            
            const letter = String.fromCharCode(97 + index); // a, b, c...
            const name = item.identified ? item.trueName : (item.name || item.id);
            const weight = item.weight || 0;
            totalWeight += weight * (item.quantity || 1);
            
            let itemClass = item.identified ? 'identified' : 'unidentified';
            if (item.equipped) itemClass += ' equipped';
            
            let itemText = `${letter} - ${name}`;
            
            // Add quantity for stackables
            if (item.quantity && item.quantity > 1) {
                itemText += ` (${item.quantity})`;
            }
            
            // Add weight
            itemText += ` [${weight} lbs]`;
            
            // Mark if equipped
            if (item.equipped) {
                itemText += ' (E)';
            }
            
            html += `<div class="inventory-item ${itemClass}">${itemText}</div>`;
        });
        
        this.elements.inventoryList.innerHTML = html || '<div class="empty">Empty</div>';
        
        // Update weight display
        if (this.elements.carryWeight && this.game.player) {
            const capacity = this.game.player.carryingCapacity || 100;
            this.elements.carryWeight.textContent = `${totalWeight}/${capacity}`;
            
            // Color code if burdened
            if (this.elements.carryWeight) {
                if (totalWeight > capacity) {
                    this.elements.carryWeight.style.color = '#ff0000';
                } else if (totalWeight > capacity * 0.75) {
                    this.elements.carryWeight.style.color = '#ffff00';
                } else {
                    this.elements.carryWeight.style.color = '#ffffff';
                }
            }
        }
        
        // Update player's weight tracking if method exists
        if (this.game.player && typeof this.game.player.updateWeight === 'function') {
            this.game.player.updateWeight(totalWeight);
        }
    }
    
    /**
     * Update status effects display
     */
    updateStatusEffects() {
        const player = this.game.player;
        if (!player) return;
        
        const effects = [];
        
        // Hunger status
        if (player.sp === 0) {
            effects.push('<span class="status-starving">Starving</span>');
        } else if (player.sp <= 20) {
            effects.push('<span class="status-hungry">Hungry</span>');
        }
        
        // Burden status (if tracking exists)
        if (player.isOverloaded) {
            effects.push('<span class="status-overloaded">Overloaded</span>');
        } else if (player.isBurdened) {
            effects.push('<span class="status-burdened">Burdened</span>');
        }
        
        // Other status effects (from effects system)
        for (const effect of this.statusEffects) {
            effects.push(`<span class="status-effect">${effect}</span>`);
        }
        
        // Find or create status display element
        let statusDisplay = document.getElementById('status-effects');
        if (!statusDisplay) {
            // Create it next to the controls help
            const controlsHelp = document.querySelector('.controls-help');
            if (controlsHelp) {
                statusDisplay = document.createElement('div');
                statusDisplay.id = 'status-effects';
                statusDisplay.className = 'status-effects';
                controlsHelp.parentNode.insertBefore(statusDisplay, controlsHelp);
            }
        }
        
        if (statusDisplay) {
            statusDisplay.innerHTML = effects.join(' | ') || '';
        }
    }
    
    /**
     * Show quiz modal
     */
    showQuiz(quizData) {
        if (!this.elements.quizModal) {
            console.warn('Quiz modal element not found');
            return;
        }
        
        // Set quiz info
        const subject = quizData.subject.charAt(0).toUpperCase() + quizData.subject.slice(1);
        const tier = quizData.difficulty || 1;
        
        if (this.elements.quizTitle) {
            this.elements.quizTitle.textContent = 'Knowledge Challenge!';
        }
        if (this.elements.quizSubject) {
            this.elements.quizSubject.textContent = `${subject} Tier ${tier}`;
        }
        if (this.elements.quizQuestion) {
            this.elements.quizQuestion.textContent = quizData.question.question;
        }
        
        // Clear previous feedback
        if (this.elements.quizFeedback) {
            this.elements.quizFeedback.textContent = '';
            this.elements.quizFeedback.className = 'quiz-feedback';
        }
        
        // Setup input based on question type
        if (this.elements.quizInputArea) {
            this.setupQuizInput(quizData.question);
        }
        
        // Start timer
        const timerDuration = quizData.timeLimit || 
                            (this.game.player && typeof this.game.player.getQuizTimer === 'function' ? 
                             this.game.player.getQuizTimer() : 30);
        this.startQuizTimer(timerDuration);
        
        // Show modal
        this.elements.quizModal.classList.add('active');
        this.pushModal('quiz');
        
        // Focus input
        setTimeout(() => {
            const input = this.elements.quizInputArea?.querySelector('input');
            if (input) input.focus();
        }, 100);
    }
    
    /**
     * Setup quiz input area based on question type
     */
    setupQuizInput(question) {
        const inputArea = this.elements.quizInputArea;
        if (!inputArea) return;
        
        if (question.type === 'multiple') {
            // Multiple choice
            let html = '<div class="quiz-options">';
            question.options.forEach((option, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C...
                html += `
                    <button class="quiz-option" data-answer="${option}">
                        ${letter}. ${option}
                    </button>
                `;
            });
            html += '</div>';
            inputArea.innerHTML = html;
            
            // Add click handlers
            inputArea.querySelectorAll('.quiz-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.submitQuizAnswer(e.target.dataset.answer);
                });
            });
            
        } else {
            // Text input
            inputArea.innerHTML = `
                <input type="text" id="quiz-answer" class="quiz-input" 
                       placeholder="Type your answer..." autocomplete="off">
                <button id="quiz-submit" class="btn-primary">Submit</button>
            `;
            
            const input = document.getElementById('quiz-answer');
            const submit = document.getElementById('quiz-submit');
            
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.submitQuizAnswer(input.value);
                    }
                });
            }
            
            if (submit) {
                submit.addEventListener('click', () => {
                    const input = document.getElementById('quiz-answer');
                    if (input) {
                        this.submitQuizAnswer(input.value);
                    }
                });
            }
        }
    }
    
    /**
     * Start quiz timer
     */
    startQuizTimer(seconds) {
        this.quizTimeRemaining = seconds;
        
        // Clear any existing timer
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
        }
        
        // Update display
        if (this.elements.quizTimer) {
            this.elements.quizTimer.textContent = seconds;
        }
        
        // Start countdown
        this.quizTimerInterval = setInterval(() => {
            this.quizTimeRemaining--;
            if (this.elements.quizTimer) {
                this.elements.quizTimer.textContent = this.quizTimeRemaining;
                
                // Color code when low
                if (this.quizTimeRemaining <= 5) {
                    this.elements.quizTimer.style.color = '#ff0000';
                } else if (this.quizTimeRemaining <= 10) {
                    this.elements.quizTimer.style.color = '#ffff00';
                }
            }
            
            // Time's up
            if (this.quizTimeRemaining <= 0) {
                this.stopQuizTimer();
                EventBus.emit(EVENTS.QUIZ_TIMEOUT);
                this.showQuizFeedback(false, "Time's up!");
            }
        }, 1000);
    }
    
    /**
     * Stop quiz timer
     */
    stopQuizTimer() {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
    }
    
    /**
     * Submit quiz answer
     */
    submitQuizAnswer(answer) {
        // Disable further input
        if (this.elements.quizInputArea) {
            this.elements.quizInputArea.style.pointerEvents = 'none';
        }
        
        // Emit answer event
        EventBus.emit(EVENTS.QUIZ_ANSWER, answer);
    }
    
    /**
     * Show quiz feedback
     */
    showQuizFeedback(correct, message, correctAnswer = null) {
        this.stopQuizTimer();
        
        const feedback = this.elements.quizFeedback;
        if (feedback) {
            feedback.textContent = message;
            feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`;
            
            // If wrong, show correct answer clearly
            if (!correct && correctAnswer) {
                feedback.innerHTML = `${message}<br><strong>Correct answer: ${correctAnswer}</strong>`;
                
                // Hold for 3 seconds so kids can read and learn
                setTimeout(() => {
                    this.closeQuiz();
                }, 3000);
            } else {
                // Close after 1.5 seconds for correct answers
                setTimeout(() => {
                    this.closeQuiz();
                }, 1500);
            }
        } else {
            // No feedback element, just close
            setTimeout(() => {
                this.closeQuiz();
            }, 1500);
        }
    }
    
    /**
     * Close quiz modal
     */
    closeQuiz() {
        this.stopQuizTimer();
        if (this.elements.quizModal) {
            this.elements.quizModal.classList.remove('active');
        }
        this.popModal();
        EventBus.emit(EVENTS.UI_CLOSE_QUIZ);
    }
    
    /**
     * Show inventory modal
     */
    showInventory(mode = 'view') {
        if (!this.elements.inventoryModal || !this.game.inventorySystem) return;
        
        const inventory = this.game.inventorySystem.items || [];
        let html = '<div class="inventory-modal-list">';
        
        inventory.forEach((item, index) => {
            if (!item) return;
            
            const letter = String.fromCharCode(97 + index);
            const name = item.identified ? item.trueName : (item.name || item.id);
            
            html += `<div class="inventory-modal-item" data-index="${index}">
                ${letter} - ${name}
            </div>`;
        });
        
        html += '</div>';
        
        const contentElement = document.getElementById('inventory-modal-content');
        if (contentElement) {
            contentElement.innerHTML = html;
        }
        
        this.elements.inventoryModal.classList.add('active');
        this.pushModal('inventory');
    }
    
    /**
     * Close inventory modal
     */
    closeInventory() {
        if (this.elements.inventoryModal) {
            this.elements.inventoryModal.classList.remove('active');
        }
        this.popModal();
        EventBus.emit(EVENTS.UI_CLOSE_INVENTORY);
    }
    
    /**
     * Push modal to stack
     */
    pushModal(type) {
        this.modalStack.push(type);
        // No need to pause - turn based system
    }
    
    /**
     * Pop modal from stack
     */
    popModal() {
        return this.modalStack.pop();
    }
    
    /**
     * Close top modal
     */
    closeTopModal() {
        const top = this.modalStack[this.modalStack.length - 1];
        if (!top) return;
        
        switch (top) {
            case 'quiz':
                this.closeQuiz();
                break;
            case 'inventory':
                this.closeInventory();
                break;
            // Add other modal types as needed
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Stat updates
        EventBus.on(EVENTS.PLAYER_STAT_CHANGE, () => this.updateStats());
        EventBus.on(EVENTS.UI_UPDATE_STATS, () => this.updateStats());
        
        // Equipment/Inventory updates
        EventBus.on(EVENTS.ITEM_EQUIP, () => {
            this.updateEquipment();
            this.updateInventory();
        });
        EventBus.on(EVENTS.ITEM_UNEQUIP, () => {
            this.updateEquipment();
            this.updateInventory();
        });
        EventBus.on(EVENTS.UI_UPDATE_INVENTORY, () => this.updateInventory());
        
        // Status effects
        EventBus.on(EVENTS.PLAYER_EFFECT_ADDED, (effect) => {
            if (effect && effect.name) {
                this.statusEffects.add(effect.name);
                this.updateStatusEffects();
            }
        });
        EventBus.on(EVENTS.PLAYER_EFFECT_REMOVED, (effect) => {
            if (effect && effect.name) {
                this.statusEffects.delete(effect.name);
                this.updateStatusEffects();
            }
        });
        
        // Modal management
        EventBus.on(EVENTS.UI_OPEN_INVENTORY, (data) => {
            this.showInventory(data?.mode || 'view');
        });
        EventBus.on(EVENTS.UI_CLOSE_INVENTORY, () => {
            this.closeInventory();
        });
        
        // Quiz events
        EventBus.on(EVENTS.UI_OPEN_QUIZ, (data) => {
            this.showQuiz(data);
        });
        EventBus.on(EVENTS.QUIZ_CORRECT, () => {
            this.showQuizFeedback(true, 'Correct!');
        });
        EventBus.on(EVENTS.QUIZ_WRONG, (data) => {
            this.showQuizFeedback(false, 'Wrong!', data?.correctAnswer);
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                this.closeTopModal();
            }
        });
    }
    
    /**
     * Add status effect
     */
    addStatusEffect(name) {
        this.statusEffects.add(name);
        this.updateStatusEffects();
    }
    
    /**
     * Remove status effect
     */
    removeStatusEffect(name) {
        this.statusEffects.delete(name);
        this.updateStatusEffects();
    }
}