/**
 * monster-abilities.js - Complete monster special abilities system
 * Based on NetHack source code with all monster special abilities
 */

import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../core/event-bus.js';
import { rollDice } from '../utils/dice.js';

export class MonsterAbilities {
    /**
     * Use a monster ability
     * @param {Monster} monster - The monster using the ability
     * @param {Object} ability - The ability definition
     * @param {Object} target - The target (usually player)
     * @param {Game} game - Game instance
     * @returns {boolean} - True if ability was used successfully
     */
    static use(monster, ability, target, game) {
        if (!ability || !monster || !target) return false;
        
        // Check if monster is incapacitated
        if (monster.sleeping || monster.stunned || monster.confused) return false;
        
        // Delegate to specific ability handler
        const handler = this.getAbilityHandler(ability.type);
        if (!handler) {
            console.warn(`Unknown ability type: ${ability.type}`);
            return false;
        }
        
        return handler.call(this, monster, ability, target, game);
    }
    
    /**
     * Get ability handler function
     */
    static getAbilityHandler(type) {
        const handlers = {
            // Breath Weapons
            'breath_weapon': this.breathWeapon,
            'fire_breath': this.fireBreath,
            'cold_breath': this.coldBreath,
            'lightning_breath': this.lightningBreath,
            'acid_breath': this.acidBreath,
            'poison_breath': this.poisonBreath,
            'disintegration_breath': this.disintegrationBreath,
            'sleep_breath': this.sleepBreath,
            
            // Gaze Attacks
            'gaze_attack': this.gazeAttack,
            'petrification_gaze': this.petrificationGaze,
            'death_gaze': this.deathGaze,
            'paralysis_gaze': this.paralysisGaze,
            'confusion_gaze': this.confusionGaze,
            'fear_gaze': this.fearGaze,
            'slow_gaze': this.slowGaze,
            'cancellation_gaze': this.cancellationGaze,
            
            // Engulfing Attacks
            'engulf': this.engulf,
            'digestion': this.digestion,
            'acid_engulf': this.acidEngulf,
            'fire_engulf': this.fireEngulf,
            'drowning': this.drowning,
            
            // Movement Abilities
            'teleport_self': this.teleportSelf,
            'teleport_other': this.teleportOther,
            'phase': this.phase,
            'fly': this.fly,
            'swim': this.swim,
            'speed_burst': this.speedBurst,
            
            // Summoning & Creation
            'summon_monsters': this.summonMonsters,
            'summon_insects': this.summonInsects,
            'summon_undead': this.summonUndead,
            'summon_demons': this.summonDemons,
            'create_web': this.createWeb,
            'lay_eggs': this.layEggs,
            
            // Transformation Abilities
            'shapechange': this.shapechange,
            'invisibility': this.invisibility,
            'polymorphism': this.polymorphism,
            'split_on_damage': this.splitOnDamage,
            
            // Theft & Manipulation
            'steal_item': this.stealItem,
            'steal_gold': this.stealGold,
            'steal_weapon': this.stealWeapon,
            'disarm': this.disarm,
            'rust_items': this.rustItems,
            'corrode_items': this.corrodeItems,
            
            // Touch Attacks
            'stone_touch': this.stoneTouch,
            'rust_touch': this.rustTouch,
            'shock_touch': this.shockTouch,
            'freeze_touch': this.freezeTouch,
            'acid_touch': this.acidTouch,
            'drain_touch': this.drainTouch,
            'paralyze_touch': this.paralyzeTouch,
            
            // Projectile Attacks
            'spit_venom': this.spitVenom,
            'spit_acid': this.spitAcid,
            'spit_web': this.spitWeb,
            'throw_boulder': this.throwBoulder,
            
            // Defensive Abilities
            'regeneration': this.regeneration,
            'reflection': this.reflection,
            'magic_resistance': this.magicResistance,
            'damage_reduction': this.damageReduction,
            
            // Special Actions
            'explode_on_death': this.explodeOnDeath,
            'disease_attack': this.diseaseAttack,
            'level_drain': this.levelDrain,
            'energy_drain': this.energyDrain,
            'mind_blast': this.mindBlast,
            'temporal_stasis': this.temporalStasis,
            'banishment': this.banishment,
            
            // Unique Abilities
            'turn_to_gold': this.turnToGold,
            'rider_revival': this.riderRevival,
            'covetous_warp': this.covetousWarp,
            'photography_resistance': this.photographyResistance
        };
        
        return handlers[type];
    }
    
