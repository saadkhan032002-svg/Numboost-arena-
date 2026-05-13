const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Missed blue/emerald gradients
content = content.replace(/bg-gradient-to-r from-blue-600 to-emerald-500/g, 'bg-[#FFD13B] dark:bg-gradient-to-r dark:from-blue-600 dark:to-emerald-500');
content = content.replace(/text-slate-800 dark:text-white/g, 'text-slate-900 dark:text-white');
content = content.replace(/shadow-\[0_0_20px_rgba\(59,130,246,0\.3\)\]/g, 'shadow-[0_10px_20px_rgba(255,209,59,0.3)] dark:shadow-[0_0_20px_rgba(59,130,246,0.3)]');
content = content.replace(/bg-gradient-to-tr from-blue-600 to-emerald-500/g, 'bg-[#FFD13B] dark:bg-gradient-to-tr dark:from-blue-600 dark:to-emerald-500');
content = content.replace(/from-blue-600\/10/g, 'from-[#FFD13B]/10 dark:from-blue-600/10');
content = content.replace(/emerald-600\/10/g, '#FFD13B/10 dark:bg-emerald-600/10');

// And one more important thing: The blue icon on home page. 
// `<div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 ..."`
// That text runs into issues if it says text-slate-900 dark:text-white. It should be correct now.

fs.writeFileSync('src/App.tsx', content);
