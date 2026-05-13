import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
  currentWeekId: string;
  weeklyMPoints: number;
  totalMPoints: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  addPoints: (points: number) => Promise<{ sessionPoints: number, mPointsEarned: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getCurrentWeekId = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (firebaseUser: User, isGuestMatch?: boolean, customName?: string) => {
    const currentWeekId = getCurrentWeekId();
    const isGuest = isGuestMatch !== undefined ? isGuestMatch : firebaseUser.isAnonymous;
    
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Week change logic -> reset weekly points if week changed
        if (data.currentWeekId !== currentWeekId) {
           data.currentWeekId = currentWeekId;
           data.weeklyMPoints = 0; // Reset for new week
           await updateDoc(userRef, { currentWeekId, weeklyMPoints: 0 });
        }
        setProfile(data);
      } else {
        // Enforce unique displayName only if user requests a specific one or fallback
        const requestedName = customName || firebaseUser.displayName || (isGuest ? 'Guest User' : 'Player');
        // We query strictly since displayName uniqueness is requested
        let finalName = requestedName;
        if (!isGuest && requestedName !== 'Guest User' && requestedName !== 'Player') {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'users'), where('displayName', '==', requestedName));
          const colSnap = await getDocs(q);
          if (!colSnap.empty) {
             finalName = `${requestedName}_${Math.floor(Math.random() * 10000)}`;
          }
        }

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: finalName,
          photoURL: firebaseUser.photoURL || '',
          isGuest,
          currentWeekId,
          weeklyMPoints: 0,
          totalMPoints: 0
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      }
    } catch (e: any) {
      console.error('fetchOrCreateProfile error:', e.message);
      throw e;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchOrCreateProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await fetchOrCreateProfile(cred.user, false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
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
  };

  const signInAsGuest = async () => {
    const cred = await signInAnonymously(auth);
    await fetchOrCreateProfile(cred.user, true);
  };

  const logout = () => signOut(auth);

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, updates);
      setProfile({ ...profile, ...updates });
    } catch (e: any) {
      console.error('updateProfileData error:', e.message);
      throw e;
    }
  };

  const addPoints = async (rawPoints: number) => {
     if (!user || !profile || profile.isGuest) return { sessionPoints: rawPoints, mPointsEarned: 0 };
     
     // 100 raw points = 1 M Point
     // But we will add rawPoints to total and M points are derived by dividing by 100?
     // Actually M points are updated immediately if user earns them.
     // Wait, the specification says "aise 100 points ko mila ke bane 1 point of leaderboard and leader board banega jise bolenge M point"
     // So if user gets 10 points this game, we need to track raw points to convert to M points.
     // Let's store raw points or just fractional MPoints? 
     // Let's store raw point fraction (0.1 M points per 10 points). 
     // 1 M Point = 100 points. MPoints = rawPoints / 100.
     // Let's sum points and update.
     
     const mPointsToAdd = rawPoints / 100;
     const currentWeekId = getCurrentWeekId();
     let newWeekly = profile.weeklyMPoints;
     if (profile.currentWeekId !== currentWeekId) {
        newWeekly = 0;
     }

     const updates: Partial<UserProfile> = {
        currentWeekId,
        weeklyMPoints: newWeekly + mPointsToAdd,
        totalMPoints: profile.totalMPoints + mPointsToAdd
     };
     
     await updateProfileData(updates);
     return { sessionPoints: rawPoints, mPointsEarned: mPointsToAdd };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInAsGuest, signInWithEmail, signUpWithEmail, logout, updateProfileData, addPoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
