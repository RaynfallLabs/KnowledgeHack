/**
 * question-loader.js - Loads question banks from JSON files
 * Simple loader for the 9 subject files we already have
 */

export class QuestionLoader {
    constructor() {
        this.questions = {};
        this.loaded = false;
        this.baseUrl = window.location.hostname === 'localhost' ? '/' : '/KnowledgeHack/';
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
                const response = await fetch(`${this.baseUrl}data/questions/questions-${subject}.json`);
                if (!response.ok) {
                    console.warn(`✗ ${subject} questions not found (${response.status})`);
                    // Create placeholder questions so the game can still run
                    this.questions[subject] = this.createPlaceholderQuestions(subject);
                } else {
                    const data = await response.json();
                    this.questions[subject] = data;
                    console.log(`✓ Loaded ${subject}`);
                }
            } catch (error) {
                console.error(`✗ Failed to load ${subject}:`, error);
                // Create placeholder questions so the game can still run
                this.questions[subject] = this.createPlaceholderQuestions(subject);
            }
        }
        
        this.loaded = true;
        console.log('Question loading complete!');
    }
    
    /**
     * Create placeholder questions for missing files
     */
    createPlaceholderQuestions(subject) {
        return {
            "1": {
                "tier": 1,
                "difficulty": "Basic",
                "questions": [
                    {
                        "question": `Sample ${subject} question: What is 2 + 2?`,
                        "type": "multiple_choice",
                        "answers": ["3", "4", "5", "6"],
                        "correct": 1,
                        "explanation": "2 + 2 = 4"
                    },
                    {
                        "question": `Sample ${subject} question: True or False: This is a test question.`,
                        "type": "true_false",
                        "correct": true,
                        "explanation": "This is indeed a test question."
                    }
                ]
            },
            "2": {
                "tier": 2,
                "difficulty": "Intermediate",
                "questions": [
                    {
                        "question": `Intermediate ${subject} question: What is 10 * 5?`,
                        "type": "multiple_choice",
                        "answers": ["40", "45", "50", "55"],
                        "correct": 2,
                        "explanation": "10 * 5 = 50"
                    }
                ]
            },
            "3": {
                "tier": 3,
                "difficulty": "Advanced",
                "questions": [
                    {
                        "question": `Advanced ${subject} question: What is 100 / 4?`,
                        "type": "multiple_choice",
                        "answers": ["20", "25", "30", "35"],
                        "correct": 1,
                        "explanation": "100 / 4 = 25"
                    }
                ]
            }
        };
    }
    
    /**
     * Get a random question from a subject and tier
     */
    getRandomQuestion(subject, tier = 1) {
        // Make sure tier is a string to match JSON structure
        const tierKey = tier.toString();
        
        if (!this.questions[subject]) {
            console.error(`Subject ${subject} not loaded`);
            return null;
        }
        
        if (!this.questions[subject][tierKey]) {
            console.error(`No questions for ${subject} tier ${tier}`);
            // Fallback to tier 1 if requested tier doesn't exist
            if (this.questions[subject]["1"]) {
                const tierData = this.questions[subject]["1"];
                const questions = tierData.questions;
                if (questions && questions.length > 0) {
                    const index = Math.floor(Math.random() * questions.length);
                    return questions[index];
                }
            }
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
        
        if (!this.questions[subject]) {
            console.error(`Subject ${subject} not loaded`);
            return [];
        }
        
        if (!this.questions[subject][tierKey]) {
            // Fallback to tier 1
            if (this.questions[subject]["1"]) {
                const tierData = this.questions[subject]["1"];
                const allQuestions = [...tierData.questions];
                const selected = [];
                
                for (let i = 0; i < Math.min(count, allQuestions.length); i++) {
                    const index = Math.floor(Math.random() * (allQuestions.length - i));
                    selected.push(allQuestions.splice(index, 1)[0]);
                }
                
                return selected;
            }
            return [];
        }
        
        const tierData = this.questions[subject][tierKey];
        const allQuestions = [...tierData.questions]; // Copy array
        const selected = [];
        
        // Shuffle and take first N questions
        for (let i = 0; i < Math.min(count, allQuestions.length); i++) {
            const index = Math.floor(Math.random() * (allQuestions.length - i));
            selected.push(allQuestions.splice(index, 1)[0]);
        }
        
        return selected;
    }
    
    /**
     * Check if questions are loaded
     */
    isLoaded() {
        return this.loaded;
    }
    
    /**
     * Get all subjects
     */
    getSubjects() {
        return Object.keys(this.questions);
    }
    
    /**
     * Get tier info for a subject
     */
    getTiers(subject) {
        if (!this.questions[subject]) {
            return [];
        }
        return Object.keys(this.questions[subject]);
    }
}

// Create singleton instance and export it as default
const questionLoader = new QuestionLoader();
export default questionLoader;

// Also export as named export for compatibility
export { questionLoader as QuestionLoaderInstance };