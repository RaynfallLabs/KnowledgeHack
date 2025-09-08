/**
 * magic.js - Magic and spell casting system
 * Handles spell casting through science questions
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';
import spellLoader from '../core/spell-loader.js';

export class MagicSystem {
    constructor(game) {
        this.game = game;
        this.quizEngine = new QuizEngine();
        this.knownSpells = new Set();
        this.preparedSpells = [];
        this.maxPreparedSpells = 5;
        this.spellPower = 100; // Percentage modifier for spell effects
        
        this.setupEventListeners();
    }
    
    /**
     * Cast a spell
     */
    async castSpell(spellId, target = null) {
        // Check if spell is known
        if (!this.knownSpells.has(spellId) && !this.isPrepared(spellId)) {
            this.game.messageLog.add('You don\'t know that spell!', 'warning');
            return false;
        }
        
        // Get spell data
        const spell = spellLoader.getSpell(spellId);
        if (!spell) {
            console.error(`Spell ${spellId} not found in spell data`);
            return false;
        }
        
        // Check mana cost
        if (this.game.player.mp < spell.manaCost) {
            this.game.messageLog.add('Not enough mana!', 'warning');
            return false;
        }
        
        // Check if spell needs a target
        if (spell.targetRequired && !target) {
            this.game.messageLog.add('This spell requires a target.', 'info');
            return false;
        }
        
        // Start science quiz for spell casting
        const difficulty = this.getSpellDifficulty(spell);
        const result = await this.quizEngine.startQuiz(
            'science',
            difficulty,
            { 
                action: 'casting',
                spell: spell.name
            }
        );
        
        if (result.success) {
            // Consume mana
            this.game.player.mp -= spell.manaCost;
            
            // Calculate spell effectiveness based on quiz score
            const effectiveness = (result.score / 100) * (this.spellPower / 100);
            
            // Apply spell effect
            this.applySpellEffect(spell, target, effectiveness);
            
            this.game.messageLog.add(`Cast ${spell.name}!`, 'success');
            EventBus.emit(EVENTS.SPELL_CAST, { spell, target, effectiveness });
            
            return true;
        } else {
            // Spell fizzled
            this.game.messageLog.add('The spell fizzles...', 'warning');
            
            // Still consume half mana on failure
            this.game.player.mp -= Math.floor(spell.manaCost / 2);
            
            return false;
        }
    }
    
    /**
     * Apply spell effect
     */
    applySpellEffect(spell, target, effectiveness) {
        switch (spell.effect) {
            case 'damage':
                this.applyDamageSpell(spell, target, effectiveness);
                break;
                
            case 'heal':
                this.applyHealSpell(spell, target, effectiveness);
                break;
                
            case 'teleport':
                this.applyTeleportSpell(spell, target, effectiveness);
                break;
                
            case 'identify':
                this.applyIdentifySpell(spell, effectiveness);
                break;
                
            case 'buff':
                this.applyBuffSpell(spell, target, effectiveness);
                break;
                
            case 'debuff':
                this.applyDebuffSpell(spell, target, effectiveness);
                break;
                
            case 'summon':
                this.applySummonSpell(spell, effectiveness);
                break;
                
            default:
                console.warn(`Unknown spell effect: ${spell.effect}`);
        }
    }
    
    /**
     * Apply damage spell
     */
    applyDamageSpell(spell, target, effectiveness) {
        if (!target) {
            target = this.game.player; // Self-damage if no target?
        }
        
        const baseDamage = this.rollDice(spell.power || '1d6');
        const damage = Math.floor(baseDamage * effectiveness);
        
        if (target.takeDamage) {
            target.takeDamage(damage, 'magic');
            this.game.messageLog.add(`${spell.name} deals ${damage} damage!`, 'info');
        }
    }
    
    /**
     * Apply healing spell
     */
    applyHealSpell(spell, target, effectiveness) {
        if (!target) {
            target = this.game.player;
        }
        
        const baseHeal = this.rollDice(spell.power || '2d6');
        const healAmount = Math.floor(baseHeal * effectiveness);
        
        if (target.heal) {
            target.heal(healAmount);
            this.game.messageLog.add(`Healed for ${healAmount} HP!`, 'success');
        }
    }
    
    /**
     * Apply teleport spell
     */
    applyTeleportSpell(spell, target, effectiveness) {
        const range = Math.floor((spell.range || 5) * effectiveness);
        
        if (target && target.x !== undefined && target.y !== undefined) {
            // Teleport to target location
            this.game.player.x = target.x;
            this.game.player.y = target.y;
            this.game.messageLog.add('Teleported!', 'info');
        } else {
            // Random teleport
            this.game.messageLog.add(`Random teleport within ${range} tiles!`, 'info');
            // TODO: Implement random teleport
        }
    }
    
    /**
     * Apply identify spell
     */
    applyIdentifySpell(spell, effectiveness) {
        if (this.game.identificationSystem) {
            const numItems = Math.ceil(3 * effectiveness);
            this.game.messageLog.add(`Identifying ${numItems} items...`, 'info');
            // TODO: Identify multiple items
        }
    }
    
    /**
     * Apply buff spell
     */
    applyBuffSpell(spell, target, effectiveness) {
        if (!target) target = this.game.player;
        
        const duration = Math.floor((spell.duration || 10) * effectiveness);
        
        // TODO: Apply actual buff effect
        this.game.messageLog.add(`${target.name || 'You'} buffed for ${duration} turns!`, 'success');
    }
    
    /**
     * Apply debuff spell
     */
    applyDebuffSpell(spell, target, effectiveness) {
        if (!target) return;
        
        const duration = Math.floor((spell.duration || 5) * effectiveness);
        
        // TODO: Apply actual debuff effect
        this.game.messageLog.add(`${target.name} debuffed for ${duration} turns!`, 'info');
    }
    
    /**
     * Apply summon spell
     */
    applySummonSpell(spell, effectiveness) {
        const summonPower = Math.floor(100 * effectiveness);
        
        // TODO: Actually summon a creature
        this.game.messageLog.add(`Summoned a creature with ${summonPower}% power!`, 'success');
    }
    
    /**
     * Learn a new spell
     */
    learnSpell(spellId) {
        const spell = spellLoader.getSpell(spellId);
        if (!spell) return false;
        
        this.knownSpells.add(spellId);
        this.game.messageLog.add(`Learned spell: ${spell.name}!`, 'success');
        
        EventBus.emit(EVENTS.SPELL_LEARNED, { spellId });
        return true;
    }
    
    /**
     * Prepare a spell for casting
     */
    prepareSpell(spellId) {
        if (!this.knownSpells.has(spellId)) {
            this.game.messageLog.add('You don\'t know that spell!', 'warning');
            return false;
        }
        
        if (this.preparedSpells.length >= this.maxPreparedSpells) {
            this.game.messageLog.add('No room for more prepared spells!', 'warning');
            return false;
        }
        
        if (this.isPrepared(spellId)) {
            this.game.messageLog.add('Spell already prepared!', 'info');
            return false;
        }
        
        this.preparedSpells.push(spellId);
        return true;
    }
    
    /**
     * Check if spell is prepared
     */
    isPrepared(spellId) {
        return this.preparedSpells.includes(spellId);
    }
    
    /**
     * Get spell difficulty
     */
    getSpellDifficulty(spell) {
        const baseDifficulty = spell.level || 1;
        
        // Reduce difficulty for prepared spells
        const preparedBonus = this.isPrepared(spell.id) ? 1 : 0;
        
        // Wisdom bonus
        const wisdomBonus = Math.floor((this.game.player.wisdom - 10) / 5);
        
        return Math.max(1, Math.min(5, baseDifficulty - preparedBonus - wisdomBonus));
    }
    
    /**
     * Roll dice (e.g., "3d6+2")
     */
    rollDice(diceStr) {
        const match = diceStr.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return 0;
        
        const numDice = parseInt(match[1]);
        const dieSize = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        let total = modifier;
        for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * dieSize) + 1;
        }
        
        return total;
    }
    
    /**
     * Rest to restore mana
     */
    rest() {
        // Clear prepared spells and restore mana
        this.preparedSpells = [];
        this.game.player.mp = this.game.player.maxMp;
        this.game.messageLog.add('You rest and recover your magical energy.', 'info');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Learn spells from books
        EventBus.on(EVENTS.ITEM_READ, (data) => {
            if (data.item.type === 'book' && data.item.teaches === 'spell') {
                this.learnSpell(data.item.spellId);
            }
        });
        
        // Learn spells from scrolls (one-time use)
        EventBus.on(EVENTS.ITEM_USE, (data) => {
            if (data.item.type === 'scroll' && data.item.spellId) {
                this.castSpell(data.item.spellId, data.target);
                // Scroll is consumed
            }
        });
    }
    
    /**
     * Serialize magic system state
     */
    serialize() {
        return {
            knownSpells: Array.from(this.knownSpells),
            preparedSpells: this.preparedSpells,
            spellPower: this.spellPower
        };
    }
    
    /**
     * Deserialize magic system state
     */
    deserialize(data) {
        if (data.knownSpells) {
            this.knownSpells = new Set(data.knownSpells);
        }
        if (data.preparedSpells) {
            this.preparedSpells = data.preparedSpells;
        }
        if (data.spellPower !== undefined) {
            this.spellPower = data.spellPower;
        }
    }
}

export default MagicSystem;