import { useState, useEffect, useCallback, useRef } from 'react';
import { playCorrectSound, playWrongSound, playCoinSound, playClickSound, playShowSound, resumeAudio } from './sounds';

// Слова для первоклассника с вариантами ошибок
interface WordData {
  correct: string;
  emoji: string;
  errors: { wrong: string; errorPositions: number[] }[];
}

const WORDS: WordData[] = [
  { correct: 'мама', emoji: '👩', errors: [{ wrong: 'мома', errorPositions: [1] }, { wrong: 'мама', errorPositions: [] }] },
  { correct: 'папа', emoji: '👨', errors: [{ wrong: 'попа', errorPositions: [1] }, { wrong: 'папа', errorPositions: [] }] },
  { correct: 'дом', emoji: '🏠', errors: [{ wrong: 'дам', errorPositions: [1] }, { wrong: 'дом', errorPositions: [] }] },
  { correct: 'кот', emoji: '🐱', errors: [{ wrong: 'кат', errorPositions: [1] }, { wrong: 'кот', errorPositions: [] }] },
  { correct: 'лес', emoji: '🌲', errors: [{ wrong: 'лис', errorPositions: [1] }, { wrong: 'лес', errorPositions: [] }] },
  { correct: 'река', emoji: '🏞️', errors: [{ wrong: 'рика', errorPositions: [1] }, { wrong: 'река', errorPositions: [] }] },
  { correct: 'гора', emoji: '⛰️', errors: [{ wrong: 'гара', errorPositions: [1] }, { wrong: 'гора', errorPositions: [] }] },
  { correct: 'снег', emoji: '❄️', errors: [{ wrong: 'сниг', errorPositions: [2] }, { wrong: 'снег', errorPositions: [] }] },
  { correct: 'школа', emoji: '🏫', errors: [{ wrong: 'шкала', errorPositions: [2, 3] }, { wrong: 'школа', errorPositions: [] }] },
  { correct: 'книга', emoji: '📖', errors: [{ wrong: 'кнега', errorPositions: [1] }, { wrong: 'книга', errorPositions: [] }] },
  { correct: 'ручка', emoji: '✏️', errors: [{ wrong: 'ручька', errorPositions: [3] }, { wrong: 'ручка', errorPositions: [] }] },
  { correct: 'солнце', emoji: '☀️', errors: [{ wrong: 'сонце', errorPositions: [] }, { wrong: 'солнце', errorPositions: [] }] },
  { correct: 'заяц', emoji: '🐰', errors: [{ wrong: 'заец', errorPositions: [2] }, { wrong: 'заяц', errorPositions: [] }] },
  { correct: 'лиса', emoji: '🦊', errors: [{ wrong: 'лисо', errorPositions: [3] }, { wrong: 'лиса', errorPositions: [] }] },
  { correct: 'волк', emoji: '🐺', errors: [{ wrong: 'валк', errorPositions: [1] }, { wrong: 'волк', errorPositions: [] }] },
  { correct: 'молоко', emoji: '🥛', errors: [{ wrong: 'молако', errorPositions: [1] }, { wrong: 'молоко', errorPositions: [] }] },
  { correct: 'хлеб', emoji: '🍞', errors: [{ wrong: 'хлеп', errorPositions: [3] }, { wrong: 'хлеб', errorPositions: [] }] },
  { correct: 'вода', emoji: '💧', errors: [{ wrong: 'вада', errorPositions: [1] }, { wrong: 'вода', errorPositions: [] }] },
  { correct: 'земля', emoji: '🌍', errors: [{ wrong: 'зимля', errorPositions: [2] }, { wrong: 'земля', errorPositions: [] }] },
  { correct: 'небо', emoji: '🌤️', errors: [{ wrong: 'нибо', errorPositions: [1] }, { wrong: 'небо', errorPositions: [] }] },
  { correct: 'звезда', emoji: '⭐', errors: [{ wrong: 'звездо', errorPositions: [5] }, { wrong: 'звезда', errorPositions: [] }] },
  { correct: 'трава', emoji: '🌿', errors: [{ wrong: 'трова', errorPositions: [1] }, { wrong: 'трава', errorPositions: [] }] },
  { correct: 'дерево', emoji: '🌳', errors: [{ wrong: 'дерефо', errorPositions: [5] }, { wrong: 'дерево', errorPositions: [] }] },
  { correct: 'цветок', emoji: '🌸', errors: [{ wrong: 'цвиток', errorPositions: [1] }, { wrong: 'цветок', errorPositions: [] }] },
  { correct: 'птица', emoji: '🐦', errors: [{ wrong: 'птеца', errorPositions: [1] }, { wrong: 'птица', errorPositions: [] }] },
  { correct: 'рыба', emoji: '🐟', errors: [{ wrong: 'реба', errorPositions: [1] }, { wrong: 'рыба', errorPositions: [] }] },
  { correct: 'каша', emoji: '🥣', errors: [{ wrong: 'коша', errorPositions: [1] }, { wrong: 'каша', errorPositions: [] }] },
  { correct: 'суп', emoji: '🍲', errors: [{ wrong: 'суп', errorPositions: [] }, { wrong: 'сап', errorPositions: [1] }] },
  { correct: 'стол', emoji: '🪑', errors: [{ wrong: 'стал', errorPositions: [1] }, { wrong: 'стол', errorPositions: [] }] },
  { correct: 'окно', emoji: '🪟', errors: [{ wrong: 'акно', errorPositions: [0] }, { wrong: 'окно', errorPositions: [] }] },
  { correct: 'дверь', emoji: '🚪', errors: [{ wrong: 'двер', errorPositions: [] }, { wrong: 'дверь', errorPositions: [] }] },
  { correct: 'город', emoji: '🏙️', errors: [{ wrong: 'гарод', errorPositions: [1] }, { wrong: 'город', errorPositions: [] }] },
  { correct: 'улица', emoji: '🛣️', errors: [{ wrong: 'улеца', errorPositions: [1] }, { wrong: 'улица', errorPositions: [] }] },
  { correct: 'дорога', emoji: '🛤️', errors: [{ wrong: 'дарога', errorPositions: [1] }, { wrong: 'дорога', errorPositions: [] }] },
  { correct: 'зима', emoji: '⛄', errors: [{ wrong: 'зема', errorPositions: [1] }, { wrong: 'зима', errorPositions: [] }] },
  { correct: 'весна', emoji: '🌷', errors: [{ wrong: 'висна', errorPositions: [1] }, { wrong: 'весна', errorPositions: [] }] },
  { correct: 'лето', emoji: '🌞', errors: [{ wrong: 'лито', errorPositions: [1] }, { wrong: 'лето', errorPositions: [] }] },
  { correct: 'осень', emoji: '🍂', errors: [{ wrong: 'осинь', errorPositions: [2] }, { wrong: 'осень', errorPositions: [] }] },
  { correct: 'дождь', emoji: '🌧️', errors: [{ wrong: 'дошт', errorPositions: [] }, { wrong: 'дождь', errorPositions: [] }] },
  { correct: 'ветер', emoji: '💨', errors: [{ wrong: 'витер', errorPositions: [2] }, { wrong: 'ветер', errorPositions: [] }] },
];

