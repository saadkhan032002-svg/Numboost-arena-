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
  Info,
  Download,
  MoreVertical,
  Mail
} from 'lucide-react';
import { generateQuestion, Difficulty, Question, shuffleArray, generateSmartDecoys } from './lib/mathEngine';
import { jsPDF } from 'jspdf';
import { playClick, playCorrect, playWrong, playNumpad } from './lib/audioEngine';

type Screen = 'home' | 'categories' | 'subcategories' | 'setup' | 'game' | 'results' | 'custom' | 'about';

export interface ActiveCategory {
  name: string;
  difficulty?: Difficulty;
  customRange?: { start: number | ''; end: number | '' };
}

interface GameState {
  categories: ActiveCategory[];
  isTestMode: boolean;
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  questions: { question: Question; options: (string | number)[] }[];
  answers: Record<number, string | 'skipped'>;
  currentIndex: number;
  startTime: number;
  endTime: number | null;
}

const diffEmojis: Record<Difficulty, string> = {
  Beginner: '🌱',
  Intermediate: '⚡',
  Advanced: '🔥',
  Expert: '💀'
};

const PRACTICE_CATS = [
  { id: 'Addition', label: 'Addition' },
  { id: 'Subtraction', label: 'Subtraction' },
  { id: 'Multiplication', label: 'Multiplication' },
  { id: 'Division', label: 'Division' },
  { id: 'Decimals', label: 'Decimals' },
  { id: 'Fractions', label: 'Fractions' },
  { id: 'Tables', label: 'Tables' },
  { id: 'Squares', label: 'Squares' },
  { id: 'Cubes', label: 'Cubes' },
  { id: 'Roots', label: 'Roots' }
];

