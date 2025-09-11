# KnowledgeHack File System Reference

## Project Status: BUG FIXES COMPLETE! 🎉

```
philosophers-quest/
├── index.html                              # Entry point
├── css/
│   └── main.css                           # All styles
│
├── js/
│   ├── config.js                          ✅ FIXED - Added EVENTS & INVENTORY
│   │
│   ├── core/
│   │   ├── event-bus.js                   ✅ COMPLETE - All events defined
│   │   ├── question-loader.js             ✅ COMPLETE - Loads 500+ questions per subject
│   │   ├── item-loader.js                 ✅ FIXED - GitHub Pages paths
│   │   ├── monster-loader.js              ✅ FIXED - GitHub Pages paths
│   │   ├── spell-loader.js                ❌ Needs spell data
│   │   └── game.js                        ✅ FIXED - Error handling added
│   │
│   ├── entities/
│   │   ├── player.js                      ✅ FIXED - All methods added
│   │   ├── item.js                        🟡 Basic implementation
│   │   ├── monster.js                     ✅ COMPLETE - Drops corpses
│   │   ├── monster-ai.js                  ✅ COMPLETE - Multiple behaviors
│   │   ├── monster-abilities.js           ✅ COMPLETE - Special abilities
│   │   └── effect.js                      🟡 Status effects
│   │
│   ├── systems/
│   │   ├── quiz-engine.js                 🟡 Threshold & escalator quizzes
│   │   ├── combat.js                      🟡 Math quiz damage
│   │   ├── inventory.js                   🟡 Item management
│   │   ├── equipment.js                   🟡 Gear management
│   │   ├── identification.js              🟡 Philosophy quizzes
│   │   ├── cooking.js                     ✅ FIXED - GitHub Pages paths
│   │   ├── harvesting.js                  ✅ FIXED - GitHub Pages paths
│   │   ├── magic.js                       ❌ Science quiz casting
│   │   ├── lockpicking.js                 🟡 Economics threshold
│   │   └── save-load.js                   🟡 Game persistence
│   │
│   ├── ui/
│   │   ├── input-handler.js               ✅ COMPLETE - Full controls
│   │   ├── message-log.js                 ✅ COMPLETE - Game messages
│   │   ├── renderer.js                    ✅ COMPLETE - ASCII display
│   │   ├── ui-manager.js                  ✅ FIXED - Simplified version
│   │   └── modal.js                       🟡 Quiz/menu modals
│   │
│   ├── utils/
│   │   └── dice.js                        ✅ COMPLETE - RPG dice notation
│   │
│   └── world/
│       ├── dungeon.js                     🟡 Dungeon data structure
│       ├── dungeon-generator.js           ✅ FIXED - Import paths corrected
│       ├── tile.js                        🟡 Tile properties
│       ├── room.js                        🟡 Room generation
│       └── corridor.js                    🟡 Corridor generation
│
└── data/
    ├── questions/                          ✅ ALL COMPLETE (500+ each)
    │   ├── questions-math.json            ✅ Combat damage
    │   ├── questions-philosophy.json      ✅ Item/monster identification
    │   ├── questions-geography.json       ✅ Armor equipping
    │   ├── questions-science.json         ✅ Spell casting
    │   ├── questions-history.json         ✅ Accessory equipping
    │   ├── questions-economics.json       ✅ Lockpicking (2d4 threshold)
    │   ├── questions-cooking.json         ✅ Food preparation (escalator)
    │   ├── questions-grammar.json         ✅ Scroll/book reading
    │   └── questions-animal.json          ✅ Corpse harvesting (threshold)
    │
    ├── items/
    │   ├── weapons.json                   ✅ COMPLETE - 59 weapons (5 tiers)
    │   ├── armor.json                     ❌ EMPTY - Needs implementation
    │   ├── accessories.json               ❌ EMPTY - Needs implementation
    │   ├── potions.json                   ❌ EMPTY - Needs implementation
    │   ├── scrolls.json                   ❌ EMPTY - Needs implementation
    │   ├── wands.json                     ❌ EMPTY
    │   ├── books.json                     ❌ EMPTY
    │   ├── food.json                      ✅ COMPLETE - 15 foods, 90 recipes
    │   ├── corpses.json                   ✅ FIXED - 15 corpse types
    │   ├── tools.json                     ❌ EMPTY
    │   ├── artifacts.json                 ❌ EMPTY
    │   ├── ammo.json                      ✅ COMPLETE - 26 arrow/bolt types
    │   └── containers.json                ✅ MOVED & COMPLETE - 21 lockable chests
    │
    ├── monsters.json                       ✅ COMPLETE - 15 monster types
    ├── materials.json                      ✅ COMPLETE - 17 material types
    └── spells.json                         ❌ EMPTY - Needs implementation
```

