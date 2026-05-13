const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <div className="text-center mb-8 mt-2">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome!</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">Sign in to track progress and climb the leaderboard or play as a guest.</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={async () => {
                    await signInWithGoogle();
                    setShowAuthModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-[#0A0F1A] hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-900 dark:text-white rounded-2xl font-bold transition-all border border-slate-900/10 dark:border-white/5 shadow-sm active:scale-95"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#4CAF50" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBC02D" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#E53935" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-4 py-2 opacity-50">
                  <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                  <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">or</span>
                  <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                </div>
                <button
                  onClick={async () => {
                    await signInAsGuest();
                    setShowAuthModal(false);
                  }}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 rounded-2xl font-bold transition-all shadow-md active:scale-95"
                >
                  Play as Guest
                </button>
              </div>`;

const replacement = `              <div className="text-center mb-8 mt-2">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome!</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">Sign in to track progress and climb the leaderboard or play as a guest.</p>
              </div>

              {!emailMode ? (
                <div className="space-y-4">
                  <button
                    onClick={async () => {
                      await signInWithGoogle();
                      setShowAuthModal(false);
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-[#0A0F1A] hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-900 dark:text-white rounded-2xl font-bold transition-all border border-slate-900/10 dark:border-white/5 shadow-sm active:scale-95"
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
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-[#0A0F1A] hover:bg-slate-100 dark:hover:bg-[#1a2333] text-slate-900 dark:text-white rounded-2xl font-bold transition-all border border-slate-900/10 dark:border-white/5 shadow-sm active:scale-95"
                  >
                    Continue with Email
                  </button>
                  <div className="flex items-center gap-4 py-2 opacity-50">
                    <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                    <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">or</span>
                    <div className="h-[1px] flex-1 bg-slate-900 border-t border-slate-200 dark:border-white/10" />
                  </div>
                  <button
                    onClick={async () => {
                      await signInAsGuest();
                      setShowAuthModal(false);
                    }}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100 rounded-2xl font-bold transition-all shadow-md active:scale-95"
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
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                    />
                  )}
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={passInput} 
                    onChange={(e) => setPassInput(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all font-bold"
                  />
                  <button
                    onClick={async () => {
                      setAuthError('');
                      try {
                        if (isSignUp) {
                          await signUpWithEmail(emailInput, passInput, nameInput);
                        } else {
                          await signInWithEmail(emailInput, passInput);
                        }
                        setShowAuthModal(false);
                      } catch (err) {
                        setAuthError(err.message);
                      }
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95"
                  >
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </button>
                  <div className="pt-2 flex justify-between items-center">
                    <button onClick={() => setEmailMode(false)} className="text-slate-500 dark:text-gray-400 text-sm hover:text-slate-900 dark:hover:text-white font-bold transition-colors">← Back</button>
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 text-sm font-bold hover:text-blue-400 transition-colors">
                      {isSignUp ? 'Already have an account?' : 'Create an account'}
                    </button>
                  </div>
                </div>
              )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
