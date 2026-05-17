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
  Mail,
  LogIn,
  LogOut,
  User as UserIcon,
  Camera,
  Sun,
  Moon,
  Laptop,
  RefreshCw,
  Eye,
  EyeOff,
  ClipboardCheck
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';
import { generateQuestion, Difficulty, Question, shuffleArray, generateSmartDecoys } from './lib/mathEngine';
import { jsPDF } from 'jspdf';
import { playClick, playCorrect, playWrong, playNumpad } from './lib/audioEngine';
import { useAuth, getCurrentWeekId } from './lib/AuthContext';

type Screen = 'home' | 'categories' | 'subcategories' | 'setup' | 'game' | 'results' | 'custom' | 'about' | 'profile' | 'leaderboard' | 'menu';

const MPointBadge = ({ points, size = 'md', className = '' }: { points: number, size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm'
  };
  return (
    <div className={`flex items-center gap-2 group ${className}`} title={`${points} M-Points`}>
      <div className={`relative ${sizeClasses[size]} rounded-full bg-emerald-400 dark:bg-emerald-500 flex items-center justify-center text-emerald-950 font-black shadow-sm border border-emerald-300 dark:border-emerald-400 overflow-hidden shrink-0 transform transition-transform group-hover:scale-110 group-hover:rotate-12`}>
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full duration-[1.5s] ease-in-out transition-transform" />
         <span className="drop-shadow-sm">M</span>
      </div>
      <span className="font-extrabold text-slate-900 dark:text-gray-100 tracking-tight drop-shadow-sm group-hover:text-emerald-500 transition-colors">
        {points % 1 !== 0 ? points.toFixed(2) : points}
      </span>
    </div>
  );
};

export interface ActiveCategory {
  name: string;
  difficulty?: Difficulty;
  customRange?: { start: number | ''; end: number | '' };
}

