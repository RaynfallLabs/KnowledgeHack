/**
 * question-loader.js - Loads question banks from JSON files
 * FIXED VERSION - Handles the actual JSON structure from questions-math.json
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
                    
                    // FIXED: Handle the actual JSON structure
                    // The JSON has structure: { "math": { "1": { "questions": [...] } } }
                    // We need to extract the inner object
                    if (data[subject]) {
                        // JSON has subject wrapper, extract the tier data
                        this.questions[subject] = data[subject];
                        console.log(`✓ Loaded ${subject} (${Object.keys(data[subject]).length} tiers)`);
                    } else {
                        // JSON is direct tier data: { "1": { "questions": [...] } }
                        this.questions[subject] = data;
                        console.log(`✓ Loaded ${subject} (${Object.keys(data).length} tiers)`);
                    }
                }
            } catch (error) {
                console.error(`✗ Failed to load ${subject}:`, error);
                // Create placeholder questions so the game can still run
                this.questions[subject] = this.createPlaceholderQuestions(subject);
            }
        }
        
        this.loaded = true;
        console.log('Question loading complete!');
        
        // Debug: Show what we actually loaded
        console.log('Loaded question structure:', Object.keys(this.questions));
        for (const subject of Object.keys(this.questions)) {
            console.log(`${subject} tiers:`, Object.keys(this.questions[subject]));
        }
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
                        "answer": "4",
                        "type": "input"
                    },
                    {
                        "question": `Sample ${subject} question: What is 5 × 3?`,
                        "answer": "15",
                        "type": "input"
                    },
                    {
                        "question": `Sample ${subject} true/false: This is a test question.`,
                        "answer": "true",
                        "type": "input"
                    }
                ]
            },
            "2": {
                "tier": 2,
                "difficulty": "Intermediate",
                "questions": [
                    {
                        "question": `Intermediate ${subject} question: What is 10 × 5?`,
                        "answer": "50",
                        "type": "input"
                    }
                ]
            },
            "3": {
                "tier": 3,
                "difficulty": "Advanced",
                "questions": [
                    {
                        "question": `Advanced ${subject} question: What is 100 ÷ 4?`,
                        "answer": "25",
                        "type": "input"
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
        
        // Debug logging
        console.log(`Looking for ${subject} tier ${tierKey}`);
        console.log(`Available tiers for ${subject}:`, Object.keys(this.questions[subject]));
        
        if (!this.questions[subject][tierKey]) {
            console.error(`No questions for ${subject} tier ${tier}`);
            // Fallback to tier 1 if requested tier doesn't exist
            if (tierKey !== "1" && this.questions[subject]["1"]) {
                console.log(`Falling back to tier 1 for ${subject}`);
                const tierData = this.questions[subject]["1"];
                const questions = tierData.questions;
                if (questions && questions.length > 0) {
                    const index = Math.floor(Math.random() * questions.length);
                    console.log(`Returning fallback question: ${questions[index].question}`);
                    return questions[index];
                }
            }
            return null;
        }
        
        const tierData = this.questions[subject][tierKey];
        const questions = tierData.questions;
        
        if (!questions || questions.length === 0) {
            console.error(`No questions array found in ${subject} tier ${tierKey}`);
            return null;
        }
        
        const index = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[index];
        
        console.log(`Selected question from ${subject} tier ${tierKey}:`, selectedQuestion.question);
        return selectedQuestion;
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
    
    /**
     * Debug method to show loaded data
     */
    debugShowLoadedData() {
        console.log('=== Question Loader Debug ===');
        for (const subject of Object.keys(this.questions)) {
            console.log(`${subject}:`);
            for (const tier of Object.keys(this.questions[subject])) {
                const questions = this.questions[subject][tier].questions;
                console.log(`  Tier ${tier}: ${questions ? questions.length : 0} questions`);
                if (questions && questions.length > 0) {
                    console.log(`    Sample: ${questions[0].question}`);
                }
            }
        }
        console.log('=== End Debug ===');
    }
}

// Create singleton instance and export it as default
const questionLoader = new QuestionLoader();
export default questionLoader;

// Also export as named export for compatibility
export { questionLoader as QuestionLoaderInstance };