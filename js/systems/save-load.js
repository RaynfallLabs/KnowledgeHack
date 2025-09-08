/**
 * save-load.js - Game save/load system
 * Handles persistent game state
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';

export class SaveLoadSystem {
    constructor(game) {
        this.game = game;
        this.saveSlots = 3; // Number of save slots
        this.autoSaveInterval = 60000; // Auto-save every minute
        this.autoSaveTimer = null;
        
        this.setupEventListeners();
        this.startAutoSave();
    }
    
    /**
     * Save game to a slot
     */
    saveGame(slot = 0) {
        try {
            const saveData = {
                version: CONFIG.VERSION || '1.0.0',
                timestamp: Date.now(),
                slot: slot,
                
                // Game state
                playerName: this.game.playerName,
                turnNumber: this.game.turnNumber,
                currentLevel: this.game.currentLevel,
                
                // Player data
                player: this.game.player ? this.game.player.serialize() : null,
                
                // Dungeon data
                dungeon: this.game.dungeon ? this.serializeDungeon() : null,
                
                // Systems data
                inventory: this.game.inventorySystem ? 
                    this.game.inventorySystem.serialize() : null,
                equipment: this.game.equipmentSystem ? 
                    this.game.equipmentSystem.serialize() : null,
                identification: this.game.identificationSystem ? 
                    this.game.identificationSystem.serialize() : null,
                
                // Monsters and items
                monsters: this.serializeMonsters(),
                items: this.serializeItems()
            };
            
            const key = this.getSaveKey(slot);
            localStorage.setItem(key, JSON.stringify(saveData));
            
            // Update save metadata
            this.updateSaveMetadata(slot, saveData);
            
            this.game.messageLog?.add(`Game saved to slot ${slot + 1}!`, 'success');
            EventBus.emit(EVENTS.SAVE_GAME, { slot, data: saveData });
            
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            this.game.messageLog?.add('Failed to save game!', 'danger');
            return false;
        }
    }
    
    /**
     * Load game from a slot
     */
    loadGame(slot = 0) {
        try {
            const key = this.getSaveKey(slot);
            const saveDataStr = localStorage.getItem(key);
            
            if (!saveDataStr) {
                this.game.messageLog?.add(`No save found in slot ${slot + 1}`, 'warning');
                return false;
            }
            
            const saveData = JSON.parse(saveDataStr);
            
            // Check version compatibility
            if (!this.isCompatibleVersion(saveData.version)) {
                this.game.messageLog?.add('Save file version incompatible!', 'danger');
                return false;
            }
            
            // Restore game state
            this.game.playerName = saveData.playerName;
            this.game.turnNumber = saveData.turnNumber;
            this.game.currentLevel = saveData.currentLevel;
            
            // Restore player
            if (saveData.player && this.game.player) {
                this.game.player.deserialize(saveData.player);
            }
            
            // Restore dungeon
            if (saveData.dungeon) {
                this.deserializeDungeon(saveData.dungeon);
            }
            
            // Restore systems
            if (saveData.inventory && this.game.inventorySystem) {
                this.game.inventorySystem.deserialize(saveData.inventory);
            }
            if (saveData.equipment && this.game.equipmentSystem) {
                this.game.equipmentSystem.deserialize(saveData.equipment);
            }
            if (saveData.identification && this.game.identificationSystem) {
                this.game.identificationSystem.deserialize(saveData.identification);
            }
            
            // Restore monsters and items
            this.deserializeMonsters(saveData.monsters);
            this.deserializeItems(saveData.items);
            
            this.game.messageLog?.add(`Game loaded from slot ${slot + 1}!`, 'success');
            EventBus.emit(EVENTS.LOAD_GAME, { slot, data: saveData });
            
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.game.messageLog?.add('Failed to load game!', 'danger');
            return false;
        }
    }
    
    /**
     * Quick save (slot 0)
     */
    quickSave() {
        return this.saveGame(0);
    }
    
    /**
     * Quick load (slot 0)
     */
    quickLoad() {
        return this.loadGame(0);
    }
    
    /**
     * Auto-save to dedicated slot
     */
    autoSave() {
        const autoSaveSlot = this.saveSlots; // Use slot beyond normal slots
        this.saveGame(autoSaveSlot);
    }
    
    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.game.running && !this.game.gameOver) {
                this.autoSave();
            }
        }, this.autoSaveInterval);
    }
    
    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
    
    /**
     * Get save key for a slot
     */
    getSaveKey(slot) {
        return `${CONFIG.SAVE_KEY}-slot-${slot}`;
    }
    
    /**
     * Get metadata key
     */
    getMetadataKey() {
        return `${CONFIG.SAVE_KEY}-metadata`;
    }
    
    /**
     * Update save metadata
     */
    updateSaveMetadata(slot, saveData) {
        const metadataKey = this.getMetadataKey();
        let metadata = {};
        
        try {
            const existing = localStorage.getItem(metadataKey);
            if (existing) {
                metadata = JSON.parse(existing);
            }
        } catch (error) {
            console.warn('Could not load save metadata:', error);
        }
        
        metadata[slot] = {
            timestamp: saveData.timestamp,
            playerName: saveData.playerName,
            level: saveData.currentLevel,
            turns: saveData.turnNumber
        };
        
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
    }
    
    /**
     * Get all save metadata
     */
    getSaveMetadata() {
        try {
            const metadataKey = this.getMetadataKey();
            const metadata = localStorage.getItem(metadataKey);
            return metadata ? JSON.parse(metadata) : {};
        } catch (error) {
            console.error('Failed to load save metadata:', error);
            return {};
        }
    }
    
    /**
     * Delete a save slot
     */
    deleteSave(slot) {
        const key = this.getSaveKey(slot);
        localStorage.removeItem(key);
        
        // Update metadata
        const metadata = this.getSaveMetadata();
        delete metadata[slot];
        localStorage.setItem(this.getMetadataKey(), JSON.stringify(metadata));
        
        this.game.messageLog?.add(`Save slot ${slot + 1} deleted.`, 'info');
    }
    
    /**
     * Check if a save slot exists
     */
    hasSave(slot) {
        const key = this.getSaveKey(slot);
        return localStorage.getItem(key) !== null;
    }
    
    /**
     * Check version compatibility
     */
    isCompatibleVersion(version) {
        // Simple check - could be more sophisticated
        return version === (CONFIG.VERSION || '1.0.0');
    }
    
    /**
     * Serialize dungeon
     */
    serializeDungeon() {
        if (!this.game.dungeon) return null;
        
        return {
            level: this.game.currentLevel,
            tiles: this.game.dungeon.tiles,
            entrance: this.game.dungeon.entrance,
            exit: this.game.dungeon.exit,
            rooms: this.game.dungeon.rooms
        };
    }
    
    /**
     * Deserialize dungeon
     */
    deserializeDungeon(data) {
        // TODO: Implement when Dungeon class has deserialize method
        // For now, regenerate the level
        this.game.generateLevel(data.level);
    }
    
    /**
     * Serialize monsters
     */
    serializeMonsters() {
        return this.game.monsters.map(monster => ({
            id: monster.id,
            x: monster.x,
            y: monster.y,
            hp: monster.hp,
            maxHp: monster.maxHp
        }));
    }
    
    /**
     * Deserialize monsters
     */
    deserializeMonsters(data) {
        if (!data) return;
        // TODO: Implement when Monster class is complete
        this.game.monsters = [];
    }
    
    /**
     * Serialize items
     */
    serializeItems() {
        return this.game.items.map(item => ({
            id: item.id,
            x: item.x,
            y: item.y,
            identified: item.identified
        }));
    }
    
    /**
     * Deserialize items
     */
    deserializeItems(data) {
        if (!data) return;
        // TODO: Implement when Item class is complete
        this.game.items = [];
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Save on level change
        EventBus.on(EVENTS.LEVEL_ENTER, () => {
            this.autoSave();
        });
        
        // Save on game pause
        EventBus.on(EVENTS.GAME_PAUSE, () => {
            this.quickSave();
        });
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoSave();
    }
}

export default SaveLoadSystem;