const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove large box-shadow utility patterns that act as neon glows
content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([^)]+\)\]/g, 'shadow-sm');
content = content.replace(/shadow-\[0_[0-9]+px_[0-9]+px_rgba\([^)]+\)\]/g, 'shadow-sm');
content = content.replace(/dark:shadow-\[0_[0-9]+px_[0-9]+px_rgba\([^)]+\)\]/g, '');
content = content.replace(/dark:shadow-\[0_0_[0-9]+px_rgba\([^)]+\)\]/g, '');

// Also remove text drop shadows
content = content.replace(/drop-shadow-\[0_[0-9]+px_[0-9]+px_rgba\([^)]+\)\]/g, '');


// 2. Revert dark theme MenuCard and SubCard to their original look and light mode 
// to be simple, no yellow/neon border on hover.
content = content.replace(/text-\[#D9A01C\]/g, 'text-amber-500');
content = content.replace(/text-\[#FFD13B\]/g, 'text-amber-400');

// Revert main play button gradients for light and dark
content = content.replace(
  /bg-\[#FFD13B\] dark:bg-gradient-to-r dark:from-blue-600 dark:to-emerald-500 text-slate-900 dark:text-white/g,
  'bg-blue-600 dark:bg-emerald-500 text-white'
);

content = content.replace(
  /bg-\[#FFD13B\] dark:bg-gradient-to-tr dark:from-blue-600 dark:to-emerald-500/g,
  'bg-blue-600 dark:bg-emerald-500'
);

content = content.replace(
  /hover:bg-\[#FACC15\] dark:hover:from-blue-500 dark:hover:to-emerald-400/g,
  'hover:bg-blue-500 dark:hover:bg-emerald-400'
);

content = content.replace(
  /border-\[#FACC15\]/g,
  'border-blue-400'
);

content = content.replace(
  /hover:border-\[#FFD13B\]/g,
  'hover:border-blue-400'
);

content = content.replace(
  /from-\[#FFD13B\]\/10/g,
  'from-blue-500/10'
);

content = content.replace(
  /bg-\[#FFD13B\] dark:bg-gradient-to-r dark:from-blue-500\/20 dark:to-emerald-500\/20 text-slate-900 font-bold dark:text-white border-\[#FACC15\] dark:border-blue-500\/50/g,
  'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold border-blue-400 dark:border-blue-500'
);

// Revert dark mode background changes:
content = content.replace(/bg-white dark:bg-\[#111827\]/g, 'bg-white dark:bg-[#111827]');
content = content.replace(/bg-slate-50 dark:bg-\[#0F1626\]/g, 'bg-slate-50 dark:bg-[#0F1626]');
// MenuCard original dark mode
content = content.replace(
  /bg-white dark:bg-gradient-to-br dark:from-white\/5 dark:to-\[#0F1626\]/g,
  'bg-slate-50 dark:bg-gradient-to-br dark:from-white/5 dark:to-[#0F1626]'
);

// MPoints
content = content.replace(
  /bg-gradient-to-br from-\[#FFF5C3\] via-\[#FFD13B\] to-\[#D9A01C\]/g,
  'bg-amber-400 dark:bg-amber-500'
);
content = content.replace(
  /border border-\[#FFEA79\]/g,
  'border border-amber-300 dark:border-amber-400'
);

fs.writeFileSync('src/App.tsx', content);
