/**
 * ui-manager.js - Complete Fixed Version
 * Handles stat displays, inventory, equipment, and quiz modals
 * FIXED: Proper inventory handling, quiz state management, robust error handling
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
        
        console.log('🖥️ UI Manager initialized');
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
                    border: 1px solid #333;
                    margin: 5px;
                `;
                
                const gameContainer = document.getElementById('game-container') || 
                                    document.getElementById('game-area') ||
                                    document.body;
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
        
        // FIXED: Always try to update inventory from player
        this.updateInventory();
        
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
            this.elements.dungeonLevel.textContent = this.game.level?.depth || 1;
        }
        if (this.elements.wisdom) {
            this.elements.wisdom.textContent = player.wisdom || 10;
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
            const level = this.game.level?.depth || 1;
            const inventoryCount = player.inventory ? player.inventory.length : 0;
            
            statsDisplay.innerHTML = `
                <div style="color: #00ff00;">HP: ${player.hp}/${player.maxHp}</div>
                <div style="color: #ffff00;">SP: ${player.sp}/${player.maxSp}${player.sp === 0 ? ' (STARVING!)' : ''}</div>
                <div style="color: #00ffff;">MP: ${player.mp}/${player.maxMp}</div>
                <div style="color: #ffffff;">Level: ${level} | AC: ${ac} | Items: ${inventoryCount}</div>
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
     * Update inventory display - FIXED VERSION
     */
    updateInventory() {
        // FIXED: Look at player.inventory directly instead of inventorySystem
        if (!this.game.player || !this.game.player.inventory) {
            // Try to update basic inventory display if no full UI
            this.updateBasicInventoryDisplay();
            return;
        }
        
        const inventory = this.game.player.inventory;
        
        // If we have the full inventory list element, use it
        if (this.elements.inventoryList) {
            let html = '';
            let totalWeight = 0;
            
            inventory.forEach((item, index) => {
                if (!item) return;
                
                const letter = String.fromCharCode(97 + index); // a, b, c...
                const name = item.identified ? item.trueName : (item.name || item.type || 'unknown item');
                const weight = item.weight || 1;
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
                    itemText += ' (equipped)';
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
                this.game.player.updateWeight();
            }
        } else {
            // Fallback to basic display
            this.updateBasicInventoryDisplay();
        }
    }
    
    /**
     * Update basic inventory display for minimal UI
     */
    updateBasicInventoryDisplay() {
        if (!this.game.player || !this.game.player.inventory) return;
        
        const inventory = this.game.player.inventory;
        if (inventory.length === 0) return;
        
        // Find or create basic inventory display
        let invDisplay = document.getElementById('basic-inventory');
        if (!invDisplay) {
            const gameStats = document.getElementById('stats-display') || 
                             document.getElementById('game-stats');
            if (gameStats) {
                invDisplay = document.createElement('div');
                invDisplay.id = 'basic-inventory';
                invDisplay.style.cssText = `
                    font-family: monospace;
                    color: #ffff00;
                    margin-top: 10px;
                    font-size: 12px;
                    border-top: 1px solid #333;
                    padding-top: 5px;
                `;
                gameStats.appendChild(invDisplay);
            }
        }
        
        if (invDisplay) {
            let invText = `Inventory (${inventory.length}): `;
            const displayItems = inventory.slice(0, 3).map(item => 
                item.name || item.type || 'item'
            );
            if (inventory.length > 3) {
                displayItems.push(`+${inventory.length - 3} more`);
            }
            invText += displayItems.join(', ');
            invDisplay.textContent = invText;
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
        if (typeof player.getBurdenLevel === 'function') {
            const burden = player.getBurdenLevel();
            if (burden !== 'none') {
                effects.push(`<span class="status-burden">${burden.charAt(0).toUpperCase() + burden.slice(1)}</span>`);
            }
        }
        
        // Other status effects (from effects system)
        if (player.effects) {
            player.effects.forEach(effect => {
                const name = effect.name || effect.type || effect;
                effects.push(`<span class="status-effect">${name}</span>`);
            });
        }
        
        // Find or create status display element
        let statusDisplay = document.getElementById('status-effects');
        if (!statusDisplay) {
            // Create it next to the stats
            const statsDisplay = document.getElementById('stats-display') || 
                                document.getElementById('game-stats');
            if (statsDisplay) {
                statusDisplay = document.createElement('div');
                statusDisplay.id = 'status-effects';
                statusDisplay.className = 'status-effects';
                statusDisplay.style.cssText = `
                    font-family: monospace;
                    color: #ff8800;
                    margin-top: 5px;
                    font-size: 11px;
                `;
                statsDisplay.appendChild(statusDisplay);
            }
        }
        
        if (statusDisplay) {
            statusDisplay.innerHTML = effects.join(' | ') || '';
        }
    }
    
    /**
     * Show quiz modal - IMPROVED VERSION
     */
    showQuiz(quizData) {
        console.log('🎓 Showing quiz modal:', quizData);
        
        // If no modal element exists, create a basic one
        if (!this.elements.quizModal) {
            this.createBasicQuizModal();
        }
        
        if (!this.elements.quizModal) {
            console.error('Could not create quiz modal');
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
        this.elements.quizModal.style.display = 'block';
        this.pushModal('quiz');
        
        // Focus input
        setTimeout(() => {
            const input = this.elements.quizInputArea?.querySelector('input');
            if (input) input.focus();
        }, 100);
    }
    
    /**
     * Create basic quiz modal if none exists
     */
    createBasicQuizModal() {
        const modal = document.createElement('div');
        modal.id = 'quiz-modal';
        modal.className = 'quiz-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="quiz-content" style="
                background: #111;
                border: 2px solid #333;
                padding: 20px;
                border-radius: 8px;
                color: white;
                font-family: monospace;
                max-width: 500px;
                width: 90%;
            ">
                <div id="quiz-title" style="font-size: 18px; text-align: center; margin-bottom: 10px;">Quiz</div>
                <div id="quiz-subject" style="text-align: center; color: #888; margin-bottom: 15px;">Subject</div>
                <div id="quiz-timer" style="text-align: center; font-size: 24px; color: #0f0; margin-bottom: 15px;">30</div>
                <div id="quiz-question" style="margin-bottom: 20px; font-size: 16px;">Question will appear here</div>
                <div id="quiz-input-area" style="margin-bottom: 15px;">Input area</div>
                <div id="quiz-feedback" style="text-align: center; font-weight: bold;"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Update elements reference
        this.elements.quizModal = modal;
        this.elements.quizTitle = document.getElementById('quiz-title');
        this.elements.quizSubject = document.getElementById('quiz-subject');
        this.elements.quizTimer = document.getElementById('quiz-timer');
        this.elements.quizQuestion = document.getElementById('quiz-question');
        this.elements.quizInputArea = document.getElementById('quiz-input-area');
        this.elements.quizFeedback = document.getElementById('quiz-feedback');
    }
    
    /**
     * Setup quiz input area based on question type
     */
    setupQuizInput(question) {
        const inputArea = this.elements.quizInputArea;
        if (!inputArea) return;
        
        if (question.type === 'multiple' && question.options) {
            // Multiple choice
            let html = '<div class="quiz-options">';
            question.options.forEach((option, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C...
                html += `
                    <button class="quiz-option" data-answer="${option}" style="
                        display: block;
                        width: 100%;
                        margin: 5px 0;
                        padding: 10px;
                        background: #333;
                        color: white;
                        border: 1px solid #555;
                        cursor: pointer;
                        font-family: monospace;
                    " onmouseover="this.style.background='#555'" onmouseout="this.style.background='#333'">
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
                       placeholder="Type your answer..." autocomplete="off" style="
                           width: 100%;
                           padding: 10px;
                           font-size: 16px;
                           font-family: monospace;
                           background: #333;
                           color: white;
                           border: 1px solid #555;
                           margin-bottom: 10px;
                       ">
                <button id="quiz-submit" class="btn-primary" style="
                    width: 100%;
                    padding: 10px;
                    font-size: 16px;
                    background: #006600;
                    color: white;
                    border: 1px solid #008800;
                    cursor: pointer;
                    font-family: monospace;
                " onmouseover="this.style.background='#008800'" onmouseout="this.style.background='#006600'">Submit</button>
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
            this.elements.quizTimer.style.color = '#00ff00';
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
                } else {
                    this.elements.quizTimer.style.color = '#00ff00';
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
        console.log('📝 Submitting quiz answer:', answer);
        
        // Disable further input
        if (this.elements.quizInputArea) {
            this.elements.quizInputArea.style.pointerEvents = 'none';
        }
        
        // Emit answer event
        EventBus.emit(EVENTS.QUIZ_ANSWER, answer);
    }
    
    /**
     * Show quiz feedback - IMPROVED VERSION
     */
    showQuizFeedback(correct, message, correctAnswer = null) {
        console.log('💬 Quiz feedback:', {correct, message, correctAnswer});
        
        this.stopQuizTimer();
        
        const feedback = this.elements.quizFeedback;
        if (feedback) {
            feedback.textContent = message;
            feedback.className = `quiz-feedback ${correct ? 'correct' : 'wrong'}`;
            feedback.style.color = correct ? '#00ff00' : '#ff0000';
            
            // If wrong, show correct answer clearly
            if (!correct && correctAnswer) {
                feedback.innerHTML = `${message}<br><strong style="color: #ffff00;">Correct answer: ${correctAnswer}</strong>`;
                
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
        console.log('❌ Closing quiz modal');
        
        this.stopQuizTimer();
        if (this.elements.quizModal) {
            this.elements.quizModal.classList.remove('active');
            this.elements.quizModal.style.display = 'none';
        }
        this.popModal();
        EventBus.emit(EVENTS.UI_CLOSE_QUIZ);
    }
    
    /**
     * Show inventory modal
     */
    showInventory(mode = 'view') {
        if (!this.elements.inventoryModal || !this.game.player?.inventory) {
            console.log('No inventory modal or inventory system');
            return;
        }
        
        const inventory = this.game.player.inventory;
        let html = '<div class="inventory-modal-list">';
        
        inventory.forEach((item, index) => {
            if (!item) return;
            
            const letter = String.fromCharCode(97 + index);
            const name = item.identified ? item.trueName : (item.name || item.type || 'unknown item');
            
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
        EventBus.on(EVENTS.ITEM_PICKED_UP, () => {
            this.updateInventory();
        });
        EventBus.on(EVENTS.INVENTORY_UPDATED, () => {
            this.updateInventory();
        });
        EventBus.on(EVENTS.UI_UPDATE_INVENTORY, () => this.updateInventory());
        
        // Status effects
        EventBus.on(EVENTS.PLAYER_EFFECT_ADDED, (data) => {
            if (data?.effect?.name) {
                this.statusEffects.add(data.effect.name);
                this.updateStatusEffects();
            }
        });
        EventBus.on(EVENTS.PLAYER_EFFECT_REMOVED, (data) => {
            if (data?.effect?.name) {
                this.statusEffects.delete(data.effect.name);
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
        
        // Quiz events - IMPROVED
        EventBus.on(EVENTS.UI_OPEN_QUIZ, (data) => {
            console.log('🎓 Received UI_OPEN_QUIZ event:', data);
            this.showQuiz(data);
        });
        EventBus.on(EVENTS.QUIZ_CORRECT, () => {
            this.showQuizFeedback(true, 'Correct! Well done!');
        });
        EventBus.on(EVENTS.QUIZ_WRONG, (data) => {
            this.showQuizFeedback(false, 'Wrong!', data?.correctAnswer);
        });
        EventBus.on(EVENTS.QUIZ_TIMEOUT, () => {
            this.showQuizFeedback(false, "Time's up!");
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                e.preventDefault();
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
    
    /**
     * Force refresh all UI elements
     */
    forceUpdate() {
        console.log('🔄 Force updating UI...');
        this.update();
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopQuizTimer();
        
        // Remove event listeners
        EventBus.removeAllListeners();
        
        console.log('💀 UI Manager destroyed');
    }
}