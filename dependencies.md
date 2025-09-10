# Philosopher's Quest - Dependency Map

## Load Order (Critical)

The files must be loaded in this order to avoid undefined references:

1. **config.js** - No dependencies, defines global constants
2. **event-bus.js** - Depends on config.js (COMPLETE with all events)
3. **dice.js** - No dependencies
4. **player.js** - Depends on config.js, event-bus.js (COMPLETE with 6 stats)
5. **item.js** - Depends on config.js, event-bus.js
6. **monster-abilities.js** - Depends on config.js, event-bus.js
7. **monster-ai.js** - Depends on config.js, event-bus.js
8. **monster.js** - Depends on config.js, event-bus.js, monster-ai.js, dice.js
9. **effect.js** - Depends on config.js, event-bus.js
10. All loaders (question-loader, item-loader, monster-loader, spell-loader)
11. All systems (combat, inventory, equipment, cooking, harvesting, etc.)
12. All world files (tile, room, corridor, dungeon, dungeon-generator)
13. All UI files (message-log, renderer, modal, ui-manager, input-handler)
14. **game.js** - Depends on almost everything (COMPLETE with full integration)
15. **index.html** - Entry point, loads game.js last

## File-by-File Dependencies (Updated)

### Core Files

#### `js/config.js`
- **Depends on**: Nothing
- **Used by**: Almost every file
- **Exports**: CONFIG, TILES, COLORS, QUIZ_SUBJECTS constants

#### `js/core/event-bus.js` ✅ COMPLETE
- **Depends on**: Nothing (standalone)
- **Used by**: All systems, entities, and UI components
- **Exports**: EventBus, EVENTS (all events defined)
- **New Events Added**: 
  - PLAYER_STAT_CHANGE, PLAYER_SP_CHANGE, PLAYER_STARVING
  - EFFECT_ADDED, EFFECT_REMOVED
  - HARVEST_START/SUCCESS/FAILURE
  - COOKING_START/COMPLETE
  - SAVING_THROW

#### `js/core/game.js` ✅ COMPLETE
- **Depends on**:
  - All core systems
  - `js/entities/player.js` (6-stat version)
  - `js/systems/cooking.js` (NEW)
  - `js/systems/harvesting.js` (NEW)
- **Handles**: Monster death → corpse drops
- **Integrates**: Complete food progression system

### Entity Files (Updated)

#### `js/entities/player.js` ✅ COMPLETE
- **New Features**:
  - 6 base attributes (STR, CON, DEX, INT, WIS, PER)
  - Derived stats calculation
  - Saving throws (Fort, Reflex, Will)
  - Effect management system
  - SP consumption and starvation
  - Burden calculation
- **Methods Added**:
  - `increaseAttribute(attribute, value)`
  - `makeSavingThrow(type, dc)`
  - `processEffects()`
  - `consumeSP(amount)`

### System Files (New & Updated)

#### `js/systems/cooking.js` ✅ NEW - COMPLETE
- **Depends on**:
  - `js/core/event-bus.js`
  - `js/systems/quiz-engine.js`
- **External data**:
  - `data/items/food.json`
- **Purpose**: Escalator chain quiz for cooking food
- **Exports**: CookingSystem class

#### `js/systems/harvesting.js` ✅ NEW - COMPLETE
- **Depends on**:
  - `js/core/event-bus.js`
  - `js/systems/quiz-engine.js`
- **External data**:
  - `data/items/corpses.json`
- **Purpose**: Threshold quiz for harvesting corpses
- **Exports**: HarvestingSystem class

### UI Files (Updated)

#### `js/ui/ui-manager.js` ✅ COMPLETE
- **New Features**:
  - Displays all 6 attributes
  - Shows derived stats (AC, sight, carry, etc.)
  - Displays saving throws
  - Shows burden status
  - Active effects with durations
- **Auto-creates**: Stats panel if HTML lacks it

#### `js/ui/input-handler.js` ✅ COMPLETE
- **New Commands**:
  - `h` - Harvest corpse
  - `c` - Cook food
  - `,` or `g` - Pickup items
  - Full roguelike control scheme

### Data Files (New & Updated)

