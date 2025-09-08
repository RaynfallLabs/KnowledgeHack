/**
 * lockpicking.js - Lockpicking system
 * Handles lock picking through economics questions
 */

import { EventBus, EVENTS } from '../core/event-bus.js';
import { QuizEngine } from './quiz-engine.js';

export class LockpickingSystem {
    constructor(game) {
        this.game = game;
        this.quizEngine = new QuizEngine();
        this.lockpickingSkill = 0; // Improves with successful picks
        this.pickedLocks = new Set(); // Track picked locks to prevent re-locking
        
        this.setupEventListeners();
    }
    
    /**
     * Attempt to pick a lock
     */
    async pickLock(target) {
        if (!target || !target.locked) {
            this.game.messageLog.add('That is not locked.', 'info');
            return false;
        }
        
        // Check if already picked (for persistent locks)
        if (this.pickedLocks.has(target.id)) {
            target.locked = false;
            this.game.messageLog.add('You already picked this lock.', 'info');
            return true;
        }
        
        // Check for lockpicks in inventory
        if (!this.hasLockpicks()) {
            this.game.messageLog.add('You need lockpicks!', 'warning');
            return false;
        }
        
        // Determine lock difficulty
        const difficulty = this.getLockDifficulty(target);
        
        // Start economics quiz for lockpicking
        const result = await this.startLockpickingQuiz(target, difficulty);
        
        if (result.success) {
            // Unlock the target
            target.locked = false;
            this.pickedLocks.add(target.id);
            
            // Improve skill
            this.lockpickingSkill = Math.min(this.lockpickingSkill + 1, 20);
            
            // Chance to not consume lockpick based on skill
            const saveChance = this.lockpickingSkill * 5; // 5% per skill level
            if (Math.random() * 100 > saveChance) {
                this.consumeLockpick();
            } else {
                this.game.messageLog.add('Your skill saved the lockpick!', 'info');
            }
            
            this.game.messageLog.add(`Successfully picked the ${target.name || 'lock'}!`, 'success');
            EventBus.emit(EVENTS.LOCK_PICKED, { target });
            
            // Reveal contents if it's a container
            if (target.type === 'chest' || target.type === 'door') {
                this.revealContents(target);
            }
            
            return true;
        } else {
            // Failed picking
            if (result.criticalFailure) {
                // Break the lockpick
                this.consumeLockpick();
                this.game.messageLog.add('The lockpick broke!', 'danger');
                
                // Chance to jam the lock
                if (Math.random() < 0.3) {
                    target.jammed = true;
                    this.game.messageLog.add('The lock is jammed!', 'danger');
                }
            } else {
                this.game.messageLog.add('Failed to pick the lock.', 'warning');
                
                // Still consume lockpick on bad failure
                if (result.score < 30) {
                    this.consumeLockpick();
                    this.game.messageLog.add('The lockpick broke from poor technique!', 'warning');
                }
            }
            
            return false;
        }
    }
    
    /**
     * Start lockpicking quiz
     */
    async startLockpickingQuiz(target, difficulty) {
        // Number of tumblers to pick (questions to answer)
        const numTumblers = target.complexity || 3;
        let tumblersPickled = 0;
        let totalScore = 0;
        
        this.game.messageLog.add(`Attempting to pick ${numTumblers} tumblers...`, 'info');
        
        for (let i = 0; i < numTumblers; i++) {
            const result = await this.quizEngine.startQuiz(
                'economics', // Economics questions for lockpicking
                difficulty,
                { 
                    action: 'lockpicking',
                    target: target.name,
                    tumbler: i + 1
                }
            );
            
            if (result.success) {
                tumblersPickled++;
                totalScore += result.score;
                this.game.messageLog.add(`Tumbler ${i + 1} set!`, 'info');
                
                // Perfect picks might skip remaining tumblers
                if (result.score === 100 && this.lockpickingSkill >= 10) {
                    this.game.messageLog.add('Expert technique! Remaining tumblers fall into place!', 'success');
                    tumblersPickled = numTumblers;
                    totalScore += 80 * (numTumblers - i - 1); // Bonus for skipped tumblers
                    break;
                }
            } else {
                this.game.messageLog.add(`Failed at tumbler ${i + 1}!`, 'warning');
                
                // Critical failure if very bad
                if (result.score < 20) {
                    return {
                        success: false,
                        score: totalScore / (i + 1),
                        criticalFailure: true
                    };
                }
                break;
            }
        }
        
        const averageScore = totalScore / numTumblers;
        
        return {
            success: tumblersPickled === numTumblers,
            score: averageScore,
            criticalFailure: false
        };
    }
    