interface GameState {
  categories: ActiveCategory[];
  isTestMode: boolean;
  score: number;
  sessionPoints: number;
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
  const cleanError = (err: string) => {
    if (!err) return '';
    if (err.includes('auth/missing-password')) return 'Please enter a password';
    if (err.includes('auth/missing-email')) return 'Please enter your email';
    if (err.includes('auth/invalid-credential') || err.includes('auth/wrong-password')) return 'Wrong email or password';
    if (err.includes('auth/user-not-found')) return 'User not found';
    if (err.includes('auth/email-already-in-use')) return 'Email already in use';
    if (err.includes('auth/weak-password')) return 'Password must be at least 6 characters';
    if (err.includes('auth/invalid-email')) return 'Invalid email address';
    return err.replace(/Firebase:?\s*/ig, '').replace(/\((auth|firestore)\/[^)]+\)\.?/ig, '').replace(/^Error:?\s*/i, '').trim() || 'An unexpected error occurred.';
  };
  const { user, profile, logout, addPoints, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, updateProfileData, resetPassword, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<(number | string)[]>([]);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; show: boolean }>({ isCorrect: false, show: false });
  const [earnedMPoints, setEarnedMPoints] = useState<number>(0);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as any) || 'system';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const [emailMode, setEmailMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Persistence logic
  useEffect(() => {
    const savedState = localStorage.getItem('numboost_game_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            // Only restore if it was a test mode and context still seems valid (e.g. today)
            // We'll trust the saved state for now.
            setGameState(parsed);
            if (parsed.currentIndex !== undefined) {
               setCurrentQuestion(parsed.questions[parsed.currentIndex].question);
               setOptions(parsed.questions[parsed.currentIndex].options as any);
               setScreen('game');
            }
        } catch (e) {
            console.error("Failed to restore game state", e);
            localStorage.removeItem('numboost_game_state');
        }
    }
  }, []);

  useEffect(() => {
    if (gameState && gameState.isTestMode && !gameState.endTime) {
        localStorage.setItem('numboost_game_state', JSON.stringify(gameState));
    } else if (!gameState || gameState.endTime) {
        localStorage.removeItem('numboost_game_state');
    }
  }, [gameState]);

  useEffect(() => {
    if (screen === 'profile' && profile) {
      setEditProfileName(profile.displayName || '');
      setEditProfileImage(profile.photoURL || null);
    }
  }, [screen, profile]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [gameMode, setGameMode] = useState<'mcq' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [showManualInfo, setShowManualInfo] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRandomAllInfo, setShowRandomAllInfo] = useState(false);
  const [showCustomRandomInfo, setShowCustomRandomInfo] = useState(false);
  const [showRangeInfo, setShowRangeInfo] = useState(false);
  const [showLeaderboardInfo, setShowLeaderboardInfo] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isFetchingLB, setIsFetchingLB] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!loading) {
      const hasSeen = localStorage.getItem('hasSeenAuthModal');
      if (!user && !hasCheckedAuth && !hasSeen) {
        setShowAuthModal(true);
        localStorage.setItem('hasSeenAuthModal', 'true');
      }
      setHasCheckedAuth(true);
    }
  }, [user, loading, hasCheckedAuth]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      if (theme === 'system') {
         if (mediaQuery.matches) {
           root.classList.add('dark');
         } else {
           root.classList.remove('dark');
         }
      } else if (theme === 'dark') {
         root.classList.add('dark');
      } else {
         root.classList.remove('dark');
      }
    };
    
    applyTheme();
    localStorage.setItem('theme', theme);
    
    const listener = () => {
       if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (screen === 'leaderboard') {
       const fetchLB = async () => {
         setIsFetchingLB(true);
         try {
           const currentWeekId = getCurrentWeekId();
           const q = query(collection(db, 'users'), orderBy('weeklyMPoints', 'desc'), limit(100));
           const snap = await getDocs(q);
           let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           data = data.filter((u: any) => !u.isGuest).map((u: any) => ({
             ...u,
             effectivePoints: u.currentWeekId === currentWeekId ? (u.weeklyMPoints || 0) : 0
           })).sort((a: any, b: any) => b.effectivePoints - a.effectivePoints);
           setLeaderboard(data);
         } catch(e: any) {
           console.error('fetchLB error:', e.message);
         } finally {
           setIsFetchingLB(false);
         }
       };
       fetchLB();
    }
  }, [screen]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (!target.closest('.info-popup-content') && !target.closest('.info-popup-trigger')) {
        setShowMenu(false);
        setShowManualInfo(false);
        setShowRandomAllInfo(false);
        setShowCustomRandomInfo(false);
        setShowRangeInfo(false);
        setShowLeaderboardInfo(false);
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
    <div className="bg-white dark:bg-[#111827] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl mb-6 flex flex-row items-stretch shadow-xl w-full max-w-sm mx-auto">
      <div className="w-[45%] flex flex-col justify-center p-3 border-r border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex flex-shrink-0 items-center justify-center text-blue-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-gray-200 leading-tight">Input<br/>Mode</h3>
            <p className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-gray-500 mt-0.5">How to answer</p>
          </div>
        </div>
      </div>
      
      <div className="w-[55%] bg-black/5 dark:bg-black/40 relative flex flex-col rounded-r-2xl overflow-hidden info-popup-trigger">
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
          className={`relative z-10 w-full flex-1 min-h-[44px] text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center border-b border-slate-200 dark:border-white/10 ${gameMode === 'mcq' ? 'text-slate-900 dark:text-gray-100' : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:text-gray-300'}`}
        >
          Options
        </button>
        <button 
          onClick={() => setGameMode('manual')}
          className={`relative z-10 w-full flex-1 min-h-[44px] text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2 ${gameMode === 'manual' ? 'text-slate-900 dark:text-gray-100' : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:text-gray-300'}`}
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
          <div className="info-popup-content absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#111827] bg-slate-50 dark:bg-[#0A0F16] text-xs text-slate-700 dark:text-gray-300 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl z-50 text-center normal-case tracking-normal">
            Type exact answers manually using keyboard. Perfect for rigorous training.
          </div>
        )}
      </div>
    </div>
  );

  const toggleCustomCategory = (cat: string) => {
    // Encode Decimals/Fractions as Mix by default
    // Saved as `${cat}-Mix` for engine compatibility
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
        } while (attempts < 50 && questions.some(existing => existing.question.expression === q.expression));
        
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
        sessionPoints: 0,
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
      // Update the dictionary structure with user's answer segment
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
          triggerEndGame(nextState);
        } else {
          goToQuestion(nextState.currentIndex + 1, nextState);
          setIsProcessing(false);
        }
      }, 600);
    }
  };

  const triggerEndGame = async (finalState: GameState) => {
    finalState.endTime = Date.now();
    let computedPoints = 0;
    finalState.questions.forEach((q, i) => {
       const userAns = finalState.answers[i];
       const isCorrect = userAns !== undefined && userAns !== 'skipped' && String(userAns).trim() === String(q.question.answer).trim();
       if (isCorrect) {
          let pts = q.question.points || 1;
          if (q.question.category && q.question.category.toLowerCase().includes('fraction')) {
             pts *= 2;
          }
          if (!q.question.category && finalState.categories.some(c => c.name.toLowerCase().includes('fraction'))) { // edge case where category is absent but setup uses fraction
             pts *= 2; 
          }
          computedPoints += pts;
       }
    });

    finalState.sessionPoints = computedPoints;
    setGameState(finalState);
    if (computedPoints > 0 && profile && !profile.isGuest) {
       try {
         const res = await addPoints(computedPoints);
         setEarnedMPoints(res.mPointsEarned);
       } catch (err) {
         console.error('Failed to add points', err);
         setEarnedMPoints(0);
       }
    } else {
       setEarnedMPoints(computedPoints > 0 ? computedPoints : 0);
    }
    setScreen('results');
    setIsProcessing(false);
  };

  const skipQuestion = () => {
    if (!gameState || isProcessing) return;
    
    // Only Test Mode allows skipping.
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
    setShowReviewModal(true);
  };

  const confirmSubmitTest = () => {
    if (!gameState) return;
    setShowReviewModal(false);
    triggerEndGame({ ...gameState });
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
          document.text("This practice sheet created by numboostarena.netlify.app", 105, 287, { align: "center" });
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
    <div className="min-h-[100dvh] bg-[#FAFAFA] dark:bg-[#0A0F16] text-slate-900 dark:text-gray-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-hidden relative">
      {/* Immersive Background Blur Elements - Global */}
      <div className="fixed top-[-10%] left-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#10b981]/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none dark:hidden"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#10b981]/10 dark:bg-emerald-600/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none dark:hidden"></div>

      {/* Theme Toggle - Top Left */}
      <AnimatePresence>
      {screen === 'home' && (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-4 left-5 md:top-8 md:left-12 z-[100] flex items-center"
      >
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 md:p-4 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:bg-[#0A0F16] dark:hover:bg-white dark:bg-[#111827]/5 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-md shadow-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:text-gray-100 dark:hover:text-white transition-all active:scale-95"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-[#10b981]" /> : <Moon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />}
        </button>
      </motion.div>
      )}
      </AnimatePresence>

        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/50 dark:bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative"
            >
               <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Review Test</h2>
                <p className="text-slate-500 dark:text-gray-400 text-xs mt-1 font-medium">Verify your progress before final submission.</p>
               </div>

               <div className="space-y-3 mb-8">
                 <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">Attempted</span>
                    <span className="text-blue-900 dark:text-blue-200 font-black text-lg">
                      {Object.values(gameState?.answers || {}).filter(a => a !== 'skipped' && a !== '').length}
                    </span>
                 </div>
                 <div className="flex justify-between items-center bg-pink-50 dark:bg-pink-500/10 p-4 rounded-2xl border border-pink-100 dark:border-pink-500/20">
                    <span className="text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-widest">Skipped</span>
                    <span className="text-pink-900 dark:text-pink-200 font-black text-lg">
                      {Object.values(gameState?.answers || {}).filter(a => a === 'skipped').length}
                    </span>
                 </div>
                 <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">Remaining</span>
                    <span className="text-slate-900 dark:text-gray-100 font-black text-lg">
                      {(gameState?.totalQuestions || 0) - Object.keys(gameState?.answers || {}).length}
                    </span>
                 </div>
               </div>

               <div className="flex gap-4">
                 <button 
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest text-xs"
                 >
                  Back to Test
                 </button>
                 <button 
                  onClick={confirmSubmitTest}
                  className="flex-1 py-4 rounded-2xl bg-[#10b981] text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-widest text-xs"
                 >
                  Submit Final
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 dark:bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-500 dark:text-gray-500 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Close auth modal"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="text-center mb-8 mt-2">
                <div className="w-20 h-20 bg-[#10b981] rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-gray-100 mb-2">Welcome!</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">Sign in to track progress and climb the leaderboard or play as a guest.</p>
              </div>

              {!emailMode ? (
                <div className="space-y-4">
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      if (authLoading) return;
                      setAuthLoading(true);
                      setAuthError('');
                      try { await signInWithGoogle(); setScreen('home'); setShowAuthModal(false); } catch(e: any) { setAuthError(cleanError(e.message)); } finally { setAuthLoading(false); }
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-[#0A0F16] dark:bg-[#0A0F1A] hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-900 dark:text-gray-100 rounded-2xl font-bold transition-all border border-slate-900/10 border-slate-200 dark:border-white/10 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#4CAF50" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBC02D" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#E53935" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                  <button
                    onClick={() => setEmailMode(true)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-[#0A0F16] dark:bg-[#0A0F1A] hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-900 dark:text-gray-100 rounded-2xl font-bold transition-all border border-slate-900/10 border-slate-200 dark:border-white/10 shadow-sm active:scale-95"
                  >
                    Continue with Email
                  </button>
                  <div className="flex items-center gap-4 py-2 opacity-50">
                    <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                    <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">or</span>
                    <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                  </div>
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      if (authLoading) return;
                      setAuthLoading(true);
                      setAuthError('');
                      try { await signInAsGuest(); setScreen('home'); setShowAuthModal(false); } catch(e: any) { setAuthError(cleanError(e.message)); } finally { setAuthLoading(false); }
                    }}
                    className="w-full py-4 bg-slate-900 dark:bg-white dark:bg-[#111827] text-white dark:text-slate-900 dark:text-gray-100 hover:bg-slate-800 dark:hover:bg-slate-100 dark:bg-gray-800 rounded-2xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Play as Guest
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-left w-full">
                  {authError && <p className="text-red-500 text-[13px] text-center font-bold">{authError}</p>}
                  {isSignUp && (
                    <input 
                      type="text" 
                      placeholder="Display Name" 
                      value={nameInput} 
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#111827]/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-[#10b981] transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/20"
                    />
                  )}
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A0F16] dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all font-bold"
                  />
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="Password" 
                      value={passInput} 
                      onChange={(e) => setPassInput(e.target.value)}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A0F16] dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all font-bold pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      if (authLoading) return;
                      setAuthLoading(true);
                      setAuthError('');
                      try {
                        const trimmedEmail = emailInput.trim();
                        if (isSignUp) {
                          await signUpWithEmail(trimmedEmail, passInput, nameInput.trim());
                        } else {
                          await signInWithEmail(trimmedEmail, passInput);
                        }
                        setScreen('home');
                        setShowAuthModal(false);
                      } catch (err: any) {
                        setAuthError(cleanError(err.message));
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="w-full py-4 bg-[#10b981] hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {authLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                  </button>
                  
                  {!isSignUp && (
                    <button
                      onClick={async () => {
                        if (!emailInput) { setAuthError('Enter your email first to reset password'); return; }
                        try {
                          await resetPassword(emailInput);
                          setAuthError('Password reset email sent! Check your inbox and spam folder.');
                        } catch (err: any) {
                          setAuthError(cleanError(err.message));
                        }
                      }}
                      className="w-full text-[#10b981] hover:text-blue-600 font-bold transition-colors text-xs text-right"
                    >
                      Forgot password?
                    </button>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <button onClick={() => { setEmailMode(false); setAuthError(''); }} className="text-slate-500 text-slate-600 dark:text-gray-400 text-sm hover:text-slate-900 dark:text-gray-100 dark:hover:text-white font-bold transition-colors">← Back</button>
                    <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-[#10b981] text-sm font-bold hover:text-blue-400 transition-colors">
                      {isSignUp ? 'Already have an account?' : 'Create an account'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, y: 50, scale: 0.95 }}
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white dark:bg-[#111827] border border-[#10b981]/30 text-slate-900 dark:text-gray-100 px-5 py-4 rounded-2xl text-sm font-medium shadow-sm z-[100] flex items-start gap-4 backdrop-blur-xl"
          >
            <Info className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, y: -20 }}
            className="min-h-[100dvh] bg-slate-50 dark:bg-[#0A0F16] w-full max-w-6xl mx-auto px-5 lg:px-12 py-6 md:py-0 flex flex-col md:flex-row relative items-center justify-center gap-6 md:gap-10 lg:gap-16"
          >
            <div className="absolute top-4 right-5 md:top-8 md:right-12 flex flex-col items-end gap-2 z-50">
              <button 
                onClick={() => setScreen('menu')}
                aria-label="Open menu"
                className="bg-slate-100 dark:bg-[#111827]/5 hover:bg-slate-100 dark:bg-[#111827]/10 transition-colors border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-slate-700 dark:text-gray-300 flex items-center justify-center backdrop-blur-md shadow-sm"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <header className="w-full md:w-1/2 flex flex-col md:pr-10 lg:pr-16 text-center md:text-left mt-[2vh] md:mt-0">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center md:justify-start gap-3 mb-3 md:mb-6"
              >
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-[#10b981] fill-[#10b981]" />
                <span className="text-[#10b981] text-xs md:text-sm font-bold tracking-[0.2em] uppercase">Arena Engine</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] mb-3 md:mb-6 text-slate-900 dark:text-white uppercase"
              >
                NUMBOOST<br />ARENA
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 dark:text-gray-400 text-xs md:text-sm tracking-widest uppercase mb-6 md:mb-12 max-w-sm mx-auto md:mx-0"
              >
                Master speed and accuracy with adaptive challenges. Designed for flow state.
              </motion.p>
            </header>

            <div className="w-full md:w-1/2 flex flex-col gap-3 md:gap-5">
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

        {screen === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-4xl mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 w-max -ml-2 hover:bg-slate-100 dark:hover:bg-white dark:bg-[#111827]/10 rounded-full text-slate-600 dark:text-gray-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8 text-slate-900 dark:text-gray-100 flex items-center gap-3">
              Options
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <button onClick={() => setScreen('profile')} className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-4 md:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111827]/5 flex items-center justify-center text-slate-700 dark:text-gray-300">
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-gray-200 uppercase tracking-widest text-sm">Profile</span>
              </button>

              <button onClick={() => setScreen('leaderboard')} className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-4 md:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111827]/5 flex items-center justify-center text-emerald-500">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-gray-200 uppercase tracking-widest text-sm">Leaderboard</span>
              </button>

              <button onClick={() => setScreen('about')} className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-4 md:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111827]/5 flex items-center justify-center text-[#10b981]">
                  <Info className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-gray-200 uppercase tracking-widest text-sm">About</span>
              </button>
              
              <button onClick={() => handleDownloadApp()} className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-4 md:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111827]/5 flex items-center justify-center text-[#10b981]">
                  <Download className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-gray-200 uppercase tracking-widest text-sm">Install App</span>
              </button>

              <button onClick={() => handleGlobalShare()} className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-4 md:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111827]/5 flex items-center justify-center text-purple-500">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800 dark:text-gray-200 uppercase tracking-widest text-xs">Share</span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'custom' && (
          <motion.div 
            key="custom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-slate-100 dark:bg-[#111827]/5 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full transition-all active:scale-90 text-slate-600 dark:text-gray-400">
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
                          customConfig[(pillar.id === 'Decimals' || pillar.id === 'Fractions') ? `${pillar.id}-Mix` : pillar.id] ? 'bg-[#10b981] dark:bg-[#10b981] text-slate-900 dark:text-gray-100 font-bold dark:text-white border-blue-400 dark:border-blue-400 shadow-lg' : 'bg-slate-100 dark:bg-[#111827]/5 text-slate-600 dark:text-gray-400 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:bg-[#111827]/10'
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
                      className={`col-span-2 md:col-span-3 p-4 rounded-xl border text-[13px] md:text-base uppercase tracking-widest font-black transition-all relative shadow-sm ${
                        customConfig['Random'] ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-100 text-purple-600 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex w-full items-center justify-center gap-2">
                        Random (All Categories) {customConfig['Random'] && '✓'}
                      </div>
                      
                      <div 
                        onClick={(e) => { e.stopPropagation(); setShowCustomRandomInfo(!showCustomRandomInfo); }}
                        className="info-popup-trigger absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-current opacity-70 hover:opacity-100 flex items-center justify-center text-xs font-black cursor-pointer"
                      >
                        !
                        {showCustomRandomInfo && (
                          <div className="info-popup-content absolute bottom-full right-0 mb-3 w-48 p-3 bg-white dark:bg-[#111827] bg-slate-50 dark:bg-[#0A0F16] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-gray-300 rounded-lg shadow-xl z-30 normal-case tracking-normal">
                            Includes questions from every arithmetic category.
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2 mt-2">3. Test Timer</h3>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                    <label className="flex items-center justify-between cursor-pointer mb-4">
                      <span className="text-sm font-bold text-slate-700 dark:text-gray-300">Enable Time Limit</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={customUseTimer}
                          onChange={(e) => setCustomUseTimer(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-100 dark:bg-[#111827]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#111827] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 hover:bg-slate-200 dark:bg-[#111827]/20"></div>
                      </div>
                    </label>
                    
                    {customUseTimer && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1 block">Hours</label>
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
                            className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-gray-100 font-bold outline-none focus:border-blue-500/50 transition-colors text-center" 
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1 block">Minutes</label>
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
                            className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-gray-100 font-bold outline-none focus:border-blue-500/50 transition-colors text-center" 
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
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[#10b981] mb-4 px-2">2. Difficulty Level</h3>
                    <div className="space-y-3">
                      {Object.values(customConfig).map((config: ActiveCategory) => {
                        const isRange = ['Tables', 'Squares', 'Cubes', 'Roots'].includes(config.name);
                        return (
                          <div key={config.name} className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl">
                            <div className="font-bold text-slate-900 dark:text-gray-100 mb-3 text-sm">{getCatLabel(config.name)}</div>
                            {isRange ? (
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1 block">Start</label>
                                  <input type="number" 
                                    className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-gray-100 font-bold outline-none focus:border-[#10b981]/50 transition-colors" 
                                    value={config.customRange?.start === '' ? '' : (config.customRange?.start ?? '')}
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      updateCustomCategory(config.name, { customRange: { ...config.customRange!, start: isNaN(val) ? '' : val } });
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1 block">End</label>
                                  <input type="number" 
                                    className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-gray-100 font-bold outline-none focus:border-[#10b981]/50 transition-colors" 
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
                                        config.difficulty === diff ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 shadow-inner' : 'bg-black/5 dark:bg-black/30 text-slate-500 dark:text-gray-500 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:border-white/20'
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
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center text-slate-500 dark:text-gray-500 text-sm">
                    Select pillars to configure custom parameters.
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mb-4 px-2">4. Question Volume</h3>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-2 flex items-center shadow-inner">
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
                      className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-gray-100 outline-none text-center p-3"
                    />
                  </div>
                </div>

                <InputToggle />

                <div className="flex flex-col md:flex-row gap-3 mt-auto pt-8">
                  <button 
                    disabled={Object.keys(customConfig).length === 0 || !customVolume || isGeneratingPDF}
                    onClick={downloadCustomPDF}
                    className="flex-1 bg-slate-100 dark:bg-[#111827]/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-100 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-slate-100 dark:bg-[#111827]/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isGeneratingPDF ? 'Generating...' : <><Download className="w-4 h-4" /> Export PDF</>}
                  </button>

                  <button 
                    disabled={Object.keys(customConfig).length === 0 || !customVolume}
                    onClick={() => {
                      initGameState(Object.values(customConfig), customVolume, true);
                    }}
                    className="flex-[2] bg-[#10b981] dark:bg-[#10b981] text-white py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-blue-500 dark:hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-sm dark:shadow-sm md:shadow-sm"
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
            animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-slate-100 dark:bg-[#111827]/5 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full transition-all active:scale-90 text-slate-600 dark:text-gray-400">
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
                  className="w-full h-full p-5 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 rounded-2xl border-none flex items-center justify-between text-sm font-bold transition-all overflow-hidden relative peer"
                >
                  <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 relative z-10 w-full justify-center">
                     <span className="font-extrabold tracking-widest uppercase text-white drop-shadow-md">RANDOM (ALL)</span>
                     <Zap className="w-5 h-5 text-purple-200 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 absolute right-0" />
                  </div>
                </motion.button>
                  <div className="absolute -top-3 -right-2 z-50">
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowRandomAllInfo(!showRandomAllInfo); }}
                    className="info-popup-trigger w-6 h-6 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:text-gray-100 hover:bg-slate-100 dark:bg-[#111827]/5 cursor-pointer shadow-md transition-all active:scale-90 relative"
                  >
                    !
                    {showRandomAllInfo && (
                      <div className="info-popup-content absolute top-8 right-0 md:bottom-full md:top-auto md:mb-2 w-48 p-3 bg-white dark:bg-[#111827] bg-slate-50 dark:bg-[#0A0F16] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-gray-300 rounded-xl shadow-2xl z-50 font-sans pointer-events-none transition-all normal-case tracking-normal">
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
            animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-xl mx-auto px-6 py-12"
          >
            <button onClick={() => setScreen('categories')} aria-label="Go back" className="mb-8 p-2 -ml-2 bg-slate-100 dark:bg-[#111827]/5 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full transition-all active:scale-90 text-slate-600 dark:text-gray-400">
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
            animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-xl mx-auto px-4 py-8 md:py-12"
          >
            <button onClick={() => {
              if (practiceSetupStep === 2) setPracticeSetupStep(1);
              else { setScreen(practiceCat.includes('-') ? 'subcategories' : 'categories'); setShowSubcategoriesFor(''); }
            }} aria-label="Go back" className="mb-6 p-2 -ml-2 bg-slate-100 dark:bg-[#111827]/5 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full transition-all active:scale-90 text-slate-600 dark:text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center uppercase text-slate-900 dark:text-gray-100">
              {practiceSetupStep === 1 ? 'Select Level' : 'Set Volume'}
            </h2>
            <p className="text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-white/10 w-fit mx-auto px-3 py-1 rounded-full text-center text-xs md:text-xs tracking-widest font-bold uppercase mb-8">
               {getCatLabel(practiceCat)}
            </p>
            
            {practiceSetupStep === 1 && (
              <>
                {['Tables', 'Squares', 'Cubes', 'Roots'].includes(practiceCat) ? (
                  <div className="mb-6 space-y-4 bg-white dark:bg-[#111827] backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl">
                    <div className="flex flex-col items-center justify-center gap-2 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-gray-300">Number Range</h3>
                      <button 
                        onClick={() => setShowRangeInfo(!showRangeInfo)}
                        className="info-popup-trigger flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:text-gray-300 transition-colors"
                      >
                        <div className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">i</div>
                        <span>Info</span>
                      </button>
                      
                      {showRangeInfo && (
                        <div className="info-popup-content w-full p-3 bg-gray-800/50 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-gray-400 rounded-lg text-center leading-relaxed mt-2">
                          Define the start and end values for the numbers. Questions will be generated exclusively within this specified range.
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase ml-1 mb-1 block">Start Value</label>
                        <input 
                          type="number" 
                          value={practiceConfig.range.start === '' ? '' : (practiceConfig.range.start ?? '')}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setPracticeConfig({...practiceConfig, range: {...practiceConfig.range, start: isNaN(val) ? '' : val}});
                          }}
                          className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-gray-100 focus:border-gray-500 outline-none text-center font-bold"
                          placeholder="Ex: 1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase ml-1 mb-1 block">End Value</label>
                        <input 
                          type="number" 
                          value={practiceConfig.range.end === '' ? '' : (practiceConfig.range.end ?? '')}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setPracticeConfig({...practiceConfig, range: {...practiceConfig.range, end: isNaN(val) ? '' : val}});
                          }}
                          className="w-full bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-gray-100 focus:border-gray-500 outline-none text-center font-bold"
                          placeholder="Ex: 10"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setPracticeSetupStep(2)}
                      disabled={practiceConfig.range.start === '' || practiceConfig.range.end === ''}
                      className="w-full mt-4 bg-slate-100 dark:bg-[#111827]/10 hover:bg-slate-200 dark:bg-[#111827]/20 text-slate-900 dark:text-gray-100 font-bold text-sm py-4 rounded-xl uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
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
                <div className="bg-white dark:bg-[#111827] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-gray-300 mb-4 text-center">Total Questions</h3>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-2 flex items-center mb-6 shadow-inner">
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
                      className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-gray-100 outline-none text-center p-3"
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
                    className="w-full mt-6 bg-[#10b981] text-white font-bold text-sm py-4 rounded-xl uppercase tracking-widest hover:bg-blue-500 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30 border border-blue-500/20"
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
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Difficulty Level</span>
                <span className="text-lg md:text-xl font-bold text-slate-900 dark:text-gray-100">
                  {getCatLabel(currentQuestion.category)} {gameState.categories.find(c => c.name === currentQuestion.category)?.difficulty ? diffEmojis[gameState.categories.find(c => c.name === currentQuestion.category)!.difficulty!] : `[${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.start || ''}-${gameState.categories.find(c => c.name === currentQuestion.category)?.customRange?.end || ''}]`}
                </span>
              </div>
              
              {timeRemaining !== null && (
                 <div className="flex flex-col items-center flex-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Time Limit</span>
                    <span className="text-lg md:text-xl font-bold text-emerald-400 tabular-nums">
                       {String(Math.floor(timeRemaining / 3600)).padStart(2, '0')}:{String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                    </span>
                 </div>
              )}

              <div className="flex flex-1 justify-end">
                <button 
                  onClick={() => setShowQuestionGrid(true)}
                  className="flex bg-slate-100 dark:bg-[#111827]/10 rounded-full px-4 py-2 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm text-[#10b981] hover:bg-slate-200 dark:bg-[#111827]/20 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex flex-col items-end">
                      <span className="text-xs md:text-sm font-bold tracking-widest uppercase">
                        Q {gameState.currentIndex + 1} <span className="text-[#10b981]/50">/{gameState.totalQuestions}</span>
                      </span>
                      <span className="text-[8px] tracking-widest uppercase text-slate-900 dark:text-gray-100/50">Tap to view</span>
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
                         gameState.isTestMode && gameState.answers[gameState.currentIndex] === String(opt) ? 'bg-[#10b981] border-blue-400 text-slate-900 dark:text-gray-100 shadow-sm' : 'bg-white dark:bg-[#111827] dark:bg-[#0A0F1A] text-slate-900 dark:text-gray-100 border-slate-200 dark:border-white/10 hover:bg-blue-500/20 hover:border-blue-500/50 active:bg-[#10b981] shadow-inner'
                      }`}
                    >
                      {opt}
                      <span className="hidden md:flex absolute top-3 left-4 text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest group-hover:text-blue-300">
                        [{i + 1}]
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="w-full max-w-md md:max-w-lg mx-auto flex flex-col gap-4 pb-8">
                  <div className="bg-slate-100 dark:bg-[#111827]/20 border border-slate-300 dark:border-white/20 focus-within:border-[#10b981] rounded-3xl p-1 transition-all group flex items-center">
                    <input 
                      type="text" 
                      inputMode="none"
                      className="w-full bg-transparent text-center text-5xl md:text-6xl lg:text-7xl font-black py-4 lg:py-6 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
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
                          ${key === 'GO' ? 'bg-emerald-600 text-slate-900 dark:text-white col-span-2 shadow-sm' : 
                            key === 'DEL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                            ['/', '-', '.'].includes(key) ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-white dark:bg-[#111827] dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-inner hover:bg-slate-100 dark:hover:bg-[#111827]/10'}
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
                     className="py-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 font-bold uppercase tracking-widest text-xs md:text-xs transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 flex items-center justify-center text-center overflow-hidden shadow-inner"
                     style={{ flex: '1', maxWidth: '150px' }}
                   >
                     <motion.span layout="position">
                        PREV
                     </motion.span>
                   </motion.button>
                   
                   <AnimatePresence>
                   {gameState.isTestMode ? (
                      <motion.button 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 0.8 }}
                        layout
                        onClick={submitTest}
                        className="py-4 px-8 rounded-xl bg-[#10b981] dark:bg-[#10b981] hover:bg-blue-500 dark:hover:bg-emerald-400 text-slate-900 dark:text-gray-100 font-bold uppercase tracking-widest text-[12px] md:text-sm transition-all shadow-sm dark:shadow-sm active:scale-95 flex-1 max-w-[300px] flex items-center justify-center"
                      >
                        Submit Test
                      </motion.button>
                   ) : (
                      <motion.div layout className="flex-1" />
                   )}
                   </AnimatePresence>
                   
                   {gameState.currentIndex !== gameState.totalQuestions - 1 && (
                     <motion.button 
                       layout
                       onClick={() => {
                          skipQuestion();
                       }}
                       className="py-4 rounded-xl bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-[#111827]/5 border border-slate-200 dark:border-white/10 text-pink-400 font-bold uppercase tracking-widest text-xs md:text-xs transition-all active:scale-95 flex items-center justify-center text-center overflow-hidden shadow-inner"
                       style={{ flex: '1', maxWidth: '150px' }}
                     >
                       <motion.span layout="position">
                          SKIP
                       </motion.span>
                     </motion.button>
                   )}
                </div>
              )}
            </main>

            {/* Question Navigator Overlay */}
            <AnimatePresence>
              {showQuestionGrid && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex flex-col bg-white/95 dark:bg-black/95 backdrop-blur-sm p-6 md:p-12 overflow-y-auto"
                >
                  <button 
                    onClick={() => setShowQuestionGrid(false)} 
                    aria-label="Close question grid"
                    className="absolute top-6 right-6 p-3 rounded-full bg-slate-100 dark:bg-[#111827]/10 hover:bg-slate-200 dark:bg-[#111827]/20 active:scale-90 text-slate-900 dark:text-gray-100 transition-all shadow-xl"
                  >
                    ✕
                  </button>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-gray-100 uppercase tracking-widest text-center mt-12 mb-4">Question Grid</h2>
                  <p className="text-center text-slate-500 dark:text-gray-500 text-xs tracking-widest uppercase mb-12">
                     {gameState.isTestMode ? "Tap a number to jump to question" : "Live attempt status"}
                  </p>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 max-w-4xl mx-auto w-full mb-12">
                    {Array.from({ length: gameState.totalQuestions }).map((_, i) => {
                      const status = gameState.answers[i];
                      let stateColorClass = 'bg-white dark:bg-[#111827] text-slate-900 dark:text-gray-100 border-slate-200 dark:border-white/10'; // unattempted
                      
                      if (gameState.isTestMode) {
                        if (status === 'skipped') stateColorClass = 'bg-pink-500/20 text-pink-400 border-pink-500/30';
                        else if (status !== undefined) stateColorClass = 'bg-[#10b981] text-slate-900 dark:text-white border-blue-400 shadow-sm'; // Answered
                      } else {
                        // Practice mode
                        if (status !== undefined && status !== 'skipped') {
                           const q = gameState.questions[i].question;
                           const isCorrect = String(status).trim() === String(q.answer).trim();
                           stateColorClass = isCorrect ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' : 'bg-red-500/20 text-red-500 border-red-500/30';
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
                  <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-auto">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10" /> Unattempted</div>
                    {gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#10b981] border border-blue-400" /> Answered</div>}
                    {gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-pink-500/20 border border-pink-500/30" /> Skipped</div>}
                    {!gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#10b981]/20 border border-[#10b981]/30" /> Correct</div>}
                    {!gameState.isTestMode && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" /> Wrong</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {lastResult.show && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-white dark:bg-[#111827] bg-slate-50 dark:bg-[#0A0F16]/60 backdrop-blur-sm"
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

                  <div className="flex flex-col items-center mb-12">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-full inline-flex items-center justify-center">
                       <span className="text-emerald-600 dark:text-emerald-500 font-bold mr-3 text-sm uppercase tracking-widest">+ DEPOSITED</span>
                       <MPointBadge points={earnedMPoints} size="lg" />
                    </div>
                    {(!user || profile?.isGuest) && (
                      <div className="text-xs text-red-500 dark:text-red-400 font-bold tracking-wider mt-4">
                        Login to climb the leaderboard
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
                    <ResultMetric label="Accuracy" value={`${accuracy}%`} icon={<Target className="w-5 h-5 text-[#10b981]" />} />
                    <ResultMetric label="Score" value={`${correctCount}/${gameState.totalQuestions}`} icon={<Trophy className="w-5 h-5 text-emerald-400" />} />
                    <ResultMetric label="Time" value={`${Math.floor((gameState.endTime! - gameState.startTime) / 1000)}s`} icon={<Timer className="w-5 h-5 text-blue-400" />} />
                    <ResultMetric label="Speed" value={`${(Math.floor((gameState.endTime! - gameState.startTime) / 100) / 10 / gameState.totalQuestions).toFixed(1)}s/q`} icon={<Zap className="w-5 h-5 text-purple-400" />} />
                  </div>

                  <div className="flex-1 space-y-4 mb-16 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Detailed Analysis</h3>
                    </div>
                    {derivedHistory.map((h, i) => (
                      <div key={i} className={`p-4 md:p-6 rounded-2xl border flex justify-between items-center transition-all hover:scale-[1.01] ${h.isCorrect ? 'bg-white dark:bg-[#111827] bg-white dark:bg-[#111827] border-[#10b981]/30 border-l-4 border-l-emerald-500 shadow-sm' : 'bg-white dark:bg-[#111827] bg-white dark:bg-[#111827] border-red-500/30 border-l-4 border-l-red-500 shadow-sm'}`}>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1">Question {i + 1}</span>
                          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-gray-100">{h.question.expression}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1">Your Answer</div>
                            <div className={`font-black text-lg ${h.isCorrect ? 'text-[#10b981]' : 'text-red-400 opacity-80'}`}>
                              {h.userSelection === 'skipped' ? 'Skipped' : h.userSelection}
                            </div>
                          </div>
                          {!h.isCorrect && (
                            <div className="text-right pl-6 border-l w-24 border-slate-200 dark:border-white/10">
                              <div className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-1">Correct</div>
                              <div className="font-black text-[#10b981] text-lg">{h.question.answer}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-auto">
                    <button 
                      onClick={resetGame}
                      className="flex-1 bg-[#10b981] dark:bg-[#10b981] text-white py-5 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-blue-500 dark:hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm dark:shadow-sm md:shadow-sm group relative cursor-pointer"
                    >
                      Restart <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      <span className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 text-xs text-slate-900 dark:text-gray-100/50 tracking-widest uppercase">
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
                      className="w-14 md:w-16 flex items-center justify-center bg-slate-100 dark:bg-[#111827]/10 text-[#10b981] rounded-full hover:bg-slate-200 dark:bg-[#111827]/20 transition-all active:scale-95 border border-slate-200 dark:border-white/10 shadow-lg"
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
            animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-3xl mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 w-max -ml-2 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full text-slate-600 dark:text-gray-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-12 text-slate-900 dark:text-gray-100">Developers.</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <DevCard name="ABDUL HAQUE" role="Design Lead & Architect" bio="Passionate developer creating innovative educational tools for the modern age." />
              <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full text-center py-4 md:py-0 pointer-events-none z-10">
                 <span className="bg-white dark:bg-[#111827] dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-[0.2em] text-slate-500 text-slate-600 dark:text-gray-400 shadow-md whitespace-nowrap">
                   🤫 BOTH DEVELOPERS ARE SAME PERSON 🤐
                 </span>
              </div>
              <DevCard name="SAAD" role="Experience Developer" bio="Focused on high-performance interactive experiences and premium UI systems." />
            </div>

            <div className="mt-8 p-6 md:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-[32px] hover:border-blue-400 dark:hover:border-[#10b981]/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#10b981] flex items-center justify-center shadow-lg shrink-0">
                  <Mail className="w-8 h-8 text-slate-900 dark:text-gray-100" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-slate-900 dark:text-gray-100 tracking-tight mb-2">Get in Touch</h3>
                  <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base mb-4 max-w-lg leading-relaxed">
                    Please let us know your experience, any feature requests, or just drop by to say hi! We are constantly looking to improve the Arena and build the ultimate math training tool.
                  </p>
                  <a href="mailto:numboostarenaofficial@gmail.com" className="inline-flex items-center gap-2 text-[#10b981] font-bold tracking-wide hover:text-emerald-300 transition-colors bg-[#10b981]/10 px-4 py-2 rounded-xl text-sm md:text-base break-all">
                    numboostarenaofficial@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-12 p-8 md:p-12 rounded-[32px] bg-slate-900 dark:bg-[#111827] text-slate-900 dark:text-gray-100 relative overflow-hidden group shadow-2xl border border-slate-200 dark:border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 group-hover:scale-110 transition-transform">
                <Zap className="w-40 h-40 md:w-64 md:h-64 fill-white/20" />
              </div>
              <h3 className="text-3xl md:text-5xl font-black mb-2">Stay Elite.</h3>
              <p className="text-blue-100/80 text-base leading-relaxed mb-6 md:mb-10 max-w-[300px] md:max-w-md">NumBoost Arena is built for those who never stop learning.</p>
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/5 dark:bg-black/40 transition-colors"><Share2 onClick={() => handleGlobalShare()} className="w-5 h-5 text-[#10b981]" /></div>
                <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/5 dark:bg-black/40 transition-colors"><Heart className="w-5 h-5 text-blue-400" /></div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col"
          >
            <button onClick={() => setScreen('home')} aria-label="Go back" className="mb-8 p-2 w-max -ml-2 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full text-slate-600 dark:text-gray-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8 text-slate-900 dark:text-gray-100">Profile.</h2>
            
            {!user ? (
               <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-[#111827]/5 rounded-full flex items-center justify-center mx-auto mb-4">
                   <UserIcon className="w-10 h-10 text-slate-600 dark:text-gray-400" />
                 </div>
                 <h3 className="text-2xl font-bold">Unregistered Player</h3>
                 <p className="text-slate-600 dark:text-gray-400 max-w-sm mx-auto">Create an account to save your progress, participate in the leaderboard, and customize your profile.</p>
                 <div className="flex flex-col gap-3 pt-6 max-w-xs mx-auto">
                   <button 
                     onClick={() => setShowAuthModal(true)}
                     className="w-full bg-[#10b981] dark:bg-[#10b981] text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-blue-500 dark:hover:bg-emerald-400 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                   >
                     <LogIn className="w-5 h-5" /> Sign In
                   </button>
                   <button 
                     disabled={authLoading}
                     onClick={async () => {
                       if (authLoading) return;
                       setAuthLoading(true);
                       try {
                         await signInAsGuest();
                         setScreen('home');
                       } catch(e: any) {
                         setAuthError(cleanError(e.message));
                       } finally {
                         setAuthLoading(false);
                       }
                     }}
                     className="w-full bg-transparent border border-slate-300 dark:border-white/20 text-slate-900 dark:text-gray-100 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-slate-100 dark:bg-[#111827]/5 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                   >
                     Play as Guest
                   </button>
                 </div>
               </div>
            ) : (
               <div className="bg-white dark:bg-[#111827] border border-[#10b981]/30 rounded-[32px] p-8 space-y-8 shadow-sm">
                 <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                   <div className="relative group">
                     {editProfileImage ? (
                        <img src={editProfileImage} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-[#10b981]/20" />
                     ) : (
                        <div className="w-28 h-28 rounded-full bg-[#10b981]/10 border-4 border-[#10b981]/20 flex items-center justify-center">
                          <UserIcon className="w-12 h-12 text-[#10b981]/50" />
                        </div>
                     )}
                     <label className="absolute bottom-0 right-0 bg-[#10b981] p-2 rounded-full cursor-pointer hover:bg-emerald-400 transition-colors shadow-lg">
                       <Camera className="w-4 h-4 text-slate-900 dark:text-gray-100" />
                       <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           try {
                             let finalImage = file;
                             if (file.size > 200 * 1024) {
                               finalImage = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 512, useWebWorker: false });
                             }
                             const reader = new FileReader();
                             reader.readAsDataURL(finalImage);
                             reader.onloadend = async () => {
                               setEditProfileImage(reader.result as string);
                             }
                           } catch (err) {
                             console.error(err);
                           }
                         }
                       }} />
                     </label>
                   </div>
                   
                   <div className="flex-1 w-full space-y-4">
                     <div>
                       <label className="text-xs uppercase tracking-widest text-[#10b981] font-bold ml-4">Display Name</label>
                       <input 
                         type="text" 
                         value={editProfileName}
                         onChange={(e) => setEditProfileName(e.target.value)}
                         className="w-full bg-slate-100 dark:bg-[#111827]/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#10b981]/50 mt-1 transition-colors"
                       />
                     </div>
                     {!profile?.isGuest && (
                        <button 
                          disabled={isSavingProfile}
                          onClick={async () => {
                            setIsSavingProfile(true);
                            try {
                              if (editProfileImage && editProfileImage.length > 500000) {
                                setToastMessage('Image is too large. Please select a smaller photo.');
                                setIsSavingProfile(false);
                                setTimeout(() => setToastMessage(''), 4000);
                                return;
                              }
                              await updateProfileData({ displayName: editProfileName, photoURL: editProfileImage || '' });
                              setToastMessage('Profile updated!');
                            } catch (e: any) {
                              if (e.code === 'resource-exhausted') {
                                setToastMessage('Database quota exceeded. Please try again tomorrow.');
                              } else {
                                setToastMessage('Failed to save. Try a smaller image or distinct name.');
                              }
                            } finally {
                              setIsSavingProfile(false);
                              setTimeout(() => setToastMessage(''), 4000);
                            }
                          }}
                          className="w-auto px-6 bg-[#10b981] text-white py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                          {isSavingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                     )}
                     {profile?.isGuest && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-left">
                          <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-200/80 leading-relaxed">
                            You are playing as a Guest. To save your progress permanently and appear on the Leaderboard, please link a Google account.
                          </p>
                        </div>
                     )}
                   </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   <div className="bg-slate-100 dark:bg-[#111827]/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                     <span className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-2 block">Current Week</span>
                     <MPointBadge points={profile?.weeklyMPoints || 0} size="md" />
                   </div>
                   <div className="bg-slate-100 dark:bg-[#111827]/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                     <span className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-2 block">Previous Week</span>
                     <MPointBadge points={(profile as any)?.previousWeeklyMPoints || 0} size="md" />
                   </div>
                   <div className="bg-slate-100 dark:bg-[#111827]/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10 col-span-2 md:col-span-1">
                     <span className="text-xs uppercase font-bold text-slate-500 dark:text-gray-500 mb-2 block">Total Extracted</span>
                     <MPointBadge points={profile?.totalMPoints || 0} size="md" />
                   </div>
                 </div>
                 
                 <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                   <button 
                     onClick={() => { logout(); setScreen('home'); }}
                     className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 px-6 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
                   >
                     <LogOut className="w-4 h-4" /> Sign Out
                   </button>
                 </div>
               </div>
            )}
          </motion.div>
        )}

        {screen === 'leaderboard' && (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-lg mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col"
          >
            <div className="flex justify-between items-center mb-8 relative">
              <div className="flex items-center gap-4">
                <button onClick={() => setScreen('home')} aria-label="Go back" className="p-2 w-max -ml-2 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full text-slate-600 dark:text-gray-400 transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={async () => {
                     setIsFetchingLB(true);
                     try {
                       const currentWeekId = getCurrentWeekId();
                       const q = query(collection(db, 'users'), orderBy('weeklyMPoints', 'desc'), limit(100)); // increased limit to 100 to catch more
                       const snap = await getDocs(q);
                       let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                       data = data.filter((u: any) => !u.isGuest).map((u: any) => ({
                         ...u,
                         effectivePoints: u.currentWeekId === currentWeekId ? (u.weeklyMPoints || 0) : 0
                       })).sort((a: any, b: any) => b.effectivePoints - a.effectivePoints);
                       setLeaderboard(data);
                     } catch(e: any) {
                       console.error('fetchLB error:', e.message);
                     } finally {
                       setIsFetchingLB(false);
                     }
                  }}
                  disabled={isFetchingLB}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#111827] dark:bg-[#111827]/5 hover:bg-slate-100 dark:hover:bg-white dark:bg-[#111827]/10 shadow-sm border border-slate-200 dark:border-white/10 dark:border-transparent text-slate-700 dark:text-gray-300 rounded-full font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLB ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowLeaderboardInfo(!showLeaderboardInfo)} 
                  className="info-popup-trigger p-2 hover:bg-slate-100 dark:bg-[#111827]/10 rounded-full text-blue-400 transition-colors border border-blue-400/20 bg-blue-500/10"
                >
                  <Info className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showLeaderboardInfo && (
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} exit={{ opacity: 0, scale: 0.9 }}
                       className="info-popup-content absolute top-full right-0 mt-2 w-64 md:w-80 bg-white dark:bg-[#111827] border border-blue-500/30 rounded-2xl p-4 shadow-xl z-50 text-sm shadow-sm"
                    >
                      <h4 className="font-bold text-blue-400 uppercase tracking-widest mb-2 text-xs">How Points Work</h4>
                      <ul className="text-slate-700 dark:text-gray-300 space-y-2 list-disc pl-4 text-xs font-medium">
                        <li>Beginner: 1 pt / Table, Root..: 2 pts / Adv: 3 pts / Exp: 4 pts</li>
                        <li>1 <b>Point</b> = 1 M-Point (Leaderboard Point)</li>
                        <li>Leaderboard resets every week on Sunday (UTC).</li>
                        <li>Last week's top players retain their position but start with 0 M-Points until they play.</li>
                        <li>Guests do not appear on the leaderboard.</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8 text-slate-900 dark:text-gray-100 flex items-center gap-3">
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-emerald-400" />
              Global Rank.
            </h2>

            <div className="w-full max-w-md mx-auto">
               {isFetchingLB ? (
                  <div className="text-center text-slate-500 dark:text-gray-500 py-10">Loading arena champions...</div>
               ) : leaderboard.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-gray-500 py-10">No arena champions yet.</div>
               ) : (
                  <div className="flex flex-col gap-6">
                    {/* Top 3 Podium */}
                    {leaderboard.length > 0 && (
                      <div className="flex justify-center items-end gap-4 md:gap-6 pt-4 pb-8 border-b border-slate-100 border-slate-200 dark:border-white/10">
                        {/* 2nd Place */}
                        {leaderboard.length > 1 && (
                          <div className="flex flex-col items-center pb-4 relative">
                            {leaderboard[1].currentWeekId !== getCurrentWeekId() && <span className="absolute -top-5 text-[8px] uppercase tracking-wider text-slate-500 dark:text-gray-500">Last Week</span>}
                            <div className="relative mb-2">
                              {leaderboard[1].photoURL ? (
                                <img src={leaderboard[1].photoURL} alt={leaderboard[1].displayName || "Player"} className="w-14 h-14 rounded-full border-[3px] border-slate-300 dark:border-slate-600 object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center border-[3px] border-slate-300 dark:border-slate-600">
                                  <UserIcon className="w-6 h-6 text-slate-500 dark:text-gray-500 dark:text-slate-600 dark:text-gray-400" />
                                </div>
                              )}
                              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white rounded-full flex items-center justify-center text-xs font-black border-2 border-white dark:border-[#0a0a0a]">
                                2
                              </div>
                            </div>
                            <span className="font-bold text-sm text-slate-800 dark:text-gray-200 mt-2 truncate w-20 text-center">{leaderboard[1].displayName?.split(' ')[0] || 'Player'}</span>
                            <span className="text-xs text-slate-500 text-slate-600 dark:text-gray-400 font-medium">{(leaderboard[1].currentWeekId === getCurrentWeekId() ? leaderboard[1].weeklyMPoints : 0) || 0} pts</span>
                          </div>
                        )}

                        {/* 1st Place */}
                        <div className="flex flex-col items-center relative z-10">
                          {leaderboard[0].currentWeekId !== getCurrentWeekId() && <span className="absolute -top-5 text-[8px] uppercase tracking-wider text-slate-500 dark:text-gray-500">Last Week</span>}
                          <div className="relative mb-2">
                            <span className="absolute -top-5 -right-3 text-3xl drop-shadow-md z-10 rotate-12">👑</span>
                            {leaderboard[0].photoURL ? (
                              <img src={leaderboard[0].photoURL} alt={leaderboard[0].displayName || "Player"} className="w-20 h-20 rounded-full border-4 border-emerald-400 dark:border-[#bbf7d0] object-cover shadow-lg shadow-emerald-500/20 dark:shadow-[#bbf7d0]/10" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center border-4 border-emerald-400 dark:border-[#bbf7d0] shadow-lg">
                                <UserIcon className="w-8 h-8 text-slate-500 dark:text-gray-500 dark:text-gray-600" />
                              </div>
                            )}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-emerald-400 dark:bg-[#bbf7d0] text-emerald-900 dark:text-[#052e16] rounded-full flex items-center justify-center text-sm font-black border-2 border-white dark:border-[#0a0a0a]">
                              1
                            </div>
                          </div>
                          <span className="font-bold text-base text-slate-900 dark:text-gray-100 mt-3 truncate w-24 text-center">{leaderboard[0].displayName?.split(' ')[0] || 'Player'}</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-[#bbf7d0]">{(leaderboard[0].currentWeekId === getCurrentWeekId() ? leaderboard[0].weeklyMPoints : 0) || 0} pts</span>
                        </div>

                        {/* 3rd Place */}
                        {leaderboard.length > 2 && (
                          <div className="flex flex-col items-center pb-4 relative">
                            {leaderboard[2].currentWeekId !== getCurrentWeekId() && <span className="absolute -top-5 text-[8px] uppercase tracking-wider text-slate-500 dark:text-gray-500">Last Week</span>}
                            <div className="relative mb-2">
                              {leaderboard[2].photoURL ? (
                                <img src={leaderboard[2].photoURL} alt={leaderboard[2].displayName || "Player"} className="w-14 h-14 rounded-full border-[3px] border-emerald-700/50 dark:border-emerald-700/70 object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center border-[3px] border-emerald-700/50 dark:border-emerald-700/70">
                                  <UserIcon className="w-6 h-6 text-slate-500 dark:text-gray-500 dark:text-slate-600 dark:text-gray-400" />
                                </div>
                              )}
                              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 bg-emerald-700/50 dark:bg-emerald-700/70 text-white rounded-full flex items-center justify-center text-xs font-black border-2 border-white dark:border-[#0a0a0a]">
                                3
                              </div>
                            </div>
                            <span className="font-bold text-sm text-slate-800 dark:text-gray-200 mt-2 truncate w-20 text-center">{leaderboard[2].displayName?.split(' ')[0] || 'Player'}</span>
                            <span className="text-xs text-slate-500 text-slate-600 dark:text-gray-400 font-medium">{(leaderboard[2].currentWeekId === getCurrentWeekId() ? leaderboard[2].weeklyMPoints : 0) || 0} pts</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* List */}
                    <div className="bg-white dark:bg-[#111827] dark:bg-[#111111] rounded-3xl p-3 shadow-sm border border-slate-100 dark:border-[#222]">
                      <div className="flex flex-col">
                        {leaderboard.slice(3, 10).map((u, i) => {
                           const rank = i + 4;
                           const isOldWeek = u.currentWeekId !== getCurrentWeekId();
                           const displayScore = isOldWeek ? 0 : (u.weeklyMPoints || 0);
                           const isMe = user && user.uid === u.id;
                           
                           return (
                             <div key={u.id} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${i === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30' : i === 1 ? 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10' : i === 2 ? 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30' : 'bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}>
                               <div className="flex items-center gap-4">
                                 <div className={`w-6 font-bold text-center text-sm ${isMe ? 'text-[#166534]' : 'text-slate-500 dark:text-gray-500 text-slate-500 dark:text-gray-500'} shrink-0`}>
                                    {rank}
                                 </div>
                                 <div className="relative shrink-0">
                                   {u.photoURL ? (
                                     <img src={u.photoURL} alt={u.displayName || "Player"} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white dark:bg-[#111827] dark:bg-black" referrerPolicy="no-referrer" />
                                   ) : (
                                     <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${isMe ? 'bg-[#bbf7d0] dark:bg-[#86efac]' : 'bg-slate-100 dark:bg-[#222]'}`}>
                                       <UserIcon className={`w-5 h-5 ${isMe ? 'text-[#166534]' : 'text-slate-500 dark:text-gray-500 text-slate-500 dark:text-gray-500'}`} />
                                     </div>
                                   )}
                                 </div>
                                 <div className="flex flex-col">
                                   <span className={`font-semibold tracking-tight text-base truncate max-w-[140px] sm:max-w-[200px] ${isMe ? 'text-[#052e16] dark:text-[#052e16]' : 'text-slate-800 dark:text-gray-200'}`}>
                                      {isMe ? 'You' : (u.displayName || 'Unknown Player')}
                                   </span>
                                   {isOldWeek && <span className={`text-[9px] font-medium uppercase tracking-wider ${isMe ? 'text-[#166534]/70' : 'text-slate-500 dark:text-gray-500'}`}>Last Week</span>}
                                 </div>
                               </div>
                               <div className={`text-right text-sm font-bold shrink-0 ${isMe ? 'text-[#052e16]' : 'text-slate-600 dark:text-gray-400 text-slate-600 dark:text-gray-400'}`}>
                                 {displayScore} pts
                               </div>
                             </div>
                           );
                        })}

                        {user && profile && !profile.isGuest && !leaderboard.slice(0, 10).find(u => u.id === user.uid) && (
                          <>
                            <div className="h-px bg-slate-100 dark:bg-[#222] my-1"></div>
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#dcfce7] dark:bg-[#bbf7d0] text-[#052e16]">
                               <div className="flex items-center gap-4">
                                 <div className="w-6 font-bold text-sm text-center text-[#166534] shrink-0 opacity-70">
                                    {leaderboard.findIndex(u => u.id === user.uid) !== -1 ? leaderboard.findIndex(u => u.id === user.uid) + 1 : '—'}
                                 </div>
                                 <div className="relative shrink-0">
                                   {profile.photoURL ? (
                                     <img src={profile.photoURL} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm bg-white dark:bg-[#111827]" />
                                   ) : (
                                     <div className="w-10 h-10 rounded-full bg-[#bbf7d0] dark:bg-[#86efac] flex items-center justify-center">
                                       <UserIcon className="w-5 h-5 text-[#166534]" />
                                     </div>
                                   )}
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="font-semibold text-[#052e16] text-base truncate max-w-[140px] sm:max-w-[200px]">
                                      You
                                   </span>
                                 </div>
                               </div>
                               <div className="text-right text-sm font-bold shrink-0">
                                  {profile.currentWeekId === getCurrentWeekId() ? (profile.weeklyMPoints || 0) : 0} pts
                               </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuCard({ icon, title, description, onClick, accent }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; accent: string; key?: React.Key }) {
  const accentClasses: any = {
    orange: "group-hover:text-emerald-400 group-hover:bg-emerald-400/20",
    zinc: "group-hover:text-blue-400 group-hover:bg-blue-500/20",
    blue: "group-hover:text-[#10b981] group-hover:bg-[#10b981]/20"
  };

  return (
    <motion.button 
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="group p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-2xl md:rounded-3xl transition-all shadow-sm active:scale-95 text-slate-900 w-full text-left flex items-center gap-4 relative overflow-hidden"
    >
      <div className={`p-3 rounded-xl transition-colors ${accentClasses[accent] || ''} bg-slate-50 dark:bg-gray-800/50 text-[#10b981] relative z-10 border border-slate-100 dark:border-white/5`}>
        {icon}
      </div>
      <div className="flex-1 z-10">
        <h3 className="font-bold text-lg md:text-xl leading-tight text-slate-900 dark:text-gray-100 transition-colors">{title}</h3>
        <p className="text-slate-500 dark:text-gray-400 text-sm md:text-base mt-1">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-gray-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all z-10" />
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
      className="p-5 bg-white dark:bg-[#111827] dark:bg-[#111827]/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:text-gray-100 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-between group overflow-hidden relative shadow-sm"
    >
      <div className="absolute inset-0 bg-[#10b981]/5 dark:bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative z-10">{name}</span>
      <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 text-emerald-500 dark:text-blue-400 relative z-10" />
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
      className={`relative overflow-hidden w-full p-6 text-left rounded-[24px] border transition-all duration-300 group ${selected ? 'bg-slate-100 dark:bg-[#111827]/10 border-slate-400 dark:border-white/30 shadow-inner' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] dark:bg-[#111827]/5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm'}`}
    >
      {!selected && <div className="absolute inset-0 bg-slate-50 dark:bg-[#0A0F16]0/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
      <div className="flex justify-between items-center mb-1 relative z-10">
        <span className={`text-xl font-black uppercase tracking-tight transition-colors ${selected ? 'text-slate-900 dark:text-gray-100' : 'text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-gray-100'}`}>
          {level} {diffEmojis[level]}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: ['Beginner', 'Intermediate', 'Advanced', 'Expert'].indexOf(level) + 1 }).map((_, i) => (
            <div key={i} className={`w-1.5 h-3 rounded-[1px] ${selected ? 'bg-slate-900 dark:bg-emerald-400 dark:shadow-sm' : 'bg-slate-300 dark:bg-blue-500/80 dark:shadow-sm'}`} />
          ))}
        </div>
      </div>
      <p className={`text-xs ${selected ? 'text-slate-700 font-medium dark:text-blue-200' : 'text-slate-500 dark:text-gray-500'}`}>{descMap[level]}</p>
    </motion.button>
  );
}

function ResultMetric({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-slate-100 dark:bg-[#111827]/5 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md hover:bg-slate-100 dark:bg-[#111827]/10 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-gray-400">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function DevCard({ name, role, bio }: { name: string, role: string, bio: string }) {
  return (
    <div className="p-8 bg-white dark:bg-[#111827] rounded-[32px] border border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-[#10b981]/30 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#10b981] dark:bg-[#10b981] flex items-center justify-center text-slate-900 dark:text-gray-100 font-black text-xl shadow-lg">
          {name[0]}
        </div>
        <div>
          <h3 className="font-bold text-xl text-slate-900 dark:text-gray-100 tracking-tight">{name}</h3>
          <p className="text-[#10b981] font-bold text-xs uppercase tracking-widest">{role}</p>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">{bio}</p>
    </div>
  );
}
