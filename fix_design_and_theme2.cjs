const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix Random All button styling (make it purple in dark mode)
content = content.replace(
  /customConfig\['Random'\] \? 'bg-gradient-to-r bg-slate-900 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-amber-400 font-bold dark:text-white border-slate-900 dark:border-purple-500\/50 shadow-lg' : 'bg-slate-100 dark:bg-white\/5 text-purple-400 border-purple-500\/20 hover:border-purple-500\/40 hover:bg-slate-100 dark:bg-white\/10'/g,
  "customConfig['Random'] ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-50 dark:hover:bg-purple-500/10'"
);

// 2. Fix the Category Selection Yellow bug in dark mode
content = content.replace(
  /customConfig\[\(pillar.id === 'Decimals' \|\| pillar.id === 'Fractions'\) \? \`\$\{pillar.id\}-Mix\` : pillar.id\] \? 'bg-gradient-to-r bg-\[#FFD13B\] dark:bg-gradient-to-r dark:from-blue-500\/20 dark:to-emerald-500\/20 text-slate-900 font-bold dark:text-white border-blue-400 dark:border-blue-500\/50 shadow-lg'/g,
  "customConfig[(pillar.id === 'Decimals' || pillar.id === 'Fractions') ? `${pillar.id}-Mix` : pillar.id] ? 'bg-[#FFD13B] dark:bg-blue-600 text-slate-900 font-bold dark:text-white border-blue-400 dark:border-blue-400 shadow-lg'"
);

// 3. Theme Toggle changes (Single button rotating)
const themeStrOld = `{screen === 'home' && (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-6 left-5 md:top-8 md:left-12 z-[100] flex items-center gap-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 p-1 rounded-2xl backdrop-blur-md shadow-sm"
      >
        <button
          onClick={() => setTheme('light')}
          className={\`p-2 rounded-xl transition-all \${theme !== 'dark' ? 'bg-slate-100 dark:bg-white/5 shadow-sm text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700 dark:hover:text-gray-300'}\`}
          aria-label="Light mode"
        >
          <Sun className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={\`p-2 rounded-xl transition-all \${theme === 'dark' ? 'bg-slate-100 dark:bg-white/5 shadow-sm text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-700 dark:hover:text-gray-300'}\`}
          aria-label="Dark mode"
        >
          <Moon className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </motion.div>
      )}`;

const themeStrNew = `{screen === 'home' && (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-6 left-5 md:top-8 md:left-12 z-[100] flex items-center"
      >
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-3 md:p-4 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-md shadow-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" /> : <Moon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />}
        </button>
      </motion.div>
      )}`;
      
if (content.includes(themeStrOld)) {
   content = content.replace(themeStrOld, themeStrNew);
} else {
   console.log("Could not find theme old string");
}

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx modified");