const SUB_OPS = [
  { id: 'Addition', label: 'Addition (+)' },
  { id: 'Subtraction', label: 'Subtraction (-)' },
  { id: 'Multiplication', label: 'Multiplication (×)' },
  { id: 'Division', label: 'Division (÷)' },
  { id: 'Mix', label: 'Mix (All)' }
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<(number | string)[]>([]);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; show: boolean }>({ isCorrect: false, show: false });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [gameMode, setGameMode] = useState<'mcq' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [showManualInfo, setShowManualInfo] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRandomAllInfo, setShowRandomAllInfo] = useState(false);
  const [showCustomRandomInfo, setShowCustomRandomInfo] = useState(false);
  const [showRangeInfo, setShowRangeInfo] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (!target.closest('.info-popup-content') && !target.closest('.info-popup-trigger')) {
        setShowMenu(false);
        setShowManualInfo(false);
        setShowRandomAllInfo(false);
        setShowCustomRandomInfo(false);
        setShowRangeInfo(false);
      }

      if (target.tagName.toLowerCase() === 'button' || target.closest('button') || target.tagName.toLowerCase() === 'a' || target.closest('a')) {
        const btn = target.closest('button') || target.closest('a');
        if (btn?.dataset.sound !== 'none' && btn?.dataset.sound !== 'numpad') {
          playClick();
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleDownloadApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      setToastMessage('To install the app, please open it in a new tab, or use your browser menu -> "Add to Home Screen".');
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  const [practiceCat, setPracticeCat] = useState<string>('');
  const [practiceSetupStep, setPracticeSetupStep] = useState<1 | 2>(1);
  const [showSubcategoriesFor, setShowSubcategoriesFor] = useState<string>('');
  const [practiceConfig, setPracticeConfig] = useState<{
    difficulty: Difficulty;
    range: { start: number | ''; end: number | '' };
    volume: number | '';
  }>({ difficulty: 'Beginner', range: { start: '', end: '' }, volume: 10 });
  const [customConfig, setCustomConfig] = useState<Record<string, ActiveCategory>>({});
  const [customVolume, setCustomVolume] = useState<number>(20);
  const [customUseTimer, setCustomUseTimer] = useState(false);
  const [customTimerHours, setCustomTimerHours] = useState<number | ''>('');
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number | ''>(5);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (screen === 'game' && timeRemaining !== null && timeRemaining > 0) {
      const timerId = setInterval(() => setTimeRemaining(t => (t ? t - 1 : 0)), 1000);
      return () => clearInterval(timerId);
    } else if (screen === 'game' && timeRemaining === 0) {
      submitTest();
    }
  }, [screen, timeRemaining]);

  const InputToggle = () => (
    <div className="bg-[#111827]/80 backdrop-blur-md border border-white/5 rounded-2xl mb-6 flex flex-row items-stretch shadow-xl w-full max-w-sm mx-auto">
      <div className="w-[45%] flex flex-col justify-center p-3 border-r border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex flex-shrink-0 items-center justify-center text-blue-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-200 leading-tight">Input<br/>Mode</h3>
            <p className="text-[8px] uppercase tracking-wider text-gray-500 mt-0.5">How to answer</p>
          </div>
        </div>
      </div>
      
      <div className="w-[55%] bg-black/40 relative flex flex-col rounded-r-2xl overflow-hidden info-popup-trigger">
        <motion.div
           className="absolute left-0 right-0 h-[50%] z-0"
           initial={false}
           animate={{
             top: gameMode === 'mcq' ? '0%' : '50%',
             backgroundColor: gameMode === 'mcq' ? '#2563EB' : '#059669' // blue-600 vs emerald-600
           }}
           transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        
        <button 
          onClick={() => setGameMode('mcq')}
          className={`relative z-10 w-full flex-1 min-h-[44px] text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center border-b border-white/5 ${gameMode === 'mcq' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Options
        </button>
        <button 
          onClick={() => setGameMode('manual')}
          className={`relative z-10 w-full flex-1 min-h-[44px] text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2 ${gameMode === 'manual' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Manual 
          <div 
            onClick={(e) => { e.stopPropagation(); setShowManualInfo(!showManualInfo); }}
            className="w-4 h-4 rounded-full border border-current opacity-70 hover:opacity-100 flex items-center justify-center text-[9px] font-black pointer-events-auto"
          >
            !
          </div>
        </button>
        
        {showManualInfo && (
          <div className="info-popup-content absolute top-full mt-2 right-0 w-48 bg-[#0A0F16] text-[10px] text-gray-300 p-3 rounded-xl border border-white/10 shadow-2xl z-50 text-center normal-case tracking-normal">
            Type exact answers manually using keyboard. Perfect for rigorous training.
          </div>
        )}
      </div>
    </div>
  );

  const toggleCustomCategory = (cat: string) => {
    // For custom arena, encode Decimals/Fractions as Mix by default, or let user select sub.
    // For simplicity, we just save it as `${cat}-Mix` if it's Fractions/Decimals to leverage the engine.
    const key = (cat === 'Decimals' || cat === 'Fractions') ? `${cat}-Mix` : cat;
    
    const newConf = { ...customConfig };
    if (newConf[key]) {
      delete newConf[key];
    } else {
      const isRange = ['Tables', 'Squares', 'Cubes', 'Roots'].includes(cat);
      newConf[key] = {
        name: key,
        ...(isRange ? { customRange: { start: 1, end: 12 } } : { difficulty: 'Intermediate' as Difficulty })
      };
    }
    setCustomConfig(newConf);
  };

  const getCatLabel = (cat: string) => {
    if (cat.includes('-')) {
      const [main, sub] = cat.split('-');
      const opLabel = SUB_OPS.find(o => o.id === sub)?.label || sub;
      return `${main} ${opLabel}`;
    }
    return PRACTICE_CATS.find(p => p.id === cat)?.label || cat;
  };

  const updateCustomCategory = (name: string, updates: Partial<ActiveCategory>) => {
    setCustomConfig(prev => ({
      ...prev,
      [name]: { ...prev[name], ...updates }
    }));
  };

  const handleGlobalShare = async (scoreData?: { accuracy: number, score: number, total: number, speed?: string }) => {
    let text = "Level up your calculation speeds with NumBoost Arena! 🤯 Create custom math challenges, practice specific ranges, and challenge your limits in an immersive test mode. Let's see if you can handle the Expert level!\"\n👉 Join the Arena: https://numboostarena.netlify.app/#";
    if (scoreData) {
        text = `🚀 I just tested my mathematical limits at NumBoost Arena!\n\nMy Stats:\n🎯 Accuracy: ${scoreData.accuracy}% (${scoreData.score}/${scoreData.total})\n${scoreData.speed ? `⏱️ Speed: ${scoreData.speed}s/q\n` : ''}\nThink you have faster reflexes? Challenge my score!\n\nPlay now: https://numboostarena.netlify.app/#`;
    }
    if (navigator.share) {
        navigator.share({ text }).catch((err) => {
           if (err.name !== 'AbortError') {
             console.log('Share error:', err);
           }
        });
    } else {
        try {
          await navigator.clipboard.writeText(text);
          alert("Link copied to clipboard!");
        } catch (err) {
          console.error("Failed to copy link: ", err);
        }
    }
  };

  const startPractice = (category: string) => {
    if (category === 'Decimals' || category === 'Fractions') {
      setShowSubcategoriesFor(category);
      setScreen('subcategories');
    } else {
      setPracticeCat(category);
      setPracticeSetupStep(1);
      setScreen('setup');
    }
  };

  const startSubcategory = (subOp: string) => {
    setPracticeCat(`${showSubcategoriesFor}-${subOp}`);
    setPracticeSetupStep(1);
    setScreen('setup');
  };

  const initGameState = (categories: ActiveCategory[], totalQuestions: number, isTestMode: boolean) => {
    const questions: { question: Question; options: (string | number)[] }[] = [];
    for (let i = 0; i < totalQuestions; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        let q: Question;
        let attempts = 0;
        do {
            q = generateQuestion(cat.name, cat.difficulty, cat.customRange);
            attempts++;
        } while (attempts < 15 && questions.some(existing => existing.question.expression === q.expression));
        
        const decoys = generateSmartDecoys(q);
        const options = shuffleArray([q.answer, ...decoys]);
        questions.push({ question: q, options });
    }

    if (isTestMode && customUseTimer && screen === 'custom') {
      let tm = (Number(customTimerHours) || 0) * 3600 + (Number(customTimerMinutes) || 0) * 60;
      if (tm < 60) tm = 60;
      if (tm > 10800) tm = 10800; // max 3 hours
      setTimeRemaining(tm);
    } else {
      setTimeRemaining(null);
    }

    const state: GameState = {
        categories,
        isTestMode,
        score: 0,
        questionsAnswered: 0,
        totalQuestions,
        questions,
        answers: {},
        currentIndex: 0,
        startTime: Date.now(),
        endTime: null
    };
    setGameState(state);
    setCurrentQuestion(state.questions[0].question);
    setOptions(state.questions[0].options as any);
    setManualInput('');
    setScreen('game');
  };

  const goToQuestion = (index: number, stateObj = gameState) => {
    if (!stateObj) return;
    setCurrentQuestion(stateObj.questions[index].question);
    setOptions(stateObj.questions[index].options as any);
    setManualInput(stateObj.answers[index] !== 'skipped' ? (stateObj.answers[index] || '') : '');
    setGameState({ ...stateObj, currentIndex: index });
  };

  const handleAnswer = (answer: string | number) => {
    if (!gameState || isProcessing) return;
    
    if (gameState.isTestMode) {
      playNumpad();
      // Test Mode logic: No immediate feedback, proceed to next
      const nextState: GameState = {
        ...gameState,
        answers: { ...gameState.answers, [gameState.currentIndex]: String(answer).trim() }
      };
      // Mark as answered if it wasn't already or wasn't skipped? Actually just update the dictionary.
      const answeredKeys = Object.values(nextState.answers).filter(val => val !== undefined && val !== '').length;
      nextState.questionsAnswered = answeredKeys;
      
      setGameState(nextState);
      
      if (gameState.currentIndex + 1 < gameState.totalQuestions) {
        goToQuestion(gameState.currentIndex + 1, nextState);
      }
    } else {
      // Practice Mode logic: Evaluate immediately
      setIsProcessing(true);
      const isCorrect = String(answer).trim() === String(currentQuestion?.answer).trim();
      setLastResult({ isCorrect, show: true });
      if (isCorrect) {
         playCorrect();
      } else {
         playWrong();
      }

      const nextState: GameState = {
        ...gameState,
        answers: { ...gameState.answers, [gameState.currentIndex]: String(answer).trim() },
        score: isCorrect ? gameState.score + 1 : gameState.score,
        questionsAnswered: gameState.questionsAnswered + 1
      };

      setGameState(nextState);

      setTimeout(() => {
        setLastResult({ ...lastResult, show: false });
        if (nextState.currentIndex + 1 >= nextState.totalQuestions) {
          setGameState({ ...nextState, endTime: Date.now() });
          setScreen('results');
          setIsProcessing(false);
        } else {
          goToQuestion(nextState.currentIndex + 1, nextState);
          setIsProcessing(false);
        }
      }, 600);
    }
  };

  const skipQuestion = () => {
    if (!gameState || isProcessing) return;
    
    // Both Test & Practice can skip technically? The user said "practice mai previous aur skip ka option nhi daalna"
    if (!gameState.isTestMode) return;

    const nextState: GameState = {
      ...gameState,
      answers: { ...gameState.answers, [gameState.currentIndex]: 'skipped' }
    };
    const answeredKeys = Object.values(nextState.answers).filter(val => val !== undefined && val !== '').length;
    nextState.questionsAnswered = answeredKeys;
    
    setGameState(nextState);
    if (gameState.currentIndex + 1 < gameState.totalQuestions) {
      goToQuestion(gameState.currentIndex + 1, nextState);
    }
  };

  const submitTest = () => {
    if (!gameState) return;
    setGameState({ ...gameState, endTime: Date.now() });
    setScreen('results');
  };

  const resetGame = () => {
    setScreen('home');
    setGameState(null);
    setCurrentQuestion(null);
  };

  const downloadCustomPDF = () => {
    if (Object.keys(customConfig).length === 0 || !customVolume) return;
    setIsGeneratingPDF(true);

    setTimeout(() => {
      try {
        const finalQuestions: Question[] = [];
        const categories = Object.values(customConfig) as ActiveCategory[];
        for (let i = 0; i < customVolume; i++) {
          const activeCat = categories[Math.floor(Math.random() * categories.length)];
          finalQuestions.push(generateQuestion(activeCat.name, activeCat.difficulty, activeCat.customRange));
        }

        const doc = new jsPDF({ format: 'a4' });

        const addFooter = (document: jsPDF) => {
          document.setFontSize(9);
          document.setFont("helvetica", "italic");
          document.text("This practice sheet created by Numboostarena.netlify.app", 105, 287, { align: "center" });
        };
        
        // Page 1: Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("NUMBOOST ARENA", 14, 20);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Name: _______________________", 14, 30);
        doc.text("Date: ________________", 110, 30);
        doc.text(`Total Questions: ${customVolume}`, 160, 30);

        doc.line(14, 34, 196, 34);

        // Sanitize string for standard jsPDF encoding
        const formatExp = (exp: string) => exp.replace(/²/g, ' sq').replace(/³/g, ' cu').replace(/√/g, 'sqrt( )');

        // Layout Config
        const hasLongQuestions = finalQuestions.some(q => q.expression.length > 12);
        const cols = hasLongQuestions ? 3 : 4;
        const colWidth = hasLongQuestions ? 60 : 46;
        const startX = 14;
        let startY = 46;
        const lineH = gameMode === 'mcq' ? 24 : 14;
        const rowsPerPage = gameMode === 'mcq' ? 10 : 16;

        doc.setFontSize(11);

        for (let i = 0; i < finalQuestions.length; i++) {
           const col = i % cols;
           const row = Math.floor(i / cols);
           const localRow = row % rowsPerPage;

           const x = startX + (col * colWidth);
           const y = startY + (localRow * lineH);

           if (i > 0 && i % (cols * rowsPerPage) === 0) {
              addFooter(doc);
              doc.addPage();
              doc.setFont("helvetica", "bold");
              startY = 20;
           }

           doc.setFont("helvetica", "bold");
           doc.text(`${i + 1}.`, x, y);
           doc.setFont("helvetica", "normal");
           doc.text(`${formatExp(finalQuestions[i].expression)} = _______`, x + (i >= 9 ? 7 : 6), y);

           // Add options if gameMode is MCQ
           if (gameMode === 'mcq') {
              const decoys = generateSmartDecoys(finalQuestions[i]);
              const combinedOpts = shuffleArray([finalQuestions[i].answer, ...decoys]);
              doc.setFontSize(8);
              doc.text(`a) ${combinedOpts[0]}   b) ${combinedOpts[1]}`, x + (i >= 9 ? 7 : 6), y + 6);
              doc.text(`c) ${combinedOpts[2]}   d) ${combinedOpts[3]}`, x + (i >= 9 ? 7 : 6), y + 11);
              doc.setFontSize(11); // revert for next text
           }
        }
        addFooter(doc);

        // Add Answer Key Page
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("ANSWER KEY", 14, 20);
        doc.line(14, 24, 196, 24);
        
        doc.setFontSize(11);
        startY = 34;
        const ansRowsPerPage = 26;
        const ansLineH = 9;

        for (let i = 0; i < finalQuestions.length; i++) {
           const col = i % cols;
           const row = Math.floor(i / cols);
           const localRow = row % ansRowsPerPage;

           const x = startX + (col * colWidth);
           const y = startY + (localRow * ansLineH);

           if (i > 0 && i % (cols * ansRowsPerPage) === 0) {
              addFooter(doc);
              doc.addPage();
              doc.setFont("helvetica", "bold");
              startY = 20;
           }

           doc.setFont("helvetica", "bold");
           doc.text(`${i + 1}.`, x, y);
           doc.setFont("helvetica", "normal");
           doc.text(`${finalQuestions[i].answer}`, x + (i >= 9 ? 7 : 6), y);
        }
        addFooter(doc);

        doc.save("NumBoost-Elite-Worksheet.pdf");
      } catch (e) {
        console.error("Failed to generate PDF", e);
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if inside an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (screen === 'game' && gameMode === 'manual' && e.key === 'Enter') {
          // Allow enter key for manual mode to submit answer
          e.preventDefault(); // Prevent default form submit behaviors if any
        } else {
           return;
        }
      }

      // Global Escape
      if (e.key === 'Escape') {
        if (showSubcategoriesFor && screen === 'categories') {
          setShowSubcategoriesFor('');
          return;
        }
        if (['categories', 'custom', 'about'].includes(screen)) setScreen('home');
        if (screen === 'difficulty') setScreen('categories');
      }

      // Results screen Actions
      if (screen === 'results' && e.key === 'Enter') {
        resetGame();
      }

      // Game screen Actions
      if (screen === 'game' && !isProcessing && currentQuestion) {
        if (gameMode === 'mcq' && options.length > 0) {
          if (e.key === '1' || e.key === 'Numpad1') handleAnswer(options[0]);
          if (e.key === '2' || e.key === 'Numpad2') handleAnswer(options[1]);
          if (e.key === '3' || e.key === 'Numpad3') handleAnswer(options[2]);
          if (e.key === '4' || e.key === 'Numpad4') handleAnswer(options[3]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isProcessing, options, gameMode, showSubcategoriesFor, manualInput, currentQuestion]);

  return (
    <div className="min-h-[100dvh] bg-[#0F1626] text-white font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-hidden relative">
      {/* Immersive Background Blur Elements - Global */}
      <div className="fixed top-[-10%] left-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-emerald-600/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#111827] border border-emerald-500/30 text-white px-5 py-4 rounded-2xl text-sm font-medium shadow-[0_10px_30px_rgba(16,185,129,0.15)] z-[100] flex items-start gap-4 backdrop-blur-xl"
          >
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl mx-auto px-5 md:px-8 lg:px-12 pt-[15vh] md:pt-16 min-h-[100dvh] flex flex-col md:flex-row relative items-start md:items-center justify-start md:justify-center gap-10 md:gap-12 pb-12"
          >
            <div className="absolute top-6 right-5 md:top-8 md:right-12 flex flex-col items-end gap-2 z-50">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Open menu"
                className="info-popup-trigger bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-3 rounded-xl text-gray-300 flex items-center justify-center backdrop-blur-md shadow-sm"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="info-popup-content flex flex-col gap-2"
                  >
                    <button 
                      onClick={() => { handleDownloadApp(); setShowMenu(false); }}
                      aria-label="Install app"
                      className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-3 rounded-xl text-gray-300 flex items-center justify-center backdrop-blur-md shadow-sm group relative"
                    >
                      <Download className="w-5 h-5" />
                      <span className="absolute right-12 bg-black text-[10px] uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Install</span>
                    </button>
                    <button 
                      onClick={() => { handleGlobalShare(); setShowMenu(false); }}
                      aria-label="Share"
                      className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-3 rounded-xl text-gray-300 flex items-center justify-center backdrop-blur-md shadow-sm group relative"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="absolute right-12 bg-black text-[10px] uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Share</span>
                    </button>
                    <button 
                      onClick={() => { setScreen('about'); setShowMenu(false); }}
                      aria-label="About"
                      className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-3 rounded-xl text-gray-300 flex items-center justify-center backdrop-blur-md shadow-sm group relative"
                    >
                      <Info className="w-5 h-5" />
                      <span className="absolute right-12 bg-black text-[10px] uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">About</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <header className="md:w-1/2 flex flex-col md:pr-12 md:pb-24">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-6"
              >
                <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-blue-300">Arena Engine</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[13.5vw] sm:text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-4 md:mb-6 text-white"
              >
                NUMBOOST<br />ARENA
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-sm md:text-base leading-relaxed max-w-[320px]"
              >
                Master speed and accuracy with adaptive challenges. Designed for flow state.
              </motion.p>
            </header>

            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <MenuCard 
                icon={<Target className="w-6 h-6" />}
                title="Practice Mode"
                description="Master specific arithmetic skills"
                onClick={() => { setScreen('categories'); setShowMenu(false); }}
                accent="orange"
              />
              <MenuCard 
                icon={<Settings2 className="w-6 h-6" />}
                title="Custom Test"
                description="Build your perfect challenge"
                onClick={() => { setScreen('custom'); setShowMenu(false); }}
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
            className="w-full max-w-4xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Custom<br />Challenge.</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <section className="space-y-8">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">1. Select Pillars</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PRACTICE_CATS.map((pillar) => (
                      <button 
                        key={pillar.id}
                        onClick={() => toggleCustomCategory(pillar.id)}
                        className={`p-3 rounded-xl border text-[13px] md:text-sm font-bold transition-all ${
                          customConfig[(pillar.id === 'Decimals' || pillar.id === 'Fractions') ? `${pillar.id}-Mix` : pillar.id] ? 'bg-gradient-to-r from-blue-500/20 to-emerald-500/20 text-white border-blue-500/50 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {pillar.label} {customConfig[(pillar.id === 'Decimals' || pillar.id === 'Fractions') ? `${pillar.id}-Mix` : pillar.id] && '✓'}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        toggleCustomCategory('Random');
                        if (!customConfig['Random']) {
                          setShowCustomRandomInfo(false);
                        }
                      }}
                      className={`col-span-2 md:col-span-3 p-4 rounded-xl border text-[13px] md:text-base uppercase tracking-widest font-black transition-all relative shadow-[0_0_15px_rgba(147,51,234,0.1)] ${
                        customConfig['Random'] ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/50 shadow-lg' : 'bg-white/5 text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex w-full items-center justify-center gap-2">
                        Random (All Categories) {customConfig['Random'] && '✓'}
                      </div>
                      
                      <div 
                        onClick={(e) => { e.stopPropagation(); setShowCustomRandomInfo(!showCustomRandomInfo); }}
                        className="info-popup-trigger absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-current opacity-70 hover:opacity-100 flex items-center justify-center text-[10px] font-black cursor-pointer"
                      >
                        !
                        {showCustomRandomInfo && (
                          <div className="info-popup-content absolute bottom-full right-0 mb-3 w-48 p-3 bg-[#0A0F16] border border-white/10 text-[10px] font-medium text-gray-300 rounded-lg shadow-xl z-30 normal-case tracking-normal">
                            Includes questions from every arithmetic category.
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2 mt-2">3. Test Timer</h3>
                  <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
                    <label className="flex items-center justify-between cursor-pointer mb-4">
                      <span className="text-sm font-bold text-gray-300">Enable Time Limit</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={customUseTimer}
                          onChange={(e) => setCustomUseTimer(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 hover:bg-white/20"></div>
                      </div>
                    </label>
                    
                    {customUseTimer && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[11px] uppercase font-bold text-gray-500 mb-1 block">Hours</label>
                          <input 
                            type="number" 
                            min="0" max="3"
                            value={customTimerHours}
                            onChange={e => {
                               let val = parseInt(e.target.value);
                               if (isNaN(val) || val < 0) val = 0;
                               if (val > 3) val = 3;
                               setCustomTimerHours(val || '');
                            }}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold outline-none focus:border-blue-500/50 transition-colors text-center" 
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[11px] uppercase font-bold text-gray-500 mb-1 block">Minutes</label>
                          <input 
                            type="number" 
                            min="0" max="59"
                            value={customTimerMinutes}
                            onChange={e => {
                               let val = parseInt(e.target.value);
                               if (isNaN(val) || val < 0) val = 0;
                               if (val > 59) val = 59;
                               setCustomTimerMinutes(val || '');
                            }}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold outline-none focus:border-blue-500/50 transition-colors text-center" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="space-y-8 flex flex-col">
                {Object.keys(customConfig).length > 0 ? (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400 mb-4 px-2">2. Difficulty Level</h3>
                    <div className="space-y-3">
                      {Object.values(customConfig).map((config: ActiveCategory) => {
                        const isRange = ['Tables', 'Squares', 'Cubes', 'Roots'].includes(config.name);
                        return (
                          <div key={config.name} className="p-4 bg-[#111827] border border-white/10 rounded-xl">
                            <div className="font-bold text-white mb-3 text-sm">{getCatLabel(config.name)}</div>
                            {isRange ? (
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="text-[11px] uppercase font-bold text-gray-500 mb-1 block">Start</label>
                                  <input type="number" 
                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold outline-none focus:border-emerald-500/50 transition-colors" 
                                    value={config.customRange?.start === '' ? '' : (config.customRange?.start ?? '')}
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      updateCustomCategory(config.name, { customRange: { ...config.customRange!, start: isNaN(val) ? '' : val } });
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[11px] uppercase font-bold text-gray-500 mb-1 block">End</label>
                                  <input type="number" 
                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold outline-none focus:border-emerald-500/50 transition-colors" 
                                    value={config.customRange?.end === '' ? '' : (config.customRange?.end ?? '')}
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      updateCustomCategory(config.name, { customRange: { ...config.customRange!, end: isNaN(val) ? '' : val } });
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as Difficulty[]).map(diff => (
                                  <button 
                                    key={diff}
                                    onClick={() => updateCustomCategory(config.name, { difficulty: diff })}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all ${
                                        config.difficulty === diff ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-inner' : 'bg-black/30 text-gray-500 border-white/5 hover:border-white/20'
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
                ) : (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 text-center text-gray-500 text-sm">
                    Select pillars to configure custom parameters.
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">4. Question Volume</h3>
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-2 flex items-center shadow-inner">
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
                      className="w-full bg-transparent text-3xl font-black text-white outline-none text-center p-3"
                    />
                  </div>
                </div>

                <InputToggle />

                <div className="flex flex-col md:flex-row gap-3 mt-auto pt-8">
                  <button 
                    disabled={Object.keys(customConfig).length === 0 || !customVolume || isGeneratingPDF}
                    onClick={downloadCustomPDF}
                    className="flex-1 bg-white/5 border border-white/10 text-white py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isGeneratingPDF ? 'Generating...' : <><Download className="w-4 h-4" /> Export PDF</>}
                  </button>

                  <button 
                    disabled={Object.keys(customConfig).length === 0 || !customVolume}
                    onClick={() => {
                      initGameState(Object.values(customConfig), customVolume, true);
                    }}
                    className="flex-[2] bg-gradient-to-r from-blue-600 to-emerald-500 text-white py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs md:text-sm hover:from-blue-500 hover:to-emerald-400 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_30px_rgba(59,130,246,0.3)] md:shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                  >
                    Start Custom Arena
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'categories' && (
          <motion.div 
            key="categories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Choose Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PRACTICE_CATS.map((cat) => (
                <CategoryBtn key={cat.id} name={cat.label} onClick={() => startPractice(cat.id)} />
              ))}
              <div className="col-span-2 md:col-span-2 relative group mt-2">
                 <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startPractice('Random')}
                  className="w-full h-full p-5 bg-gradient-to-br from-purple-900/40 to-[#0A0F16] border border-purple-500/20 rounded-2xl text-sm font-bold text-gray-400 hover:text-purple-400 hover:border-purple-500/40 hover:shadow-[0_8px_30px_rgba(147,51,234,0.15)] transition-all flex items-center justify-between overflow-hidden relative peer"
                >
                  <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 relative z-10 w-full justify-center">
                     <span className="font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">RANDOM (ALL)</span>
                     <Zap className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 text-purple-400 absolute right-0" />
                  </div>
                </motion.button>
                  <div className="absolute -top-3 -right-2 z-50">
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowRandomAllInfo(!showRandomAllInfo); }}
                    className="info-popup-trigger w-6 h-6 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer shadow-md transition-all active:scale-90 relative"
                  >
                    !
                    {showRandomAllInfo && (
                      <div className="info-popup-content absolute top-8 right-0 md:bottom-full md:top-auto md:mb-2 w-48 p-3 bg-[#0A0F16] border border-white/10 text-[11px] text-gray-300 rounded-xl shadow-2xl z-50 font-sans pointer-events-none transition-all normal-case tracking-normal">
                        Practice a mix of questions from all available categories.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'subcategories' && (
          <motion.div 
            key="subcategories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('categories')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Select Operation</h2>
            <p className="text-blue-400 text-xs tracking-widest font-bold uppercase mb-8">
              For {showSubcategoriesFor}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUB_OPS.map((op) => (
                <CategoryBtn key={op.id} name={op.label} onClick={() => startSubcategory(op.id)} />
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-xl mx-auto px-4 py-8 md:py-12"
          >
            <button onClick={() => {
              if (practiceSetupStep === 2) setPracticeSetupStep(1);
              else { setScreen(practiceCat.includes('-') ? 'subcategories' : 'categories'); setShowSubcategoriesFor(''); }
            }} aria-label="Go back" className="mb-6 p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center uppercase text-white">
              {practiceSetupStep === 1 ? 'Select Level' : 'Set Volume'}
            </h2>
            <p className="text-gray-400 border border-white/10 w-fit mx-auto px-3 py-1 rounded-full text-center text-[10px] md:text-xs tracking-widest font-bold uppercase mb-8">
               {getCatLabel(practiceCat)}
            </p>
            
            {practiceSetupStep === 1 && (
              <>
                {['Tables', 'Squares', 'Cubes', 'Roots'].includes(practiceCat) ? (
                  <div className="mb-6 space-y-4 bg-[#111827]/80 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl">
                    <div className="flex flex-col items-center justify-center gap-2 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300">Number Range</h3>
                      <button 
                        onClick={() => setShowRangeInfo(!showRangeInfo)}
                        className="info-popup-trigger flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <div className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">i</div>
                        <span>Info</span>
                      </button>
                      
                      {showRangeInfo && (
                        <div className="info-popup-content w-full p-3 bg-gray-800/50 border border-white/5 text-[11px] text-gray-400 rounded-lg text-center leading-relaxed mt-2">
                          Define the start and end values for the numbers. Questions will be generated exclusively within this specified range.
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 mb-1 block">Start Value</label>
                        <input 
                          type="number" 
                          value={practiceConfig.range.start === '' ? '' : (practiceConfig.range.start ?? '')}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setPracticeConfig({...practiceConfig, range: {...practiceConfig.range, start: isNaN(val) ? '' : val}});
                          }}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:border-gray-500 outline-none text-center font-bold"
                          placeholder="Ex: 1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 mb-1 block">End Value</label>
                        <input 
                          type="number" 
                          value={practiceConfig.range.end === '' ? '' : (practiceConfig.range.end ?? '')}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setPracticeConfig({...practiceConfig, range: {...practiceConfig.range, end: isNaN(val) ? '' : val}});
                          }}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:border-gray-500 outline-none text-center font-bold"
                          placeholder="Ex: 10"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setPracticeSetupStep(2)}
                      disabled={practiceConfig.range.start === '' || practiceConfig.range.end === ''}
                      className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm py-4 rounded-xl uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 space-y-2">
                    {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as Difficulty[]).map((diff) => (
                      <DifficultyCard 
                        key={diff} 
                        level={diff} 
                        onClick={() => {
                          setPracticeConfig({...practiceConfig, difficulty: diff});
                          setPracticeSetupStep(2);
                        }}
                        selected={practiceConfig.difficulty === diff}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {practiceSetupStep === 2 && (
              <div className="mb-6">
                <div className="bg-[#111827]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-4 text-center">Total Questions</h3>
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-2 flex items-center mb-6 shadow-inner">
                    <input 
                      type="number" 
                      min="1" max="100"
                      value={practiceConfig.volume === '' ? '' : (practiceConfig.volume ?? '')}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setPracticeConfig({...practiceConfig, volume: ''});
                          return;
                        }
                        let val = parseInt(e.target.value) || 0;
                        if (val > 100) val = 100;
                        setPracticeConfig({...practiceConfig, volume: val});
                      }}
                      className="w-full bg-transparent text-3xl font-black text-white outline-none text-center p-3"
                      placeholder="Enter volume (Max 100)"
                    />
                  </div>
                  
                  <InputToggle />
                  
                  <button 
                    disabled={!practiceConfig.volume}
                    onClick={() => {
                      const finalCategories = [{
                        name: practiceCat,
                        ...( ['Tables', 'Squares', 'Cubes', 'Roots'].includes(practiceCat) 
                           ? { customRange: practiceConfig.range } 
                           : { difficulty: practiceConfig.difficulty } )
                      }];
                      initGameState(finalCategories, practiceConfig.volume || 10, false);
                    }}
                    className="w-full mt-6 bg-gradient-to-r from-gray-700 to-gray-600 text-white font-bold text-sm py-4 rounded-xl uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 disabled:opacity-30 border border-white/10"
                  >
                    Start Practice
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {screen === 'game' && gameState && currentQuestion && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl mx-auto px-6 pt-12 flex flex-col min-h-screen bg-transparent relative z-10"
          >
            <header className="flex justify-between items-center mb-10 w-full z-20">
              <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Difficulty Level</span>
                <span className="text-lg md:text-xl font-bold text-white">
                  {getCatLabel(currentQuestion.category)} {gameState.categories.find(c => c.name === currentQuestion.category)?.difficulty ? diffEmojis[gameState.categories.find(c => c.name === currentQuestion.category)!.difficulty!] : `[${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.start || ''}-${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.end || ''}]`}
                </span>
              </div>
              
              {timeRemaining !== null && (
                 <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Time Limit</span>
                    <span className="text-lg md:text-xl font-bold text-amber-400 tabular-nums">
                       {String(Math.floor(timeRemaining / 3600)).padStart(2, '0')}:{String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                    </span>
                 </div>
              )}

              <div className="flex flex-1 justify-end">
                <button 
                  onClick={() => setShowQuestionGrid(true)}
                  className="flex bg-white/10 rounded-full px-4 py-2 backdrop-blur-md border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-emerald-400 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex flex-col items-end">
                      <span className="text-xs md:text-sm font-bold tracking-widest uppercase">
                        Q {gameState.currentIndex + 1} <span className="text-emerald-400/50">/{gameState.totalQuestions}</span>
                      </span>
                      <span className="text-[8px] tracking-widest uppercase text-white/50">Tap to view</span>
                  </div>
                </button>
              </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center -mt-10 relative z-10 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  className="text-[60px] sm:text-[80px] md:text-[100px] lg:text-[120px] font-black tracking-tighter mb-8 tabular-nums drop-shadow-2xl text-center leading-tight break-words max-w-full"
                >
                  {currentQuestion.expression}
                </motion.div>
              </AnimatePresence>

              {gameMode === 'mcq' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-3xl pb-8">
                  {options.map((opt, i) => (
                    <motion.button
                      aria-label={`Answer option: ${opt}`}
                      disabled={isProcessing}
                      key={i}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(opt)}
                      className={`relative group h-20 md:h-28 border rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-bold transition-all active:scale-95 disabled:opacity-50 overflow-hidden ${
                         gameState.isTestMode && gameState.answers[gameState.currentIndex] === String(opt) ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]' : 'bg-[#0A0F1A] text-white border-white/5 hover:bg-blue-500/20 hover:border-blue-500/50 active:bg-blue-600 shadow-inner'
                      }`}
                    >
                      {opt}
                      <span className="hidden md:flex absolute top-3 left-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-300">
                        [{i + 1}]
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="w-full max-w-md md:max-w-lg mx-auto flex flex-col gap-4 pb-8">
                  <div className="bg-white/5 border border-white/20 focus-within:border-emerald-500 rounded-3xl p-1 transition-all group flex items-center">
                    <input 
                      type="text" 
                      inputMode="none"
                      className="w-full bg-transparent text-center text-5xl md:text-6xl lg:text-7xl font-black py-4 lg:py-6 outline-none text-white placeholder:text-white/10"
                      placeholder="?"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter' && manualInput.trim()) handleAnswer(manualInput.trim())
                      }}
                      autoFocus
                    />
                  </div>
                  
                  {/* Custom Numpad */}
                  <div className="grid lg:hidden grid-cols-4 gap-2 md:gap-4 mt-2 px-2 md:px-0">
                    {['1', '2', '3', '/', '4', '5', '6', '-', '7', '8', '9', '.', 'DEL', '0', 'GO'].map((key) => (
                      <button
                        key={key}
                        data-sound="numpad"
                        onClick={() => {
                          playNumpad();
                          if (key === 'DEL') setManualInput(prev => prev.slice(0, -1));
                          else if (key === 'GO') { if (manualInput.trim()) handleAnswer(manualInput.trim()); }
                          else setManualInput(prev => prev + key);
                        }}
                        className={`h-16 font-bold text-xl md:text-3xl rounded-2xl active:scale-95 transition-all
                          ${key === 'GO' ? 'bg-emerald-600 text-white col-span-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                            key === 'DEL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                            ['/', '-', '.'].includes(key) ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-[#0A0F1A] border border-white/5 text-white shadow-inner hover:bg-white/5'}
                        `}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Bar for Test Mode */}
              {gameState.isTestMode && (
                <div className="flex w-full max-w-3xl justify-between items-center gap-3 mt-4 px-2 h-14">
                   <motion.button 
                     layout
                     onClick={() => {if (gameState.currentIndex > 0) goToQuestion(gameState.currentIndex - 1);}}
                     disabled={gameState.currentIndex === 0}
                     className="py-4 rounded-xl bg-[#0A0F1A] hover:bg-white/5 border border-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 flex items-center justify-center text-center overflow-hidden shadow-inner"
                     style={{ flex: gameState.currentIndex === gameState.totalQuestions - 1 ? '0 0 60px' : '1', maxWidth: gameState.currentIndex === gameState.totalQuestions - 1 ? '60px' : '150px' }}
                   >
                     <motion.span layout="position">
                        {gameState.currentIndex === gameState.totalQuestions - 1 ? '<' : 'PRE'}
                     </motion.span>
                   </motion.button>
                   
                   <AnimatePresence>
                   {gameState.currentIndex === gameState.totalQuestions - 1 && Object.values(gameState.answers).length > 0 ? (
                      <motion.button 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                        onClick={submitTest}
                        className="h-full px-8 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold uppercase tracking-widest text-[12px] md:text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 flex-1 max-w-[300px] flex items-center justify-center"
                      >
                        Submit Test
                      </motion.button>
                   ) : (
                      <motion.div layout className="flex-1" />
                   )}
                   </AnimatePresence>
                   
                   <motion.button 
                     layout
                     onClick={() => {
                        skipQuestion();
                        if (gameState.currentIndex === gameState.totalQuestions - 1) submitTest();
                     }}
                     className="py-4 rounded-xl bg-[#0A0F1A] hover:bg-white/5 border border-white/5 text-pink-400 font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all active:scale-95 flex items-center justify-center text-center overflow-hidden shadow-inner"
                     style={{ flex: gameState.currentIndex === gameState.totalQuestions - 1 ? '0 0 60px' : '1', maxWidth: gameState.currentIndex === gameState.totalQuestions - 1 ? '60px' : '150px' }}
                   >
                     <motion.span layout="position">
                        {gameState.currentIndex === gameState.totalQuestions - 1 ? '>' : 'SKIP'}
                     </motion.span>
                   </motion.button>
                </div>
              )}
            </main>

            {/* Question Navigator Overlay */}
            <AnimatePresence>
              {showQuestionGrid && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm p-6 md:p-12 overflow-y-auto"
                >
                  <button 
                    onClick={() => setShowQuestionGrid(false)} 
                    aria-label="Close question grid"
                    className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all shadow-xl"
                  >
                    ✕
                  </button>
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest text-center mt-12 mb-4">Question Grid</h2>
                  <p className="text-center text-gray-500 text-xs tracking-widest uppercase mb-12">
                     {gameState.isTestMode ? "Tap a number to jump to question" : "Live attempt status"}
                  </p>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 max-w-4xl mx-auto w-full mb-12">
                    {Array.from({ length: gameState.totalQuestions }).map((_, i) => {
                      const status = gameState.answers[i];
                      let stateColorClass = 'bg-[#111827] text-gray-400 border-white/5'; // unattempted
                      
                      if (gameState.isTestMode) {
                        if (status === 'skipped') stateColorClass = 'bg-pink-500/20 text-pink-400 border-pink-500/30';
                        else if (status !== undefined) stateColorClass = 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]'; // Answered
                      } else {
                        // Practice mode
                        if (status !== undefined && status !== 'skipped') {
                           const q = gameState.questions[i].question;
                           const isCorrect = String(status).trim() === String(q.answer).trim();
                           stateColorClass = isCorrect ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30';
                        }
                      }
  
                      return (
                        <button 
                          key={i}
                          onClick={() => {
                            if (gameState.isTestMode) {
                              goToQuestion(i);
                              setShowQuestionGrid(false);
                            }
                          }}
                          disabled={!gameState.isTestMode}
                          className={`aspect-square flex items-center justify-center rounded-xl border-2 text-sm md:text-base font-bold transition-all ${gameState.currentIndex === i ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110 z-10 shadow-2xl' : ''} ${stateColorClass} ${gameState.isTestMode ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-widest text-gray-500 mt-auto">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#111827] border border-white/10" /> Unattempted</div>
                    {gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-600 border border-blue-400" /> Answered</div>}
                    {gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-pink-500/20 border border-pink-500/30" /> Skipped</div>}
                    {!gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" /> Correct</div>}
                    {!gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" /> Wrong</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
            className="w-full max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col"
          >
            {(() => {
              const derivedHistory = gameState.questions.map((gq, i) => {
                 const userSelection = gameState.answers[i] || 'skipped';
                 const isCorrect = userSelection !== 'skipped' && String(userSelection).trim() === String(gq.question.answer).trim();
                 return { question: gq.question, userSelection, isCorrect };
              });
              const correctCount = derivedHistory.filter(h => h.isCorrect).length;
              const accuracy = Math.round((correctCount / gameState.totalQuestions) * 100);

              return (
                <>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-2 text-center drop-shadow-lg">ELITE<br />RESULTS.</h2>
                  <p className="text-blue-400 text-center text-sm tracking-[0.3em] font-bold uppercase mb-16">
                    "{
                      accuracy === 100 ? "Flawless precision. Pure mastery." :
                      accuracy >= 90 ? "Almost perfect. Sharp focus." :
                      accuracy >= 75 ? "Great run. Refine for perfection." :
                      accuracy >= 50 ? "Good ground covered. Keep scaling." :
                      "Growth happens at the edge of failure."
                    }"
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
                    <ResultMetric label="Accuracy" value={`${accuracy}%`} icon={<Target className="w-5 h-5 text-emerald-400" />} />
                    <ResultMetric label="Score" value={`${correctCount}/${gameState.totalQuestions}`} icon={<Trophy className="w-5 h-5 text-amber-400" />} />
                    <ResultMetric label="Time" value={`${Math.floor((gameState.endTime! - gameState.startTime) / 1000)}s`} icon={<Timer className="w-5 h-5 text-blue-400" />} />
                    <ResultMetric label="Speed" value={`${(Math.floor((gameState.endTime! - gameState.startTime) / 100) / 10 / gameState.totalQuestions).toFixed(1)}s/q`} icon={<Zap className="w-5 h-5 text-purple-400" />} />
                  </div>

                  <div className="flex-1 space-y-4 mb-16 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Detailed Analysis</h3>
                    </div>
                    {derivedHistory.map((h, i) => (
                      <div key={i} className={`p-4 md:p-6 rounded-2xl border flex justify-between items-center transition-all hover:scale-[1.01] ${h.isCorrect ? 'bg-[#111827] border-emerald-500/30 border-l-4 border-l-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.05)]' : 'bg-[#111827] border-red-500/30 border-l-4 border-l-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.05)]'}`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Question {i + 1}</span>
                          <span className="text-xl md:text-2xl font-black text-white">{h.question.expression}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Your Answer</div>
                            <div className={`font-black text-lg ${h.isCorrect ? 'text-emerald-400' : 'text-red-400 opacity-80'}`}>
                              {h.userSelection === 'skipped' ? 'Skipped' : h.userSelection}
                            </div>
                          </div>
                          {!h.isCorrect && (
                            <div className="text-right pl-6 border-l w-24 border-white/10">
                              <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Correct</div>
                              <div className="font-black text-emerald-400 text-lg">{h.question.answer}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-auto">
                    <button 
                      onClick={resetGame}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-500 text-white py-5 rounded-full font-bold uppercase tracking-widest text-sm hover:from-blue-500 hover:to-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)] md:shadow-[0_0_40px_rgba(59,130,246,0.5)] group relative cursor-pointer"
                    >
                      Restart <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      <span className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 text-[10px] text-white/50 tracking-widest uppercase">
                        Press [Enter]
                      </span>
                    </button>
                    <button 
                      onClick={() => handleGlobalShare({
                        accuracy,
                        score: correctCount,
                        total: gameState.totalQuestions,
                        speed: ((Math.floor((gameState.endTime! - gameState.startTime) / 100) / 10) / gameState.totalQuestions).toFixed(1)
                      })}
                      className="w-14 md:w-16 flex items-center justify-center bg-white/10 text-emerald-400 rounded-full hover:bg-white/20 transition-all active:scale-95 border border-white/5 shadow-lg"
                    >
                      <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="sr-only">Share result</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {screen === 'about' && (
          <motion.div 
            key="about"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-3xl mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 w-max -ml-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-12 text-white">Developers.</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DevCard name="ABDUL HAQUE" role="Design Lead & Architect" bio="Passionate developer creating innovative educational tools for the modern age." />
              <DevCard name="SAAD" role="Experience Developer" bio="Focused on high-performance interactive experiences and premium UI systems." />
            </div>

            <div className="mt-8 p-6 md:p-8 bg-[#111827] border border-white/5 rounded-[32px] hover:border-emerald-500/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-white tracking-tight mb-2">Get in Touch</h3>
                  <p className="text-gray-400 text-sm md:text-base mb-4 max-w-lg leading-relaxed">
                    Please let us know your experience, any feature requests, or just drop by to say hi! We are constantly looking to improve the Arena and build the ultimate math training tool.
                  </p>
                  <a href="mailto:numboostarenaofficial@gmail.com" className="inline-flex items-center gap-2 text-emerald-400 font-bold tracking-wide hover:text-emerald-300 transition-colors bg-emerald-500/10 px-4 py-2 rounded-xl text-sm md:text-base break-all">
                    numboostarenaofficial@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-12 p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-blue-900 to-emerald-900 text-white relative overflow-hidden group shadow-2xl border border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 group-hover:scale-110 transition-transform">
                <Zap className="w-40 h-40 md:w-64 md:h-64 fill-white/20" />
              </div>
              <h3 className="text-3xl md:text-5xl font-black mb-2">Stay Elite.</h3>
              <p className="text-blue-100/80 text-base leading-relaxed mb-6 md:mb-10 max-w-[300px] md:max-w-md">NumBoost Arena is built for those who never stop learning.</p>
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"><Share2 onClick={() => handleGlobalShare()} className="w-5 h-5 text-emerald-400" /></div>
                <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"><Heart className="w-5 h-5 text-blue-400" /></div>
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
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="group w-full p-6 bg-gradient-to-br from-white/5 to-[#0F1626] border border-white/5 rounded-2xl text-left flex items-center gap-5 transition-all hover:bg-white/10 hover:border-white/10 hover:shadow-[0_10px_30px_rgba(255,255,255,0.03)] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className={`p-4 rounded-xl transition-colors ${accentClasses[accent]} bg-white/5 text-gray-400 relative z-10`}>
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
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="p-5 bg-gradient-to-br from-[#111827] to-[#0A0F16] border border-white/5 rounded-2xl text-sm font-bold text-gray-400 hover:text-blue-400 hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all flex items-center justify-between group overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative z-10">{name}</span>
      <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 text-blue-400 relative z-10" />
    </motion.button>
  );
}

function DifficultyCard({ level, onClick, selected }: { level: Difficulty; onClick: () => void; selected?: boolean; key?: React.Key }) {
  const descMap: any = {
    Beginner: "Single digits, simple logic",
    Intermediate: "Double digits, focused math",
    Advanced: "Multi-digit, competitive pace",
    Expert: "The ultimate arithmetic test"
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`relative overflow-hidden w-full p-6 text-left rounded-2xl border transition-all duration-300 group ${selected ? 'bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500 shadow-[0_10px_40px_rgba(59,130,246,0.25)]' : 'border-white/5 bg-[#111827] hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]'}`}
    >
      {!selected && <div className="absolute inset-0 bg-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
      <div className="flex justify-between items-center mb-1 relative z-10">
        <span className={`text-xl font-black uppercase tracking-tight transition-colors ${selected ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>
          {level} {diffEmojis[level]}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: ['Beginner', 'Intermediate', 'Advanced', 'Expert'].indexOf(level) + 1 }).map((_, i) => (
            <div key={i} className={`w-1.5 h-3 rounded-[1px] ${selected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
          ))}
        </div>
      </div>
      <p className={`text-xs ${selected ? 'text-blue-200' : 'text-gray-500'}`}>{descMap[level]}</p>
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
