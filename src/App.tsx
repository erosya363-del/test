import { useState, useEffect, useCallback } from 'react';
import { playCorrectSound, playWrongSound, playCoinSound, playClickSound, playShowSound, resumeAudio } from './sounds';

// Ударение через combining acute accent (U+0301)
const a = '\u0301';

interface WordData {
  correct: string;
  correctPlain: string;
  emoji: string;
  errors: { wrong: string; hasError: boolean }[];
}

const WORDS: WordData[] = [
  // Обычные слова
  { correct: `м${a}ма`, correctPlain: 'мама', emoji: '👩', errors: [{ wrong: `м${a}мо`, hasError: true }, { wrong: `м${a}ма`, hasError: false }] },
  { correct: `п${a}па`, correctPlain: 'папа', emoji: '👨', errors: [{ wrong: `п${a}по`, hasError: true }, { wrong: `п${a}па`, hasError: false }] },
  { correct: `до${a}м`, correctPlain: 'дом', emoji: '🏠', errors: [{ wrong: `да${a}м`, hasError: true }, { wrong: `до${a}м`, hasError: false }] },
  { correct: `ко${a}т`, correctPlain: 'кот', emoji: '🐱', errors: [{ wrong: `ка${a}т`, hasError: true }, { wrong: `ко${a}т`, hasError: false }] },
  { correct: `ле${a}с`, correctPlain: 'лес', emoji: '🌲', errors: [{ wrong: `ли${a}с`, hasError: true }, { wrong: `ле${a}с`, hasError: false }] },
  { correct: `река${a}`, correctPlain: 'река', emoji: '🏞️', errors: [{ wrong: `ри${a}ка`, hasError: true }, { wrong: `река${a}`, hasError: false }] },
  { correct: `гора${a}`, correctPlain: 'гора', emoji: '⛰️', errors: [{ wrong: `га${a}ра`, hasError: true }, { wrong: `гора${a}`, hasError: false }] },
  { correct: `сне${a}г`, correctPlain: 'снег', emoji: '❄️', errors: [{ wrong: `сни${a}г`, hasError: true }, { wrong: `сне${a}г`, hasError: false }] },
  { correct: `шко${a}ла`, correctPlain: 'школа', emoji: '🏫', errors: [{ wrong: `шка${a}ла`, hasError: true }, { wrong: `шко${a}ла`, hasError: false }] },
  { correct: `кни${a}га`, correctPlain: 'книга', emoji: '📖', errors: [{ wrong: `кне${a}га`, hasError: true }, { wrong: `кни${a}га`, hasError: false }] },
  { correct: `ру${a}чка`, correctPlain: 'ручка', emoji: '✏️', errors: [{ wrong: `ру${a}чька`, hasError: true }, { wrong: `ру${a}чка`, hasError: false }] },
  { correct: `со${a}лнце`, correctPlain: 'солнце', emoji: '☀️', errors: [{ wrong: `со${a}нце`, hasError: false }, { wrong: `со${a}лнцо`, hasError: true }] },
  { correct: `за${a}яц`, correctPlain: 'заяц', emoji: '🐰', errors: [{ wrong: `за${a}ец`, hasError: true }, { wrong: `за${a}яц`, hasError: false }] },
  { correct: `лиса${a}`, correctPlain: 'лиса', emoji: '🦊', errors: [{ wrong: `лисо${a}`, hasError: true }, { wrong: `лиса${a}`, hasError: false }] },
  { correct: `во${a}лк`, correctPlain: 'волк', emoji: '🐺', errors: [{ wrong: `ва${a}лк`, hasError: true }, { wrong: `во${a}лк`, hasError: false }] },
  { correct: `молоко${a}`, correctPlain: 'молоко', emoji: '🥛', errors: [{ wrong: `молако${a}`, hasError: true }, { wrong: `молоко${a}`, hasError: false }] },
  { correct: `хле${a}б`, correctPlain: 'хлеб', emoji: '🍞', errors: [{ wrong: `хле${a}п`, hasError: true }, { wrong: `хле${a}б`, hasError: false }] },
  { correct: `вода${a}`, correctPlain: 'вода', emoji: '💧', errors: [{ wrong: `вада${a}`, hasError: true }, { wrong: `вода${a}`, hasError: false }] },
  { correct: `земля${a}`, correctPlain: 'земля', emoji: '🌍', errors: [{ wrong: `зимля${a}`, hasError: true }, { wrong: `земля${a}`, hasError: false }] },
  { correct: `не${a}бо`, correctPlain: 'небо', emoji: '🌤️', errors: [{ wrong: `ни${a}бо`, hasError: true }, { wrong: `не${a}бо`, hasError: false }] },
  { correct: `зве${a}зда`, correctPlain: 'звезда', emoji: '⭐', errors: [{ wrong: `зве${a}здо`, hasError: true }, { wrong: `зве${a}зда`, hasError: false }] },
  { correct: `трава${a}`, correctPlain: 'трава', emoji: '🌿', errors: [{ wrong: `трова${a}`, hasError: true }, { wrong: `трава${a}`, hasError: false }] },
  { correct: `де${a}рево`, correctPlain: 'дерево', emoji: '🌳', errors: [{ wrong: `де${a}рефо`, hasError: true }, { wrong: `де${a}рево`, hasError: false }] },
  { correct: `цве${a}ток`, correctPlain: 'цветок', emoji: '🌸', errors: [{ wrong: `цви${a}ток`, hasError: true }, { wrong: `цве${a}ток`, hasError: false }] },
  { correct: `пти${a}ца`, correctPlain: 'птица', emoji: '🐦', errors: [{ wrong: `пте${a}ца`, hasError: true }, { wrong: `пти${a}ца`, hasError: false }] },
  { correct: `ры${a}ба`, correctPlain: 'рыба', emoji: '🐟', errors: [{ wrong: `ре${a}ба`, hasError: true }, { wrong: `ры${a}ба`, hasError: false }] },
  { correct: `ка${a}ша`, correctPlain: 'каша', emoji: '🥣', errors: [{ wrong: `ко${a}ша`, hasError: true }, { wrong: `ка${a}ша`, hasError: false }] },
  { correct: `су${a}п`, correctPlain: 'суп', emoji: '🍲', errors: [{ wrong: `са${a}п`, hasError: true }, { wrong: `су${a}п`, hasError: false }] },
  { correct: `сто${a}л`, correctPlain: 'стол', emoji: '🪑', errors: [{ wrong: `ста${a}л`, hasError: true }, { wrong: `сто${a}л`, hasError: false }] },
  { correct: `окно${a}`, correctPlain: 'окно', emoji: '🪟', errors: [{ wrong: `акно${a}`, hasError: true }, { wrong: `окно${a}`, hasError: false }] },
  { correct: `две${a}рь`, correctPlain: 'дверь', emoji: '🚪', errors: [{ wrong: `две${a}р`, hasError: true }, { wrong: `две${a}рь`, hasError: false }] },
  { correct: `го${a}род`, correctPlain: 'город', emoji: '🏙️', errors: [{ wrong: `га${a}род`, hasError: true }, { wrong: `го${a}род`, hasError: false }] },
  { correct: `ули${a}ца`, correctPlain: 'улица', emoji: '🛣️', errors: [{ wrong: `уле${a}ца`, hasError: true }, { wrong: `ули${a}ца`, hasError: false }] },
  { correct: `доро${a}га`, correctPlain: 'дорога', emoji: '🛤️', errors: [{ wrong: `даро${a}га`, hasError: true }, { wrong: `доро${a}га`, hasError: false }] },
  { correct: `зи${a}ма`, correctPlain: 'зима', emoji: '⛄', errors: [{ wrong: `зе${a}ма`, hasError: true }, { wrong: `зи${a}ма`, hasError: false }] },
  { correct: `весна${a}`, correctPlain: 'весна', emoji: '🌷', errors: [{ wrong: `висна${a}`, hasError: true }, { wrong: `весна${a}`, hasError: false }] },
  { correct: `ле${a}то`, correctPlain: 'лето', emoji: '🌞', errors: [{ wrong: `ли${a}то`, hasError: true }, { wrong: `ле${a}то`, hasError: false }] },
  { correct: `о${a}сень`, correctPlain: 'осень', emoji: '🍂', errors: [{ wrong: `оси${a}нь`, hasError: true }, { wrong: `о${a}сень`, hasError: false }] },
  { correct: `до${a}ждь`, correctPlain: 'дождь', emoji: '🌧️', errors: [{ wrong: `до${a}шт`, hasError: true }, { wrong: `до${a}ждь`, hasError: false }] },
  { correct: `ве${a}тер`, correctPlain: 'ветер', emoji: '💨', errors: [{ wrong: `ви${a}тер`, hasError: true }, { wrong: `ве${a}тер`, hasError: false }] },
  // Слова с заглавной буквы
  { correct: `Москва${a}`, correctPlain: 'Москва', emoji: '🏛️', errors: [{ wrong: `Масква${a}`, hasError: true }, { wrong: `Москва${a}`, hasError: false }] },
  { correct: `Росси${a}я`, correctPlain: 'Россия', emoji: '🇷🇺', errors: [{ wrong: `Раси${a}я`, hasError: true }, { wrong: `Росси${a}я`, hasError: false }] },
  { correct: `Вла${a}димир`, correctPlain: 'Владимир', emoji: '👑', errors: [{ wrong: `Вала${a}димир`, hasError: true }, { wrong: `Вла${a}димир`, hasError: false }] },
  { correct: `Анна${a}`, correctPlain: 'Анна', emoji: '👸', errors: [{ wrong: `Анн${a}о`, hasError: true }, { wrong: `Анна${a}`, hasError: false }] },
  { correct: `Ива${a}н`, correctPlain: 'Иван', emoji: '🤴', errors: [{ wrong: `Ивон${a}`, hasError: true }, { wrong: `Ива${a}н`, hasError: false }] },
  { correct: `Ма${a}ри${a}я`, correctPlain: 'Мария', emoji: '👧', errors: [{ wrong: `Маря${a}`, hasError: true }, { wrong: `Ма${a}ри${a}я`, hasError: false }] },
  { correct: `Пет${a}р`, correctPlain: 'Петр', emoji: '👦', errors: [{ wrong: `Пат${a}р`, hasError: true }, { wrong: `Пет${a}р`, hasError: false }] },
  { correct: `Сере${a}да`, correctPlain: 'Середа', emoji: '📅', errors: [{ wrong: `Сире${a}да`, hasError: true }, { wrong: `Сере${a}да`, hasError: false }] },
  { correct: `Во${a}скресенье`, correctPlain: 'Воскресенье', emoji: '🗓️', errors: [{ wrong: `Васкресе${a}нье`, hasError: true }, { wrong: `Во${a}скресенье`, hasError: false }] },
  { correct: `Янва${a}рь`, correctPlain: 'Январь', emoji: '🎄', errors: [{ wrong: `Инва${a}рь`, hasError: true }, { wrong: `Янва${a}рь`, hasError: false }] },
];

