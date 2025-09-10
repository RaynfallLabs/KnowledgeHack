/**
 * ui-manager.js - Manages all UI updates and modal displays
 * Updated to display all 6 RPG stats and derived values
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI Elements
        this.elements = {
            // Core Bars
            hpBar: document.getElementById('hp-bar'),
            hpText: document.getElementById('hp-text'),
            spBar: document.getElementById('sp-bar'),
            spText: document.getElementById('sp-text'),
            mpBar: document.getElementById('mp-bar'),
            mpText: document.getElementById('mp-text'),
            
            // Six Core Stats
            strength: document.getElementById('stat-strength'),
            constitution: document.getElementById('stat-constitution'),
            dexterity: document.getElementById('stat-dexterity'),
            intelligence: document.getElementById('stat-intelligence'),
            wisdom: document.getElementById('stat-wisdom'),
            perception: document.getElementById('stat-perception'),
            
            // Derived Stats
            armorClass: document.getElementById('armor-class'),
            sightRadius: document.getElementById('sight-radius'),
            carryCapacity: document.getElementById('carry-capacity'),
            quizTimer: document.getElementById('quiz-timer-stat'),
            maxSpells: document.getElementById('max-spells'),
            
            // Saving Throws
            fortSave: document.getElementById('save-fortitude'),
            reflexSave: document.getElementById('save-reflex'),
            willSave: document.getElementById('save-will'),
            
            // Info
            dungeonLevel: document.getElementById('dungeon-level'),
            turnCounter: document.getElementById('turn-counter'),
            
            // Equipment
            equippedWeapon: document.getElementById('equipped-weapon'),
            equippedArmor: document.getElementById('equipped-armor'),
            equippedRing: document.getElementById('equipped-ring'),
            equipmentList: document.getElementById('equipment-list'),
            
            // Inventory
            inventoryList: document.getElementById('inventory-list'),
            carryWeight: document.getElementById('carry-weight'),
            burdenStatus: document.getElementById('burden-status'),
            
            // Status Effects
            statusEffects: document.getElementById('status-effects'),
            activeEffects: document.getElementById('active-effects'),
            
            // Modals
            quizModal: document.getElementById('quiz-modal'),
            inventoryModal: document.getElementById('inventory-modal'),
            statsModal: document.getElementById('stats-modal'),
            
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
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Create stat display if it doesn't exist
        this.createStatDisplay();
        
        // Initial UI update
        this.updateAll();
    }
    
    /**
     * Create stat display panel if HTML doesn't have it
     */
    createStatDisplay() {
        // Check if stats panel exists
        let statsPanel = document.getElementById('stats-panel');
        if (!statsPanel) {
            // Create it
            const sidebar = document.querySelector('.sidebar') || document.body;
            statsPanel = document.createElement('div');
            statsPanel.id = 'stats-panel';
            statsPanel.className = 'stats-panel';
            statsPanel.innerHTML = `
                <h3>Character Stats</h3>
                
                <div class="stat-group">
                    <h4>Attributes</h4>
                    <div class="stat-row">
                        <span class="stat-label">STR:</span>
                        <span id="stat-strength" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">CON:</span>
                        <span id="stat-constitution" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">DEX:</span>
                        <span id="stat-dexterity" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">INT:</span>
                        <span id="stat-intelligence" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">WIS:</span>
                        <span id="stat-wisdom" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">PER:</span>
                        <span id="stat-perception" class="stat-value">10</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Derived Stats</h4>
                    <div class="stat-row">
                        <span class="stat-label">AC:</span>
                        <span id="armor-class" class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Sight:</span>
                        <span id="sight-radius" class="stat-value">3</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Carry:</span>
                        <span id="carry-capacity" class="stat-value">50</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Quiz Time:</span>
                        <span id="quiz-timer-stat" class="stat-value">10s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Max Spells:</span>
                        <span id="max-spells" class="stat-value">3</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Saving Throws</h4>
                    <div class="stat-row">
                        <span class="stat-label">Fort:</span>
                        <span id="save-fortitude" class="stat-value">+0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Reflex:</span>
                        <span id="save-reflex" class="stat-value">+0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Will:</span>
                        <span id="save-will" class="stat-value">+0</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Status</h4>
                    <div id="burden-status" class="burden-status"></div>
                    <div id="active-effects" class="active-effects"></div>
                </div>
            `;
            
            // Insert before equipment or at end
            const equipment = document.querySelector('.equipment-panel');
            if (equipment) {
                sidebar.insertBefore(statsPanel, equipment);
            } else {
                sidebar.appendChild(statsPanel);
            }
            
            // Re-cache elements
            this.recacheElements();
        }
    }
    
    /**
     * Re-cache DOM elements after creating them
     */
    recacheElements() {
        // Re-cache all the stat elements
        this.elements.strength = document.getElementById('stat-strength');
        this.elements.constitution = document.getElementById('stat-constitution');
        this.elements.dexterity = document.getElementById('stat-dexterity');
        this.elements.intelligence = document.getElementById('stat-intelligence');
        this.elements.wisdom = document.getElementById('stat-wisdom');
        this.elements.perception = document.getElementById('stat-perception');
        
        this.elements.armorClass = document.getElementById('armor-class');
        this.elements.sightRadius = document.getElementById('sight-radius');
        this.elements.carryCapacity = document.getElementById('carry-capacity');
        this.elements.quizTimer = document.getElementById('quiz-timer-stat');
        this.elements.maxSpells = document.getElementById('max-spells');
        
        this.elements.fortSave = document.getElementById('save-fortitude');
        this.elements.reflexSave = document.getElementById('save-reflex');
        this.elements.willSave = document.getElementById('save-will');
        
        this.elements.burdenStatus = document.getElementById('burden-status');
        this.elements.activeEffects = document.getElementById('active-effects');
    }
    
    /**
     * Update all UI elements
     */
    updateAll() {
        this.updateStats();
        this.updateAttributes();
        this.updateDerivedStats();
        this.updateSavingThrows();
        this.updateEquipment();
        this.updateInventory();
        this.updateStatusEffects();
    }
    
    /**
     * Update HP/SP/MP bars
     */
    updateStats() {
        const player = this.game.player;
        if (!player) return;
        
        // HP
        if (this.elements.hpBar && this.elements.hpText) {
            const hpPercent = (player.hp / player.maxHp) * 100;
            this.elements.hpBar.style.width = `${hpPercent}%`;
            this.elements.hpText.textContent = `${player.hp}/${player.maxHp}`;
            
            // Color based on health
            if (hpPercent <= 25) {
                this.elements.hpBar.style.backgroundColor = '#ff0000';
            } else if (hpPercent <= 50) {
                this.elements.hpBar.style.backgroundColor = '#ffff00';
            } else {
                this.elements.hpBar.style.backgroundColor = '#00ff00';
            }
        }
        
        // SP with hunger status
        if (this.elements.spBar && this.elements.spText) {
            const spPercent = (player.sp / player.maxSp) * 100;
            this.elements.spBar.style.width = `${spPercent}%`;
            this.elements.spText.textContent = `${player.sp}/${player.maxSp}`;
            
            // Color code based on hunger
            if (player.sp === 0) {
                this.elements.spBar.style.backgroundColor = '#880000'; // Dark red - STARVING
                this.elements.spText.textContent += ' [STARVING]';
            } else if (player.sp <= 20) {
                this.elements.spBar.style.backgroundColor = '#ff8800'; // Orange - Hungry
                this.elements.spText.textContent += ' [Hungry]';
            } else if (player.sp <= 50) {
                this.elements.spBar.style.backgroundColor = '#ffff00'; // Yellow - Peckish
            } else {
                this.elements.spBar.style.backgroundColor = '#00ff00'; // Green - Satisfied
            }
        }
        
        // MP
        if (this.elements.mpBar && this.elements.mpText) {
            const mpPercent = (player.mp / player.maxMp) * 100;
            this.elements.mpBar.style.width = `${mpPercent}%`;
            this.elements.mpText.textContent = `${player.mp}/${player.maxMp}`;
        }
        
        // Other info
        if (this.elements.dungeonLevel) {
            this.elements.dungeonLevel.textContent = this.game.currentLevel;
        }
        if (this.elements.turnCounter) {
            this.elements.turnCounter.textContent = player.turnsSurvived || 0;
        }
    }
    
    /**
     * Update the 6 core attributes
     */
    updateAttributes() {
        const player = this.game.player;
        if (!player) return;
        
        if (this.elements.strength) {
            this.elements.strength.textContent = player.strength;
            this.colorCodeStat(this.elements.strength, player.strength);
        }
        if (this.elements.constitution) {
            this.elements.constitution.textContent = player.constitution;
            this.colorCodeStat(this.elements.constitution, player.constitution);
        }
        if (this.elements.dexterity) {
            this.elements.dexterity.textContent = player.dexterity;
            this.colorCodeStat(this.elements.dexterity, player.dexterity);
        }
        if (this.elements.intelligence) {
            this.elements.intelligence.textContent = player.intelligence;
            this.colorCodeStat(this.elements.intelligence, player.intelligence);
        }
        if (this.elements.wisdom) {
            this.elements.wisdom.textContent = player.wisdom;
            this.colorCodeStat(this.elements.wisdom, player.wisdom);
        }
        if (this.elements.perception) {
            this.elements.perception.textContent = player.perception;
            this.colorCodeStat(this.elements.perception, player.perception);
        }
    }
    
    /**
     * Update derived stats
     */
    updateDerivedStats() {
        const player = this.game.player;
        if (!player) return;
        
        if (this.elements.armorClass) {
            this.elements.armorClass.textContent = player.getTotalAC();
        }
        if (this.elements.sightRadius) {
            this.elements.sightRadius.textContent = player.sightRadius;
        }
        if (this.elements.carryCapacity) {
            this.elements.carryCapacity.textContent = player.carryingCapacity;
        }
        if (this.elements.quizTimer) {
            this.elements.quizTimer.textContent = `${player.quizTimer}s`;
        }
        if (this.elements.maxSpells) {
            this.elements.maxSpells.textContent = player.maxSpells;
        }
    }
    
    /**
     * Update saving throws
     */
    updateSavingThrows() {
        const player = this.game.player;
        if (!player) return;
        
        if (this.elements.fortSave) {
            const fort = player.saves.fortitude;
            this.elements.fortSave.textContent = fort >= 0 ? `+${fort}` : fort;
        }
        if (this.elements.reflexSave) {
            const reflex = player.saves.reflex;
            this.elements.reflexSave.textContent = reflex >= 0 ? `+${reflex}` : reflex;
        }
        if (this.elements.willSave) {
            const will = player.saves.will;
            this.elements.willSave.textContent = will >= 0 ? `+${will}` : will;
        }
    }
    
    /**
     * Color code a stat value
     */
    colorCodeStat(element, value) {
        if (value < 8) {
            element.style.color = '#ff0000'; // Red - very low
        } else if (value < 10) {
            element.style.color = '#ff8800'; // Orange - below average
        } else if (value <= 12) {
            element.style.color = '#ffffff'; // White - average
        } else if (value <= 15) {
            element.style.color = '#00ff00'; // Green - above average
        } else if (value <= 18) {
            element.style.color = '#00ffff'; // Cyan - high
        } else {
            element.style.color = '#ffff00'; // Yellow - exceptional
        }
    }
    
    /**
     * Update equipment display
     */
    updateEquipment() {
        const player = this.game.player;
        if (!player || !this.elements.equipmentList) return;
        
        // Build complete equipment display
        const slots = {
            'Weapon': player.equipped.weapon,
            'Head': player.equipped.armor.head,
            'Body': player.equipped.armor.body,
            'Cloak': player.equipped.armor.cloak,
            'Gloves': player.equipped.armor.gloves,
            'Boots': player.equipped.armor.boots,
            'Shield': player.equipped.armor.shield,
            'Ring 1': player.equipped.accessories.ring1,
            'Ring 2': player.equipped.accessories.ring2,
            'Amulet': player.equipped.accessories.amulet
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
        const player = this.game.player;
        if (!player || !this.elements.inventoryList) return;
        
        const items = player.inventory;
        let html = '';
        let totalWeight = player.getCurrentWeight();
        
        items.forEach((item, index) => {
            if (!item) return;
            
            const letter = String.fromCharCode(97 + index); // a, b, c...
            const name = item.identified ? item.trueName : item.name;
            const weight = item.weight || 0;
            
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
        if (this.elements.carryWeight) {
            const capacity = player.carryingCapacity;
            this.elements.carryWeight.textContent = `${totalWeight}/${capacity}`;
            
            // Color code if burdened
            const burden = player.getBurdenLevel();
            if (burden === 'overloaded') {
                this.elements.carryWeight.style.color = '#ff0000';
            } else if (burden === 'overtaxed' || burden === 'strained') {
                this.elements.carryWeight.style.color = '#ff8800';
            } else if (burden === 'stressed' || burden === 'burdened') {
                this.elements.carryWeight.style.color = '#ffff00';
            } else {
                this.elements.carryWeight.style.color = '#ffffff';
            }
        }
        
        // Update burden status
        if (this.elements.burdenStatus) {
            const burden = player.getBurdenLevel();
            if (burden !== 'none') {
                this.elements.burdenStatus.textContent = `[${burden.toUpperCase()}]`;
                this.elements.burdenStatus.className = `burden-status burden-${burden}`;
            } else {
                this.elements.burdenStatus.textContent = '';
            }
        }
    }
    
    /**
     * Update status effects display
     */
    updateStatusEffects() {
        const player = this.game.player;
        if (!player) return;
        
        const effects = [];
        
        // Active effects from player
        player.effects.forEach((effect, name) => {
            let effectText = name;
            if (effect.duration > 0) {
                effectText += ` (${effect.duration})`;
            }
            effects.push(effectText);
        });
        
        // Update active effects display
        if (this.elements.activeEffects) {
            if (effects.length > 0) {
                this.elements.activeEffects.innerHTML = effects
                    .map(e => `<span class="effect">${e}</span>`)
                    .join(' ');
            } else {
                this.elements.activeEffects.innerHTML = '<span class="no-effects">None</span>';
            }
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Stat updates
        EventBus.on(EVENTS.PLAYER_STAT_CHANGE, () => {
            this.updateAll();
        });
        EventBus.on(EVENTS.PLAYER_HP_CHANGE, () => this.updateStats());
        EventBus.on(EVENTS.PLAYER_SP_CHANGE, () => this.updateStats());
        EventBus.on(EVENTS.PLAYER_MP_CHANGE, () => this.updateStats());
        
        // Effect updates
        EventBus.on(EVENTS.EFFECT_ADDED, () => this.updateStatusEffects());
        EventBus.on(EVENTS.EFFECT_REMOVED, () => this.updateStatusEffects());
        
        // Equipment/Inventory updates
        EventBus.on(EVENTS.ITEM_EQUIPPED, () => {
            this.updateEquipment();
            this.updateInventory();
            this.updateDerivedStats(); // AC might change
        });
        EventBus.on(EVENTS.ITEM_UNEQUIPPED, () => {
            this.updateEquipment();
            this.updateInventory();
            this.updateDerivedStats();
        });
        EventBus.on(EVENTS.INVENTORY_CHANGE, () => this.updateInventory());
        
        // Turn updates
        EventBus.on(EVENTS.TURN_END, () => {
            this.updateStats(); // Update turn counter
            this.updateStatusEffects(); // Update effect durations
        });
    }
}