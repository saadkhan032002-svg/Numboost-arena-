const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Function to safely replace multiple classes globally
function replaceClasses(text) {
  const replacements = {
    // Backgrounds
    'bg-slate-50': 'bg-[var(--bg-base)]',
    'bg-white': 'bg-[var(--bg-card)]',
    'dark:bg-\\[#0A0F16\\]': 'bg-[var(--bg-base)]',
    'dark:bg-\\[#111827\\]/80': 'bg-[var(--bg-card)]',
    'dark:bg-\\[#111827\\]': 'bg-[var(--bg-card)]',
    'dark:bg-gray-900': 'bg-[var(--bg-base)]',
    'dark:bg-gray-800': 'bg-[var(--bg-surface)]',
    'bg-gray-100': 'bg-[var(--bg-surface)]',
    
    // Borders
    'border-slate-200': 'border-[var(--border)]',
    'dark:border-white/5': 'border-[var(--border)]',
    'dark:border-white/10': 'border-[var(--border)]',
    'border-gray-200': 'border-[var(--border)]',
    
    // Text
    'text-slate-900': 'text-[var(--text-primary)]',
    'dark:text-gray-100': 'text-[var(--text-primary)]',
    'text-slate-600': 'text-[var(--text-secondary)]',
    'dark:text-gray-400': 'text-[var(--text-secondary)]',
    'text-slate-400': 'text-[var(--text-muted)]',
    'dark:text-gray-500': 'text-[var(--text-muted)]',
    
    // Accents
    'text-emerald-500': 'text-[var(--accent)]',
    'text-emerald-400': 'text-[var(--accent)]',
    'bg-emerald-500': 'bg-[var(--accent)]',
    'border-emerald-500': 'border-[var(--accent)]',
    'text-blue-500': 'text-[var(--accent)]',
    'bg-blue-600': 'bg-[var(--accent)]'
  };

  for (const [oldClass, newClass] of Object.entries(replacements)) {
    // We use a global regex with word boundaries to avoid partial matches
    // But for classes with special characters like / or [, \b won't work perfectly on both sides.
    // So we just replace all occurrences.
    // Escape oldClass for Regex
    const regexPattern = oldClass;
    const regex = new RegExp(regexPattern, 'g');
    text = text.replace(regex, newClass);
  }
  return text;
}

content = replaceClasses(content);

// Step 3: Home Screen hero section
// App logo / title
content = content.replace(/className="text-4xl sm:text-5xl md:text-6xl font-black text-\[var\(--text-primary\)\] tracking-tight flex items-center justify-center sm:justify-start gap-4"/, 
  'className="font-display text-4xl font-black neon-text animate-float"');
content = content.replace(/className="font-display text-4xl sm:text-5xl font-black neon-text tracking-tight flex items-center justify-center sm:justify-start gap-4 mb-2"/, 
  'className="font-display text-4xl font-black neon-text animate-float"');

// Title specific generic
content = content.replace(/className="text-4xl.*NumB\w+.*Arena/, (match) => {
  return 'className="font-display text-4xl font-black neon-text animate-float"'; // fallback
});

// Subtitle
content = content.replace(/className="text-lg sm:text-xl text-\[var\(--text-secondary\)\] max-w-lg mx-auto sm:mx-0 font-medium"/, 
  'className="text-[var(--text-secondary)] text-sm tracking-widest uppercase"');
content = content.replace(/className="text-\[var\(--text-secondary\)\] text-lg md:text-xl mb-12 max-w-md mx-auto md:mx-0"/, 
  'className="text-[var(--text-secondary)] text-sm tracking-widest uppercase"');

// Main start button
content = content.replace(/className="w-full sm:w-auto bg-\[var\(--text-primary\)\] text-\[var\(--bg-card\)\] hover:bg-slate-800 dark:hover:bg-gray-200 px-8 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold text-lg sm:text-xl transition-all shadow-lg active:scale-95 flex items-center justify-center sm:justify-start gap-3"/, 
  'className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center gap-2"');
// Alternative match if my earlier match didn't work exactly
content = content.replace(/className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-amber-950 rounded-2xl font-bold text-xl transition-all shadow-lg shadow-yellow-500\/20 active:scale-95 flex items-center justify-center md:justify-start gap-3"/,
  'className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center gap-2"');

// Background wrapper (in the home screen component mostly, usually min-h-screen bg-...)
content = content.replace(/className="min-h-screen bg-\[var\(--bg-base\)\] text-\[var\(--text-primary\)\] pb-12 sm:pb-20 font-sans"/, 
  'className="min-h-screen bg-[var(--bg-base)] flex flex-col"');
content = content.replace(/className="min-h-screen bg-\[var\(--bg-base\)\] pb-20 font-sans overflow-x-hidden"/, 
  'className="min-h-screen bg-[var(--bg-base)] flex flex-col"');

// Game screen section
// Question ka bada box
// Search for box displaying question "bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-slate-200 dark:border-white/5 mb-6 text-center shadow-lg relative overflow-hidden"
// We'll replace matching parts for question container
content = content.replace(/className="bg-\[var\(--bg-card\)\] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-\[var\(--border\)\] mb-6 text-center shadow-lg relative overflow-hidden"/g, 
  'className="glass-card p-6 mb-4 text-center"');
