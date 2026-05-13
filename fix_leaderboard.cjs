const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                       return (
                         <div key={u.id} className={\`flex items-center justify-between p-4 rounded-xl border transition-colors \${isMe ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}\`}>
                           <div className="flex items-center gap-4">
                             <div className={\`w-8 font-black text-xl text-center \${i === 0 ? 'text-amber-400 text-3xl drop-shadow-sm' : i === 1 ? 'text-slate-700 dark:text-gray-300 text-2xl' : i === 2 ? 'text-amber-700 text-xl' : 'text-gray-600'}\`}>
                                {i + 1}
                             </div>
                             {u.photoURL ? (
                               <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-300 dark:border-white/20 object-cover" />
                             ) : (
                               <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center border border-slate-300 dark:border-white/20">
                                 <UserIcon className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                               </div>
                             )}
                             <div className="flex flex-col">
                               <span className={\`font-bold \${isMe ? 'text-amber-500 dark:text-amber-400' : 'text-slate-800 dark:text-gray-200'}\`}>
                                  {u.displayName || 'Unknown Player'}
                               </span>
                               <span className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest">{isOldWeek ? 'Last Week Leader' : 'Active'}</span>
                             </div>
                           </div>
                           <div className="text-right flex flex-col items-end">
                             <MPointBadge points={displayScore} size="md" />
                           </div>
                         </div>
                       );`;

const replacement = `                       return (
                         <div key={u.id} className={\`flex items-center justify-between p-4 rounded-xl border transition-all \${isMe ? 'bg-gradient-to-r from-amber-50 dark:from-yellow-500/10 to-amber-100 dark:to-amber-500/5 border-amber-300 dark:border-amber-500/30 shadow-sm' : 'bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}\`}>
                           <div className="flex items-center gap-4">
                             <div className={\`w-8 font-black text-2xl text-center shrink-0 \${i === 0 ? 'text-yellow-500 text-4xl drop-shadow-sm' : i === 1 ? 'text-slate-400 text-3xl' : i === 2 ? 'text-amber-700 text-3xl' : 'text-slate-400 dark:text-gray-600'}\`}>
                                {i + 1}
                             </div>
                             <div className="relative">
                               {u.photoURL ? (
                                 <img src={u.photoURL} alt={u.displayName || "Player"} className={\`w-12 h-12 rounded-full border-2 object-cover \${i === 0 ? 'border-yellow-400 dark:border-amber-400 shadow-md' : 'border-slate-200 dark:border-white/10'}\`} referrerPolicy="no-referrer" />
                               ) : (
                                 <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border-2 border-slate-200 dark:border-white/10">
                                   <UserIcon className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                                 </div>
                               )}
                               {i === 0 && <span className="absolute -top-3 -right-2 text-2xl">👑</span>}
                             </div>
                             <div className="flex flex-col">
                               <span className={\`font-black tracking-tight text-lg \${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-gray-200'}\`}>
                                  {u.displayName || 'Unknown Player'}
                               </span>
                               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isOldWeek ? 'Last Week Leader' : 'Active'}</span>
                             </div>
                           </div>
                           <div className="text-right flex flex-col items-end shrink-0">
                             <MPointBadge points={displayScore} size="lg" />
                           </div>
                         </div>
                       );`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
