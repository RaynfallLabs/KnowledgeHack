/**
 * question-loader.js - Loads question banks from JSON files
 * Simple loader for the 9 subject files we already have
 */

class QuestionLoaderClass {
    constructor() {
        this.questions = {};
        this.loaded = false;
    }
    
    /**
     * Load all question banks at startup
     */
    async loadAllQuestions() {
        if (this.loaded) return;
        
        const subjects = [
            'math',
            'philosophy',
            'geography',
            'science',
            'history',
            'economics',
            'cooking',
            'grammar',
            'animal'
        ];
        
        console.log('Loading question banks...');
        
        for (const subject of subjects) {
            try {
                const response = await fetch(`data/questions-${subject}.json`);
                const data = await response.json();
                this.questions[subject] = data;
                console.log(`✓ Loaded ${subject}`);
            } catch (error) {
                console.error(`✗ Failed to load ${subject}:`, error);
            }
        }
        
        this.loaded = true;
        console.log('Question loading complete!');
    }
    
    /**
     * Get a random question from a subject and tier
     */
    getRandomQuestion(subject, tier = 1) {
        // Make sure tier is a string to match JSON structure
        const tierKey = tier.toString();
        
        if (!this.questions[subject] || !this.questions[subject][tierKey]) {
            console.error(`No questions for ${subject} tier ${tier}`);
            return null;
        }
        
        const tierData = this.questions[subject][tierKey];
        const questions = tierData.questions;
        
        if (!questions || questions.length === 0) {
            return null;
        }
        
        const index = Math.floor(Math.random() * questions.length);
        return questions[index];
    }
    
    /**
     * Get multiple random questions without repeats
     */
    getRandomQuestions(subject, tier, count) {
        const tierKey = tier.toString();
        
        if (!this.questions[subject] || !this.questions[subject][tierKey]) {
            return [];
        }
        
        const tierData = this.questions[subject][tierKey];
        const allQuestions = [...tierData.questions]; // Copy array
        const selected = [];
        
        // Shuffle and take first N questions
        for (let i = 0; i < Math.min(count, allQuestions.length); i++) {
            const index = Math.floor(Math.random() * allQuestions.length);
            selected.push(allQuestions.splice(index, 1)[0]);
        }
        
        return selected;
    }
}

// Create singleton instance
const QuestionLoader = new QuestionLoaderClass();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestionLoader;
} else {
    window.QuestionLoader = QuestionLoader;
}