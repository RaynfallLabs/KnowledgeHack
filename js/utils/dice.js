/**
 * dice.js - Dice rolling utility for Philosopher's Quest
 * Supports standard RPG dice notation (e.g., "2d6+3", "1d20", "3d8-2")
 */

/**
 * Roll dice based on standard RPG notation
 * @param {string|number} notation - Dice notation string (e.g., "2d6+3") or just a number
 * @returns {number} Total rolled value
 * 
 * Examples:
 * - rollDice("2d6+3") - Roll 2 six-sided dice and add 3
 * - rollDice("1d20") - Roll a twenty-sided die
 * - rollDice("3d8-2") - Roll 3 eight-sided dice and subtract 2
 * - rollDice(10) - Just return 10
 * - rollDice("1d6+1d4") - Roll 1d6 and 1d4 and sum them
 */
export function rollDice(notation) {
    // If it's just a number, return it
    if (typeof notation === 'number') {
        return notation;
    }
    
    // Convert to string and remove spaces
    notation = String(notation).replace(/\s/g, '');
    
    // If it's just a plain number string
    if (/^\d+$/.test(notation)) {
        return parseInt(notation);
    }
    
    // Handle multiple dice expressions (e.g., "1d6+1d4+2")
    const parts = notation.split(/(?=[+-])/); // Split on + or - but keep the sign
    let total = 0;
    
    for (const part of parts) {
        // Check if this part starts with + or -
        const isNegative = part.startsWith('-');
        const cleanPart = part.replace(/^[+-]/, '');
        
        // Parse dice notation (XdY format)
        const diceMatch = cleanPart.match(/^(\d+)d(\d+)$/);
        
        if (diceMatch) {
            const numDice = parseInt(diceMatch[1]);
            const dieSize = parseInt(diceMatch[2]);
            const rollResult = rollMultiple(numDice, dieSize);
            total += isNegative ? -rollResult : rollResult;
        } else if (/^\d+$/.test(cleanPart)) {
            // It's just a number modifier
            const modifier = parseInt(cleanPart);
            total += isNegative ? -modifier : modifier;
        }
    }
    
    return Math.max(0, total); // Never return negative damage
}

/**
 * Roll a single die
 * @param {number} sides - Number of sides on the die
 * @returns {number} Rolled value (1 to sides)
 */
export function roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice of the same type
 * @param {number} count - Number of dice to roll
 * @param {number} sides - Number of sides on each die
 * @returns {number} Sum of all rolls
 */
export function rollMultiple(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += roll(sides);
    }
    return total;
}

/**
 * Roll a d20 (common for attack rolls)
 * @returns {number} Value from 1-20
 */
export function d20() {
    return roll(20);
}

/**
 * Roll a d100 (percentile dice)
 * @returns {number} Value from 1-100
 */
export function d100() {
    return roll(100);
}

/**
 * Roll 3d6 (common for ability scores)
 * @returns {number} Value from 3-18
 */
export function roll3d6() {
    return rollMultiple(3, 6);
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {string} notation - Dice notation
 * @returns {number} Higher of two rolls
 */
export function rollAdvantage(notation) {
    const roll1 = rollDice(notation);
    const roll2 = rollDice(notation);
    return Math.max(roll1, roll2);
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {string} notation - Dice notation
 * @returns {number} Lower of two rolls
 */
export function rollDisadvantage(notation) {
    const roll1 = rollDice(notation);
    const roll2 = rollDice(notation);
    return Math.min(roll1, roll2);
}

/**
 * Get a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random float
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Roll for a percentage chance
 * @param {number} chance - Percentage chance (0-100)
 * @returns {boolean} True if roll succeeds
 */
export function rollChance(chance) {
    return Math.random() * 100 < chance;
}

/**
 * Pick a random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
export function randomChoice(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick multiple random elements from an array (without replacement)
 * @param {Array} array - Array to pick from
 * @param {number} count - Number of elements to pick
 * @returns {Array} Array of random elements
 */
export function randomChoices(array, count) {
    if (!array || array.length === 0) return [];
    
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Roll on a weighted table
 * @param {Array} table - Array of {weight: number, value: any} objects
 * @returns {*} Selected value based on weights
 * 
 * Example:
 * const lootTable = [
 *   { weight: 50, value: 'gold' },
 *   { weight: 30, value: 'potion' },
 *   { weight: 20, value: 'sword' }
 * ];
 * const loot = rollWeighted(lootTable); // More likely to get gold
 */
export function rollWeighted(table) {
    if (!table || table.length === 0) return null;
    
    const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    
    for (const item of table) {
        roll -= item.weight;
        if (roll <= 0) {
            return item.value;
        }
    }
    
    // Fallback (shouldn't happen)
    return table[table.length - 1].value;
}

/**
 * Parse dice notation to get min/max/average values
 * @param {string} notation - Dice notation string
 * @returns {Object} Object with min, max, and average values
 * 
 * Example:
 * parseDice("2d6+3") returns { min: 5, max: 15, average: 10 }
 */
export function parseDice(notation) {
    // Simple number
    if (typeof notation === 'number') {
        return { min: notation, max: notation, average: notation };
    }
    
    notation = String(notation).replace(/\s/g, '');
    
    if (/^\d+$/.test(notation)) {
        const value = parseInt(notation);
        return { min: value, max: value, average: value };
    }
    
    let minTotal = 0;
    let maxTotal = 0;
    let avgTotal = 0;
    
    const parts = notation.split(/(?=[+-])/);
    
    for (const part of parts) {
        const isNegative = part.startsWith('-');
        const cleanPart = part.replace(/^[+-]/, '');
        const diceMatch = cleanPart.match(/^(\d+)d(\d+)$/);
        
        if (diceMatch) {
            const numDice = parseInt(diceMatch[1]);
            const dieSize = parseInt(diceMatch[2]);
            
            const min = numDice * 1;
            const max = numDice * dieSize;
            const avg = numDice * (dieSize + 1) / 2;
            
            minTotal += isNegative ? -max : min;
            maxTotal += isNegative ? -min : max;
            avgTotal += isNegative ? -avg : avg;
        } else if (/^\d+$/.test(cleanPart)) {
            const modifier = parseInt(cleanPart);
            const value = isNegative ? -modifier : modifier;
            minTotal += value;
            maxTotal += value;
            avgTotal += value;
        }
    }
    
    return {
        min: Math.max(0, minTotal),
        max: Math.max(0, maxTotal),
        average: Math.max(0, avgTotal)
    };
}

// Export a default object with all functions for convenience
export default {
    rollDice,
    roll,
    rollMultiple,
    d20,
    d100,
    roll3d6,
    rollAdvantage,
    rollDisadvantage,
    randomInt,
    randomFloat,
    rollChance,
    randomChoice,
    randomChoices,
    rollWeighted,
    parseDice
};