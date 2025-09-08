# KnowledgeHack File System Reference

```
philosophers-quest/
├── index.html
├── css/
│   └── main.css
│
├── js/
│   ├── config.js
│   │
│   ├── core/
│   │   ├── event-bus.js
│   │   ├── question-loader.js
│   │   ├── item-loader.js
│   │   ├── monster-loader.js
│   │   ├── spell-loader.js
│   │   └── game.js
│   │
│   ├── entities/
│   │   ├── player.js
│   │   ├── item.js
│   │   ├── monster.js
│   │   ├── monster-ai.js
│   │   ├── monster-abilities.js
│   │   └── effect.js
│   │
│   ├── systems/
│   │   ├── quiz-engine.js
│   │   ├── combat.js
│   │   ├── inventory.js
│   │   ├── equipment.js
│   │   ├── identification.js
│   │   ├── cooking.js
│   │   ├── harvesting.js
│   │   ├── magic.js
│   │   ├── lockpicking.js
│   │   └── save-load.js
│   │
│   ├── ui/
│   │   ├── input-handler.js
│   │   ├── message-log.js
│   │   ├── renderer.js
│   │   ├── ui-manager.js
│   │   └── modal.js
│   │
│   └── world/
│       ├── dungeon.js
│       ├── dungeon-generator.js
│       ├── tile.js
│       ├── room.js
│       └── corridor.js
│
└── data/
    ├── questions/
    │   ├── questions-math.json        # Combat damage
    │   ├── questions-philosophy.json  # Item/monster identification
    │   ├── questions-geography.json   # Armor equipping
    │   ├── questions-science.json     # Spell casting
    │   ├── questions-history.json     # Accessory equipping
    │   ├── questions-economics.json   # Lockpicking
    │   ├── questions-cooking.json     # Food preparation (escalator chain)
    │   ├── questions-grammar.json     # Scroll/book reading
    │   └── questions-animal.json      # Corpse harvesting (threshold)
    │
    ├── items/
    │   ├── weapons.json
    │   ├── armor.json
    │   ├── accessories.json
    │   ├── potions.json
    │   ├── scrolls.json
    │   ├── wands.json
    │   ├── books.json
    │   ├── food.json
    │   ├── corpses.json
    │   ├── tools.json
    │   └── artifacts.json
    │
    ├── monsters.json
    │
    └── spells.json
```