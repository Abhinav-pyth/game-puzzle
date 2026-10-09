import { useState, useEffect, useCallback, useRef } from 'react';
import { generatePuzzle, getLevelConfig, Puzzle, Difficulty, fruitGroups } from './utils/puzzleGenerator';

type GameState = 'menu' | 'playing' | 'correct' | 'wrong' | 'gameover' | 'levelSelect' | 'creator';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem('oddOneOut_highScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [maxLevel, setMaxLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('oddOneOut_maxLevel');
      return saved ? parseInt(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [startLevel, setStartLevel] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef<GameState>('menu');
  const [shakeWrong, setShakeWrong] = useState(false);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, emoji: string}[]>([]);

  // Creator state
  const [creatorGridSize, setCreatorGridSize] = useState(4);
  const [creatorMainEmoji, setCreatorMainEmoji] = useState('🍎');
  const [creatorOddEmoji, setCreatorOddEmoji] = useState('🍏');
  const [creatorTimeLimit, setCreatorTimeLimit] = useState(10);
  const [creatorPuzzle, setCreatorPuzzle] = useState<Puzzle | null>(null);
  const [creatorOddIndex, setCreatorOddIndex] = useState<number | null>(null);
  const [creatorPlaying, setCreatorPlaying] = useState(false);
  const [creatorTimeLeft, setCreatorTimeLeft] = useState(0);
  const [creatorResult, setCreatorResult] = useState<'correct' | 'wrong' | null>(null);
  const creatorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const spawnParticles = useCallback(() => {
    const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1500);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAutoNext = useCallback(() => {
    if (autoNextRef.current) {
      clearTimeout(autoNextRef.current);
      autoNextRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    clearTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (gameStateRef.current === 'playing') {
            clearTimer();
            setGameState('wrong');
            setShowResult(true);
            setStreak(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const startGame = useCallback((level: number, difficulty: Difficulty, resetScore = true) => {
    clearTimer();
    clearAutoNext();
    setCurrentLevel(level);
    setSelectedDifficulty(difficulty);
    if (resetScore) {
      setScore(0);
      setStreak(0);
    }
    setStartLevel(level);
    const newPuzzle = generatePuzzle(difficulty, level);
    setPuzzle(newPuzzle);
    setSelectedCell(null);
    setShowResult(false);
    setGameState('playing');
    startTimer(newPuzzle.config.timeLimit);
  }, [clearTimer, clearAutoNext, startTimer]);

  const nextLevel = useCallback(() => {
    clearTimer();
    clearAutoNext();
    const next = currentLevel + 1;
    setCurrentLevel(next);
    if (next > maxLevel) {
      setMaxLevel(next);
      try {
        localStorage.setItem('oddOneOut_maxLevel', next.toString());
      } catch { /* ignore */ }
    }
    const newPuzzle = generatePuzzle(selectedDifficulty, next);
    setPuzzle(newPuzzle);
    setSelectedCell(null);
    setShowResult(false);
    setGameState('playing');
    startTimer(newPuzzle.config.timeLimit);
  }, [currentLevel, selectedDifficulty, maxLevel, clearTimer, clearAutoNext, startTimer]);

  // Auto-advance to next level after correct answer
  useEffect(() => {
    if (gameState === 'correct') {
      clearAutoNext();
      autoNextRef.current = setTimeout(() => {
        if (currentLevel >= 60) {
          setGameState('gameover');
        } else {
          nextLevel();
        }
      }, 1500);
      return () => clearAutoNext();
    }
  }, [gameState, currentLevel, nextLevel, clearAutoNext]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearAutoNext();
      if (creatorTimerRef.current) clearInterval(creatorTimerRef.current);
    };
  }, [clearTimer, clearAutoNext]);

  const handleCellClick = (cellIndex: number) => {
    if (gameState !== 'playing' || showResult) return;
    
    setSelectedCell(cellIndex);
    setShowResult(true);
    clearTimer();

    if (cellIndex === puzzle?.oddIndex) {
      // Correct!
      const bonus = streak >= 3 ? 50 : 0;
      const timeBonus = timeLeft * 10;
      const levelBonus = currentLevel * 5;
      const points = 100 + timeBonus + levelBonus + bonus;
      setScore(prev => {
        const newScore = prev + points;
        if (newScore > highScore) {
          setHighScore(newScore);
          try {
            localStorage.setItem('oddOneOut_highScore', newScore.toString());
          } catch { /* ignore */ }
        }
        return newScore;
      });
      setStreak(prev => prev + 1);
      setGameState('correct');
      spawnParticles();
    } else {
      // Wrong!
      setStreak(0);
      setShakeWrong(true);
      setGameState('wrong');
      setTimeout(() => setShakeWrong(false), 500);
    }
  };

  const handleCreatorCellClick = (cellIndex: number) => {
    if (!creatorPlaying || creatorResult) return;
    
    if (creatorTimerRef.current) {
      clearInterval(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    setCreatorPlaying(false);

    if (cellIndex === creatorOddIndex) {
      setCreatorResult('correct');
      spawnParticles();
    } else {
      setCreatorResult('wrong');
    }
  };

  // Creator timer effect
  useEffect(() => {
    if (creatorPlaying && !creatorResult) {
      creatorTimerRef.current = setInterval(() => {
        setCreatorTimeLeft(prev => {
          if (prev <= 1) {
            if (creatorTimerRef.current) {
              clearInterval(creatorTimerRef.current);
              creatorTimerRef.current = null;
            }
            setCreatorPlaying(false);
            setCreatorResult('wrong');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (creatorTimerRef.current) {
          clearInterval(creatorTimerRef.current);
          creatorTimerRef.current = null;
        }
      };
    }
  }, [creatorPlaying, creatorResult]);

  const generateCreatorPuzzle = () => {
    const totalCells = creatorGridSize * creatorGridSize;
    const oddIdx = Math.floor(Math.random() * totalCells);
    setCreatorOddIndex(oddIdx);

    const cells = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      emoji: i === oddIdx ? creatorOddEmoji : creatorMainEmoji,
      isOdd: i === oddIdx,
    }));

    setCreatorPuzzle({
      cells,
      gridSize: creatorGridSize,
      oddIndex: oddIdx,
      config: { gridSize: creatorGridSize, timeLimit: creatorTimeLimit, difficulty: 'easy', puzzleType: 'different_fruit' },
    });
    setCreatorTimeLeft(creatorTimeLimit);
    setCreatorResult(null);
    setCreatorPlaying(true);
  };

  const getLevelInfo = () => {
    const { label } = getLevelConfig(currentLevel);
    return label;
  };

  const getTimerColor = () => {
    if (!puzzle) return 'text-green-400';
    const ratio = timeLeft / puzzle.config.timeLimit;
    if (ratio > 0.5) return 'text-green-400';
    if (ratio > 0.25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTimerBarColor = () => {
    if (!puzzle) return 'bg-green-500';
    const ratio = timeLeft / puzzle.config.timeLimit;
    if (ratio > 0.5) return 'bg-green-500';
    if (ratio > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const allEmojis = fruitGroups.map(g => g.emojis[0]);

  // =================== MENU SCREEN ===================
  if (gameState === 'menu') {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4 overflow-hidden">
        {/* Floating background emojis */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍌', '🍉', '🥝', '🍍'].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-float"
              style={{
                left: `${(i * 10) + 2}%`,
                top: `${(i * 8 + 5) % 80}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.3}s`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative z-10 max-h-[95vh] overflow-y-auto">
          <div className="text-6xl sm:text-7xl mb-3 animate-bounce">🍎</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            Odd One Out
          </h1>
          <p className="text-gray-500 mb-4 text-base sm:text-lg">🍒🍋🍑 Fruit Puzzle Challenge</p>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-3 sm:p-4 mb-4 border border-yellow-200">
            <div className="flex justify-around">
              <div>
                <p className="text-xs text-gray-500">🏆 High Score</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{highScore}</p>
              </div>
              <div className="w-px bg-yellow-200"></div>
              <div>
                <p className="text-xs text-gray-500">📈 Max Level</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{maxLevel}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-4">
            <h3 className="font-semibold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Select Difficulty</h3>
            <div className="flex gap-2 justify-center">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 ${
                    selectedDifficulty === d
                      ? d === 'easy' ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-105'
                        : d === 'medium' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200 scale-105'
                        : 'bg-red-500 text-white shadow-lg shadow-red-200 scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d === 'easy' ? '🌱 Easy' : d === 'medium' ? '🌿 Medium' : '🔥 Hard'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => startGame(1, selectedDifficulty)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl text-lg sm:text-xl shadow-lg shadow-purple-200 hover:shadow-xl transform hover:scale-105 transition-all duration-200 mb-2 sm:mb-3"
          >
            🎮 Start Game
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setGameState('levelSelect')}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              📋 Levels
            </button>
            <button
              onClick={() => setGameState('creator')}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              ✨ Create
            </button>
          </div>

          <div className="mt-4 bg-gray-50 rounded-2xl p-3 sm:p-4 text-left">
            <h3 className="font-bold text-gray-700 mb-2 text-xs sm:text-sm">🎯 How to Play</h3>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2"><span>👀</span> Look at the grid of fruit emojis</li>
              <li className="flex items-center gap-2"><span>🔍</span> Find the one that&apos;s different</li>
              <li className="flex items-center gap-2"><span>⏱️</span> Beat the clock each round</li>
              <li className="flex items-center gap-2"><span>🔥</span> Build streaks for bonus points!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // =================== LEVEL SELECT ===================
  if (gameState === 'levelSelect') {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-4 sm:p-6 max-w-lg w-full max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">📋 Level Select</h2>
            <button
              onClick={() => setGameState('menu')}
              className="bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 mb-3 text-center">
            Select any unlocked level to play. Score resets when starting a new game.
          </p>
          
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {Array.from({ length: 60 }, (_, i) => i + 1).map(level => {
              const { difficulty } = getLevelConfig(level);
              const isUnlocked = level <= maxLevel;
              return (
                <button
                  key={level}
                  onClick={() => {
                    if (isUnlocked) {
                      // Use the difficulty that matches the level range
                      startGame(level, difficulty, true);
                    }
                  }}
                  disabled={!isUnlocked}
                  className={`aspect-square rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 ${
                    isUnlocked
                      ? difficulty === 'easy' ? 'bg-green-100 hover:bg-green-200 text-green-700 hover:scale-110 shadow-sm'
                        : difficulty === 'medium' ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 hover:scale-110 shadow-sm'
                        : 'bg-red-100 hover:bg-red-200 text-red-700 hover:scale-110 shadow-sm'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isUnlocked ? level : '🔒'}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <span className="text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">🌱 Easy (1-20)</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">🌿 Medium (21-40)</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">🔥 Hard (41-60)</span>
          </div>
        </div>
      </div>
    );
  }

  // =================== PUZZLE CREATOR ===================
  if (gameState === 'creator') {
    return (
      <div className="h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-4 sm:p-6 max-w-lg w-full max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">✨ Puzzle Creator</h2>
            <button
              onClick={() => { setGameState('menu'); setCreatorPlaying(false); }}
              className="bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {!creatorPlaying ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Grid Size */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Grid Size: {creatorGridSize}×{creatorGridSize}</label>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={creatorGridSize}
                  onChange={e => setCreatorGridSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>3×3 (Easy)</span>
                  <span>8×8 (Hard)</span>
                </div>
              </div>

              {/* Main Emoji */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Main Emoji (filler)</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {allEmojis.map(emoji => (
                    <button
                      key={`main-${emoji}`}
                      onClick={() => setCreatorMainEmoji(emoji)}
                      className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                        creatorMainEmoji === emoji ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Odd Emoji */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Odd Emoji (the different one)</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {allEmojis.map(emoji => (
                    <button
                      key={`odd-${emoji}`}
                      onClick={() => setCreatorOddEmoji(emoji)}
                      className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                        creatorOddEmoji === emoji ? 'bg-red-100 ring-2 ring-red-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Time Limit: {creatorTimeLimit}s</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={creatorTimeLimit}
                  onChange={e => setCreatorTimeLimit(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5s (Hard)</span>
                  <span>30s (Easy)</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-gray-500 mb-2">Preview</p>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl">{creatorMainEmoji}</span>
                    <p className="text-xs text-gray-400 mt-1">×{creatorGridSize * creatorGridSize - 1}</p>
                  </div>
                  <span className="text-gray-300 text-lg sm:text-xl">vs</span>
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl">{creatorOddEmoji}</span>
                    <p className="text-xs text-gray-400 mt-1">×1</p>
                  </div>
                </div>
              </div>

              <button
                onClick={generateCreatorPuzzle}
                disabled={creatorMainEmoji === creatorOddEmoji}
                className={`w-full font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl text-base sm:text-lg shadow-lg transition-all duration-200 ${
                  creatorMainEmoji === creatorOddEmoji
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {creatorMainEmoji === creatorOddEmoji ? '⚠️ Choose different emojis!' : '🎲 Generate & Play!'}
              </button>
            </div>
          ) : (
            /* Creator Puzzle Playing */
            <div>
              {/* Timer */}
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-gray-500">Custom Puzzle</span>
                <span className={`text-xl sm:text-2xl font-bold ${
                  creatorTimeLeft > creatorTimeLimit * 0.5 ? 'text-green-500' :
                  creatorTimeLeft > creatorTimeLimit * 0.25 ? 'text-yellow-500' : 'text-red-500'
                } ${creatorTimeLeft <= 3 ? 'animate-pulse' : ''}`}>
                  {creatorTimeLeft}s
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    creatorTimeLeft > creatorTimeLimit * 0.5 ? 'bg-green-500' :
                    creatorTimeLeft > creatorTimeLimit * 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(creatorTimeLeft / creatorTimeLimit) * 100}%` }}
                />
              </div>

              {/* Grid */}
              {creatorPuzzle && (
                <div className={`${creatorResult === 'wrong' ? 'animate-shake' : ''}`}>
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${creatorPuzzle.gridSize}, 1fr)` }}
                  >
                    {creatorPuzzle.cells.map((cell, index) => (
                      <button
                        key={cell.id}
                        onClick={() => handleCreatorCellClick(index)}
                        disabled={!!creatorResult}
                        className={`aspect-square flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-200 text-xl sm:text-2xl md:text-3xl
                          ${creatorResult && cell.isOdd ? 'bg-green-200 ring-4 ring-green-500 scale-110' : ''}
                          ${!creatorResult ? 'hover:bg-emerald-100 hover:scale-105 active:scale-95 cursor-pointer bg-gray-50' : 'bg-gray-50'}
                        `}
                      >
                        <span className={creatorResult && cell.isOdd ? 'animate-bounce' : ''}>
                          {cell.emoji}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {creatorResult && (
                <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl text-center animate-slide-up ${
                  creatorResult === 'correct' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <p className={`text-xl sm:text-2xl font-bold mb-2 ${creatorResult === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                    {creatorResult === 'correct' ? '🎉 You found it!' : creatorTimeLeft === 0 ? '⏱️ Time\'s Up!' : '❌ Wrong one!'}
                  </p>
                  <button
                    onClick={() => {
                      setCreatorPlaying(false);
                      setCreatorResult(null);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2 px-5 sm:px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                  >
                    🔄 New Puzzle
                  </button>
                </div>
              )}

              {!creatorResult && (
                <p className="text-center text-gray-400 text-xs sm:text-sm mt-3 animate-pulse">
                  👆 Find the odd one out!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =================== GAME OVER ===================
  if (gameState === 'gameover') {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-6xl sm:text-7xl mb-3 sm:mb-4">🏆</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Congratulations!</h2>
          <p className="text-gray-500 mb-4">You completed all 60 levels!</p>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-purple-100">
            <p className="text-sm text-gray-500">Final Score</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{score}</p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-500 font-semibold mt-2 text-base sm:text-lg">🏆 New High Score!</p>
            )}
          </div>

          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => startGame(startLevel, selectedDifficulty)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => { clearTimer(); clearAutoNext(); setGameState('menu'); }}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              🏠 Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== GAME PLAYING ===================
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-3 sm:p-4 select-none relative overflow-hidden">
      {/* Celebration particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="fixed text-2xl pointer-events-none animate-confetti z-50"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Main content container - fits viewport */}
      <div className="w-full max-w-lg flex flex-col gap-2 sm:gap-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              clearTimer();
              clearAutoNext();
              setGameState('menu');
            }}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors"
          >
            ← Menu
          </button>
          <div className="text-center">
            <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full ${
              getLevelInfo() === 'Easy' ? 'bg-green-500/80' : getLevelInfo() === 'Medium' ? 'bg-yellow-500/80' : 'bg-red-500/80'
            } text-white`}>
              Level {currentLevel} · {getLevelInfo()}
            </span>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-[10px] sm:text-xs">Score</p>
            <p className="text-white font-bold text-base sm:text-lg leading-tight">{score}</p>
          </div>
        </div>

        {/* Streak & Timer */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 h-6 sm:h-8">
            {streak >= 2 && (
              <span className="bg-orange-500/90 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full animate-pulse shadow-lg">
                🔥 {streak}x Streak
              </span>
            )}
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold ${getTimerColor()} ${timeLeft <= 3 ? 'animate-pulse' : ''} drop-shadow-lg`}>
            {timeLeft}s
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${getTimerBarColor()}`}
            style={{ width: puzzle ? `${(timeLeft / puzzle.config.timeLimit) * 100}%` : '100%' }}
          />
        </div>

        {/* Puzzle Grid */}
        {puzzle && (
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-3 ${shakeWrong ? 'animate-shake' : ''}`}>
            <div
              className="grid gap-0.5 sm:gap-1"
              style={{
                gridTemplateColumns: `repeat(${puzzle.gridSize}, 1fr)`,
              }}
            >
              {puzzle.cells.map((cell, index) => (
                <button
                  key={cell.id}
                  onClick={() => handleCellClick(index)}
                  disabled={showResult}
                  className={`aspect-square flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-200
                    ${showResult && cell.isOdd ? 'bg-green-100 ring-2 sm:ring-4 ring-green-400 scale-110 z-10' : ''}
                    ${showResult && selectedCell === index && !cell.isOdd ? 'bg-red-100 ring-2 sm:ring-4 ring-red-400' : ''}
                    ${!showResult ? 'hover:bg-purple-50 hover:scale-105 active:scale-95 cursor-pointer bg-gray-50' : 'bg-gray-50'}
                    shadow-sm hover:shadow-md
                  `}
                  style={{
                    transform: cell.rotation ? `rotate(${cell.rotation}deg) ${showResult && cell.isOdd ? 'scale(1.1)' : ''}` : undefined,
                    fontSize: cell.scale ? `${cell.scale * 100}%` : undefined,
                  }}
                >
                  <span className={`text-lg sm:text-xl md:text-2xl lg:text-3xl ${showResult && cell.isOdd ? 'animate-bounce' : ''}`}>
                    {cell.emoji}
                  </span>
                </button>
              ))}
            </div>

            {/* Result Panel */}
            {showResult && (
              <div className={`mt-2 sm:mt-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl text-center animate-slide-up ${
                gameState === 'correct' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
              }`}>
                {gameState === 'correct' ? (
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-green-700 mb-0.5 sm:mb-1">
                      🎉 {['Awesome!', 'Amazing!', 'Great!', 'Perfect!', 'Bravo!'][currentLevel % 5]}
                    </p>
                    <p className="text-green-600 text-xs sm:text-sm font-medium">
                      {streak >= 3 ? `🔥 ${streak}x streak! +${50} bonus!` : `+${100 + timeLeft * 10 + currentLevel * 5} points`}
                    </p>
                    <p className="text-green-500 text-xs mt-1">Next level in 1.5s...</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-red-700 mb-0.5 sm:mb-1">
                      {timeLeft === 0 ? '⏱️ Time\'s Up!' : '❌ Not quite!'}
                    </p>
                    <p className="text-red-500 text-xs sm:text-sm">
                      The odd one was <span className="font-bold">highlighted in green</span>
                    </p>
                    <div className="flex gap-2 mt-2 sm:mt-3 justify-center">
                      <button
                        onClick={() => {
                          clearTimer();
                          clearAutoNext();
                          const newPuzzle = generatePuzzle(selectedDifficulty, currentLevel);
                          setPuzzle(newPuzzle);
                          setSelectedCell(null);
                          setShowResult(false);
                          setGameState('playing');
                          startTimer(newPuzzle.config.timeLimit);
                        }}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-1.5 sm:py-2 px-4 sm:px-5 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-xs sm:text-sm"
                      >
                        🔄 Retry
                      </button>
                      <button
                        onClick={() => {
                          clearTimer();
                          clearAutoNext();
                          setGameState('menu');
                        }}
                        className="bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-1.5 sm:py-2 px-4 sm:px-5 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-xs sm:text-sm"
                      >
                        🏠 Menu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hint text */}
        {!showResult && (
          <p className="text-white/70 text-center text-xs sm:text-sm animate-pulse">
            👆 Tap the emoji that doesn&apos;t belong!
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
