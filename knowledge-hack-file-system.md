# KnowledgeHack File System Reference

## Project Status: CORE GAMEPLAY COMPLETE ✅

```
philosophers-quest/
├── index.html                              # Entry point
├── css/
│   └── main.css                           # All styles
│
├── js/
│   ├── config.js                          # Game constants
│   │
│   ├── core/
│   │   ├── event-bus.js                   ✅ COMPLETE - All events defined
│   │   ├── question-loader.js             ✅ COMPLETE - Loads 500+ questions per subject
│   │   ├── item-loader.js                 # Loads all item types
│   │   ├── monster-loader.js              ✅ COMPLETE - Weighted spawning
│   │   ├── spell-loader.js                # Needs spell data
│   │   └── game.js                        ✅ COMPLETE - Full integration
│   │
│   ├── entities/
│   │   ├── player.js                      ✅ COMPLETE - 6-stat RPG system
│   │   ├── item.js                        # Basic implementation
│   │   ├── monster.js                     ✅ COMPLETE - Drops corpses
│   │   ├── monster-ai.js                  ✅ COMPLETE - Multiple behaviors
│   │   ├── monster-abilities.js           ✅ COMPLETE - Special abilities
│   │   └── effect.js                      # Status effects
│   │
│   ├── systems/
│   │   ├── quiz-engine.js                 # Threshold & escalator quizzes
│   │   ├── combat.js                      # Math quiz damage
│   │   ├── inventory.js                   # Item management
│   │   ├── equipment.js                   # Gear management
│   │   ├── identification.js              # Philosophy quizzes
│   │   ├── cooking.js                     ✅ COMPLETE - Food progression
│   │   ├── harvesting.js                  ✅ COMPLETE - Corpse processing
│   │   ├── magic.js                       # Science quiz casting
│   │   ├── lockpicking.js                 # Economics threshold
│   │   └── save-load.js                   # Game persistence
│   │
│   ├── ui/
│   │   ├── input-handler.js               ✅ COMPLETE - Full controls
│   │   ├── message-log.js                 ✅ COMPLETE - Game messages
│   │   ├── renderer.js                    ✅ COMPLETE - ASCII display
│   │   ├── ui-manager.js                  ✅ COMPLETE - 6-stat display
│   │   └── modal.js                       # Quiz/menu modals
│   │
│   ├── utils/
│   │   └── dice.js                        ✅ COMPLETE - RPG dice notation
│   │
│   └── world/
│       ├── dungeon.js                     # Dungeon data structure
│       ├── dungeon-generator.js           ✅ COMPLETE - Level generation
│       ├── tile.js                        # Tile properties
│       ├── room.js                        # Room generation
│       └── corridor.js                    # Corridor generation
│
└── data/
    ├── questions/                          ✅ ALL COMPLETE (500+ each)
    │   ├── questions-math.json            # Combat damage
    │   ├── questions-philosophy.json      # Item/monster identification
    │   ├── questions-geography.json       # Armor equipping
    │   ├── questions-science.json         # Spell casting
    │   ├── questions-history.json         # Accessory equipping
    │   ├── questions-economics.json       # Lockpicking (2d4 threshold)
    │   ├── questions-cooking.json         # Food preparation (escalator)
    │   ├── questions-grammar.json         # Scroll/book reading
    │   └── questions-animal.json          # Corpse harvesting (threshold)
    │
    ├── items/
    │   ├── weapons.json                   ✅ COMPLETE - 50 weapons (5 tiers)
    │   ├── armor.json                     ❌ EMPTY - Needs implementation
    │   ├── accessories.json               ❌ EMPTY - Needs implementation
    │   ├── potions.json                   ❌ EMPTY - Needs implementation
    │   ├── scrolls.json                   ❌ EMPTY - Needs implementation
    │   ├── wands.json                     ❌ EMPTY
    │   ├── books.json                     ❌ EMPTY
    │   ├── food.json                      ✅ COMPLETE - 15 foods, 90 recipes
    │   ├── corpses.json                   ✅ COMPLETE - 15 corpse types
    │   ├── tools.json                     ❌ EMPTY
    │   ├── artifacts.json                 ❌ EMPTY
    │   ├── ammo.json                      ✅ COMPLETE - 25 arrow/bolt types
    │   └── containers.json                ✅ COMPLETE - 20 lockable chests
    │
    ├── monsters.json                       ✅ COMPLETE - 15 monster types
    ├── materials.json                      ✅ COMPLETE - 17 material types
    └── spells.json                         ❌ EMPTY - Needs implementation
```

