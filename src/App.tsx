/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Settings2, 
  Trophy, 
  BookOpen, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  Target,
  Heart,
  Share2,
  Info
} from 'lucide-react';
import { generateQuestion, Difficulty, Question, shuffleArray } from './lib/mathEngine';

type Screen = 'home' | 'categories' | 'difficulty' | 'game' | 'results' | 'custom' | 'about';

export interface ActiveCategory {
  name: string;
  difficulty?: Difficulty;
  customRange?: { start: number; end: number };
}

interface GameState {
  categories: ActiveCategory[];
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  history: { question: Question; userSelection: any; isCorrect: boolean }[];
  startTime: number;
  endTime: number | null;
}

const diffEmojis: Record<Difficulty, string> = {
  Beginner: '🌱',
  Intermediate: '⚡',
  Advanced: '🔥',
  Expert: '💀'
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<(number | string)[]>([]);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; show: boolean }>({ isCorrect: false, show: false });

  const [isProcessing, setIsProcessing] = useState(false);

  const [practiceCat, setPracticeCat] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<Record<string, ActiveCategory>>({});
  const [customVolume, setCustomVolume] = useState<number>(20);

  const toggleCustomCategory = (cat: string) => {
    const newConf = { ...customConfig };
    if (newConf[cat]) {
      delete newConf[cat];
    } else {
      const isRange = ['Tables', 'Squares', 'Cubes', 'Roots'].includes(cat);
      newConf[cat] = {
        name: cat,
        ...(isRange ? { customRange: { start: 1, end: 12 } } : { difficulty: 'Intermediate' as Difficulty })
      };
    }
    setCustomConfig(newConf);
  };

  const updateCustomCategory = (name: string, updates: Partial<ActiveCategory>) => {
    setCustomConfig(prev => ({
      ...prev,
      [name]: { ...prev[name], ...updates }
    }));
  };

  const handleGlobalShare = (scoreData?: { accuracy: number, score: number, total: number }) => {
    let text = "Master speed and accuracy with NumBoost Elite.\n\"Growth happens at the edge of failure.\"\nTry it now: https://numboostarena.netlify.app/#";
    if (scoreData) {
        text = `I just scored ${scoreData.accuracy}% (${scoreData.score}/${scoreData.total}) in NumBoost Elite! 🚀\nCan you beat my score?\n\nPlay now: https://numboostarena.netlify.app/#`;
    }
    if (navigator.share) {
        navigator.share({ text }).catch(console.error);
    } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert("Link copied to clipboard!");
    }
  };

  const startPractice = (category: string) => {
    setPracticeCat(category);
    setScreen('difficulty');
  };

  const selectDifficulty = (difficulty: Difficulty) => {
    const startState: GameState = {
      categories: [{ name: practiceCat, difficulty }],
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 10,
      history: [],
      startTime: Date.now(),
      endTime: null
    };
    setGameState(startState);
    nextQuestion(startState);
    setScreen('game');
  };

  const nextQuestion = (state: GameState) => {
    const activeCat = state.categories[Math.floor(Math.random() * state.categories.length)];
    const q = generateQuestion(activeCat.name, activeCat.difficulty, activeCat.customRange);
    setCurrentQuestion(q);
    
    // Generate decoy options
    const decoys = new Set<number | string>();
    while (decoys.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      if (offset === 0) continue;
      
      let decoy;
      if (typeof q.answer === 'number') {
        decoy = q.answer + offset;
      } else {
        decoy = q.answer + String(offset);
      }
      
      if (decoy !== q.answer) decoys.add(decoy);
    }
    
    setOptions(shuffleArray([q.answer, ...Array.from(decoys)]));
  };

  const handleAnswer = (answer: number | string) => {
    if (!gameState || !currentQuestion || isProcessing) return;
    setIsProcessing(true);

    const isCorrect = answer === currentQuestion.answer;
    setLastResult({ isCorrect, show: true });

    const newHistory = [...gameState.history, { 
      question: currentQuestion, 
      userSelection: answer, 
      isCorrect 
    }];

    const nextState: GameState = {
      ...gameState,
      score: isCorrect ? gameState.score + 1 : gameState.score,
      questionsAnswered: gameState.questionsAnswered + 1,
      history: newHistory
    };

    setGameState(nextState);

    setTimeout(() => {
      setLastResult({ ...lastResult, show: false });
      if (nextState.questionsAnswered >= nextState.totalQuestions) {
        setGameState({ ...nextState, endTime: Date.now() });
        setScreen('results');
        setIsProcessing(false);
      } else {
        nextQuestion(nextState);
        setIsProcessing(false);
      }
    }, 600);
  };

  const resetGame = () => {
    setScreen('home');
    setGameState(null);
    setCurrentQuestion(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0F16] text-white font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-hidden relative">
      {/* Immersive Background Blur Elements */}
      <div className="fixed top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto px-6 pt-8 h-screen flex flex-col relative"
          >
            <div className="flex justify-between items-start mb-12">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-blue-300">Arena Engine</span>
                </div>
              </motion.div>
              <button 
                onClick={() => setScreen('about')}
                className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-300 flex items-center gap-2 backdrop-blur-md"
              >
                <Info className="w-3 h-3" /> About Us
              </button>
            </div>
            
            <header className="mb-12">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl font-black tracking-tight leading-[0.9] mb-4 text-white"
              >
                NUMBOOST<br />ARENA.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-sm leading-relaxed max-w-[280px]"
              >
                Master speed and accuracy with adaptive challenges.
              </motion.p>
            </header>

            <div className="space-y-4">
              <MenuCard 
                icon={<Target className="w-5 h-5" />}
                title="Practice Mode"
                description="Master specific arithmetic skills"
                onClick={() => setScreen('categories')}
                accent="orange"
              />
              <MenuCard 
                icon={<Settings2 className="w-5 h-5" />}
                title="Custom Test"
                description="Build your perfect challenge"
                onClick={() => setScreen('custom')}
                accent="zinc"
              />
            </div>
          </motion.div>
        )}

        {screen === 'custom' && (
          <motion.div 
            key="custom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto px-6 pt-12 pb-24"
          >
            <button onClick={() => setScreen('home')} className="mb-8 p-2 -ml-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl font-bold tracking-tight mb-8">Custom<br />Challenge.</h2>
            
            <div className="space-y-8">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">1. Select Pillars</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Addition', 'Subtraction', 'Multiplication', 'Division', 'Decimals', 'Fractions', 'Tables', 'Squares', 'Cubes', 'Roots'].map((pillar) => (
                    <button 
                      key={pillar}
                      onClick={() => toggleCustomCategory(pillar)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        customConfig[pillar] ? 'bg-gradient-to-r from-blue-500/20 to-emerald-500/20 text-white border-blue-500/50' : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {pillar} {customConfig[pillar] && '✓'}
                    </button>
                  ))}
                </div>
              </section>

              {Object.keys(customConfig).length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">2. Difficulty Level</h3>
                  <div className="space-y-3">
                    {Object.values(customConfig).map((config: ActiveCategory) => {
                      const isRange = ['Tables', 'Squares', 'Cubes', 'Roots'].includes(config.name);
                      return (
                        <div key={config.name} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div className="font-bold text-white mb-3 text-sm">{config.name}</div>
                          {isRange ? (
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-gray-500 mb-1 block">Start</label>
                                <input type="number" 
                                  className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-white font-bold outline-none" 
                                  value={config.customRange?.start || ''}
                                  onChange={e => updateCustomCategory(config.name, { customRange: { ...config.customRange!, start: parseInt(e.target.value) || 0 } })} 
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-gray-500 mb-1 block">End</label>
                                <input type="number" 
                                  className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-white font-bold outline-none" 
                                  value={config.customRange?.end || ''}
                                  onChange={e => updateCustomCategory(config.name, { customRange: { ...config.customRange!, end: parseInt(e.target.value) || 0 } })} 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as Difficulty[]).map(diff => (
                                <button 
                                  key={diff}
                                  onClick={() => updateCustomCategory(config.name, { difficulty: diff })}
                                  className={`flex-1 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all ${
                                      config.difficulty === diff ? 'bg-blue-500/30 text-white border-blue-500/50' : 'bg-black/20 text-gray-500 border-white/5'
                                  }`}
                                >
                                  {diffEmojis[diff]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">3. Question No.</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center">
                  <input 
                    type="number" 
                    min="1" max="180"
                    placeholder="Enter volume (Max 180)"
                    value={customVolume || ''}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val > 180) val = 180;
                      setCustomVolume(val);
                    }}
                    className="w-full bg-transparent text-2xl font-black text-white outline-none text-center"
                  />
                </div>
              </section>
            </div>

            <button 
              disabled={Object.keys(customConfig).length === 0 || !customVolume}
              onClick={() => {
                const finalState = {
                  categories: Object.values(customConfig),
                  score: 0,
                  questionsAnswered: 0,
                  totalQuestions: customVolume,
                  history: [],
                  startTime: Date.now(),
                  endTime: null
                };
                setGameState(finalState);
                nextQuestion(finalState as any);
                setScreen('game');
              }}
              className="mt-12 w-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:from-blue-500 hover:to-emerald-400 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              Start Custom Arena
            </button>
          </motion.div>
        )}

        {screen === 'categories' && (
          <motion.div 
            key="categories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md mx-auto px-6 pt-12 pb-24"
          >
            <button onClick={() => setScreen('home')} className="mb-8 p-2 -ml-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Choose Category</h2>
            <div className="grid grid-cols-2 gap-4">
              {['Addition', 'Subtraction', 'Multiplication', 'Division', 'Decimals', 'Fractions', 'Squares', 'Cubes', 'Roots'].map((cat) => (
                <CategoryBtn key={cat} name={cat} onClick={() => startPractice(cat)} />
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'difficulty' && (
          <motion.div 
            key="difficulty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-md mx-auto px-6 pt-12 flex flex-col justify-center min-h-screen relative"
          >
            <div className="absolute top-12 left-6">
              <button onClick={() => setScreen('categories')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-2 text-center uppercase text-white">Intensity</h2>
            <p className="text-blue-400 text-center text-xs tracking-widest font-bold uppercase mb-12">Select your challenge level</p>
            <div className="space-y-3">
              {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as Difficulty[]).map((diff) => (
                <DifficultyCard key={diff} level={diff} onClick={() => selectDifficulty(diff)} />
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'game' && gameState && currentQuestion && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto px-6 pt-12 flex flex-col min-h-screen bg-transparent relative z-10"
          >
            <header className="flex justify-between items-center mb-16">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Difficulty Level</span>
                <span className="text-lg font-bold text-white">
                  {currentQuestion.category} {gameState.categories.find(c => c.name === currentQuestion.category)?.difficulty ? diffEmojis[gameState.categories.find(c => c.name === currentQuestion.category)!.difficulty!] : `[${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.start || ''}-${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.end || ''}]`}
                </span>
              </div>
              <div className="flex bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/5 shadow-inner">
                <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
                  Q {gameState.questionsAnswered + 1}
                  <span className="text-gray-400 opacity-60">/{gameState.totalQuestions}</span>
                </span>
              </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center -mt-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  className="text-7xl font-black tracking-tighter mb-24 tabular-nums"
                >
                  {currentQuestion.expression}
                </motion.div>
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((opt, i) => (
                  <motion.button
                    disabled={isProcessing}
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAnswer(opt)}
                    className="h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-bold hover:bg-blue-500/20 hover:border-blue-500/50 transition-all active:bg-blue-600 active:text-white backdrop-blur-sm disabled:opacity-50"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            </main>

            {lastResult.show && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-[#0A0F16]/60 backdrop-blur-sm"
              >
                {lastResult.isCorrect ? (
                  <div className="text-green-500 animate-bounce">
                    <CheckCircle2 className="w-32 h-32 fill-white" />
                  </div>
                ) : (
                  <div className="text-red-500 animate-shake">
                    <XCircle className="w-32 h-32 fill-white" />
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {screen === 'results' && gameState && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto px-6 pt-12 pb-24 min-h-screen"
          >
            <h2 className="text-5xl font-black tracking-tighter mb-2 text-center">ELITE<br />RESULTS.</h2>
            <p className="text-blue-400 text-center text-xs tracking-widest font-bold uppercase mb-12">
              "{
                Math.round((gameState.score / gameState.totalQuestions) * 100) === 100 ? "Flawless precision. Pure mastery." :
                Math.round((gameState.score / gameState.totalQuestions) * 100) >= 90 ? "Almost perfect. Sharp focus." :
                Math.round((gameState.score / gameState.totalQuestions) * 100) >= 75 ? "Great run. Refine for perfection." :
                Math.round((gameState.score / gameState.totalQuestions) * 100) >= 50 ? "Good ground covered. Keep scaling." :
                "Growth happens at the edge of failure."
              }"
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-12">
              <ResultMetric label="Accuracy" value={`${Math.round((gameState.score / gameState.totalQuestions) * 100)}%`} icon={<Target className="w-4 h-4 text-emerald-400" />} />
              <ResultMetric label="Score" value={`${gameState.score}/${gameState.totalQuestions}`} icon={<Trophy className="w-4 h-4 text-amber-400" />} />
              <ResultMetric label="Time" value={`${Math.floor((gameState.endTime! - gameState.startTime) / 1000)}s`} icon={<Timer className="w-4 h-4 text-blue-400" />} />
              <ResultMetric label="Speed" value={`${(Math.floor((gameState.endTime! - gameState.startTime) / 100) / 10 / gameState.totalQuestions).toFixed(1)}s/q`} icon={<Zap className="w-4 h-4 text-purple-400" />} />
            </div>

            <div className="space-y-4 mb-12">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">Detailed Analysis</h3>
              {gameState.history.map((h, i) => (
                <div key={i} className={`p-4 rounded-xl border flex justify-between items-center ${h.isCorrect ? 'bg-[#111827] border-emerald-500/30 border-l-4 border-l-emerald-500' : 'bg-[#111827] border-red-500/30 border-l-4 border-l-red-500'}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Question {i + 1}</span>
                    <span className="text-lg font-bold text-white">{h.question.expression}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[9px] uppercase font-bold text-gray-500">Your Answer</div>
                      <div className={`font-bold ${h.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{h.userSelection}</div>
                    </div>
                    {!h.isCorrect && (
                       <div className="text-right pl-4 border-l border-white/10">
                        <div className="text-[9px] uppercase font-bold text-gray-500">Correct</div>
                        <div className="font-bold text-emerald-400">{h.question.answer}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={resetGame}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:from-blue-500 hover:to-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              Restart Arena <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {screen === 'about' && (
          <motion.div 
            key="about"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-md mx-auto px-6 pt-12 pb-24 relative z-10"
          >
            <button onClick={() => setScreen('home')} className="mb-8 p-2 -ml-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl font-black tracking-tight mb-8 text-white">Developers.</h2>
            
            <div className="space-y-6">
              <DevCard name="ABDUL HAQUE" role="Design Lead & Architect" bio="Passionate developer creating innovative educational tools for the modern age." />
              <DevCard name="SAAD" role="Experience Developer" bio="Focused on high-performance interactive experiences and premium UI systems." />
            </div>

            <div className="mt-20 p-8 rounded-[32px] bg-gradient-to-br from-blue-900 to-emerald-900 text-white relative overflow-hidden group shadow-2xl border border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 group-hover:scale-110 transition-transform">
                <Zap className="w-40 h-40 fill-white/20" />
              </div>
              <h3 className="text-2xl font-black mb-1">Stay Elite.</h3>
              <p className="text-blue-100/80 text-sm leading-relaxed mb-6">NumBoost Arena is built for those who never stop learning.</p>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"><Share2 onClick={() => handleGlobalShare()} className="w-5 h-5 text-emerald-400" /></div>
                <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"><Heart className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuCard({ icon, title, description, onClick, accent }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; accent: string; key?: React.Key }) {
  const accentClasses: any = {
    orange: "group-hover:text-amber-400 group-hover:bg-amber-400/20",
    zinc: "group-hover:text-blue-400 group-hover:bg-blue-500/20",
    blue: "group-hover:text-emerald-400 group-hover:bg-emerald-500/20"
  };

  return (
    <motion.button 
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full p-6 bg-white/5 border border-white/5 rounded-2xl text-left flex items-center gap-5 transition-all hover:bg-white/10 hover:border-white/10 relative overflow-hidden"
    >
      <div className={`p-4 rounded-xl transition-colors ${accentClasses[accent]} bg-white/5 text-gray-400`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg leading-tight text-gray-300 group-hover:text-white transition-colors">{title}</h3>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
}

function CategoryBtn({ name, onClick }: { name: string; onClick: () => void; key?: React.Key }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="p-5 bg-[#111827] border border-white/5 rounded-2xl text-sm font-bold text-gray-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-900/20 transition-all flex items-center justify-between group shadow-sm"
    >
      {name}
      <Zap className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
    </motion.button>
  );
}

function DifficultyCard({ level, onClick }: { level: Difficulty; onClick: () => void; key?: React.Key }) {
  const descMap: any = {
    Beginner: "Single digits, simple logic",
    Intermediate: "Double digits, focused math",
    Advanced: "Multi-digit, competitive pace",
    Expert: "The ultimate arithmetic test"
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-6 text-left rounded-2xl border border-white/5 bg-[#111827] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all group"
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xl font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors">{level} {diffEmojis[level]}</span>
        <div className="flex gap-1">
          {Array.from({ length: ['Beginner', 'Intermediate', 'Advanced', 'Expert'].indexOf(level) + 1 }).map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-blue-500/80 rounded-[1px] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          ))}
        </div>
      </div>
      <p className="text-gray-500 text-xs">{descMap[level]}</p>
    </motion.button>
  );
}

function ResultMetric({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black tabular-nums text-white">{value}</div>
    </div>
  );
}

function DevCard({ name, role, bio }: { name: string, role: string, bio: string }) {
  return (
    <div className="p-8 bg-[#111827] rounded-[32px] border border-white/5 hover:border-emerald-500/30 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
          {name[0]}
        </div>
        <div>
          <h3 className="font-bold text-xl text-white tracking-tight">{name}</h3>
          <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">{role}</p>
        </div>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{bio}</p>
    </div>
  );
}
