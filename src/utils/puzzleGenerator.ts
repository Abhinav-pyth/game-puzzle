// Fruit emoji groups for generating puzzles
export const fruitGroups = [
  { name: 'apple', emojis: ['🍎', '🍏'], variants: ['🍎', '🍏'] },
  { name: 'cherry', emojis: ['🍒'], variants: ['🍒'] },
  { name: 'peach', emojis: ['🍑'], variants: ['🍑'] },
  { name: 'banana', emojis: ['🍌'], variants: ['🍌'] },
  { name: 'watermelon', emojis: ['🍉'], variants: ['🍉'] },
  { name: 'grape', emojis: ['🍇'], variants: ['🍇'] },
  { name: 'strawberry', emojis: ['🍓'], variants: ['🍓'] },
  { name: 'mango', emojis: ['🥭'], variants: ['🥭'] },
  { name: 'pineapple', emojis: ['🍍'], variants: ['🍍'] },
  { name: 'lemon', emojis: ['🍋'], variants: ['🍋'] },
  { name: 'orange', emojis: ['🍊'], variants: ['🍊'] },
  { name: 'kiwi', emojis: ['🥝'], variants: ['🥝'] },
  { name: 'coconut', emojis: ['🥥'], variants: ['🥥'] },
  { name: 'avocado', emojis: ['🥑'], variants: ['🥑'] },
  { name: 'blueberry', emojis: ['🫐'], variants: ['🫐'] },
  { name: 'tomato', emojis: ['🍅'], variants: ['🍅'] },
];

// Similar-looking emoji pairs for harder puzzles
export const similarPairs: [string, string][] = [
  ['🍎', '🍏'], // red vs green apple
  ['🍋', '🍊'], // lemon vs orange
  ['🍑', '🍎'], // peach vs apple (similar shape)
  ['🍇', '🍒'], // grape vs cherry (both round fruits)
  ['🥝', '🥥'], // kiwi vs coconut
  ['🍅', '🍎'], // tomato vs apple
  ['🍌', '🍋'], // banana vs lemon (both yellow)
];

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PuzzleConfig {
  gridSize: number; // e.g., 4 means 4x4 grid
  timeLimit: number; // seconds
  difficulty: Difficulty;
  puzzleType: 'different_fruit' | 'similar_fruit' | 'rotated' | 'size_diff';
}

export interface PuzzleCell {
  id: number;
  emoji: string;
  isOdd: boolean;
  rotation?: number;
  scale?: number;
  opacity?: number;
}

export interface Puzzle {
  cells: PuzzleCell[];
  gridSize: number;
  oddIndex: number;
  config: PuzzleConfig;
  hint?: string;
}

function getGridSizeForDifficulty(difficulty: Difficulty, level: number): number {
  if (difficulty === 'easy') {
    if (level <= 5) return 3;
    if (level <= 10) return 4;
    return 4;
  } else if (difficulty === 'medium') {
    if (level <= 5) return 4;
    if (level <= 10) return 5;
    return 5;
  } else {
    if (level <= 5) return 5;
    if (level <= 10) return 6;
    return 6;
  }
}

function getTimeForDifficulty(difficulty: Difficulty, level: number): number {
  if (difficulty === 'easy') {
    if (level <= 5) return 15;
    if (level <= 10) return 12;
    return 10;
  } else if (difficulty === 'medium') {
    if (level <= 5) return 12;
    if (level <= 10) return 10;
    return 8;
  } else {
    if (level <= 5) return 10;
    if (level <= 10) return 8;
    return 6;
  }
}

function getPuzzleType(difficulty: Difficulty, level: number): PuzzleConfig['puzzleType'] {
  if (difficulty === 'easy') {
    return 'different_fruit';
  } else if (difficulty === 'medium') {
    if (level <= 5) return 'different_fruit';
    if (level <= 10) return 'similar_fruit';
    return Math.random() > 0.5 ? 'similar_fruit' : 'rotated';
  } else {
    const types: PuzzleConfig['puzzleType'][] = ['different_fruit', 'similar_fruit', 'rotated', 'size_diff'];
    return types[Math.floor(Math.random() * types.length)];
  }
}

export function generatePuzzle(difficulty: Difficulty, level: number): Puzzle {
  const gridSize = getGridSizeForDifficulty(difficulty, level);
  const timeLimit = getTimeForDifficulty(difficulty, level);
  const puzzleType = getPuzzleType(difficulty, level);
  
  const totalCells = gridSize * gridSize;
  const config: PuzzleConfig = { gridSize, timeLimit, difficulty, puzzleType };

  let cells: PuzzleCell[] = [];
  let oddIndex = Math.floor(Math.random() * totalCells);

  if (puzzleType === 'different_fruit') {
    // Pick a main fruit and a different one as the odd
    const mainGroup = fruitGroups[Math.floor(Math.random() * fruitGroups.length)];
    let oddGroup = fruitGroups[Math.floor(Math.random() * fruitGroups.length)];
    while (oddGroup.name === mainGroup.name) {
      oddGroup = fruitGroups[Math.floor(Math.random() * fruitGroups.length)];
    }

    const mainEmoji = mainGroup.emojis[0];
    const oddEmoji = oddGroup.emojis[0];

    cells = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      emoji: i === oddIndex ? oddEmoji : mainEmoji,
      isOdd: i === oddIndex,
    }));
  } else if (puzzleType === 'similar_fruit') {
    // Use similar-looking pairs
    const pair = similarPairs[Math.floor(Math.random() * similarPairs.length)];
    const mainEmoji = pair[0];
    const oddEmoji = pair[1];

    cells = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      emoji: i === oddIndex ? oddEmoji : mainEmoji,
      isOdd: i === oddIndex,
    }));
  } else if (puzzleType === 'rotated') {
    // Same emoji but one is rotated
    const group = fruitGroups[Math.floor(Math.random() * fruitGroups.length)];
    const emoji = group.emojis[0];
    const rotation = Math.random() > 0.5 ? 180 : (Math.random() > 0.5 ? 90 : 270);

    cells = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      emoji: emoji,
      isOdd: i === oddIndex,
      rotation: i === oddIndex ? rotation : 0,
    }));
  } else if (puzzleType === 'size_diff') {
    // Same emoji but one is slightly smaller
    const group = fruitGroups[Math.floor(Math.random() * fruitGroups.length)];
    const emoji = group.emojis[0];

    cells = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      emoji: emoji,
      isOdd: i === oddIndex,
      scale: i === oddIndex ? 0.7 : 1,
    }));
  }

  return { cells, gridSize, oddIndex, config };
}

export function getLevelConfig(level: number): { difficulty: Difficulty; label: string } {
  if (level <= 20) return { difficulty: 'easy', label: 'Easy' };
  if (level <= 40) return { difficulty: 'medium', label: 'Medium' };
  return { difficulty: 'hard', label: 'Hard' };
}
