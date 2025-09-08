/**
 * harvesting.js - Corpse harvesting system
 * Handles harvesting materials from corpses through animal fact questions (threshold)
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class HarvestingSystem {
    constructor(game) {
        this.game = game;
        this.quizEngine = new QuizEngine();
        this.harvestingSkill = 0; // Improves with successful harvests
        this.knownCreatures = new Set(); // Creatures successfully harvested before
        
        this.setupEventListeners();
    }
    
    /**
     * Harvest a corpse
     */
    async harvestCorpse(corpse) {
        if (!corpse || corpse.type !== 'corpse') {
            this.game.messageLog.add('That cannot be harvested.', 'warning');
            return null;
        }
        
        // Check if already harvested
        if (corpse.harvested) {
            this.game.messageLog.add('This corpse has already been harvested.', 'info');
            return null;
        }
        
        // Start threshold quiz for harvesting
        const difficulty = this.getHarvestDifficulty(corpse);
        const threshold = this.getHarvestThreshold(corpse);
        
        const result = await this.startHarvestingQuiz(corpse, difficulty, threshold);
        
        if (result.success) {
            const materials = this.extractMaterials(corpse, result.score);
            corpse.harvested = true;
            
            // Add creature to known list
            this.knownCreatures.add(corpse.creatureType);
            
            // Improve harvesting skill
            this.harvestingSkill = Math.min(this.harvestingSkill + 1, 20);
            
            this.game.messageLog.add(`Successfully harvested ${materials.length} materials!`, 'success');
            
            materials.forEach(material => {
                EventBus.emit(EVENTS.ITEM_CREATED, { item: material });
            });
            
            return materials;
        } else {
            // Failed harvesting might damage the corpse
            if (result.score < threshold * 0.5) {
                corpse.harvested = true; // Ruined
                this.game.messageLog.add('Failed harvesting - the corpse was ruined!', 'danger');
            } else {
                this.game.messageLog.add('Failed to harvest properly. You can try again.', 'warning');
            }
            return null;
        }
    }
    
    /**
     * Start harvesting quiz (threshold system)
     */
    async startHarvestingQuiz(corpse, difficulty, threshold) {
        // Multiple questions, need to reach threshold score
        const numQuestions = 3;
        let totalScore = 0;
        let questionsAnswered = 0;
        
        this.game.messageLog.add(`Harvesting ${corpse.name}... (Need ${threshold}% knowledge)`, 'info');
        
        for (let i = 0; i < numQuestions; i++) {
            const result = await this.quizEngine.startQuiz(
                'animal', // Animal facts for harvesting
                difficulty,
                { 
                    action: 'harvesting',
                    creature: corpse.creatureType,
                    question: i + 1
                }
            );
            
            if (result.success) {
                questionsAnswered++;
                totalScore += result.score;
            }
            
            // Calculate current average
            const currentAverage = totalScore / (i + 1);
            
            // Early success if already above threshold
            if (currentAverage >= threshold && questionsAnswered > 0) {
                this.game.messageLog.add('Excellent knowledge! Harvesting complete.', 'success');
                break;
            }
            
            // Early failure if impossible to reach threshold
            const remainingQuestions = numQuestions - (i + 1);
            const maxPossibleAverage = (totalScore + (remainingQuestions * 100)) / numQuestions;
            if (maxPossibleAverage < threshold) {
                this.game.messageLog.add('Insufficient knowledge to continue.', 'warning');
                break;
            }
        }
        
        const finalScore = totalScore / Math.max(questionsAnswered, 1);
        
        return {
            success: finalScore >= threshold,
            score: finalScore
        };
    }
    
    /**
     * Get harvest difficulty based on creature
     */
    getHarvestDifficulty(corpse) {
        const creaturePower = corpse.creaturePower || 1;
        
        // Known creatures are easier
        const knownBonus = this.knownCreatures.has(corpse.creatureType) ? 1 : 0;
        
        // Apply skill bonus
        const skillBonus = Math.floor(this.harvestingSkill / 5);
        
        const difficulty = Math.ceil(creaturePower / 3);
        return Math.max(1, Math.min(5, difficulty - knownBonus - skillBonus));
    }
    
    /**
     * Get score threshold needed for successful harvest
     */
    getHarvestThreshold(corpse) {
        const baseThreshold = {
            'common': 50,
            'uncommon': 60,
            'rare': 70,
            'exotic': 80,
            'legendary': 90
        };
        
        const rarity = corpse.rarity || 'common';
        return baseThreshold[rarity] || 60;
    }
    
    /**
     * Extract materials from corpse based on quality
     */
    extractMaterials(corpse, quality) {
        const materials = [];
        const qualityMultiplier = quality / 100;
        
        // Base materials every creature has
        if (Math.random() < qualityMultiplier) {
            materials.push({
                id: `${corpse.creatureType}_hide`,
                name: `${corpse.creatureName} Hide`,
                type: 'material',
                value: Math.floor(corpse.creaturePower * 5 * qualityMultiplier),
                stackable: true
            });
        }
        
        // Bones (common)
        if (Math.random() < qualityMultiplier * 0.8) {
            materials.push({
                id: `${corpse.creatureType}_bone`,
                name: `${corpse.creatureName} Bone`,
                type: 'material',
                value: Math.floor(corpse.creaturePower * 3 * qualityMultiplier),
                stackable: true
            });
        }
        
        // Special materials based on creature type
        if (corpse.specialMaterials) {
            corpse.specialMaterials.forEach(special => {
                if (Math.random() < qualityMultiplier * special.chance) {
                    materials.push({
                        ...special,
                        quality: quality > 80 ? 'pristine' : quality > 60 ? 'good' : 'normal'
                    });
                }
            });
        }
        
        // Meat (if edible)
        if (corpse.edible && Math.random() < qualityMultiplier * 0.7) {
            materials.push({
                id: `${corpse.creatureType}_meat`,
                name: `${corpse.creatureName} Meat`,
                type: 'food',
                nutrition: Math.floor(corpse.creaturePower * 10 * qualityMultiplier),
                stackable: true
            });
        }
        
        return materials;
    }
    
    /**
     * Get list of harvestable corpses in inventory
     */
    getHarvestableCorpses() {
        if (!this.game.inventorySystem) return [];
        
        return this.game.inventorySystem.getItems().filter(item => {
            return item.type === 'corpse' && !item.harvested;
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auto-harvest on monster kill if skill is high enough
        EventBus.on(EVENTS.MONSTER_KILLED, (data) => {
            if (this.harvestingSkill >= 10) {
                this.game.messageLog.add('Your harvesting expertise allows quick field dressing.', 'info');
                // Create corpse item
                const corpse = this.createCorpse(data.monster);
                EventBus.emit(EVENTS.ITEM_CREATED, { item: corpse });
            }
        });
    }
    
    /**
     * Create corpse item from monster
     */
    createCorpse(monster) {
        return {
            id: `corpse_${monster.id}`,
            name: `${monster.name} Corpse`,
            type: 'corpse',
            creatureType: monster.id,
            creatureName: monster.name,
            creaturePower: monster.level || 1,
            rarity: monster.rarity || 'common',
            edible: monster.edible !== false,
            specialMaterials: monster.materials || [],
            harvested: false,
            weight: monster.size || 10,
            decayTime: 100 // Turns before corpse disappears
        };
    }
    
    /**
     * Serialize harvesting system state
     */
    serialize() {
        return {
            harvestingSkill: this.harvestingSkill,
            knownCreatures: Array.from(this.knownCreatures)
        };
    }
    
    /**
     * Deserialize harvesting system state
     */
    deserialize(data) {
        if (data.harvestingSkill !== undefined) {
            this.harvestingSkill = data.harvestingSkill;
        }
        if (data.knownCreatures) {
            this.knownCreatures = new Set(data.knownCreatures);
        }
    }
}

export default HarvestingSystem;