type GameState = 'menu' | 'shop' | 'showing' | 'guessing' | 'result' | 'final';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [money, setMoney] = useState(() => {
    const saved = localStorage.getItem('dictation_money');
    return saved ? parseInt(saved) : 0;
  });
  const [hints, setHints] = useState(() => {
    const saved = localStorage.getItem('dictation_hints');
    return saved ? parseInt(saved) : 3;
  });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showCorrectWord, setShowCorrectWord] = useState(true);
  const [currentErrorVariant, setCurrentErrorVariant] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wordsOrder, setWordsOrder] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem('dictation_money', money.toString());
  }, [money]);

  useEffect(() => {
    localStorage.setItem('dictation_hints', hints.toString());
  }, [hints]);

  const shuffleWords = useCallback(() => {
    const shuffled = [...Array(WORDS.length).keys()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const startShowingPhase = useCallback(() => {
    setShowCorrectWord(true);
    setCurrentErrorVariant(Math.random() > 0.5 ? 1 : 0);
    setShowHint(false);
    setFeedback(null);
    setGameState('showing');
    playShowSound();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowCorrectWord(false);
      setGameState('guessing');
    }, 3500);
  }, []);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startGame = () => {
    resumeAudio();
    const shuffled = shuffleWords();
    setWordsOrder(shuffled);
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setTotalEarned(0);
    setGameStarted(true);
    startShowingPhase();
  };

  const handleAnswer = (thinksHasErrors: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    const actuallyHasErrors = errorData.errorPositions.length > 0;

    if (thinksHasErrors && actuallyHasErrors) {
      // Нашёл ошибки верно
      setFeedback('correct');
      const reward = streak >= 3 ? 10 : 5;
      setMoney(prev => prev + reward);
      setTotalEarned(prev => prev + reward);
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setShowConfetti(true);
      playCorrectSound();
      setTimeout(() => { setShowConfetti(false); playCoinSound(); }, 1500);
    } else if (!thinksHasErrors && !actuallyHasErrors) {
      // Сказал что ошибок нет и их правда нет
      setFeedback('correct');
      const reward = streak >= 3 ? 10 : 5;
      setMoney(prev => prev + reward);
      setTotalEarned(prev => prev + reward);
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setShowConfetti(true);
      playCorrectSound();
      setTimeout(() => { setShowConfetti(false); playCoinSound(); }, 1500);
    } else {
      // Ошибка
      setFeedback('wrong');
      setMoney(prev => Math.max(0, prev - 3));
      setMistakes(prev => prev + 1);
      setStreak(0);
      playWrongSound();
    }

    setGameState('result');
  };

  const useHint = () => {
    if (hints > 0) {
      setHints(prev => prev - 1);
      setShowHint(true);
    }
  };

  const nextWord = () => {
    if (currentWordIndex + 1 >= wordsOrder.length) {
      setGameState('final');
      setGameStarted(false);
    } else {
      setCurrentWordIndex(prev => prev + 1);
      startShowingPhase();
    }
  };

  const buyHint = () => {
    if (money >= 15) {
      setMoney(prev => prev - 15);
      setHints(prev => prev + 1);
    }
  };

  const resetGame = () => {
    setMoney(0);
    setHints(3);
    localStorage.setItem('dictation_money', '0');
    localStorage.setItem('dictation_hints', '3');
    setGameState('menu');
  };

  const currentWord = wordsOrder.length > 0 && wordsOrder[currentWordIndex] !== undefined ? WORDS[wordsOrder[currentWordIndex]] : null;
  const displayedWord = currentWord ? (showCorrectWord ? currentWord.correct : currentWord.errors[currentErrorVariant].wrong) : '';
  const hasErrors = currentWord ? currentWord.errors[currentErrorVariant].errorPositions.length > 0 : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white overflow-hidden relative">
      {/* Звёзды на фоне */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 1 + 's',
            }}
          />
        ))}
      </div>

      {/* Конфетти */}
      {showConfetti && <Confetti />}

      {/* Верхняя панель */}
      {gameState !== 'menu' && gameState !== 'shop' && gameState !== 'final' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-sm p-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-full px-3 py-1 flex items-center gap-1">
              <span className="text-lg">💰</span>
              <span className="font-bold text-yellow-300 text-sm">{money} ₽</span>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/50 rounded-full px-3 py-1 flex items-center gap-1">
              <span className="text-lg">💡</span>
              <span className="font-bold text-blue-300 text-sm">{hints}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {streak >= 3 && (
              <div className="bg-orange-500/20 border border-orange-400/50 rounded-full px-3 py-1 animate-bounce">
                <span className="text-sm font-bold text-orange-300">🔥 x{streak}</span>
              </div>
            )}
            <div className="bg-green-500/20 border border-green-400/50 rounded-full px-3 py-1">
              <span className="font-bold text-green-300 text-sm">{currentWordIndex + 1}/{wordsOrder.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Меню */}
      {gameState === 'menu' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce-slow">📝</div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Диктант-Квест
            </h1>
            <p className="text-lg md:text-xl text-purple-200">
              Подготовка к диктанту для 1 класса ✨
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 bg-green-500/20 rounded-xl p-3">
                <span className="text-2xl">✅</span>
                <div>
                  <span className="text-green-200 font-bold">Нашёл ошибку</span>
                  <span className="text-green-300 ml-2">→ +5 ₽</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-orange-500/20 rounded-xl p-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <span className="text-orange-200 font-bold">Серия 3+</span>
                  <span className="text-orange-300 ml-2">→ +10 ₽</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-500/20 rounded-xl p-3">
                <span className="text-2xl">❌</span>
                <div>
                  <span className="text-red-200 font-bold">Ошибка</span>
                  <span className="text-red-300 ml-2">→ -3 ₽</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-500/20 rounded-xl p-3">
                <span className="text-2xl">💡</span>
                <div>
                  <span className="text-blue-200 font-bold">Подсказка</span>
                  <span className="text-blue-300 ml-2">→ бесплатно (3 шт)</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-6 bg-white/5 rounded-xl p-4">
              <p className="text-yellow-300 text-xl font-bold mb-1">💰 Баланс: {money} ₽</p>
              <p className="text-blue-300">💡 Подсказок: {hints}</p>
            </div>

            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl py-4 rounded-2xl transform hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/30 active:scale-95"
            >
              🚀 Начать игру!
            </button>

            <button
              onClick={() => setGameState('shop')}
              className="w-full mt-3 bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white font-bold text-lg py-3 rounded-2xl transform hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/30 active:scale-95"
            >
              🛒 Магазин
            </button>

            {money > 0 && (
              <button
                onClick={resetGame}
                className="w-full mt-3 bg-red-500/20 border border-red-400/50 hover:bg-red-500/30 text-red-200 font-bold py-2 rounded-xl transition-all"
              >
                🔄 Сбросить прогресс
              </button>
            )}
          </div>
        </div>
      )}

      {/* Магазин */}
      {gameState === 'shop' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">🛒</div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Магазин
            </h1>
            <p className="text-lg text-blue-200">💰 Баланс: {money} ₽</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">💡</span>
                    <div>
                      <h3 className="text-lg font-bold text-blue-200">Подсказка</h3>
                      <p className="text-sm text-blue-300">Покажет есть ли ошибка</p>
                    </div>
                  </div>
                  <span className="text-yellow-300 font-bold text-lg">15 ₽</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 text-sm">У тебя: {hints} шт.</span>
                  <button
                    onClick={buyHint}
                    disabled={money < 15}
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${
                      money >= 15
                        ? 'bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white transform hover:scale-105 active:scale-95'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Купить
                  </button>
                </div>
              </div>

              <div className="bg-purple-500/20 border border-purple-400/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">🎁</span>
                  <div>
                    <h3 className="text-lg font-bold text-purple-200">Бонус подсказок</h3>
                    <p className="text-sm text-purple-300">+3 подсказки за раз</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-300 font-bold text-lg">40 ₽</span>
                  <button
                    onClick={() => { if (money >= 40) { setMoney(prev => prev - 40); setHints(prev => prev + 3); }}}
                    disabled={money < 40}
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${
                      money >= 40
                        ? 'bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white transform hover:scale-105 active:scale-95'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Купить
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setGameState('menu')}
              className="w-full mt-6 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
            >
              ← Назад
            </button>
          </div>
        </div>
      )}

      {/* Фаза показа слова */}
      {gameState === 'showing' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
          <div className="text-center mb-8">
            <div className="text-xl md:text-2xl text-purple-200 mb-3">📖 Запомни слово:</div>
            <div className="bg-yellow-500/20 border-2 border-yellow-400/50 rounded-2xl px-6 py-2 inline-block animate-pulse">
              <span className="text-yellow-300 font-bold text-lg">Запоминай! ⏱️ 3 сек</span>
            </div>
          </div>

          <div className="relative">
            <div className="text-6xl md:text-7xl mb-6 animate-float">{currentWord.emoji}</div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl px-8 md:px-12 py-6 md:py-8 border-2 border-yellow-400/30 shadow-2xl shadow-yellow-500/20 animate-glow">
              <div className="text-4xl md:text-6xl font-bold tracking-wider text-white">
                {displayedWord.split('').map((letter, i) => (
                  <span key={i} className="inline-block animate-pop" style={{ animationDelay: `${i * 0.1}s` }}>
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="w-48 h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-shrink" style={{ animationDuration: '3.5s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Фаза угадывания */}
      {gameState === 'guessing' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
          <div className="text-center mb-6">
            <div className="text-xl md:text-2xl text-purple-200 mb-3">🔍 Есть ли ошибки в этом слове?</div>
            {showHint && (
              <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl px-4 py-2 mt-2 animate-pulse">
                <span className="text-blue-200 font-bold">💡 {hasErrors ? 'В слове ЕСТЬ ошибка!' : 'Слово написано ПРАВИЛЬНО!'}</span>
              </div>
            )}
          </div>

          <div className="relative mb-8">
            <div className="text-6xl mb-4">{currentWord.emoji}</div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl px-8 md:px-12 py-6 md:py-8 border-2 border-purple-400/30 shadow-2xl">
              <div className="text-4xl md:text-6xl font-bold tracking-wider text-white">
                {displayedWord.split('').map((letter, i) => (
                  <span key={i} className="inline-block hover:scale-125 transition-transform cursor-default">
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            <button
              onClick={() => { playClickSound(); handleAnswer(true); }}
              className="flex-1 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold text-lg md:text-xl py-5 rounded-2xl transform hover:scale-105 transition-all duration-200 shadow-lg shadow-red-500/30 active:scale-95"
            >
              ❌ Есть ошибки!
            </button>
            <button
              onClick={() => { playClickSound(); handleAnswer(false); }}
              className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-lg md:text-xl py-5 rounded-2xl transform hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/30 active:scale-95"
            >
              ✅ Всё верно!
            </button>
          </div>

          {hints > 0 && !showHint && (
            <button
              onClick={useHint}
              className="mt-6 bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30 text-blue-200 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 active:scale-95"
            >
              💡 Подсказка ({hints} осталось)
            </button>
          )}
        </div>
      )}

      {/* Результат */}
      {gameState === 'result' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
          {feedback === 'correct' ? (
            <div className="text-center">
              <div className="text-7xl md:text-8xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl md:text-4xl font-bold text-green-300 mb-4">Молодец!</h2>
              <div className="bg-green-500/20 border border-green-400/50 rounded-2xl p-6 mb-6 max-w-sm">
                <p className="text-lg text-green-200 mb-2">Правильное написание:</p>
                <p className="text-3xl md:text-4xl font-bold text-white tracking-wider">{currentWord.correct}</p>
                {hasErrors && (
                  <div className="mt-3">
                    <p className="text-base text-green-300">
                      Было с ошибкой: <span className="text-red-300 line-through">{displayedWord}</span>
                    </p>
                  </div>
                )}
                {!hasErrors && (
                  <p className="text-base text-green-300 mt-3">Слово было написано верно!</p>
                )}
              </div>
              <div className="text-3xl font-bold text-yellow-300 animate-pulse">
                +{streak >= 3 ? 10 : 5} ₽ 💰
                {streak >= 3 && <span className="text-orange-400 ml-2">🔥 Бонус серии!</span>}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-7xl md:text-8xl mb-4">😔</div>
              <h2 className="text-3xl md:text-4xl font-bold text-red-300 mb-4">Неправильно!</h2>
              <div className="bg-red-500/20 border border-red-400/50 rounded-2xl p-6 mb-6 max-w-sm">
                <p className="text-lg text-red-200 mb-2">Запомни правильное написание:</p>
                <p className="text-3xl md:text-4xl font-bold text-white tracking-wider">{currentWord.correct}</p>
                {hasErrors && (
                  <div className="mt-3">
                    <p className="text-base text-red-300">
                      Было: <span className="text-red-400 font-bold">{displayedWord}</span>
                    </p>
                  </div>
                )}
                {!hasErrors && (
                  <p className="text-base text-red-300 mt-3">Слово было написано правильно, а ты сказал что с ошибкой!</p>
                )}
              </div>
              <div className="text-3xl font-bold text-red-300">
                -3 ₽ 💸
              </div>
            </div>
          )}

          <button
            onClick={nextWord}
            className="mt-8 bg-gradient-to-r from-purple-400 to-indigo-500 hover:from-purple-500 hover:to-indigo-600 text-white font-bold text-xl py-4 px-12 rounded-2xl transform hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/30 active:scale-95"
          >
            {currentWordIndex + 1 >= wordsOrder.length ? '🏆 Результаты' : '➡️ Дальше'}
          </button>
        </div>
      )}

      {/* Финальный экран */}
      {gameState === 'final' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-6">
            <div className="text-7xl md:text-8xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Игра окончена!
            </h1>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center bg-green-500/20 rounded-xl p-4">
                <span className="text-base md:text-lg">✅ Правильных:</span>
                <span className="text-2xl font-bold text-green-300">{score}/{wordsOrder.length}</span>
              </div>
              <div className="flex justify-between items-center bg-red-500/20 rounded-xl p-4">
                <span className="text-base md:text-lg">❌ Ошибок:</span>
                <span className="text-2xl font-bold text-red-300">{mistakes}</span>
              </div>
              <div className="flex justify-between items-center bg-yellow-500/20 rounded-xl p-4">
                <span className="text-base md:text-lg">💰 Заработано:</span>
                <span className="text-2xl font-bold text-yellow-300">{totalEarned} ₽</span>
              </div>
              <div className="flex justify-between items-center bg-purple-500/20 rounded-xl p-4">
                <span className="text-base md:text-lg">💰 Баланс:</span>
                <span className="text-2xl font-bold text-purple-300">{money} ₽</span>
              </div>
            </div>

            <div className="text-center mb-6 bg-white/5 rounded-xl p-4">
              {score >= 35 ? (
                <>
                  <div className="text-4xl mb-2">🌟🌟🌟</div>
                  <p className="text-xl text-yellow-200 font-bold">Отлично! Ты мастер орфографии!</p>
                </>
              ) : score >= 25 ? (
                <>
                  <div className="text-4xl mb-2">🌟🌟</div>
                  <p className="text-xl text-yellow-200 font-bold">Очень хорошо! Так держать!</p>
                </>
              ) : score >= 15 ? (
                <>
                  <div className="text-4xl mb-2">🌟</div>
                  <p className="text-xl text-yellow-200 font-bold">Хорошо! Но можно лучше!</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">💪</div>
                  <p className="text-xl text-yellow-200 font-bold">Тренируйся ещё!</p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-lg py-3 rounded-xl transform hover:scale-105 transition-all active:scale-95"
              >
                🔄 Ещё раз!
              </button>
              <button
                onClick={() => { setGameState('menu'); setGameStarted(false); }}
                className="flex-1 bg-gradient-to-r from-purple-400 to-indigo-500 hover:from-purple-500 hover:to-indigo-600 text-white font-bold text-lg py-3 rounded-xl transform hover:scale-105 transition-all active:scale-95"
              >
                🏠 Меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент конфетти
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: Math.random() * 100 + '%',
            top: '-10px',
            animationDelay: Math.random() * 0.5 + 's',
            animationDuration: Math.random() * 2 + 1.5 + 's',
          }}
        >
          <div
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'][Math.floor(Math.random() * 8)],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