#### `data/items/corpses.json` ✅ NEW - COMPLETE
- **Used by**: `js/systems/harvesting.js`
- **Contains**: 15 corpse definitions
- **Each corpse has**:
  - harvestTier (quiz difficulty)
  - harvestThreshold (correct answers needed)
  - harvestFood (resulting food item)

#### `data/items/food.json` ✅ COMPLETE
- **Used by**: `js/systems/cooking.js`
- **Contains**: 15 food types
- **Each food has**: 6 cooking outcomes (0-5 score)
- **Total recipes**: 90
- **Effects include**:
  - restoreSP/HP/MP
  - increaseAttribute (permanent stat gains)
  - temporary effects with duration

## System Integration Flow

### Food Progression Pipeline
```
1. Monster Death (combat.js)
   ↓
2. Corpse Drop (game.js handleMonsterDeath)
   ↓
3. Pickup Corpse (input-handler → inventory)
   ↓
4. Harvest Corpse (harvesting.js)
   → Animal Quiz (quiz-engine.js)
   → Success: Get Food Item
   ↓
5. Cook Food (cooking.js)
   → Cooking Quiz (quiz-engine.js)
   → Score 0-5: Different meals
   ↓
6. Apply Effects (player.js)
   → Restore SP/HP/MP
   → Increase Attributes
   → Add Temporary Effects
```

### Event Flow for Food System
```
PLAYER_ACTION{harvest} 
  → QUIZ_START{animal}
  → QUIZ_COMPLETE
  → HARVEST_SUCCESS/FAILURE
  → INVENTORY_CHANGE

PLAYER_ACTION{cook}
  → QUIZ_START{cooking}
  → QUIZ_COMPLETE
  → COOKING_COMPLETE
  → PLAYER_STAT_CHANGE
  → EFFECT_ADDED
```

## Module Load Order in index.html

```html
<!-- Load in this order -->
<script type="module">
  // 1. Config and constants
  import { CONFIG } from './js/config.js';
  
  // 2. Core utilities
  import { EventBus, EVENTS } from './js/core/event-bus.js';
  import * as dice from './js/utils/dice.js';
  
  // 3. Entities (in dependency order)
  import { Player } from './js/entities/player.js';
  // ... other entities
  
  // 4. Loaders
  import { QuestionLoader } from './js/core/question-loader.js';
  import { ItemLoader } from './js/core/item-loader.js';
  // ... other loaders
  
  // 5. Systems (including new food systems)
  import { QuizEngine } from './js/systems/quiz-engine.js';
  import { CookingSystem } from './js/systems/cooking.js';
  import { HarvestingSystem } from './js/systems/harvesting.js';
  // ... other systems
  
  // 6. UI
  import { UIManager } from './js/ui/ui-manager.js';
  import { InputHandler } from './js/ui/input-handler.js';
  // ... other UI
  
  // 7. Main game (depends on everything)
  import { Game } from './js/core/game.js';
  
  // Initialize game
  const game = new Game();
  await game.initialize();
</script>
```

## Critical Dependencies for Food System

### Required for Harvesting:
- `corpses.json` - Defines what each monster drops
- `harvesting.js` - Handles the harvest quiz
- `quiz-engine.js` - Runs threshold quizzes
- `event-bus.js` - Coordinates harvest events

### Required for Cooking:
- `food.json` - Defines cooking outcomes
- `cooking.js` - Handles cooking quiz
- `quiz-engine.js` - Runs escalator quizzes
- `player.js` - Applies stat increases

### Required for Stats:
- `player.js` - 6-stat system with calculations
- `ui-manager.js` - Displays all stats
- `event-bus.js` - Notifies on stat changes

## Testing the Food System

To verify everything works:
1. Check console for initialization messages
2. Kill a monster - should drop corpse
3. Press `,` to pick up corpse
4. Press `h` to harvest - Animal quiz should start
5. Press `c` to cook - Cooking quiz should start
6. Check stats panel for attribute changes

## Notes

- All food system files are complete and integrated
- The game loop is fully playable
- Stats properly affect gameplay (AC, sight, carry, etc.)
- SP hunger system forces resource management
- Quiz performance directly impacts progression