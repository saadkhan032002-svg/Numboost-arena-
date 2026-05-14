const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

// Replace by splitting and joining to avoid Regex escape hell
const replacements = {
  'className="w-full max-w-6xl mx-auto px-5 lg:px-12 py-12 md:py-0 min-h-[100dvh] flex flex-col md:flex-row relative items-center justify-center gap-10 lg:gap-16"':
  'className="min-h-[100dvh] bg-[var(--bg-base)] w-full max-w-6xl mx-auto px-5 lg:px-12 py-12 md:py-0 flex flex-col md:flex-row relative items-center justify-center gap-10 lg:gap-16"',

  'className="h-14 sm:h-16 md:h-20 bg-[var(--bg-card)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-card)]/5 active:bg-slate-200 dark:active:bg-[var(--bg-card)]/10 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold text-[var(--text-primary)] shadow-sm border border-[var(--border)] border-[var(--border)] flex items-center justify-center transition-all active:scale-95"':
  'className="numpad-key"',
  
  'className="h-16 md:h-20 bg-[var(--bg-card)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-card)]/5 active:bg-slate-200 dark:active:bg-[var(--bg-card)]/10 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold text-[var(--text-primary)] shadow-sm border border-[var(--border)] border-[var(--border)] flex items-center justify-center transition-all active:scale-95 touch-manipulation"':
  'className="numpad-key"',

  'className="col-span-2 h-16 md:h-20 bg-[var(--accent)] text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] rounded-2xl sm:rounded-3xl text-xl sm:text-2xl font-bold border border-[var(--accent)] shadow-sm flex items-center justify-center transition-all active:scale-95 touch-manipulation"':
  'className="btn-primary flex items-center justify-center col-span-2"',

  'className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-[var(--border)] border-[var(--border)] mb-6 text-center shadow-lg relative overflow-hidden"':
  'className="glass-card p-6 mb-4 text-center"',

  'className="bg-[var(--bg-card)] rounded-3xl p-8 shadow-sm border border-[var(--border)] border-[var(--border)] mb-8 text-center shadow-lg relative overflow-hidden"':
  'className="glass-card p-6 mb-4 text-center"',

  'className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"':
  'className="grid grid-cols-2 gap-3"',

  'className="w-full h-3 sm:h-4 bg-gray-200 dark:bg-[var(--bg-card)]/10 rounded-full overflow-hidden shadow-inner flex shrink-0"':
  'className="progress-track w-full my-2 flex shrink-0"',

  'className="h-full bg-yellow-400 rounded-full transition-all duration-300 ease-out"':
  'className="progress-fill transition-all duration-300 ease-out"',
  
  'className="text-lg md:text-xl text-[var(--text-secondary)] max-w-lg mx-auto md:mx-0 font-medium leading-relaxed"':
  'className="text-[var(--text-secondary)] text-sm tracking-widest uppercase mb-12 max-w-md mx-auto md:mx-0"'
};

for (const [k, v] of Object.entries(replacements)) {
  code = code.split(k).join(v);
}

// Regex for Dynamic parts
code = code.replace(/className={`flex items-center justify-between p-3\.5 rounded-2xl transition-all \$\{[^}]+\}`}/g,
    'className={`lb-row ${i === 0 ? \'rank-1\' : i === 1 ? \'rank-2\' : i === 2 ? \'rank-3\' : \'\'}`}'
);

code = code.replace(/className={`p-4 sm:p-5 md:p-6 text-xl sm:text-2xl md:text-3xl font-bold rounded-2xl sm:rounded-3xl transition-all \$\{[^}]+\}`}/g,
    'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}'
);

code = code.replace(/className={`w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all hover:border-\[var\(--border\)\] active:scale-\[0\.98\] relative overflow-hidden gap-1 group \$\{[^}]+\}`}/g,
    'className={`category-pill ${selectedCategoryId === cat.id ? \'selected\' : \'\'}`}'
);

code = code.replace(/className={`w-full text-left p-4 sm:p-5 flex flex-col gap-1 rounded-2xl sm:rounded-3xl border transition-all hover:border-\[var\(--border\)\] active:scale-\[0\.98\] relative overflow-hidden \$\{[^}]+\}`}/g,
    'className={`category-pill ${selectedSubcategory === sub.id ? \'selected\' : \'\'}`}'
);

fs.writeFileSync(appPath, code);
console.log("Safe replacement completed");
