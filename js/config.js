const CONFIG = {
    MAP_WIDTH: 120, 
    MAP_HEIGHT: 80,
    VIEWPORT_WIDTH: 50, 
    VIEWPORT_HEIGHT: 33,
    CANVAS_WIDTH: 900, 
    CANVAS_HEIGHT: 600, 
    TILE_SIZE: 18,
    STARTING_WISDOM: 15,
    SIGHT_RADIUS: 3,
    MAX_MESSAGES: 50,
    CARRYING_CAPACITY_BASE: 50,
    MAX_LEVEL: 100,
    BOSS_LEVELS: [15, 30, 45, 60, 75, 90, 100]
};

const TILES = {
    PLAYER: '@',
    WALL: '#',
    FLOOR: '.',
    DOOR: '+',
    FOOD: '%',
    WEAPON: ')',
    ARMOR: '[',
    SCROLL: '?',
    POTION: '!',
    WAND: '/'
};

const COLORS = {
    WHITE: '#ffffff',
    GRAY: '#808080',
    DARKGRAY: '#404040',
    BROWN: '#8B4513',
    GREEN: '#00ff00',
    BLUE: '#0066ff',
    RED: '#ff0000',
    YELLOW: '#ffff00',
    MAGENTA: '#ff00ff',
    CYAN: '#00ffff',
    ORANGE: '#ff8800'
};

const QUIZ_SUBJECTS = {
    math: 'Mathematics',
    science: 'Science', 
    philosophy: 'Philosophy',
    geography: 'Geography',
    history: 'History',
    economics: 'Economics',
    cooking: 'Cooking & Nutrition',
    grammar: 'Grammar & Language',
    animal: 'Animal Facts'
};