import os

app_path = "src/App.tsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    # Home Screen wrapper
    'className="w-full max-w-6xl mx-auto px-5 lg:px-12 py-12 md:py-0 min-h-[100dvh] flex flex-col md:flex-row relative items-center justify-center gap-10 lg:gap-16"': 
    'className="min-h-[100dvh] bg-[var(--bg-base)] w-full max-w-6xl mx-auto px-5 lg:px-12 py-12 md:py-0 flex flex-col md:flex-row relative items-center justify-center gap-10 lg:gap-16"',

    # Title
    'className="text-5xl lg:text-7xl font-black text-[var(--text-primary)] tracking-tight flex items-center justify-center md:justify-start gap-4 mb-3"':
    'className="font-display text-4xl font-black neon-text animate-float flex items-center justify-center md:justify-start gap-4 mb-3"',

    # Subtitle
    'className="text-lg md:text-xl text-[var(--text-secondary)] max-w-lg mx-auto md:mx-0 font-medium leading-relaxed"':
    'className="text-[var(--text-secondary)] text-sm tracking-widest uppercase mb-12 max-w-md mx-auto md:mx-0"',

    # Main Start Button
    'className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-amber-950 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95 flex items-center justify-center md:justify-start gap-3"':
    'className="btn-primary w-full max-w-xs mx-auto md:mx-0 flex items-center justify-center gap-2 mb-10"',

    # Game Question Box
    'className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-[var(--border)] border-[var(--border)] mb-6 text-center shadow-lg relative overflow-hidden"':
    'className="glass-card p-6 mb-4 text-center"',

    'className="bg-[var(--bg-card)] rounded-3xl p-8 shadow-sm border border-[var(--border)] border-[var(--border)] mb-8 text-center shadow-lg relative overflow-hidden"':
    'className="glass-card p-6 mb-4 text-center"',

    # Question text
    'className="text-6xl md:text-8xl font-black text-[var(--text-primary)] tracking-tight tabular-nums drop-shadow-sm"':
    'className="text-6xl md:text-8xl font-mono font-black text-[var(--text-primary)] drop-shadow-sm tabular-nums"',
    
    # Options grid
    'className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"':
    'className="grid grid-cols-2 gap-3"',

    'className="grid grid-cols-2 gap-4"':
    'className="grid grid-cols-2 gap-3"',

    # Progress Back/Fill
    'className="w-full h-3 sm:h-4 bg-gray-200 dark:bg-[var(--bg-card)]/10 rounded-full overflow-hidden shadow-inner mb-6"':
    'className="progress-track w-full my-4"',

    'className="w-full h-3 sm:h-4 bg-gray-200 dark:bg-[var(--bg-card)]/10 rounded-full overflow-hidden shadow-inner flex shrink-0"':
    'className="progress-track w-full my-2 flex shrink-0"',

    'className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"':
    'className="progress-fill transition-all duration-300 ease-out"',

    'className="h-full bg-yellow-400 rounded-full transition-all duration-300 ease-out"':
    'className="progress-fill transition-all duration-300 ease-out"',
    
    # Inputs
    'className="w-full bg-[var(--bg-base)] border border-[var(--border)] border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"':
    'className="premium-input mb-4"',
    
    'className="w-full bg-[var(--bg-base)] border border-[var(--border)] border-[var(--border)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[var(--text-primary)] text-lg outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"':
    'className="premium-input mb-4"',

    # Numpad Keys    
    'className="h-16 md:h-20 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] dark:hover:bg-[var(--bg-card)]/5 active:bg-[var(--bg-base)] dark:active:bg-[var(--bg-card)]/10 rounded-2xl sm:rounded-3xl text-2xl sm:text-3xl font-bold text-[var(--text-primary)] shadow-sm border border-[var(--border)] border-[var(--border)] flex items-center justify-center transition-all active:scale-95 touch-manipulation"':
    'className="numpad-key"',

    'className="col-span-2 h-16 md:h-20 bg-[var(--accent)] text-white hover:bg-[var(--accent)] rounded-2xl sm:rounded-3xl text-xl sm:text-2xl font-bold border border-[var(--accent)] shadow-sm flex items-center justify-center transition-all active:scale-95 touch-manipulation"':
    'className="btn-primary grid-cols-2 h-full w-full"',
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Regex operations
import re

# Answer Option replace (Regex is safer to match dynamic parts)
# Pattern matching standard answer options inside className={`...`} 
content = re.sub(r'className={`p-4 sm:p-5 md:p-6 text-xl sm:text-2xl md:text-3xl font-bold rounded-2xl sm:rounded-3xl transition-all \$\{.*?}`}', 
                 r'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}', content)

content = re.sub(r'className={`w-full p-4 sm:p-5 text-xl sm:text-2xl font-bold rounded-2xl transition-all shadow-sm active:scale-95 \$\{.*?}`}', 
                 r'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}', content)

content = re.sub(r'className={`p-4 sm:p-5 md:p-6 text-xl md:text-3xl font-bold rounded-2xl transition-all \$\{.*?}`}', 
                 r'className={`answer-option ${isCorrect ? \'correct\' : isWrong ? \'wrong\' : \'\'}`}', content)

# Leaderboard row
content = re.sub(r'className={`flex items-center justify-between p-3\.5 rounded-2xl transition-all \$\{.*?}`}',
                 r'className={`lb-row ${i === 0 ? \'rank-1\' : i === 1 ? \'rank-2\' : i === 2 ? \'rank-3\' : \'\'}`}', content)

# Categoriy pills
content = re.sub(r'className={`w-full text-left p-4 sm:p-5 flex flex-col gap-1 rounded-2xl sm:rounded-3xl border transition-all hover:border-\[var\(--border\)\] active:scale-\[0\.98\] relative overflow-hidden \$\{.*?}`}',
                 r'className={`category-pill ${selectedSubcategory === sub.id ? \'selected\' : \'\'}`}', content)

content = re.sub(r'className={`w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all hover:border-\[var\(--border\)\] active:scale-\[0\.98\] relative overflow-hidden gap-1 group \$\{.*?}`}',
                 r'className={`category-pill ${selectedCategoryId === cat.id ? \'selected\' : \'\'}`}', content)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Python targeted replacement done.")
