# Philosopher's Quest - Project Kickoff Document

## 🎮 What We're Building
A NetHack-inspired educational roguelike where **knowledge literally powers actions**. Players descend 100 dungeon levels to retrieve the Philosopher's Stone, answering quiz questions to perform game actions.

## 🧠 Core Game Concept
**CRITICAL**: This is NOT a traditional RPG with quizzes tacked on. The quiz system IS the core mechanic:
- **Math quizzes** → Weapon damage (chain scoring for multipliers)
- **Philosophy quizzes** → Identify items/monsters (Philosopher's Amulet)
- **Geography quizzes** → Equip armor (must know world to wear protection)
- **History quizzes** → Equip accessories (rings, amulets)
- **Science quizzes** → Cast spells
- **Economics quizzes** → Lockpicking (threshold system - 2d4 correct answers needed)
- **Cooking quizzes** → Food preparation (escalator chain for recipes)
- **Grammar quizzes** → Read scrolls/books
- **Animal quizzes** → Harvest corpses (threshold for butchering)

## ⚡ SP/Hunger System (IMPLEMENTED ✅)
**SP (Stamina Points) is the hunger/energy system:**
- Player starts with 100 SP (modified by Constitution)
- Every move/action costs 1 SP
- When SP reaches 0, actions start costing HP instead (STARVATION)
- When HP reaches 0, game over
- Eating food restores SP (not HP directly)
- Different foods restore different amounts of SP
- Some special foods may also restore HP or give buffs
- **NO SEPARATE NUTRITION/HUNGER SYSTEM - SP IS THE HUNGER SYSTEM**

## 🎭 Six-Stat RPG System (IMPLEMENTED ✅)
**Base Attributes (all start at 10):**
- **Strength** - Affects carrying capacity (Base 50 + STR*2)
- **Constitution** - Affects HP (Base 10 + (CON-10)/2) and SP (Base 100 + (CON-10)*2)
- **Dexterity** - Affects AC (Base 10 + (DEX-10)/2)
- **Intelligence** - Affects max spells (INT/3)
- **Wisdom** - Affects quiz timer (WIS seconds)
- **Perception** - Affects sight radius (Base 3 + PER/5)

**Saving Throws:**
- **Fortitude** (CON-based) - vs poison, disease, death
- **Reflex** (DEX-based) - vs traps, area effects
- **Will** (WIS-based) - vs paralysis, confusion

## 🍖 Food Progression System (IMPLEMENTED ✅)
**The ONLY way to increase stats:**
1. Kill monster → drops corpse
2. Harvest corpse (Animal quiz, threshold) → get raw food
3. Cook food (Cooking quiz, escalator 1-5) → create meal
4. Eat meal → gain permanent stat increases
5. Better cooking = better stat gains

**No XP, No Levels - Only Food!**

## 🗡️ Weapon & Material System
**Materials DO NOT affect damage!** Damage comes from:
- **Weapon tier** (1-5) determines base damage
- **Math quiz performance** determines actual damage
- **Chain multipliers** reward consecutive correct answers

**Materials ONLY affect:**
- **Environmental interactions** (iron rusts in water, wood burns in lava)
- **Item durability** and weight
- **Conductivity** (electrical/magical)

## 🎁 Container/Lockpicking System
**Containers are the best loot source:**
- All containers are locked (no keys, only Economics quizzes)
- Lock threshold is 2d4 (2-8 correct answers needed)
- About 50% are trapped
- Cannot be forced open
- Best items come from containers

## 📁 Project Structure
```
KnowledgeHack/
├── index.html                    # Main entry point
├── css/main.css                  # All styles
├── js/
│   ├── config.js                # Game constants & settings
│   ├── core/                    # Core game systems
│   │   ├── event-bus.js        # ✅ COMPLETE - All events defined
│   │   ├── game.js             # ✅ COMPLETE - Full integration
│   │   ├── question-loader.js  # ✅ COMPLETE
│   │   ├── item-loader.js      # Loads all items
│   │   ├── monster-loader.js   # ✅ COMPLETE
│   │   └── spell-loader.js     # Needs spells data
│   ├── entities/                
│   │   ├── player.js           # ✅ COMPLETE - 6 stats, saves, effects
│   │   ├── monster.js          # ✅ COMPLETE
│   │   ├── monster-ai.js       # ✅ COMPLETE
│   │   ├── monster-abilities.js # ✅ COMPLETE
│   │   ├── item.js             # Basic implementation
│   │   └── effect.js           # Basic implementation
│   ├── systems/                 
│   │   ├── quiz-engine.js      # Handles all quiz types
│   │   ├── combat.js           # Basic implementation
│   │   ├── inventory.js        # Basic implementation
│   │   ├── equipment.js        # Basic implementation
│   │   ├── identification.js   # Basic implementation
│   │   ├── cooking.js          # ✅ COMPLETE - Escalator quiz
│   │   ├── harvesting.js       # ✅ COMPLETE - Threshold quiz
│   │   ├── magic.js            # Needs implementation
│   │   ├── lockpicking.js      # Basic implementation
│   │   └── save-load.js        # Basic implementation
│   ├── ui/                      
│   │   ├── input-handler.js    # ✅ COMPLETE - All commands
│   │   ├── message-log.js      # ✅ COMPLETE
│   │   ├── renderer.js         # ✅ COMPLETE
│   │   ├── ui-manager.js       # ✅ COMPLETE - 6 stat display
│   │   └── modal.js            # Basic implementation
│   ├── utils/                   
│   │   └── dice.js             # ✅ COMPLETE
│   └── world/                   
│       ├── dungeon.js          # Basic implementation
│       ├── dungeon-generator.js # ✅ COMPLETE
│       ├── tile.js             # Basic implementation
│       ├── room.js             # Basic implementation
│       └── corridor.js         # Basic implementation
└── data/                         
    ├── questions/                # ✅ ALL COMPLETE (500+ each)
    ├── monsters.json            # ✅ COMPLETE (15 monsters)
    ├── materials.json           # ✅ COMPLETE (17 materials)
    ├── spells.json              # ❌ EMPTY
    └── items/                   
        ├── weapons.json         # ✅ COMPLETE (50 weapons)
        ├── armor.json           # ❌ EMPTY - Needed
        ├── accessories.json     # ❌ EMPTY - Needed
        ├── potions.json         # ❌ EMPTY - Needed
        ├── scrolls.json         # ❌ EMPTY - Needed
        ├── wands.json           # ❌ EMPTY
        ├── books.json           # ❌ EMPTY
        ├── food.json            # ✅ COMPLETE (15 foods, 90 recipes)
        ├── corpses.json         # ✅ COMPLETE (15 corpses)
        ├── tools.json           # ❌ EMPTY
        ├── artifacts.json       # ❌ EMPTY
        ├── ammo.json            # ✅ COMPLETE (25 types)
        └── containers.json      # ✅ COMPLETE (20 types)
```

## ✅ What's Working NOW
- Complete food progression system
- 6-stat RPG system with saving throws
- SP hunger system (move or starve!)
- Corpse harvesting with Animal quizzes
- Cooking with escalator chain quizzes
- 90 different meals with varying stat gains
- Monster AI with multiple behaviors
- Dungeon generation
- Full keyboard controls
- UI displays all stats and effects

## 🎮 How to Play
1. **Move**: Arrow keys, HJKL, or numpad
2. **Attack**: Move into monsters → Math quiz
3. **Pickup**: `,` or `g` to get items/corpses
4. **Harvest**: `h` to butcher corpses → Animal quiz
5. **Cook**: `c` to prepare food → Cooking quiz
6. **Inventory**: `i` to manage items
7. **Help**: `?` for all commands

## 🚨 Next Priority Tasks
1. **Create armor.json** - Basic defense items
2. **Create potions.json** - Healing and buffs
3. **Create scrolls.json** - Magical effects
4. **Implement spell system** - Science quiz integration
5. **Add boss monsters** - For levels 15, 30, 45, etc.

## 📝 Design Principles
1. **Quiz First**: Every action requires knowledge
2. **Food is Progression**: No XP, only cooking/eating
3. **SP is Life**: Managing hunger is survival
4. **Knowledge Types Matter**: Each quiz subject has unique purpose
5. **Chain Scoring**: Consecutive correct = more power

## 💬 Session Summary
**Last Updated**: After implementing food system
- ✅ Created complete 6-stat RPG system
- ✅ Implemented corpse harvesting
- ✅ Implemented cooking system
- ✅ Created 90 unique recipes
- ✅ Integrated everything in game.js
- ✅ Added full keyboard controls

**The core gameplay loop is COMPLETE and PLAYABLE!**