content = content.replace(/className="bg-\[var\(--bg-card\)\] rounded-3xl p-8 shadow-sm border border-\[var\(--border\)\] mb-8 text-center relative overflow-hidden"/g, 
  'className="glass-card p-6 mb-4 text-center"');
content = content.replace(/className="bg-\[var\(--bg-card\)\] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-\[var\(--border\)\] mb-6 text-center relative overflow-hidden"/g, 
  'className="glass-card p-6 mb-4 text-center"');

// Question text
content = content.replace(/className="text-5xl sm:text-7xl md:text-8xl font-black text-\[var\(--text-primary\)\] tracking-tighter tabular-nums drop-shadow-sm"/g, 
  'className="text-2xl font-mono font-black text-[var(--text-primary)]"');
content = content.replace(/className="text-6xl md:text-8xl font-black text-\[var\(--text-primary\)\] tracking-tight tabular-nums drop-shadow-sm"/g, 
  'className="text-2xl font-mono font-black text-[var(--text-primary)]"');
content = content.replace(/className="text-5xl sm:text-7xl md:text-8xl font-black text-\[var\(--text-primary\)\] tracking-tighter tabular-nums"/g,
  'className="text-2xl font-mono font-black text-[var(--text-primary)]"');

// Answer options grid
content = content.replace(/className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"/g, 
  'className="grid grid-cols-2 gap-3"');
content = content.replace(/className="grid grid-cols-2 gap-4"/g, 
  'className="grid grid-cols-2 gap-3"');

// Har option button
content = content.replace(/className={`p-4 sm:p-5 md:p-6 text-xl sm:text-2xl md:text-3xl font-bold rounded-2xl sm:rounded-3xl transition-all \${[^\}]+}`}/g, 
  'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}');
// Another match in case
content = content.replace(/className={`w-full p-4 sm:p-5 text-xl sm:text-2xl font-bold rounded-2xl transition-all shadow-sm active:scale-95 \${[^\}]+}`}/g, 
  'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}');
content = content.replace(/className={`p-4 sm:p-5 md:p-6 text-xl md:text-3xl font-bold rounded-2xl transition-all \${[^\}]+}`}/g,
  'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}');


// Leaderboard Rows
content = content.replace(/className={`flex items-center justify-between p-3.5 rounded-2xl transition-all \${[^\}]+}`}/g, 
  "className={`lb-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}");
// MIGHT need to be careful with the map index if it's not `i`. The map uses `(u, i)`.
// We will refine replacing leaderboard via explicit manual check if this regex is too aggressive.

// Progress bar
content = content.replace(/className="w-full h-3 sm:h-4 bg-slate-200 dark:bg-white\/10 rounded-full overflow-hidden shadow-inner"/g, 
  'className="progress-track w-full my-2"');
content = content.replace(/className="w-full h-4 bg-slate-200 dark:bg-white\/10 rounded-full overflow-hidden shadow-inner mb-6"/g, 
  'className="progress-track w-full my-2"');
content = content.replace(/className="h-full bg-\[var\(--accent\)\] rounded-full transition-all duration-300 ease-out"/g, 
  'className="progress-fill"');
content = content.replace(/className="h-full bg-yellow-400 rounded-full transition-all duration-300 ease-out"/g, 
  'className="progress-fill"');

// Category buttons
// Need to find the pill classes
content = content.replace(/className={`w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all \${[^\}]+}`}/g, 
  "className={`category-pill ${selectedSubcategory === cat.id ? 'selected' : ''}`}");
content = content.replace(/className={`text-left p-5 md:p-6 rounded-3xl border transition-all relative overflow-hidden \${[^\}]+}`}/g, 
  "className={`category-pill selected`}");

// Input fields
content = content.replace(/className="w-full bg-\[var\(--bg-card\)\] border border-\[var\(--border\)\] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-\[var\(--text-primary\)\] text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/20 transition-all font-medium"/g, 
  'className="premium-input"');
content = content.replace(/className="flex-1 bg-\[var\(--bg-card\)\] border border-\[var\(--border\)\] rounded-xl px-4 py-3 text-\[var\(--text-primary\)\] outline-none focus:border-blue-500 transition-all"/g, 
  'className="premium-input"');
content = content.replace(/className="w-full bg-\[var\(--bg-base\)\] dark:bg-\[#0a0a0a\] border border-\[var\(--border\)\] rounded-xl px-4 py-3 text-\[var\(--text-primary\)\] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500\/20 transition-all mb-4"/g,
  'className="premium-input mb-4"');

// Numpad keys
content = content.replace(/className="h-14 sm:h-16 md:h-20 bg-\[var\(--bg-card\)\] hover:bg-slate-100 dark:hover:bg-white\/5 active:bg-slate-200 dark:active:bg-white\/10 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold text-\[var\(--text-primary\)\] shadow-sm border border-\[var\(--border\)\] flex items-center justify-center transition-all active:scale-95"/g, 
  'className="numpad-key"');
content = content.replace(/className="h-16 md:h-20 bg-\[var\(--bg-card\)\] hover:bg-slate-100 dark:hover:bg-white\/5 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold text-\[var\(--text-primary\)\] shadow-sm border border-\[var\(--border\)\] flex items-center justify-center transition-all active:scale-95"/g, 
  'className="numpad-key"');

fs.writeFileSync(appPath, content);
console.log('Replacements completed.');