## System Status

### ✅ Fully Implemented Systems
- **Food Progression**: Kill → Harvest → Cook → Eat → Gain Stats
- **6-Stat RPG System**: STR, CON, DEX, INT, WIS, PER
- **SP Hunger System**: Movement costs SP, 0 SP = starvation
- **Quiz Integration**: 9 subjects, each with unique game purpose
- **Monster AI**: Multiple behaviors, special abilities
- **Dungeon Generation**: Procedural levels with rooms/corridors
- **Full Input System**: Roguelike controls (HJKL, arrows, numpad)

### 🟡 Partially Implemented
- **Combat**: Basic system, needs polish
- **Inventory**: Basic functionality
- **Equipment**: Needs armor/accessory integration
- **Magic**: Framework exists, needs spells
- **Lockpicking**: System ready, containers exist

### ❌ Not Yet Implemented
- **Armor System**: Needs items and Geography quiz integration
- **Spell Casting**: Needs spell data and Science quiz integration
- **Scroll/Book Reading**: Needs items and Grammar quiz integration
- **Potion System**: Needs items and effects
- **Save/Load**: Framework exists, needs testing

## Core Gameplay Loop (WORKING!)

```
1. Move around (Arrow/HJKL) → Costs SP
2. Attack monsters → Math Quiz → Damage
3. Monster dies → Drops corpse
4. Pickup corpse (,) → Add to inventory
5. Harvest corpse (h) → Animal Quiz → Get food
6. Cook food (c) → Cooking Quiz → Create meal
7. Eat meal → Gain permanent stats
8. Repeat until strong enough for next level
```

## Quiz Subject Mapping

| Subject | Game Action | Quiz Type | Implementation |
|---------|------------|-----------|----------------|
| Math | Weapon Damage | Chain Multiplier | ✅ Working |
| Philosophy | Identification | Threshold | 🟡 Basic |
| Geography | Armor Equipping | Threshold | ❌ Needs armor |
| Science | Spell Casting | Escalator | ❌ Needs spells |
| History | Accessory Equip | Threshold | ❌ Needs items |
| Economics | Lockpicking | 2d4 Threshold | 🟡 Containers exist |
| Cooking | Food Prep | Escalator 1-5 | ✅ Working |
| Grammar | Reading | Threshold | ❌ Needs scrolls |
| Animal | Harvesting | Threshold | ✅ Working |

## Controls Reference

```
Movement:       ↑↓←→, HJKL, Numpad
Pickup:         , or g
Harvest:        h
Cook:           c
Inventory:      i
Equipment:      e
Drop:           d
Wait:           . or Space
Help:           ?
Save:           Ctrl+S
Load:           Ctrl+L
```

## Next Development Priorities

1. **Create armor.json** - Basic defense items for Geography quizzes
2. **Create potions.json** - Healing and buff items
3. **Create scrolls.json** - Magical effects for Grammar quizzes
4. **Create spells.json** - Offensive/utility spells for Science quizzes
5. **Polish combat system** - Add more feedback and balance

## Notes

- Materials affect environmental interactions, NOT damage
- Weapon damage = tier + math quiz performance
- All progression through food (no XP system)
- SP is the only hunger system
- Quiz difficulty affects rewards