    /**
     * Get lock difficulty
     */
    getLockDifficulty(target) {
        const baseDifficulty = target.lockLevel || 1;
        
        // Jammed locks are harder
        const jammedPenalty = target.jammed ? 1 : 0;
        
        // Skill reduces difficulty
        const skillBonus = Math.floor(this.lockpickingSkill / 5);
        
        // Tools might provide bonus
        const toolBonus = this.getToolBonus();
        
        return Math.max(1, Math.min(5, baseDifficulty + jammedPenalty - skillBonus - toolBonus));
    }
    
    /**
     * Check if player has lockpicks
     */
    hasLockpicks() {
        if (!this.game.inventorySystem) return false;
        
        return this.game.inventorySystem.hasItem('lockpick') ||
               this.game.inventorySystem.hasItem('skeleton_key') ||
               this.game.inventorySystem.hasItem('thieves_tools');
    }
    
    /**
     * Consume a lockpick
     */
    consumeLockpick() {
        if (!this.game.inventorySystem) return;
        
        // Try to consume basic lockpick first
        if (this.game.inventorySystem.hasItem('lockpick')) {
            this.game.inventorySystem.removeItem('lockpick', 1);
        } else if (this.game.inventorySystem.hasItem('thieves_tools')) {
            // Thieves tools have multiple uses
            const tools = this.game.inventorySystem.getItem('thieves_tools');
            if (tools && tools.uses) {
                tools.uses--;
                if (tools.uses <= 0) {
                    this.game.inventorySystem.removeItem('thieves_tools');
                }
            }
        }
        // Skeleton keys don't break
    }
    
    /**
     * Get bonus from lockpicking tools
     */
    getToolBonus() {
        if (!this.game.inventorySystem) return 0;
        
        if (this.game.inventorySystem.hasItem('skeleton_key')) {
            return 2; // Skeleton key provides big bonus
        } else if (this.game.inventorySystem.hasItem('thieves_tools')) {
            return 1; // Thieves tools provide moderate bonus
        }
        
        return 0;
    }
    
    /**
     * Reveal contents of picked container
     */
    revealContents(target) {
        if (target.type === 'chest' && target.contents) {
            this.game.messageLog.add('The chest contains:', 'info');
            target.contents.forEach(item => {
                this.game.messageLog.add(`  - ${item.name}`, 'info');
                EventBus.emit(EVENTS.ITEM_FOUND, { item });
            });
        } else if (target.type === 'door') {
            this.game.messageLog.add('The door swings open.', 'info');
            // Update dungeon tile to open door
            if (this.game.dungeon) {
                const tile = this.game.dungeon.getTile(target.x, target.y);
                if (tile) {
                    tile.type = 'open_door';
                    tile.passable = true;
                }
            }
        }
    }
    
    /**
     * Force a lock open (breaks it permanently)
     */
    bashLock(target) {
        if (!target || !target.locked) {
            this.game.messageLog.add('That is not locked.', 'info');
            return false;
        }
        
        // Strength check
        const strengthRequired = (target.lockLevel || 1) * 5 + 10;
        if (this.game.player.strength < strengthRequired) {
            this.game.messageLog.add('You are not strong enough to force this lock!', 'warning');
            return false;
        }
        
        // Success - but might damage contents or alert enemies
        target.locked = false;
        target.broken = true;
        
        this.game.messageLog.add('You smash the lock!', 'success');
        
        // Chance to damage contents
        if (target.contents && Math.random() < 0.3) {
            this.game.messageLog.add('Some contents were damaged!', 'warning');
            // TODO: Actually damage items
        }
        
        // Alert nearby enemies
        EventBus.emit(EVENTS.LOUD_NOISE, { x: target.x, y: target.y, radius: 10 });
        
        return true;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auto-pick simple locks at high skill
        EventBus.on(EVENTS.INTERACT, (data) => {
            if (data.target.locked && data.target.lockLevel === 1 && this.lockpickingSkill >= 15) {
                this.game.messageLog.add('Your expertise makes this lock trivial.', 'info');
                data.target.locked = false;
                this.pickedLocks.add(data.target.id);
            }
        });
    }
    
    /**
     * Serialize lockpicking system state
     */
    serialize() {
        return {
            lockpickingSkill: this.lockpickingSkill,
            pickedLocks: Array.from(this.pickedLocks)
        };
    }
    
    /**
     * Deserialize lockpicking system state
     */
    deserialize(data) {
        if (data.lockpickingSkill !== undefined) {
            this.lockpickingSkill = data.lockpickingSkill;
        }
        if (data.pickedLocks) {
            this.pickedLocks = new Set(data.pickedLocks);
        }
    }
}

export default LockpickingSystem;