## Legend
- ✅ **COMPLETE/FIXED** - Fully working
- 🟡 **PARTIAL** - Basic implementation, needs work
- ❌ **MISSING** - Not implemented

## Bug Fix Summary (This Session)

### Critical Fixes Applied:
1. ✅ **Player.js** - Added getTotalAC(), getAC(), updateStats(), getSightRadius(), update(), updateWeight()
2. ✅ **Config.js** - Added CONFIG.EVENTS and CONFIG.INVENTORY
3. ✅ **UI Manager** - Created simplified version that doesn't crash
4. ✅ **Path Issues** - All loaders use GitHub Pages paths
5. ✅ **Import Errors** - Fixed dungeon-generator monster-loader import
6. ✅ **Data Files** - Moved containers.json, filled corpses.json

### Files That Changed:
- `/js/config.js` - Added missing constants
- `/js/entities/player.js` - Added missing methods
- `/js/ui/ui-manager.js` - Simplified version
- `/js/core/item-loader.js` - Fixed paths
- `/js/core/monster-loader.js` - Fixed paths
- `/js/systems/cooking.js` - Fixed paths
- `/js/systems/harvesting.js` - Fixed paths
- `/js/world/dungeon-generator.js` - Fixed import
- `/js/core/game.js` - Added error handling
- `/data/items/corpses.json` - Added content
- `/data/items/containers.json` - Moved from /data/

## Game Status

### ✅ What's Working Now:
- Game loads without fatal errors
- All question banks load
- Monster data loads and spawns work
- Item data loads (weapons, food, corpses, ammo, containers)
- Player stats initialize correctly
- UI displays without crashing
- Movement system ready
- Food/corpse systems have correct paths

### 🟡 Partially Working:
- Combat system (basic implementation)
- Inventory system (basic implementation)
- Equipment system (basic implementation)
- Quiz engine (needs integration)

### ❌ Still Needed:
- Armor items (Geography quizzes)
- Potion items (instant effects)
- Scroll items (Grammar quizzes)
- Accessory items (History quizzes)
- Spell data (Science quizzes)
- Magic system implementation
- Save/Load testing

## Next Steps

### Priority 1 - Core Gameplay:
1. Test combat with Math quizzes
2. Test harvesting with Animal quizzes
3. Test cooking with Cooking quizzes
4. Verify inventory management

### Priority 2 - Missing Items:
1. Create armor.json
2. Create potions.json
3. Create scrolls.json
4. Create accessories.json

### Priority 3 - Systems:
1. Implement spell casting
2. Polish combat feedback
3. Add save/load functionality

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
Save:           Ctrl+S (when implemented)
Load:           Ctrl+L (when implemented)
```

## Development Notes

### GitHub Pages Deployment:
- All data paths now use conditional loading:
```javascript
const basePath = window.location.hostname === 'localhost' 
    ? '/data/items' 
    : '/KnowledgeHack/data/items';
```

### Player Class Compatibility:
- Player now has all methods expected by other systems
- Equipment bonus tracking added
- Burden system implemented
- All derived stats calculate properly

### Event System:
- All events defined in CONFIG.EVENTS
- EventBus uses CONFIG.EVENTS
- All systems can emit/listen to standardized events

## Final Status
**The game should now run without critical errors!** 🎮

Focus can shift from bug fixing to implementing remaining features.