/**
 * quiz-engine.js - Educational quiz system
 * Handles all four quiz modes: threshold, chain, escalator_threshold, escalator_chain
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuestionLoader } from '../core/question-loader.js';

export class QuizEngine {
    constructor() {
        this.currentQuiz = null;
        this.timer = null;
        this.timeRemaining = 0;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Start a quiz with specified parameters
     * @param {Object} params - Quiz parameters from calling system
     * @param {string} params.mode - threshold|chain|escalator_threshold|escalator_chain
     * @param {string} params.subject - math|philosophy|geography|etc
     * @param {number} params.startingTier - 1-5
     * @param {number} params.threshold - For threshold modes
     * @param {number} params.maxChain - For chain modes
     * @param {function} params.callback - Called with result
     * @param {string} params.reason - Why quiz is happening (for messages)
     */
    startQuiz(params) {
        // Validate parameters
        if (!this.validateParams(params)) {
            console.error('Invalid quiz parameters:', params);
            params.callback({ success: false, score: 0, mode: params.mode });
            return;
        }
        
        // Initialize quiz state
        this.currentQuiz = {
            mode: params.mode,
            subject: params.subject,
            currentTier: params.startingTier,
            startingTier: params.startingTier,
            threshold: params.threshold || 0,
            maxChain: params.maxChain || 0,
            callback: params.callback,
            reason: params.reason || 'quiz',
            
            // Progress tracking
            correctCount: 0,
            totalAsked: 0,
            currentQuestion: null,
            questionHistory: []
        };
        
        // Show quiz start message
        const subjectName = params.subject.charAt(0).toUpperCase() + params.subject.slice(1);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `${subjectName} challenge begins! (${this.getModeDescription(params.mode)})`, 
            'info'
        );
        
        // Load and show first question
        this.showNextQuestion();
    }
    
    /**
     * Show the next question in the quiz
     */
    showNextQuestion() {
        const quiz = this.currentQuiz;
        if (!quiz) return;
        
        // Check if quiz should end (reached goal)
        if (this.shouldEndQuiz()) {
            this.endQuiz(true);
            return;
        }
        
        // Get next question
        const question = QuestionLoader.getRandomQuestion(quiz.subject, quiz.currentTier);
        if (!question) {
            console.error(`No questions available for ${quiz.subject} tier ${quiz.currentTier}`);
            this.endQuiz(false);
            return;
        }
        
        quiz.currentQuestion = question;
        quiz.totalAsked++;
        
        // Calculate timer (wisdom only, no modifications in quiz engine)
        const player = window.PhilosophersQuest?.Game?.player;
        const wisdom = player?.wisdom || CONFIG.STARTING_WISDOM;
        this.timeRemaining = wisdom;
        
        // Show quiz modal
        EventBus.emit(EVENTS.UI_OPEN_QUIZ, {
            subject: quiz.subject,
            difficulty: quiz.currentTier,
            question: question,
            timeLimit: this.timeRemaining,
            reason: quiz.reason
        });
        
        // Start timer
        this.startTimer();
    }
    
    /**
     * Check if quiz should end (reached threshold or max chain)
     */
    shouldEndQuiz() {
        const quiz = this.currentQuiz;
        
        switch (quiz.mode) {
            case 'threshold':
            case 'escalator_threshold':
                return quiz.correctCount >= quiz.threshold;
                
            case 'chain':
            case 'escalator_chain':
                return quiz.correctCount >= quiz.maxChain;
                
            default:
                return false;
        }
    }
    
    /**
     * Handle answer submission
     */
    handleAnswer(answer) {
        const quiz = this.currentQuiz;
        if (!quiz || !quiz.currentQuestion) return;
        
        // Stop timer
        this.stopTimer();
        
        // Check answer (exact match, case and punctuation sensitive)
        const correct = answer === quiz.currentQuestion.answer;
        
        if (correct) {
            quiz.correctCount++;
            quiz.questionHistory.push({ 
                question: quiz.currentQuestion, 
                correct: true,
                tier: quiz.currentTier
            });
            
            EventBus.emit(EVENTS.QUIZ_CORRECT);
            EventBus.emit(EVENTS.UI_MESSAGE, 'Correct!', 'success');
            
            // Handle tier escalation for escalator modes
            if (quiz.mode === 'escalator_threshold' || quiz.mode === 'escalator_chain') {
                if (quiz.currentTier < 5) {
                    quiz.currentTier++;
                }
            }
            
            // Continue or end quiz
            setTimeout(() => {
                if (this.shouldEndQuiz()) {
                    this.endQuiz(true);
                } else {
                    this.showNextQuestion();
                }
            }, 500); // Brief pause after correct answer
            
        } else {
            // Wrong answer - quiz ends immediately
            quiz.questionHistory.push({ 
                question: quiz.currentQuestion, 
                correct: false,
                tier: quiz.currentTier
            });
            
            EventBus.emit(EVENTS.QUIZ_WRONG, { 
                correctAnswer: quiz.currentQuestion.answer 
            });
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `Wrong! The answer was: ${quiz.currentQuestion.answer}`, 
                'warning'
            );
            
            // End quiz after showing correct answer
            setTimeout(() => {
                this.endQuiz(false);
            }, 3000); // 3 seconds to read correct answer
        }
    }
    
    /**
     * Handle timer timeout
     */
    handleTimeout() {
        const quiz = this.currentQuiz;
        if (!quiz) return;
        
        EventBus.emit(EVENTS.QUIZ_TIMEOUT);
        EventBus.emit(EVENTS.UI_MESSAGE, "Time's up!", 'danger');
        
        // Treat timeout as wrong answer
        quiz.questionHistory.push({ 
            question: quiz.currentQuestion, 
            correct: false,
            timeout: true,
            tier: quiz.currentTier
        });
        
        // Show correct answer
        EventBus.emit(EVENTS.QUIZ_WRONG, { 
            correctAnswer: quiz.currentQuestion.answer 
        });
        
        setTimeout(() => {
            this.endQuiz(false);
        }, 3000);
    }
    
    /**
     * End the quiz and return results
     */
    endQuiz(reachedGoal) {
        const quiz = this.currentQuiz;
        if (!quiz) return;
        
        // Stop timer
        this.stopTimer();
        
        // Build result object
        const result = {
            mode: quiz.mode,
            score: quiz.correctCount,
            totalAsked: quiz.totalAsked,
            history: quiz.questionHistory
        };
        
        // Add success flag for threshold modes
        if (quiz.mode === 'threshold' || quiz.mode === 'escalator_threshold') {
            result.success = quiz.correctCount >= quiz.threshold;
        } else {
            // For chain modes, score of 0 means failure
            result.success = quiz.correctCount > 0;
        }
        
        // Clear quiz state
        this.currentQuiz = null;
        
        // Close modal
        EventBus.emit(EVENTS.UI_CLOSE_QUIZ);
        
        // Emit completion event
        EventBus.emit(EVENTS.QUIZ_COMPLETE, result);
        
        // Call the callback
        if (quiz.callback) {
            quiz.callback(result);
        }
    }
    
    /**
     * Start countdown timer
     */
    startTimer() {
        // Clear any existing timer
        this.stopTimer();
        
        // Update display immediately
        EventBus.emit(EVENTS.QUIZ_TIMER_UPDATE, this.timeRemaining);
        
        // Start countdown
        this.timer = setInterval(() => {
            this.timeRemaining--;
            EventBus.emit(EVENTS.QUIZ_TIMER_UPDATE, this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }
    
    /**
     * Stop countdown timer
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    /**
     * Validate quiz parameters
     */
    validateParams(params) {
        const validModes = ['threshold', 'chain', 'escalator_threshold', 'escalator_chain'];
        const validSubjects = Object.values(CONFIG.QUIZ_SUBJECTS);
        
        if (!validModes.includes(params.mode)) {
            console.error(`Invalid mode: ${params.mode}`);
            return false;
        }
        
        if (!validSubjects.includes(params.subject)) {
            console.error(`Invalid subject: ${params.subject}`);
            return false;
        }
        
        if (params.startingTier < 1 || params.startingTier > 5) {
            console.error(`Invalid starting tier: ${params.startingTier}`);
            return false;
        }
        
        // Check mode-specific requirements
        if ((params.mode === 'threshold' || params.mode === 'escalator_threshold') && !params.threshold) {
            console.error('Threshold modes require threshold parameter');
            return false;
        }
        
        if ((params.mode === 'chain' || params.mode === 'escalator_chain') && !params.maxChain) {
            console.error('Chain modes require maxChain parameter');
            return false;
        }
        
        return true;
    }
    
    /**
     * Get human-readable mode description
     */
    getModeDescription(mode) {
        switch (mode) {
            case 'threshold':
                return 'Answer correctly to succeed';
            case 'chain':
                return 'Build a chain of correct answers';
            case 'escalator_threshold':
                return 'Questions get harder with each success';
            case 'escalator_chain':
                return 'Chain with increasing difficulty';
            default:
                return 'Quiz';
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for quiz start requests
        EventBus.on(EVENTS.QUIZ_START, (params) => {
            this.startQuiz(params);
        });
        
        // Listen for answer submissions
        EventBus.on(EVENTS.QUIZ_ANSWER, (answer) => {
            this.handleAnswer(answer);
        });
        
        // Listen for quiz cancel (if needed)
        EventBus.on(EVENTS.QUIZ_CANCEL, () => {
            if (this.currentQuiz) {
                this.endQuiz(false);
            }
        });
    }
    
    /**
     * Check if quiz is active
     */
    isQuizActive() {
        return this.currentQuiz !== null;
    }
    
    /**
     * Get current quiz info (for debugging/display)
     */
    getCurrentQuizInfo() {
        if (!this.currentQuiz) return null;
        
        return {
            mode: this.currentQuiz.mode,
            subject: this.currentQuiz.subject,
            tier: this.currentQuiz.currentTier,
            progress: this.currentQuiz.correctCount,
            goal: this.currentQuiz.threshold || this.currentQuiz.maxChain
        };
    }
}

// Export singleton instance
export const quizEngine = new QuizEngine();