    // ========== BREATH WEAPONS ==========
    
    static breathWeapon(monster, ability, target, game) {
        const range = ability.range || 8;
        const damage = rollDice(ability.damage);
        const element = ability.element || 'fire';
        
        // Check line of sight
        if (!this.hasLineOfSight(monster, target, game, range)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} breathes ${element}!`, 'danger');
        
        // Apply damage based on element
        const finalDamage = this.applyElementalDamage(target, damage, element);
        
        if (finalDamage > 0) {
            target.takeDamage(finalDamage);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You are hit by the ${element} breath for ${finalDamage} damage!`, 'danger');
        } else {
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You resist the ${element}!`, 'success');
        }
        
        return true;
    }
    
    static fireBreath(monster, ability, target, game) {
        return this.breathWeapon(monster, {...ability, element: 'fire'}, target, game);
    }
    
    static coldBreath(monster, ability, target, game) {
        return this.breathWeapon(monster, {...ability, element: 'cold'}, target, game);
    }
    
    static lightningBreath(monster, ability, target, game) {
        const success = this.breathWeapon(monster, {...ability, element: 'lightning'}, target, game);
        // Lightning can blind even with reflection
        if (success && Math.random() < 0.3) {
            target.addEffect('blinded', 5);
            EventBus.emit(EVENTS.UI_MESSAGE, 'You are blinded by the flash!', 'warning');
        }
        return success;
    }
    
    static acidBreath(monster, ability, target, game) {
        const success = this.breathWeapon(monster, {...ability, element: 'acid'}, target, game);
        if (success) {
            // Acid can damage equipment
            this.tryDamageEquipment(target, 'acid');
        }
        return success;
    }
    
    static poisonBreath(monster, ability, target, game) {
        const success = this.breathWeapon(monster, {...ability, element: 'poison'}, target, game);
        if (success && !target.resistances?.includes('poison')) {
            target.addEffect('poisoned', 10);
            EventBus.emit(EVENTS.UI_MESSAGE, 'You feel very sick!', 'danger');
        }
        return success;
    }
    
    static disintegrationBreath(monster, ability, target, game) {
        if (!this.hasLineOfSight(monster, target, game, 8)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} breathes disintegration!`, 'danger');
        
        if (target.resistances?.includes('disintegration')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist disintegration!', 'success');
            return true;
        }
        
        // Disintegration is usually fatal unless resisted
        if (target.hasReflection && target.hasReflection()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'The beam reflects back!', 'success');
            monster.takeDamage(monster.hp); // Reflects back at full power
        } else {
            const damage = Math.floor(target.hp * 0.75); // Massive damage
            target.takeDamage(damage);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You are disintegrated for ${damage} damage!`, 'danger');
        }
        
        return true;
    }
    
    static sleepBreath(monster, ability, target, game) {
        if (!this.hasLineOfSight(monster, target, game, 8)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} breathes sleep gas!`, 'warning');
        
        if (target.resistances?.includes('sleep')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist the sleep gas!', 'success');
            return true;
        }
        
        // Sleep the target
        target.addEffect('sleeping', 5 + Math.floor(Math.random() * 5));
        EventBus.emit(EVENTS.UI_MESSAGE, 'You fall asleep!', 'danger');
        
        return true;
    }
    
    // ========== GAZE ATTACKS ==========
    
    static gazeAttack(monster, ability, target, game) {
        // Generic gaze attack handler
        const effect = ability.effect || 'confusion';
        const duration = ability.duration || 5;
        
        if (!this.canGaze(monster, target, game)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} gazes at you!`, 'warning');
        
        // Check for protection
        if (target.isBlind || target.isBlind()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'Being blind protects you!', 'info');
            return true;
        }
        
        if (target.hasReflection && target.hasReflection()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'The gaze reflects back!', 'success');
            monster.addEffect(effect, duration);
            return true;
        }
        
        // Apply effect
        target.addEffect(effect, duration);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You are affected by the ${effect} gaze!`, 'danger');
        
        return true;
    }
    
    static petrificationGaze(monster, ability, target, game) {
        if (!this.canGaze(monster, target, game)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name}'s gaze turns you to stone!`, 'danger');
        
        if (target.isBlind || target.isBlind()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'Being blind protects you!', 'info');
            return true;
        }
        
        if (target.hasReflection && target.hasReflection()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'The gaze reflects back!', 'success');
            monster.takeDamage(monster.hp); // Medusa turns to stone
            return true;
        }
        
        if (target.resistances?.includes('petrification')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist petrification!', 'success');
            return true;
        }
        
        // Petrification is usually fatal
        target.takeDamage(target.hp);
        EventBus.emit(EVENTS.UI_MESSAGE, 'You turn to stone!', 'danger');
        
        return true;
    }
    
    static deathGaze(monster, ability, target, game) {
        if (!this.canGaze(monster, target, game)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} gazes at you with deadly intent!`, 'danger');
        
        if (target.isBlind || target.isBlind()) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'Being blind protects you!', 'info');
            return true;
        }
        
        if (target.resistances?.includes('death')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist the death magic!', 'success');
            return true;
        }
        
        // Death gaze - chance of instant death
        if (Math.random() < 0.3) {
            target.takeDamage(target.hp);
            EventBus.emit(EVENTS.UI_MESSAGE, 'You die from the gaze!', 'danger');
        } else {
            const damage = Math.floor(target.hp * 0.5);
            target.takeDamage(damage);
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `You feel your life force drain away! (${damage} damage)`, 'danger');
        }
        
        return true;
    }
    
    static paralysisGaze(monster, ability, target, game) {
        return this.gazeAttack(monster, {...ability, effect: 'paralyzed'}, target, game);
    }
    
    static confusionGaze(monster, ability, target, game) {
        return this.gazeAttack(monster, {...ability, effect: 'confused'}, target, game);
    }
    
    static fearGaze(monster, ability, target, game) {
        return this.gazeAttack(monster, {...ability, effect: 'feared'}, target, game);
    }
    
    static slowGaze(monster, ability, target, game) {
        return this.gazeAttack(monster, {...ability, effect: 'slowed'}, target, game);
    }
    
    static cancellationGaze(monster, ability, target, game) {
        if (!this.canGaze(monster, target, game)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} gazes at you with nullifying force!`, 'warning');
        
        // Cancellation removes magical effects
        target.removeAllMagicalEffects();
        EventBus.emit(EVENTS.UI_MESSAGE, 'Your magical effects are canceled!', 'warning');
        
        return true;
    }
    
    // ========== ENGULFING ATTACKS ==========
    
    static engulf(monster, ability, target, game) {
        if (monster.engulfs) return false; // Already engulfing someone
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} engulfs you!`, 'danger');
        
        monster.engulfs = target;
        target.engulfedBy = monster;
        
        // Apply immediate damage based on engulf type
        const damageType = ability.damageType || 'physical';
        const damage = rollDice(ability.damage || '1d6');
        
        this.applyElementalDamage(target, damage, damageType);
        
        return true;
    }
    
    static digestion(monster, ability, target, game) {
        if (!monster.engulfs || monster.engulfs !== target) return false;
        
        const damage = rollDice(ability.damage || '2d6');
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `You are being digested for ${damage} damage!`, 'danger');
        
        target.takeDamage(damage);
        
        // Chance of instant death if low health
        if (target.hp < target.maxHp / 4 && Math.random() < 0.2) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You are completely digested!', 'danger');
            target.takeDamage(target.hp);
        }
        
        return true;
    }
    
    static acidEngulf(monster, ability, target, game) {
        const success = this.engulf(monster, {...ability, damageType: 'acid'}, target, game);
        if (success) {
            this.tryDamageEquipment(target, 'acid');
        }
        return success;
    }
    
    static fireEngulf(monster, ability, target, game) {
        const success = this.engulf(monster, {...ability, damageType: 'fire'}, target, game);
        if (success) {
            this.tryDamageEquipment(target, 'fire');
        }
        return success;
    }
    
    static drowning(monster, ability, target, game) {
        const success = this.engulf(monster, {...ability, damageType: 'drowning'}, target, game);
        if (success) {
            // Drowning prevents breathing
            target.addEffect('drowning', 10);
            EventBus.emit(EVENTS.UI_MESSAGE, 'You cannot breathe!', 'danger');
        }
        return success;
    }
    
    // ========== MOVEMENT ABILITIES ==========
    
    static teleportSelf(monster, ability, target, game) {
        const newPos = this.findRandomPosition(game);
        if (!newPos) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} teleports!`, 'warning');
        
        monster.x = newPos.x;
        monster.y = newPos.y;
        
        return true;
    }
    
    static teleportOther(monster, ability, target, game) {
        const newPos = this.findRandomPosition(game);
        if (!newPos) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} teleports you away!`, 'warning');
        
        target.x = newPos.x;
        target.y = newPos.y;
        
        return true;
    }
    
    static phase(monster, ability, target, game) {
        // Phasing allows movement through walls
        monster.addEffect('phasing', ability.duration || 5);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} becomes incorporeal!`, 'warning');
        
        return true;
    }
    
    static fly(monster, ability, target, game) {
        monster.addEffect('flying', ability.duration || 10);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} takes flight!`, 'info');
        
        return true;
    }
    
    static swim(monster, ability, target, game) {
        monster.addEffect('swimming', ability.duration || 10);
        return true;
    }
    
    static speedBurst(monster, ability, target, game) {
        monster.addEffect('hasted', ability.duration || 5);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} moves with blinding speed!`, 'warning');
        
        return true;
    }
    
    // ========== SUMMONING & CREATION ==========
    
    static summonMonsters(monster, ability, target, game) {
        const count = ability.count || Math.floor(Math.random() * 3) + 1;
        const monsterType = ability.monsterType || 'random';
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} summons help!`, 'warning');
        
        // TODO: Actually summon monsters when monster creation is implemented
        EventBus.emit(EVENTS.MONSTERS_SUMMONED, {
            summoner: monster,
            count: count,
            type: monsterType
        });
        
        return true;
    }
    
    static summonInsects(monster, ability, target, game) {
        return this.summonMonsters(monster, {...ability, monsterType: 'insect'}, target, game);
    }
    
    static summonUndead(monster, ability, target, game) {
        return this.summonMonsters(monster, {...ability, monsterType: 'undead'}, target, game);
    }
    
    static summonDemons(monster, ability, target, game) {
        return this.summonMonsters(monster, {...ability, monsterType: 'demon'}, target, game);
    }
    
    static createWeb(monster, ability, target, game) {
        const radius = ability.radius || 2;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} spins webs!`, 'warning');
        
        // Create web tiles around the monster
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const x = monster.x + dx;
                const y = monster.y + dy;
                
                if (game.dungeon.isWalkable(x, y) && Math.random() < 0.3) {
                    // TODO: Create web terrain when terrain system is implemented
                    EventBus.emit(EVENTS.WEB_CREATED, { x, y });
                }
            }
        }
        
        return true;
    }
    
    static layEggs(monster, ability, target, game) {
        const count = ability.count || Math.floor(Math.random() * 2) + 1;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} lays eggs!`, 'info');
        
        // TODO: Create egg items that hatch into monsters
        EventBus.emit(EVENTS.EGGS_LAID, {
            mother: monster,
            count: count,
            hatchTime: ability.hatchTime || 10
        });
        
        return true;
    }
    
    // ========== TRANSFORMATION ABILITIES ==========
    
    static shapechange(monster, ability, target, game) {
        const forms = ability.forms || ['bat', 'wolf', 'mist'];
        const newForm = forms[Math.floor(Math.random() * forms.length)];
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} transforms into a ${newForm}!`, 'warning');
        
        monster.currentForm = newForm;
        monster.originalForm = monster.originalForm || monster.id;
        
        // Apply form-specific bonuses
        this.applyShapechangeBonuses(monster, newForm);
        
        return true;
    }
    
    static invisibility(monster, ability, target, game) {
        monster.addEffect('invisible', ability.duration || 10);
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} vanishes!`, 'warning');
        
        return true;
    }
    
    static polymorphism(monster, ability, target, game) {
        if (target.resistances?.includes('polymorph')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist the polymorph!', 'success');
            return true;
        }
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} polymorphs you!`, 'danger');
        
        // TODO: Implement polymorph when player transformation is ready
        target.addEffect('polymorphed', 20);
        
        return true;
    }
    
    static splitOnDamage(monster, ability, target, game) {
        // This is triggered when monster takes damage, not as an active ability
        if (monster.hp > monster.maxHp / 2) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} splits in two!`, 'warning');
        
        // TODO: Create a duplicate monster when monster creation is implemented
        EventBus.emit(EVENTS.MONSTER_SPLIT, {
            original: monster,
            newHp: Math.floor(monster.hp / 2)
        });
        
        monster.hp = Math.floor(monster.hp / 2);
        
        return true;
    }
    
    // ========== THEFT & MANIPULATION ==========
    
    static stealItem(monster, ability, target, game) {
        if (target.inventory.length === 0) return false;
        
        const randomIndex = Math.floor(Math.random() * target.inventory.length);
        const stolenItem = target.inventory[randomIndex];
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} steals your ${stolenItem.name}!`, 'warning');
        
        // Remove from player, add to monster
        target.inventory.splice(randomIndex, 1);
        monster.inventory.push(stolenItem);
        
        // Monster might teleport away after stealing
        if (ability.teleportAfter && Math.random() < 0.7) {
            this.teleportSelf(monster, {}, target, game);
        }
        
        return true;
    }
    
    static stealGold(monster, ability, target, game) {
        if (target.gold <= 0) return false;
        
        const amount = Math.min(target.gold, Math.floor(Math.random() * 100) + 50);
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} steals ${amount} gold!`, 'warning');
        
        target.gold -= amount;
        monster.gold = (monster.gold || 0) + amount;
        
        if (ability.teleportAfter && Math.random() < 0.8) {
            this.teleportSelf(monster, {}, target, game);
        }
        
        return true;
    }
    
    static stealWeapon(monster, ability, target, game) {
        const weapon = target.equipped?.weapon;
        if (!weapon) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} disarms you!`, 'warning');
        
        target.equipped.weapon = null;
        weapon.equipped = false;
        monster.inventory.push(weapon);
        
        return true;
    }
    
    static disarm(monster, ability, target, game) {
        const weapon = target.equipped?.weapon;
        if (!weapon) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} knocks your weapon away!`, 'warning');
        
        target.equipped.weapon = null;
        weapon.equipped = false;
        
        // Weapon falls to the ground
        weapon.x = target.x;
        weapon.y = target.y;
        game.items.push(weapon);
        
        return true;
    }
    
    static rustItems(monster, ability, target, game) {
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} rusts your equipment!`, 'warning');
        
        // Rust metal armor and weapons
        this.tryDamageEquipment(target, 'rust');
        
        return true;
    }
    
    static corrodeItems(monster, ability, target, game) {
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} corrodes your equipment!`, 'warning');
        
        this.tryDamageEquipment(target, 'acid');
        
        return true;
    }
    
    // ========== TOUCH ATTACKS ==========
    
    static stoneTouch(monster, ability, target, game) {
        if (target.resistances?.includes('petrification')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist petrification!', 'success');
            return true;
        }
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name}'s touch turns you to stone!`, 'danger');
        
        // Usually fatal unless resisted
        target.takeDamage(target.hp);
        
        return true;
    }
    
    static rustTouch(monster, ability, target, game) {
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name}'s touch rusts your equipment!`, 'warning');
        
        this.tryDamageEquipment(target, 'rust');
        
        return true;
    }
    
    static shockTouch(monster, ability, target, game) {
        const damage = rollDice(ability.damage || '1d8');
        const finalDamage = this.applyElementalDamage(target, damage, 'lightning');
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} shocks you for ${finalDamage} damage!`, 'danger');
        
        target.takeDamage(finalDamage);
        
        return true;
    }
    
    static freezeTouch(monster, ability, target, game) {
        const damage = rollDice(ability.damage || '1d6');
        const finalDamage = this.applyElementalDamage(target, damage, 'cold');
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} freezes you for ${finalDamage} damage!`, 'danger');
        
        target.takeDamage(finalDamage);
        
        // Chance to slow
        if (Math.random() < 0.3) {
            target.addEffect('slowed', 5);
        }
        
        return true;
    }
    
    static acidTouch(monster, ability, target, game) {
        const damage = rollDice(ability.damage || '1d6');
        const finalDamage = this.applyElementalDamage(target, damage, 'acid');
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} burns you with acid for ${finalDamage} damage!`, 'danger');
        
        target.takeDamage(finalDamage);
        this.tryDamageEquipment(target, 'acid');
        
        return true;
    }
    
    static drainTouch(monster, ability, target, game) {
        if (target.resistances?.includes('drain')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist the drain!', 'success');
            return true;
        }
        
        const drainAmount = ability.drainAmount || 1;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} drains your life force!`, 'danger');
        
        // In our game, drain max HP instead of levels
        target.maxHp = Math.max(1, target.maxHp - (drainAmount * 10));
        target.hp = Math.min(target.hp, target.maxHp);
        
        return true;
    }
    
    static paralyzeTouch(monster, ability, target, game) {
        if (target.resistances?.includes('paralysis')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'You resist paralysis!', 'success');
            return true;
        }
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name}'s touch paralyzes you!`, 'danger');
        
        target.addEffect('paralyzed', ability.duration || 5);
        
        return true;
    }
    
    // ========== PROJECTILE ATTACKS ==========
    
    static spitVenom(monster, ability, target, game) {
        const range = ability.range || 5;
        if (!this.hasLineOfSight(monster, target, game, range)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} spits venom at you!`, 'warning');
        
        if (target.resistances?.includes('poison')) {
            EventBus.emit(EVENTS.UI_MESSAGE, 'The venom has no effect!', 'success');
            return true;
        }
        
        const damage = rollDice(ability.damage || '1d4');
        target.takeDamage(damage);
        target.addEffect('poisoned', 10);
        
        return true;
    }
    
    static spitAcid(monster, ability, target, game) {
        const range = ability.range || 5;
        if (!this.hasLineOfSight(monster, target, game, range)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} spits acid at you!`, 'warning');
        
        const damage = rollDice(ability.damage || '1d6');
        const finalDamage = this.applyElementalDamage(target, damage, 'acid');
        
        target.takeDamage(finalDamage);
        this.tryDamageEquipment(target, 'acid');
        
        return true;
    }
    
    static spitWeb(monster, ability, target, game) {
        const range = ability.range || 5;
        if (!this.hasLineOfSight(monster, target, game, range)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} spits web at you!`, 'warning');
        
        target.addEffect('webbed', ability.duration || 5);
        
        return true;
    }
    
    static throwBoulder(monster, ability, target, game) {
        const range = ability.range || 8;
        if (!this.hasLineOfSight(monster, target, game, range)) return false;
        
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} hurls a boulder at you!`, 'danger');
        
        const damage = rollDice(ability.damage || '3d6');
        target.takeDamage(damage);
        
        return true;
    }
    
    // ========== UTILITY METHODS ==========
    
    static hasLineOfSight(monster, target, game, range) {
        const dist = Math.abs(monster.x - target.x) + Math.abs(monster.y - target.y);
        if (dist > range) return false;
        
        // TODO: Implement proper line-of-sight checking
        return true;
    }
    
    static canGaze(monster, target, game) {
        // Can't gaze if blind, invisible, or target is invisible
        if (monster.isBlind || monster.invisible) return false;
        if (target.invisible && !monster.seeInvisible) return false;
        
        const dist = Math.abs(monster.x - target.x) + Math.abs(monster.y - target.y);
        return dist <= 5; // Gaze range
    }
    
    static applyElementalDamage(target, damage, element) {
        // Check resistances
        if (target.resistances?.includes(element)) {
            return Math.floor(damage / 2);
        }
        
        // Check reflection for certain elements
        if (target.hasReflection && target.hasReflection()) {
            const reflectableElements = ['fire', 'cold', 'lightning', 'acid'];
            if (reflectableElements.includes(element)) {
                return 0; // Reflected
            }
        }
        
        return damage;
    }
    
    static tryDamageEquipment(target, damageType) {
        // TODO: Implement equipment damage when item durability system exists
        const message = {
            'rust': 'Your metal equipment rusts!',
            'acid': 'Your equipment is corroded!',
            'fire': 'Your equipment is burned!',
            'cold': 'Your equipment is frozen!'
        };
        
        if (Math.random() < 0.3) {
            EventBus.emit(EVENTS.UI_MESSAGE, message[damageType] || 'Your equipment is damaged!', 'warning');
        }
    }
    
    static findRandomPosition(game) {
        // Find a valid position for teleportation
        for (let attempts = 0; attempts < 50; attempts++) {
            const x = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
            const y = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
            
            if (game.dungeon.isWalkable(x, y) && !game.getMonsterAt(x, y)) {
                return { x, y };
            }
        }
        
        return null; // No valid position found
    }
    
    static applyShapechangeBonuses(monster, form) {
        // Apply form-specific bonuses
        switch (form) {
            case 'bat':
                monster.addEffect('flying', 999);
                monster.size = 'tiny';
                break;
            case 'wolf':
                monster.speed = Math.floor(monster.speed * 1.5);
                break;
            case 'mist':
                monster.addEffect('phasing', 999);
                monster.addEffect('damage_reduction', 999);
                break;
        }
    }
    
    // ========== SPECIAL/UNIQUE ABILITIES ==========
    
    static turnToGold(monster, ability, target, game) {
        // Golden golem ability - drops gold when killed
        if (monster.hp <= 0) {
            const goldAmount = rollDice('10d10');
            game.items.push({
                type: 'gold',
                amount: goldAmount,
                x: monster.x,
                y: monster.y
            });
            
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${monster.name} crumbles into ${goldAmount} gold pieces!`, 'success');
        }
        
        return true;
    }
    
    static riderRevival(monster, ability, target, game) {
        // Riders of the Apocalypse revive themselves
        if (monster.hp <= 0 && !monster.permanentlyDead) {
            monster.hp = monster.maxHp;
            monster.addEffect('invulnerable', 3);
            
            EventBus.emit(EVENTS.UI_MESSAGE, 
                `The ${monster.name} rises again!`, 'danger');
            
            return true;
        }
        
        return false;
    }
    
    static covetousWarp(monster, ability, target, game) {
        // Covetous monsters warp to pursue the player
        if (Math.random() < 0.3) {
            // Teleport near player
            const positions = [];
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const x = target.x + dx;
                    const y = target.y + dy;
                    if (game.dungeon.isWalkable(x, y) && !game.getMonsterAt(x, y)) {
                        positions.push({x, y});
                    }
                }
            }
            
            if (positions.length > 0) {
                const pos = positions[Math.floor(Math.random() * positions.length)];
                monster.x = pos.x;
                monster.y = pos.y;
                
                EventBus.emit(EVENTS.UI_MESSAGE, 
                    `The ${monster.name} warps closer!`, 'warning');
                
                return true;
            }
        }
        
        return false;
    }
    
    static photographyResistance(monster, ability, target, game) {
        // Tourist camera resistance
        EventBus.emit(EVENTS.UI_MESSAGE, 
            `The ${monster.name} hides from the camera!`, 'info');
        
        return true;
    }
}