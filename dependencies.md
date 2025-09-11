# Philosopher's Quest - Dependency Map

## Load Order (Critical) - UPDATED

The files must be loaded in this order to avoid undefined references:

1. **config.js** - ✅ FIXED (includes EVENTS and INVENTORY)
2. **event-bus.js** - ✅ COMPLETE (uses CONFIG.EVENTS)
3. **dice.js** - ✅ COMPLETE (no dependencies)
4. **player.js** - ✅ FIXED (all methods added)
5. **item.js** - Basic implementation
6. **monster-abilities.js** - ✅ COMPLETE
7. **monster-ai.js** - ✅ COMPLETE
8. **monster.js** - ✅ COMPLETE
9. **effect.js** - Basic implementation
10. All loaders - ✅ FIXED (correct paths)
11. All systems - Mixed (cooking/harvesting ✅ FIXED)
12. All world files - ✅ FIXED (import paths)
13. All UI files - ✅ FIXED (ui-manager simplified)
14. **game.js** - ✅ FIXED (error handling)
15. **index.html** - Entry point

## Critical Path Dependencies (After Bug Fixes)

### Core Loading Chain
```
config.js (✅ FIXED)
    ↓
event-bus.js (✅ uses CONFIG.EVENTS)
    ↓
player.js (✅ FIXED - has all methods)
    ↓
game.js (✅ FIXED - proper initialization)
```

### Data Loading Chain
```
item-loader.js (✅ FIXED paths)
    → /KnowledgeHack/data/items/*.json
    
monster-loader.js (✅ FIXED paths)
    → /KnowledgeHack/data/monsters.json
    
question-loader.js (✅ COMPLETE)
    → /KnowledgeHack/data/questions/*.json
```

### System Dependencies
```
cooking.js (✅ FIXED)
    → requires: event-bus.js, quiz-engine.js
    → loads: /KnowledgeHack/data/items/food.json
    
harvesting.js (✅ FIXED)
    → requires: event-bus.js, quiz-engine.js
    → loads: /KnowledgeHack/data/items/corpses.json
    
ui-manager.js (✅ SIMPLIFIED)
    → requires: player with getTotalAC(), getAC()
    → no longer breaks if methods missing
```

## Fixed Issues Summary

### Path Issues (ALL FIXED ✅)
- `item-loader.js` - Now uses GitHub Pages paths
- `monster-loader.js` - Now uses GitHub Pages paths
- `cooking.js` - Now uses GitHub Pages paths
- `harvesting.js` - Now uses GitHub Pages paths

### Missing Methods (ALL FIXED ✅)
- `player.getTotalAC()` - Added
- `player.getAC()` - Added
- `player.updateStats()` - Added
- `player.getSightRadius()` - Added
- `player.update()` - Added
- `player.updateWeight()` - Added

### Missing Constants (ALL FIXED ✅)
- `CONFIG.EVENTS` - Added complete event list
- `CONFIG.INVENTORY` - Added with MAX_ITEMS and DEFAULT_STACK_SIZE

### Import Errors (ALL FIXED ✅)
- `dungeon-generator.js` - Fixed monster-loader import path from `/systems/` to `/core/`

## Current Dependency Tree

```
index.html
    ├── config.js ✅
    ├── event-bus.js ✅
    ├── question-loader.js ✅
    ├── item-loader.js ✅
    ├── monster-loader.js ✅
    ├── player.js ✅
    ├── game.js ✅
    │   ├── dungeon-generator.js ✅
    │   ├── dungeon.js
    │   ├── quiz-engine.js
    │   ├── combat.js
    │   ├── inventory.js
    │   ├── equipment.js
    │   ├── cooking.js ✅
    │   ├── harvesting.js ✅
    │   ├── renderer.js ✅
    │   ├── message-log.js ✅
    │   ├── ui-manager.js ✅
    │   └── input-handler.js ✅
    └── (starts game loop)
```

## Validation Checklist

### Core Systems
- [x] CONFIG loads with all constants
- [x] EventBus initializes with CONFIG.EVENTS
- [x] Player class has all required methods
- [x] Game initializes without errors

### Data Loading
- [x] Questions load from correct path
- [x] Monsters load from correct path
- [x] Items load from correct paths
- [x] Food data loads properly
- [x] Corpse data loads properly
- [x] Container data loads properly

### UI Systems
- [x] UIManager doesn't crash on missing methods
- [x] Stats display properly
- [x] Inventory displays (if system exists)
- [x] Messages appear in log

## Remaining Dependencies to Implement

### Systems Needing Full Implementation:
- `combat.js` - Basic version exists
- `inventory.js` - Basic version exists
- `equipment.js` - Basic version exists
- `magic.js` - Not implemented
- `lockpicking.js` - Basic version exists
- `save-load.js` - Basic version exists

### Data Files Needed:
- `armor.json` - For Geography quiz system
- `potions.json` - For healing items
- `scrolls.json` - For Grammar quiz system
- `accessories.json` - For History quiz system
- `spells.json` - For Science quiz system

## Module Load Order in index.html

```html
<script type="module">
  // 1. Config and constants
  import { CONFIG } from './js/config.js';
  
  // 2. Core utilities
  import { EventBus, EVENTS } from './js/core/event-bus.js';
  import * as dice from './js/utils/dice.js';
  
  // 3. Entities
  import { Player } from './js/entities/player.js';
  import { Monster } from './js/entities/monster.js';
  
  // 4. Loaders (with fixed paths)
  import { QuestionLoader } from './js/core/question-loader.js';
  import { ItemLoader } from './js/core/item-loader.js';
  import { monsterLoader } from './js/core/monster-loader.js';
  
  // 5. Systems (with fixed files)
  import { QuizEngine } from './js/systems/quiz-engine.js';
  import { CookingSystem } from './js/systems/cooking.js';
  import { HarvestingSystem } from './js/systems/harvesting.js';
  
  // 6. UI (with simplified ui-manager)
  import { UIManager } from './js/ui/ui-manager.js';
  import { InputHandler } from './js/ui/input-handler.js';
  import { MessageLog } from './js/ui/message-log.js';
  import { Renderer } from './js/ui/renderer.js';
  
  // 7. World
  import { DungeonGenerator } from './js/world/dungeon-generator.js';
  import { Dungeon } from './js/world/dungeon.js';
  
  // 8. Main game (with error handling)
  import { Game } from './js/core/game.js';
  
  // Initialize game
  const game = new Game();
  await game.initialize();
</script>
```

## Notes

- All critical path issues have been resolved
- Game should now load and run without fatal errors
- Some systems still need full implementation but won't crash
- Focus can now shift from bug fixing to feature implementation