type GameState = 'splash' | 'menu' | 'shop' | 'showing' | 'guessing' | 'result' | 'final';

function App() {
  const [gameState, setGameState] = useState<GameState>('splash');
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
  const [currentErrorVariant, setCurrentErrorVariant] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wordsOrder, setWordsOrder] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showMoneyAnim, setShowMoneyAnim] = useState<{ amount: number; key: number } | null>(null);
  const [mistakeWords, setMistakeWords] = useState<number[]>([]);

  useEffect(() => {
    localStorage.setItem('dictation_money', money.toString());
  }, [money]);

  useEffect(() => {
    localStorage.setItem('dictation_hints', hints.toString());
  }, [hints]);

  // Splash screen -> menu
  useEffect(() => {
    if (gameState === 'splash') {
      const timer = setTimeout(() => {
        setGameState('menu');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const generateWordsOrder = useCallback(() => {
    // Создаём порядок из 50 слов с повторением слов с ошибками каждые 5-9 слов
    const baseOrder = [...Array(WORDS.length).keys()];
    
    // Перемешиваем базовый порядок
    for (let i = baseOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseOrder[i], baseOrder[j]] = [baseOrder[j], baseOrder[i]];
    }
    
    // Добавляем слова для достижения 50
    const result = [...baseOrder];
    while (result.length < 50) {
      result.push(Math.floor(Math.random() * WORDS.length));
    }
    
    return result;
  }, []);

  const insertMistakeWord = useCallback((currentOrder: number[], currentIndex: number, mistakePool: number[]) => {
    if (mistakePool.length === 0) return currentOrder;
    
    // Вставляем слово с ошибкой через 5-9 слов
    const insertAt = currentIndex + Math.floor(Math.random() * 5) + 5;
    if (insertAt < currentOrder.length) {
      const mistakeWord = mistakePool[Math.floor(Math.random() * mistakePool.length)];
      const newOrder = [...currentOrder];
      newOrder.splice(insertAt, 0, mistakeWord);
      return newOrder;
    }
    
    return currentOrder;
  }, []);

  const startGame = () => {
    resumeAudio();
    const order = generateWordsOrder();
    setWordsOrder(order);
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setTotalEarned(0);
    setMistakeWords([]);
    setCurrentErrorVariant(Math.random() > 0.5 ? 1 : 0);
    setShowHint(false);
    setFeedback(null);
    setGameState('showing');
    playShowSound();
  };

  const goToGuessing = () => {
    playClickSound();
    setGameState('guessing');
  };

  const handleAnswer = (thinksHasErrors: boolean) => {
    playClickSound();
    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    const actuallyHasErrors = errorData.hasError;

    if (thinksHasErrors === actuallyHasErrors) {
      setFeedback('correct');
      const reward = streak >= 2 ? 10 : 5;
      setMoney(prev => prev + reward);
      setTotalEarned(prev => prev + reward);
      setScore(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setShowConfetti(true);
      setShowMoneyAnim({ amount: reward, key: Date.now() });
      playCorrectSound();
      setTimeout(() => { setShowConfetti(false); playCoinSound(); }, 1200);
      setTimeout(() => setShowMoneyAnim(null), 2000);
    } else {
      setFeedback('wrong');
      setMoney(prev => Math.max(0, prev - 3));
      setMistakes(prev => prev + 1);
      setStreak(0);
      
      // Добавляем слово в пул для повторения
      setMistakeWords(prev => {
        const newMistakes = [...prev];
        if (!newMistakes.includes(wordIndex)) {
          newMistakes.push(wordIndex);
        }
        return newMistakes;
      });
      
      playWrongSound();
    }

    setGameState('result');
  };

  const useHint = () => {
    if (hints > 0) {
      playClickSound();
      setHints(prev => prev - 1);
      setShowHint(true);
    }
  };

  const nextWord = () => {
    playClickSound();
    if (currentWordIndex + 1 >= wordsOrder.length) {
      setGameState('final');
    } else {
      const nextIndex = currentWordIndex + 1;
      
      // Проверяем, нужно ли вставить слово с ошибкой
      let updatedOrder = wordsOrder;
      if (mistakeWords.length > 0 && nextIndex % 7 === 0) {
        updatedOrder = insertMistakeWord(wordsOrder, nextIndex, mistakeWords);
        setWordsOrder(updatedOrder);
      }
      
      setCurrentWordIndex(nextIndex);
      setCurrentErrorVariant(Math.random() > 0.5 ? 1 : 0);
      setShowHint(false);
      setFeedback(null);
      setGameState('showing');
      playShowSound();
    }
  };

  const goBack = () => {
    playClickSound();
    if (gameState === 'showing' || gameState === 'guessing' || gameState === 'result') {
      setGameState('menu');
    } else if (gameState === 'shop') {
      setGameState('menu');
    }
  };

  const buyHint = () => {
    if (money >= 15) {
      playCoinSound();
      setMoney(prev => prev - 15);
      setHints(prev => prev + 1);
    }
  };

  const buyHintPack = () => {
    if (money >= 40) {
      playCoinSound();
      setMoney(prev => prev - 40);
      setHints(prev => prev + 3);
    }
  };

  const resetGame = () => {
    setMoney(0);
    setHints(3);
    localStorage.setItem('dictation_money', '0');
    localStorage.setItem('dictation_hints', '3');
  };

  const currentWord = wordsOrder.length > 0 && wordsOrder[currentWordIndex] !== undefined ? WORDS[wordsOrder[currentWordIndex]] : null;
  const displayedWord = currentWord ? (gameState === 'showing' ? currentWord.correct : currentWord.errors[currentErrorVariant].wrong) : '';
  const hasErrors = currentWord ? currentWord.errors[currentErrorVariant].hasError : false;
  const progress = wordsOrder.length > 0 ? ((currentWordIndex) / wordsOrder.length) * 100 : 0;

  // Splash Screen
  if (gameState === 'splash') {
    return (
      <div className="splash-screen">
        <div className="splash-logo text-9xl mb-6">📝</div>
        <div className="splash-title">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent text-center">
            Диктант Квест
          </h1>
          <p className="text-lg text-white/60 text-center mt-4">Подготовка к диктанту</p>
        </div>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white overflow-hidden relative safe-area-top safe-area-bottom">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60 animate-twinkle"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's',
            }}
          />
        ))}
      </div>

      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Money animation */}
      {showMoneyAnim && (
        <div key={showMoneyAnim.key} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
          <div className="text-5xl font-black text-yellow-300 animate-money-pop drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
            +{showMoneyAnim.amount} ₽ 💰
          </div>
        </div>
      )}

      {/* Top HUD */}
      {gameState !== 'menu' && gameState !== 'shop' && gameState !== 'final' && (
        <div className="fixed top-0 left-0 right-0 z-50">
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="btn-back text-sm">
                ← Назад
              </button>
              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/40 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-inner">
                <span className="text-base">💰</span>
                <span className="font-black text-yellow-300 text-sm tabular-nums">{money} ₽</span>
              </div>
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-base">💡</span>
                <span className="font-black text-blue-300 text-sm">{hints}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {streak >= 2 && (
                <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/40 rounded-full px-3 py-1.5 animate-pulse">
                  <span className="text-sm font-black text-orange-300">🔥 x{streak}</span>
                </div>
              )}
              <div className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">
                <span className="font-bold text-white/80 text-sm">{currentWordIndex + 1}<span className="text-white/40">/{wordsOrder.length}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MENU ============ */}
      {gameState === 'menu' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="relative inline-block mb-6">
              <div className="text-8xl animate-float">📝</div>
              <div className="absolute -top-2 -right-4 text-3xl animate-spin-slow">✨</div>
              <div className="absolute -bottom-1 -left-3 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>⭐</div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-3">
              <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent drop-shadow-lg">
                Диктант
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
                Квест
              </span>
            </h1>
            <p className="text-lg text-purple-200/80 font-medium">
              Подготовка к диктанту • 1 класс
            </p>
          </div>

          <div className="glass-card max-w-sm w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="space-y-2.5 mb-5">
              <RuleRow emoji="✅" bg="from-green-500/20 to-emerald-500/20" border="border-green-400/30" text="Правильно" reward="+5 ₽" textColor="text-green-200" rewardColor="text-green-300" />
              <RuleRow emoji="🔥" bg="from-orange-500/20 to-red-500/20" border="border-orange-400/30" text="Серия 3+" reward="+10 ₽" textColor="text-orange-200" rewardColor="text-orange-300" />
              <RuleRow emoji="❌" bg="from-red-500/20 to-pink-500/20" border="border-red-400/30" text="Ошибка" reward="-3 ₽" textColor="text-red-200" rewardColor="text-red-300" />
              <RuleRow emoji="💡" bg="from-blue-500/20 to-cyan-500/20" border="border-blue-400/30" text="Подсказка" reward="бесплатно" textColor="text-blue-200" rewardColor="text-blue-300" />
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-5 border border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-white/50">Баланс</p>
                  <p className="text-2xl font-black text-yellow-300">{money} ₽</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm text-white/50">Подсказки</p>
                  <p className="text-2xl font-black text-blue-300">{hints} 💡</p>
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full btn-primary text-lg py-4 mb-3"
            >
              🚀 Начать игру!
            </button>

            <button
              onClick={() => { resumeAudio(); playClickSound(); setGameState('shop'); }}
              className="w-full btn-secondary text-base py-3 mb-3"
            >
              🛒 Магазин
            </button>

            {money > 0 && (
              <button
                onClick={resetGame}
                className="w-full text-red-300/60 hover:text-red-300 text-sm py-2 transition-colors"
              >
                🔄 Сбросить прогресс
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ SHOP ============ */}
      {gameState === 'shop' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="text-7xl mb-4">🛒</div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
              Магазин
            </h1>
            <p className="text-lg text-white/60 mt-2">💰 Баланс: <span className="text-yellow-300 font-bold">{money} ₽</span></p>
          </div>

          <div className="glass-card max-w-sm w-full space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <ShopItem
              emoji="💡"
              title="Подсказка"
              desc="Покажет, есть ли ошибка"
              price={15}
              owned={hints}
              canBuy={money >= 15}
              gradient="from-blue-500/20 to-cyan-500/20"
              border="border-blue-400/30"
              onBuy={buyHint}
            />
            <ShopItem
              emoji="🎁"
              title="Набор подсказок"
              desc="+3 подсказки сразу"
              price={40}
              owned={hints}
              canBuy={money >= 40}
              gradient="from-purple-500/20 to-pink-500/20"
              border="border-purple-400/30"
              onBuy={buyHintPack}
              isPack
            />
          </div>

          <button
            onClick={() => { playClickSound(); setGameState('menu'); }}
            className="mt-6 btn-secondary px-8 py-3 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            ← Назад в меню
          </button>
        </div>
      )}

      {/* ============ SHOWING ============ */}
      {gameState === 'showing' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-400/30 rounded-full px-5 py-2 mb-4">
              <span className="text-lg">📖</span>
              <span className="text-yellow-200 font-bold">Запомни слово!</span>
            </div>
          </div>

          <div className="relative">
            <div className="text-7xl md:text-8xl mb-6 animate-float">{currentWord.emoji}</div>
            
            <div className="word-card-showing">
              <div className="text-4xl md:text-6xl font-black tracking-wider text-white animate-word-appear">
                {displayedWord}
              </div>
              <div className="mt-4 text-sm text-white/40 font-medium">
                {currentWord.correctPlain.length} букв
              </div>
            </div>
          </div>

          <button
            onClick={goToGuessing}
            className="mt-10 btn-primary text-lg px-10 py-4 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            Далее → Проверка
          </button>
        </div>
      )}

      {/* ============ GUESSING ============ */}
      {gameState === 'guessing' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-400/30 rounded-full px-5 py-2 mb-3">
              <span className="text-lg">🔍</span>
              <span className="text-purple-200 font-bold">Есть ли ошибки?</span>
            </div>
            {showHint && (
              <div className="mt-3 bg-blue-500/20 border border-blue-400/40 rounded-xl px-4 py-2 animate-pulse">
                <span className="text-blue-200 font-bold">
                  💡 {hasErrors ? 'В слове ЕСТЬ ошибка!' : 'Слово написано ПРАВИЛЬНО!'}
                </span>
              </div>
            )}
          </div>

          <div className="relative mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-6xl mb-4">{currentWord.emoji}</div>
            <div className="word-card-guessing">
              <div className="text-4xl md:text-6xl font-black tracking-wider text-white">
                {displayedWord}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 btn-danger text-lg py-5"
            >
              <span className="text-2xl block mb-1">❌</span>
              Есть ошибки!
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 btn-success text-lg py-5"
            >
              <span className="text-2xl block mb-1">✅</span>
              Всё верно!
            </button>
          </div>

          {hints > 0 && !showHint && (
            <button
              onClick={useHint}
              className="mt-6 btn-hint animate-fade-in-up"
              style={{ animationDelay: '0.3s' }}
            >
              💡 Подсказка <span className="text-blue-300/60">({hints} ост.)</span>
            </button>
          )}
        </div>
      )}

      {/* ============ RESULT ============ */}
      {gameState === 'result' && currentWord && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
          {feedback === 'correct' ? (
            <div className="text-center animate-fade-in-up">
              <div className="text-7xl md:text-8xl mb-4 animate-bounce-big">🎉</div>
              <h2 className="text-3xl md:text-4xl font-black text-green-300 mb-6">Молодец!</h2>
              <div className="glass-card-result border-green-400/30 bg-green-500/10 max-w-sm">
                <p className="text-sm text-green-200/70 mb-2 uppercase tracking-wider font-bold">Правильно:</p>
                <p className="text-3xl md:text-4xl font-black text-white tracking-wider mb-3">{currentWord.correct}</p>
                {hasErrors ? (
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-400/20">
                    <p className="text-sm text-red-200/70 mb-1">Было с ошибкой:</p>
                    <p className="text-xl font-bold text-red-300 line-through decoration-2">{displayedWord}</p>
                  </div>
                ) : (
                  <div className="bg-green-500/10 rounded-xl p-3 border border-green-400/20">
                    <p className="text-green-200">✨ Слово было написано верно!</p>
                  </div>
                )}
              </div>
              <div className="mt-6 text-3xl font-black text-yellow-300 animate-pulse">
                +{streak >= 3 ? 10 : 5} ₽ 💰
                {streak >= 3 && <span className="text-orange-400 ml-2 text-lg">🔥 Серия!</span>}
              </div>
            </div>
          ) : (
            <div className="text-center animate-fade-in-up">
              <div className="text-7xl md:text-8xl mb-4">😔</div>
              <h2 className="text-3xl md:text-4xl font-black text-red-300 mb-6">Неправильно!</h2>
              <div className="glass-card-result border-red-400/30 bg-red-500/10 max-w-sm">
                <p className="text-sm text-red-200/70 mb-2 uppercase tracking-wider font-bold">Запомни:</p>
                <p className="text-3xl md:text-4xl font-black text-white tracking-wider mb-3">{currentWord.correct}</p>
                {hasErrors ? (
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-400/20">
                    <p className="text-sm text-red-200/70 mb-1">Было:</p>
                    <p className="text-xl font-bold text-red-300">{displayedWord}</p>
                  </div>
                ) : (
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-400/20">
                    <p className="text-red-200">Слово было написано правильно!</p>
                  </div>
                )}
              </div>
              <div className="mt-6 text-3xl font-black text-red-300">
                -3 ₽ 💸
              </div>
            </div>
          )}

          <button
            onClick={nextWord}
            className="mt-8 btn-primary text-lg px-10 py-4 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            {currentWordIndex + 1 >= wordsOrder.length ? '🏆 Результаты' : '➡️ Дальше'}
          </button>
        </div>
      )}

      {/* ============ FINAL ============ */}
      {gameState === 'final' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="text-8xl mb-4 animate-bounce-big">🏆</div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
              Игра окончена!
            </h1>
          </div>

          <div className="glass-card max-w-sm w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-3 mb-6">
              <StatRow label="Правильных" value={`${score}/${wordsOrder.length}`} color="green" />
              <StatRow label="Ошибок" value={`${mistakes}`} color="red" />
              <StatRow label="Лучшая серия" value={`🔥 x${bestStreak}`} color="orange" />
              <StatRow label="Заработано" value={`${totalEarned} ₽`} color="yellow" />
              <StatRow label="Баланс" value={`${money} ₽`} color="purple" />
            </div>

            <div className="text-center bg-white/5 rounded-2xl p-5 mb-6 border border-white/10">
              {score >= 35 ? (
                <>
                  <div className="text-5xl mb-2">🌟🌟🌟</div>
                  <p className="text-lg text-yellow-200 font-bold">Мастер орфографии!</p>
                </>
              ) : score >= 25 ? (
                <>
                  <div className="text-5xl mb-2">🌟🌟</div>
                  <p className="text-lg text-yellow-200 font-bold">Отлично! Так держать!</p>
                </>
              ) : score >= 15 ? (
                <>
                  <div className="text-5xl mb-2">🌟</div>
                  <p className="text-lg text-yellow-200 font-bold">Хорошо! Ещё тренируйся!</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">💪</div>
                  <p className="text-lg text-yellow-200 font-bold">Попробуй ещё раз!</p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={startGame} className="flex-1 btn-primary py-3">
                🔄 Ещё раз
              </button>
              <button onClick={() => { playClickSound(); setGameState('menu'); }} className="flex-1 btn-secondary py-3">
                🏠 Меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function RuleRow({ emoji, bg, border, text, reward, textColor, rewardColor }: {
  emoji: string; bg: string; border: string; text: string; reward: string; textColor: string; rewardColor: string;
}) {
  return (
    <div className={`flex items-center gap-3 bg-gradient-to-r ${bg} border ${border} rounded-xl p-3`}>
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 flex justify-between items-center">
        <span className={`font-bold ${textColor}`}>{text}</span>
        <span className={`font-black ${rewardColor}`}>{reward}</span>
      </div>
    </div>
  );
}

function ShopItem({ emoji, title, desc, price, owned, canBuy, gradient, border, onBuy, isPack }: {
  emoji: string; title: string; desc: string; price: number; owned: number; canBuy: boolean;
  gradient: string; border: string; onBuy: () => void; isPack?: boolean;
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} border ${border} rounded-2xl p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{emoji}</span>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-white/50">{desc}</p>
        </div>
        <span className="text-yellow-300 font-black text-lg">{price} ₽</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-sm">У тебя: {owned} шт.</span>
        <button
          onClick={onBuy}
          disabled={!canBuy}
          className={`px-5 py-2 rounded-xl font-bold transition-all ${
            canBuy
              ? 'bg-white/20 hover:bg-white/30 text-white transform hover:scale-105 active:scale-95'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          {isPack ? '+3 шт.' : 'Купить'}
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/15 border-green-400/30 text-green-300',
    red: 'bg-red-500/15 border-red-400/30 text-red-300',
    orange: 'bg-orange-500/15 border-orange-400/30 text-orange-300',
    yellow: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
    purple: 'bg-purple-500/15 border-purple-400/30 text-purple-300',
  };
  return (
    <div className={`flex justify-between items-center ${colors[color]} border rounded-xl p-3.5`}>
      <span className="font-medium">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: Math.random() * 100 + '%',
            top: '-20px',
            animationDelay: Math.random() * 0.8 + 's',
            animationDuration: Math.random() * 2 + 2 + 's',
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: Math.random() * 8 + 6 + 'px',
              height: Math.random() * 8 + 6 + 'px',
              backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'][Math.floor(Math.random() * 10)],
              transform: `rotate(${Math.random() * 360}deg)`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
