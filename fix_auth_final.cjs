const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update useAuth extraction to include resetPassword
content = content.replace(
  "const { user, profile, logout, addPoints, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, updateProfileData, loading } = useAuth();",
  "const { user, profile, logout, addPoints, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, updateProfileData, resetPassword, loading } = useAuth();"
);

// Add auth error state clearing
let googleOld = `                    onClick={async () => {
                      await signInWithGoogle();
                      setShowAuthModal(false);
                    }}`;
let googleNew = `                    onClick={async () => {
                      setAuthError('');
                      try { await signInWithGoogle(); setShowAuthModal(false); } catch(e: any) { setAuthError(e.message); }
                    }}`;
content = content.replace(googleOld, googleNew);

let guestOld = `                    onClick={async () => {
                      await signInAsGuest();
                      setShowAuthModal(false);
                    }}`;
let guestNew = `                    onClick={async () => {
                      setAuthError('');
                      try { await signInAsGuest(); setShowAuthModal(false); } catch(e: any) { setAuthError(e.message); }
                    }}`;
content = content.replace(guestOld, guestNew);

// Now for the email button section. Looking at exactly what we grep'd earlier.
let emailButtonsOld = `                    onClick={async () => {
                      setAuthError('');
                      try {
                        if (isSignUp) {
                          await signUpWithEmail(emailInput, passInput, nameInput);
                        } else {
                          await signInWithEmail(emailInput, passInput);
                        }
                        setShowAuthModal(false);
                      } catch (err: any) {
                        setAuthError(err.message);
                      }
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95"
                  >
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </button>
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </button>
                  <button
                    onClick={() => setEmailMode(false)}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    Back
                  </button>`;

let emailButtonsNew = `                    onClick={async () => {
                      setAuthError('');
                      try {
                        if (isSignUp) {
                          await signUpWithEmail(emailInput, passInput, nameInput);
                        } else {
                          await signInWithEmail(emailInput, passInput);
                        }
                        setShowAuthModal(false);
                      } catch (err: any) {
                        setAuthError(err.message);
                      }
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95"
                  >
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </button>
                  
                  {!isSignUp && (
                    <button
                      onClick={async () => {
                        if (!emailInput) { setAuthError('Enter your email first to reset password'); return; }
                        try {
                          await resetPassword(emailInput);
                          setAuthError('Password reset email sent! Check your inbox.');
                        } catch (err: any) {
                          setAuthError(err.message);
                        }
                      }}
                      className="w-full py-2 text-blue-500 hover:text-blue-600 font-bold transition-colors text-sm"
                    >
                      Forgot password / Set password via email?
                    </button>
                  )}

                  <button
                    onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </button>
                  <button
                    onClick={() => { setEmailMode(false); setAuthError(''); }}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    Back
                  </button>`;

if(content.includes(emailButtonsOld)) {
  content = content.replace(emailButtonsOld, emailButtonsNew);
} else {
  // Let's replace just the catch part if the exact string match fails
  const emailButtonsOldAlt = `                    onClick={async () => {
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
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </button>
                  <button
                    onClick={() => setEmailMode(false)}
                    className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                  >
                    Back
                  </button>`;
  
  if (content.includes(emailButtonsOldAlt)) {
      content = content.replace(emailButtonsOldAlt, emailButtonsNew);
  } else {
      console.log('Error replacing email buttons! Check snippet.');
  }
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done modifying App.tsx');
