/**
 * cooking.js - Cooking system
 * Handles food preparation through cooking questions (escalator chain)
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class CookingSystem {
    constructor(game) {
        this.game = game;
        this.quizEngine = new QuizEngine();
        this.knownRecipes = new Set();
        this.cookingBonus = 0; // Improves with successful cooking
        
        this.setupEventListeners();
    }
    
    /**
     * Cook food item(s)
     */
    async cookFood(ingredients) {
        if (!ingredients || ingredients.length === 0) {
            this.game.messageLog.add('You need ingredients to cook!', 'warning');
            return null;
        }
        
        // Find matching recipe
        const recipe = this.findRecipe(ingredients);
        if (!recipe) {
            this.game.messageLog.add('You don\'t know a recipe for these ingredients.', 'info');
            return null;
        }
        
        // Start escalator chain quiz for cooking
        const difficulty = this.getRecipeDifficulty(recipe);
        const result = await this.startCookingQuiz(recipe, difficulty);
        
        if (result.success) {
            const cookedFood = this.createCookedFood(recipe, result.score);
            
            // Remove ingredients from inventory
            this.consumeIngredients(ingredients);
            
            // Add to known recipes
            this.knownRecipes.add(recipe.id);
            
            // Improve cooking skill
            this.cookingBonus = Math.min(this.cookingBonus + 1, 10);
            
            this.game.messageLog.add(`Successfully cooked ${cookedFood.name}!`, 'success');
            EventBus.emit(EVENTS.ITEM_CREATED, { item: cookedFood });
            
            return cookedFood;
        } else {
            // Cooking failed - ingredients might be wasted
            if (result.score < 30) {
                this.consumeIngredients(ingredients);
                this.game.messageLog.add('Cooking failed! The ingredients were ruined.', 'danger');
            } else {
                this.game.messageLog.add('Cooking failed, but you saved the ingredients.', 'warning');
            }
            return null;
        }
    }
    
    /**
     * Start cooking quiz (escalator chain)
     */
    async startCookingQuiz(recipe, baseDifficulty) {
        const questions = [];
        let currentDifficulty = baseDifficulty;
        
        // Escalator chain: each correct answer makes next question harder
        for (let i = 0; i < recipe.steps || 3; i++) {
            questions.push({
                subject: 'cooking',
                difficulty: Math.min(currentDifficulty + i, 5),
                step: i + 1
            });
        }
        
        let totalScore = 0;
        let correctAnswers = 0;
        
        for (const question of questions) {
            const result = await this.quizEngine.startQuiz(
                question.subject,
                question.difficulty,
                { 
                    action: 'cooking',
                    recipe: recipe.name,
                    step: question.step
                }
            );
            
            if (result.success) {
                correctAnswers++;
                totalScore += result.score;
                this.game.messageLog.add(`Step ${question.step} complete!`, 'info');
            } else {
                this.game.messageLog.add(`Failed at step ${question.step}!`, 'warning');
                break; // Stop on first failure
            }
        }
        
        return {
            success: correctAnswers === questions.length,
            score: totalScore / questions.length,
            steps: correctAnswers
        };
    }
    
    /**
     * Find recipe matching ingredients
     */
    findRecipe(ingredients) {
        // TODO: Load from data/recipes.json
        const recipes = [
            {
                id: 'bread',
                name: 'Bread',
                ingredients: ['flour', 'water'],
                difficulty: 1,
                nutrition: 15,
                steps: 2
            },
            {
                id: 'stew',
                name: 'Hearty Stew',
                ingredients: ['meat', 'vegetables', 'water'],
                difficulty: 2,
                nutrition: 30,
                steps: 3
            },
            {
                id: 'potion_soup',
                name: 'Magical Soup',
                ingredients: ['herbs', 'mushroom', 'water'],
                difficulty: 3,
                nutrition: 20,
                effect: 'mana_restore',
                steps: 4
            }
        ];
        
        const ingredientIds = ingredients.map(i => i.id).sort();
        
        return recipes.find(recipe => {
            const recipeIngredients = recipe.ingredients.sort();
            return JSON.stringify(recipeIngredients) === JSON.stringify(ingredientIds);
        });
    }
    
    /**
     * Get recipe difficulty
     */
    getRecipeDifficulty(recipe) {
        const baseDifficulty = recipe.difficulty || 1;
        // Reduce difficulty if recipe is known
        const knownBonus = this.knownRecipes.has(recipe.id) ? 1 : 0;
        // Apply cooking skill bonus
        const skillBonus = Math.floor(this.cookingBonus / 3);
        
        return Math.max(1, baseDifficulty - knownBonus - skillBonus);
    }
    
    /**
     * Create cooked food item
     */
    createCookedFood(recipe, quality) {
        const qualityMultiplier = 0.5 + (quality / 100);
        
        return {
            id: `cooked_${recipe.id}`,
            name: recipe.name,
            type: 'food',
            nutrition: Math.floor(recipe.nutrition * qualityMultiplier),
            healAmount: Math.floor(recipe.nutrition * qualityMultiplier),
            effect: recipe.effect || null,
            quality: quality > 80 ? 'excellent' : quality > 60 ? 'good' : 'normal',
            stackable: true
        };
    }
    
    /**
     * Consume ingredients from inventory
     */
    consumeIngredients(ingredients) {
        if (!this.game.inventorySystem) return;
        
        ingredients.forEach(ingredient => {
            this.game.inventorySystem.removeItem(ingredient);
        });
    }
    
    /**
     * Learn a new recipe
     */
    learnRecipe(recipeId) {
        this.knownRecipes.add(recipeId);
        this.game.messageLog.add('Learned a new recipe!', 'success');
    }
    
    /**
     * Get list of known recipes
     */
    getKnownRecipes() {
        return Array.from(this.knownRecipes);
    }
    
    /**
     * Check if player knows a recipe
     */
    knowsRecipe(recipeId) {
        return this.knownRecipes.has(recipeId);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Learn recipes from books
        EventBus.on(EVENTS.ITEM_READ, (data) => {
            if (data.item.type === 'book' && data.item.teaches === 'recipe') {
                this.learnRecipe(data.item.recipeId);
            }
        });
    }
    
    /**
     * Serialize cooking system state
     */
    serialize() {
        return {
            knownRecipes: Array.from(this.knownRecipes),
            cookingBonus: this.cookingBonus
        };
    }
    
    /**
     * Deserialize cooking system state
     */
    deserialize(data) {
        if (data.knownRecipes) {
            this.knownRecipes = new Set(data.knownRecipes);
        }
        if (data.cookingBonus !== undefined) {
            this.cookingBonus = data.cookingBonus;
        }
    }
}

export default CookingSystem;