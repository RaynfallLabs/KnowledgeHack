/**
 * ui-manager.js - Manages all UI updates
 * Simplified version that works with current Player class
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Create stats panel if it doesn't exist
        this.ensureStatsPanel();
        
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
            
            // 6-stat display
            strength: document.getElementById('stat-str'),
            constitution: document.getElementById('stat-con'),
            dexterity: document.getElementById('stat-dex'),
            intelligence: document.getElementById('stat-int'),
            wisdom: document.getElementById('stat-wis'),
            perception: document.getElementById('stat-per'),
            
            // Derived stats
            armorClass: document.getElementById('armor-class'),
            sightRadius: document.getElementById('sight-radius'),
            carryCapacity: document.getElementById('carry-capacity'),
            
            // Equipment
            equippedWeapon: document.getElementById('equipped-weapon'),
            equippedArmor: document.getElementById('equipped-armor'),
            equippedRing: document.getElementById('equipped-ring'),
            
            // Inventory
            inventoryList: document.getElementById('inventory-list'),
            carryWeight: document.getElementById('carry-weight'),
            
            // Modals
            quizModal: document.getElementById('quiz-modal'),
            inventoryModal: document.getElementById('inventory-modal')
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial UI update
        this.updateAll();
    }
    
    /**
     * Ensure stats panel exists in HTML
     */
    ensureStatsPanel() {
        // Check if stats panel exists
        let statsPanel = document.querySelector('.stats-panel');
        if (!statsPanel) {
            // Create it if missing
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                statsPanel = document.createElement('div');
                statsPanel.className = 'stats-panel';
                statsPanel.innerHTML = `
                    <h3>Stats</h3>
                    <div class="stat-bars">
                        <div class="stat-row">
                            <span>HP:</span>
                            <div class="bar-container">
                                <div id="hp-bar" class="bar hp"></div>
                                <span id="hp-text">10/10</span>
                            </div>
                        </div>
                        <div class="stat-row">
                            <span>SP:</span>
                            <div class="bar-container">
                                <div id="sp-bar" class="bar sp"></div>
                                <span id="sp-text">100/100</span>
                            </div>
                        </div>
                        <div class="stat-row">
                            <span>MP:</span>
                            <div class="bar-container">
                                <div id="mp-bar" class="bar mp"></div>
                                <span id="mp-text">20/20</span>
                            </div>
                        </div>
                    </div>
                    <div class="stat-info">
                        <div>Level: <span id="dungeon-level">1</span></div>
                        <div>AC: <span id="armor-class">10</span></div>
                        <div>Sight: <span id="sight-radius">3</span></div>
                    </div>
                    <div class="attributes-display">
                        <div>STR: <span id="stat-str">10</span></div>
                        <div>CON: <span id="stat-con">10</span></div>
                        <div>DEX: <span id="stat-dex">10</span></div>
                        <div>INT: <span id="stat-int">10</span></div>
                        <div>WIS: <span id="stat-wis">10</span></div>
                        <div>PER: <span id="stat-per">10</span></div>
                    </div>
                `;
                sidebar.insertBefore(statsPanel, sidebar.firstChild);
            }
        }
    }
    
    /**
     * Update all UI elements
     */
    updateAll() {
        this.updateStats();
        this.updateAttributes();
        this.updateDerivedStats();
        this.updateEquipment();
        this.updateInventory();
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
            } else if (player.sp <= 20) {
                this.elements.spBar.style.backgroundColor = '#ff8800'; // Orange - Hungry
            } else {
                this.elements.spBar.style.backgroundColor = '#0088ff'; // Blue - Normal
            }
        }
        
        // MP
        if (this.elements.mpBar && this.elements.mpText) {
            const mpPercent = (player.mp / player.maxMp) * 100;
            this.elements.mpBar.style.width = `${mpPercent}%`;
            this.elements.mpText.textContent = `${player.mp}/${player.maxMp}`;
            this.elements.mpBar.style.backgroundColor = '#ff00ff'; // Purple for magic
        }
        
        // Dungeon level
        if (this.elements.dungeonLevel) {
            this.elements.dungeonLevel.textContent = this.game.currentLevel || 1;
        }
    }
    
    /**
     * Update attribute display
     */
    updateAttributes() {
        const player = this.game.player;
        if (!player) return;
        
        if (this.elements.strength) this.elements.strength.textContent = player.strength;
        if (this.elements.constitution) this.elements.constitution.textContent = player.constitution;
        if (this.elements.dexterity) this.elements.dexterity.textContent = player.dexterity;
        if (this.elements.intelligence) this.elements.intelligence.textContent = player.intelligence;
        if (this.elements.wisdom) this.elements.wisdom.textContent = player.wisdom;
        if (this.elements.perception) this.elements.perception.textContent = player.perception;
    }
    
    /**
     * Update derived stats display
     */
    updateDerivedStats() {
        const player = this.game.player;
        if (!player) return;
        
        // Use getAC if it exists, otherwise use ac directly
        const ac = player.getAC ? player.getAC() : player.ac;
        if (this.elements.armorClass) {
            this.elements.armorClass.textContent = ac;
        }
        
        // Sight radius
        if (this.elements.sightRadius) {
            this.elements.sightRadius.textContent = player.sightRadius || player.getSightRadius();
        }
        
        // Carry capacity
        if (this.elements.carryCapacity) {
            this.elements.carryCapacity.textContent = player.carryingCapacity || player.carryCapacity;
        }
    }
    
    /**
     * Update equipment display
     */
    updateEquipment() {
        const player = this.game.player;
        if (!player) return;
        
        // Simple equipment display
        if (this.elements.equippedWeapon) {
            const weapon = player.equipment?.weapon || player.equipped?.weapon;
            this.elements.equippedWeapon.textContent = weapon ? weapon.name : 'None';
        }
        
        if (this.elements.equippedArmor) {
            const armor = player.equipment?.armor || player.equipped?.armor?.body;
            this.elements.equippedArmor.textContent = armor ? armor.name : 'None';
        }
        
        if (this.elements.equippedRing) {
            const ring = player.equipment?.ring || player.equipped?.accessories?.ring1;
            this.elements.equippedRing.textContent = ring ? ring.name : 'None';
        }
    }
    
    /**
     * Update inventory display
     */
    updateInventory() {
        const inventory = this.game.inventorySystem;
        if (!inventory || !this.elements.inventoryList) return;
        
        const items = inventory.items || [];
        let html = '';
        let totalWeight = 0;
        
        const itemCount = Math.min(10, items.length); // Show first 10 items
        for (let i = 0; i < itemCount; i++) {
            const item = items[i];
            if (!item) continue;
            
            const letter = String.fromCharCode(97 + i); // a, b, c...
            const name = item.name || 'unknown';
            const weight = item.weight || 1;
            totalWeight += weight * (item.quantity || 1);
            
            html += `<div class="inventory-item">${letter} - ${name}</div>`;
        }
        
        if (items.length > 10) {
            html += `<div class="inventory-more">... and ${items.length - 10} more</div>`;
        }
        
        this.elements.inventoryList.innerHTML = html || '<div class="empty">Empty</div>';
        
        // Update weight display
        if (this.elements.carryWeight) {
            const capacity = this.game.player?.carryingCapacity || 50;
            this.elements.carryWeight.textContent = `${totalWeight}/${capacity}`;
            
            // Color code if burdened
            if (totalWeight > capacity) {
                this.elements.carryWeight.style.color = '#ff0000';
            } else if (totalWeight > capacity * 0.75) {
                this.elements.carryWeight.style.color = '#ffff00';
            } else {
                this.elements.carryWeight.style.color = '#ffffff';
            }
        }
    }
    
    /**
     * Update level display
     */
    updateLevel(level) {
        if (this.elements.dungeonLevel) {
            this.elements.dungeonLevel.textContent = level;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for stat changes
        EventBus.on(EVENTS.PLAYER_STAT_CHANGE, () => {
            this.updateAll();
        });
        
        // Listen for SP changes (hunger)
        EventBus.on(EVENTS.PLAYER_SP_CHANGE, () => {
            this.updateStats();
        });
        
        // Listen for inventory changes
        EventBus.on(EVENTS.INVENTORY_CHANGE, () => {
            this.updateInventory();
        });
        
        // Listen for equipment changes
        EventBus.on(EVENTS.ITEM_EQUIPPED, () => {
            this.updateEquipment();
        });
        
        EventBus.on(EVENTS.ITEM_UNEQUIPPED, () => {
            this.updateEquipment();
        });
    }
    
    /**
     * Show message (for compatibility)
     */
    showMessage(message, type = 'info') {
        if (this.game.messageLog) {
            this.game.messageLog.add(message, type);
        }
    }
}