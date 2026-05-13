const fs = require('fs');
let content = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

// Imports
content = content.replace(
  "import { User, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';",
  "import { User, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';"
);

// Type
content = content.replace(
  "signInAsGuest: () => Promise<void>;",
  "signInAsGuest: () => Promise<void>;\n  signInWithEmail: (email: string, pass: string) => Promise<void>;\n  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;"
);

// Functions
const gSignIn = "  const signInWithGoogle = async () => {\n    const provider = new GoogleAuthProvider();\n    const cred = await signInWithPopup(auth, provider);\n    await fetchOrCreateProfile(cred.user, false);\n  };";
const eSignIn = `  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await fetchOrCreateProfile(cred.user, false);
  };
  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // Optionally set display name for firebase user? No problem, fetchOrCreateProfile handles falling back.
    // Let's create profile with custom name 
    const currentWeekId = getCurrentWeekId();
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile = {
        uid: cred.user.uid,
        displayName: name || 'Player',
        photoURL: '',
        isGuest: false,
        currentWeekId,
        weeklyMPoints: 0,
        totalMPoints: 0
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    }
  };`;

content = content.replace(gSignIn, gSignIn + "\n\n" + eSignIn);

content = content.replace(
  "signInWithGoogle, signInAsGuest, logout",
  "signInWithGoogle, signInAsGuest, signInWithEmail, signUpWithEmail, logout"
);

fs.writeFileSync('src/lib/AuthContext.tsx', content);
