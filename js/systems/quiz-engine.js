/**
 * quiz-engine.js - Educational quiz system
 * Handles all four quiz modes: threshold, chain, escalator_threshold, escalator_chain
 * FINAL CORRECTED VERSION - All cross-system integration issues resolved
 */

import { CONFIG, EVENTS, QUIZ_SUBJECTS } from '../config.js';
import { EventBus } from '../core/event-bus.js';
import questionLoader from '../core/question-loader.js';

export class QuizEngine {
    constructor() {
        this.currentQuiz = null;
        this.timer = null;
        this.timeRemaining = 0;
        this.isActive = false;
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('🎓 Quiz engine initialized');
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
        // Don't start if already active
        if (this.isActive) {
            console.warn('Quiz already active, ignoring new quiz request');
            return;
        }
        
        // Validate parameters
        if (!this.validateParams(params)) {
            console.error('Invalid quiz parameters:', params);
            if (params.callback) {
                params.callback({ success: false, score: 0, mode: params.mode, error: 'Invalid parameters' });
            }
            return;
        }
        
        // Ensure questions are loaded
        if (!questionLoader.isLoaded()) {
            console.error('Questions not loaded yet');
            if (params.callback) {
                params.callback({ success: false, score: 0, mode: params.mode, error: 'Questions not loaded' });
            }
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
        
        this.isActive = true;
        
        // Emit quiz start event
        EventBus.emit(EVENTS.QUIZ_START, {
            subject: params.subject,
            mode: params.mode,
            reason: params.reason
        });
        
        // Show quiz start message
        const subjectName = params.subject.charAt(0).toUpperCase() + params.subject.slice(1);
        EventBus.emit(EVENTS.UI_MESSAGE, {
            text: `${subjectName} challenge begins! (${this.getModeDescription(params.mode)})`,
            type: 'info'
        });
        
        // Load and show first question
        this.showNextQuestion();
    }
    
    /**
     * Show the next question in the quiz
     */
    showNextQuestion() {
        const quiz = this.currentQuiz;
        if (!quiz) {
            console.error('No active quiz');
            return;
        }
        
        // Check if quiz should end (reached goal)
        if (this.shouldEndQuiz()) {
            this.endQuiz(true);
            return;
        }
        
        // Get next question using singleton instance
        const question = questionLoader.getRandomQuestion(quiz.subject, quiz.currentTier);
        if (!question) {
            console.error(`No questions available for ${quiz.subject} tier ${quiz.currentTier}`);
            
            // Try fallback to tier 1
            if (quiz.currentTier > 1) {
                console.log(`Trying fallback to tier 1 for ${quiz.subject}`);
                const fallbackQuestion = questionLoader.getRandomQuestion(quiz.subject, 1);
                if (fallbackQuestion) {
                    quiz.currentQuestion = fallbackQuestion;
                    quiz.currentTier = 1; // Reset to tier 1
                    quiz.totalAsked++;
                    console.log('Using fallback question from tier 1');
                } else {
                    console.error('No fallback questions available');
                    this.endQuiz(false);
                    return;
                }
            } else {
                console.error('No questions available even at tier 1');
                this.endQuiz(false);
                return;
            }
        } else {
            quiz.currentQuestion = question;
            quiz.totalAsked++;
        }
        
        // Calculate timer based on player wisdom
        const player = window.PhilosophersQuest?.Game?.player || 
                     (typeof global !== 'undefined' ? global.game?.player : null);
        const wisdom = player?.wisdom || CONFIG.STARTING_WISDOM;
        this.timeRemaining = Math.max(10, wisdom); // Minimum 10 seconds
        
        // Show quiz modal
        EventBus.emit(EVENTS.UI_OPEN_QUIZ, {
            subject: quiz.subject,
            difficulty: quiz.currentTier,
            question: quiz.currentQuestion,
            timeLimit: this.timeRemaining,
            reason: quiz.reason,
            progress: {
                correct: quiz.correctCount,
                total: quiz.totalAsked,
                goal: quiz.threshold || quiz.maxChain
            }
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
        if (!quiz || !quiz.currentQuestion) {
            console.warn('No active quiz or question');
            return;
        }
        
        // Stop timer
        this.stopTimer();
        
        // Normalize answer for comparison
        const normalizedAnswer = this.normalizeAnswer(answer);
        const normalizedCorrect = this.normalizeAnswer(quiz.currentQuestion.answer || quiz.currentQuestion.correct);
        
        // Check answer
        const correct = normalizedAnswer === normalizedCorrect || 
                       this.checkMultipleChoiceAnswer(quiz.currentQuestion, answer);
        
        if (correct) {
            quiz.correctCount++;
            quiz.questionHistory.push({ 
                question: quiz.currentQuestion, 
                correct: true,
                tier: quiz.currentTier,
                userAnswer: answer
            });
            
            EventBus.emit(EVENTS.QUIZ_CORRECT, {
                question: quiz.currentQuestion,
                answer: answer,
                score: quiz.correctCount
            });
            
            EventBus.emit(EVENTS.UI_MESSAGE, {
                text: 'Correct!',
                type: 'success'
            });
            
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
            }, 1000); // Brief pause after correct answer
            
        } else {
            // Wrong answer - quiz ends immediately
            quiz.questionHistory.push({ 
                question: quiz.currentQuestion, 
                correct: false,
                tier: quiz.currentTier,
                userAnswer: answer,
                correctAnswer: quiz.currentQuestion.answer || quiz.currentQuestion.correct
            });
            
            const correctAnswer = this.getCorrectAnswerText(quiz.currentQuestion);
            
            EventBus.emit(EVENTS.QUIZ_WRONG, { 
                question: quiz.currentQuestion,
                userAnswer: answer,
                correctAnswer: correctAnswer
            });
            
            EventBus.emit(EVENTS.UI_MESSAGE, {
                text: `Wrong! The answer was: ${correctAnswer}`,
                type: 'warning'
            });
            
            // End quiz after showing correct answer
            setTimeout(() => {
                this.endQuiz(false);
            }, 3000); // 3 seconds to read correct answer
        }
    }
    
    /**
     * Normalize answer for comparison
     */
    normalizeAnswer(answer) {
        if (typeof answer === 'string') {
            return answer.toLowerCase().trim().replace(/[.,!?;]/g, '');
        }
        return String(answer).toLowerCase();
    }
    
    /**
     * Check multiple choice answer
     */
    checkMultipleChoiceAnswer(question, answer) {
        if (question.type === 'multiple_choice' && question.answers) {
            const answerIndex = parseInt(answer);
            if (!isNaN(answerIndex)) {
                return answerIndex === question.correct;
            }
        }
        return false;
    }
    
    /**
     * Get correct answer text for display
     */
    getCorrectAnswerText(question) {
        if (question.type === 'multiple_choice' && question.answers) {
            return question.answers[question.correct] || question.correct;
        }
        return question.answer || question.correct || 'Unknown';
    }
    
    /**
     * Handle timer timeout
     */
    handleTimeout() {
        const quiz = this.currentQuiz;
        if (!quiz) return;
        
        EventBus.emit(EVENTS.QUIZ_TIMEOUT, {
            question: quiz.currentQuestion,
            timeRemaining: 0
        });
        
        EventBus.emit(EVENTS.UI_MESSAGE, {
            text: "Time's up!",
            type: 'danger'
        });
        
        // Treat timeout as wrong answer
        quiz.questionHistory.push({ 
            question: quiz.currentQuestion, 
            correct: false,
            timeout: true,
            tier: quiz.currentTier,
            correctAnswer: quiz.currentQuestion.answer || quiz.currentQuestion.correct
        });
        
        // Show correct answer
        const correctAnswer = this.getCorrectAnswerText(quiz.currentQuestion);
        EventBus.emit(EVENTS.QUIZ_WRONG, { 
            question: quiz.currentQuestion,
            timeout: true,
            correctAnswer: correctAnswer
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
            subject: quiz.subject,
            score: quiz.correctCount,
            totalAsked: quiz.totalAsked,
            history: quiz.questionHistory,
            reachedGoal: reachedGoal
        };
        
        // Add success flag based on mode
        if (quiz.mode === 'threshold' || quiz.mode === 'escalator_threshold') {
            result.success = quiz.correctCount >= quiz.threshold;
        } else if (quiz.mode === 'chain' || quiz.mode === 'escalator_chain') {
            result.success = quiz.correctCount >= quiz.maxChain;
        } else {
            result.success = quiz.correctCount > 0;
        }
        
        // Clear quiz state
        this.currentQuiz = null;
        this.isActive = false;
        
        // Close modal
        EventBus.emit(EVENTS.UI_CLOSE_QUIZ, result);
        
        // Emit completion event
        EventBus.emit(EVENTS.QUIZ_COMPLETE, result);
        
        // Call the callback
        if (quiz.callback) {
            try {
                quiz.callback(result);
            } catch (error) {
                console.error('Error in quiz callback:', error);
            }
        }
        
        // Show final message
        if (result.success) {
            EventBus.emit(EVENTS.UI_MESSAGE, {
                text: `Quiz completed successfully! Score: ${result.score}/${result.totalAsked}`,
                type: 'success'
            });
        } else {
            EventBus.emit(EVENTS.UI_MESSAGE, {
                text: `Quiz failed. Final score: ${result.score}/${result.totalAsked}`,
                type: 'warning'
            });
        }
    }
    
    /**
     * Start countdown timer
     */
    startTimer() {
        // Clear any existing timer
        this.stopTimer();
        
        // Start countdown
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            // Emit timer update
            EventBus.emit(EVENTS.QUIZ_QUESTION, {
                timeRemaining: this.timeRemaining,
                totalTime: this.currentQuiz ? this.currentQuiz.totalTime : 30
            });
            
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
     * Cancel current quiz
     */
    cancelQuiz() {
        if (!this.currentQuiz) return;
        
        this.stopTimer();
        
        const result = {
            mode: this.currentQuiz.mode,
            subject: this.currentQuiz.subject,
            score: this.currentQuiz.correctCount,
            totalAsked: this.currentQuiz.totalAsked,
            history: this.currentQuiz.questionHistory,
            success: false,
            cancelled: true
        };
        
        this.currentQuiz = null;
        this.isActive = false;
        
        EventBus.emit(EVENTS.UI_CLOSE_QUIZ, result);
        EventBus.emit(EVENTS.QUIZ_COMPLETE, result);
        
        EventBus.emit(EVENTS.UI_MESSAGE, {
            text: 'Quiz cancelled',
            type: 'info'
        });
    }
    
    /**
     * Validate quiz parameters
     */
    validateParams(params) {
        const validModes = ['threshold', 'chain', 'escalator_threshold', 'escalator_chain'];
        const validSubjects = Object.keys(QUIZ_SUBJECTS || {});
        
        if (!params) {
            console.error('No parameters provided');
            return false;
        }
        
        if (!validModes.includes(params.mode)) {
            console.error(`Invalid mode: ${params.mode}. Valid modes: ${validModes.join(', ')}`);
            return false;
        }
        
        if (!validSubjects.includes(params.subject)) {
            console.error(`Invalid subject: ${params.subject}. Valid subjects: ${validSubjects.join(', ')}`);
            return false;
        }
        
        if (params.startingTier < 1 || params.startingTier > 5) {
            console.error(`Invalid starting tier: ${params.startingTier}. Must be 1-5`);
            return false;
        }
        
        if (!params.callback || typeof params.callback !== 'function') {
            console.error('Callback function is required');
            return false;
        }
        
        // Check mode-specific requirements
        if ((params.mode === 'threshold' || params.mode === 'escalator_threshold') && (!params.threshold || params.threshold < 1)) {
            console.error('Threshold modes require threshold parameter >= 1');
            return false;
        }
        
        if ((params.mode === 'chain' || params.mode === 'escalator_chain') && (!params.maxChain || params.maxChain < 1)) {
            console.error('Chain modes require maxChain parameter >= 1');
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
            if (params && typeof params === 'object' && params.mode) {
                this.startQuiz(params);
            }
        });
        
        // Listen for answer submissions
        EventBus.on(EVENTS.QUIZ_ANSWER, (data) => {
            const answer = typeof data === 'string' ? data : data.answer;
            this.handleAnswer(answer);
        });
        
        // Listen for quiz cancellation
        EventBus.on(EVENTS.QUIZ_TIMEOUT, () => {
            // Timeout is handled internally
        });
    }
    
    /**
     * Check if quiz is active
     */
    isQuizActive() {
        return this.isActive;
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
            goal: this.currentQuiz.threshold || this.currentQuiz.maxChain,
            timeRemaining: this.timeRemaining,
            totalAsked: this.currentQuiz.totalAsked,
            active: this.isActive
        };
    }
    
    /**
     * Get quiz statistics
     */
    getStats() {
        return {
            active: this.isActive,
            currentQuiz: this.getCurrentQuizInfo(),
            questionsLoaded: questionLoader.isLoaded(),
            availableSubjects: questionLoader.getSubjects()
        };
    }
}

// Export singleton instance
export const quizEngine = new QuizEngine();
export default quizEngine;