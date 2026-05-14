import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
  currentWeekId: string;
  weeklyMPoints: number;
  previousWeeklyMPoints?: number;
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
  resetPassword: (email: string) => Promise<void>;
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
         let updates: any = {};
         
         if (customName && data.displayName === 'Player' && customName !== 'Player') {
             updates.displayName = customName;
         }
         
         if (data.currentWeekId !== currentWeekId) {
             updates.currentWeekId = currentWeekId;
             updates.previousWeeklyMPoints = data.weeklyMPoints || 0;
             updates.weeklyMPoints = 0;
         }
         
         if (Object.keys(updates).length > 0) {
             try {
                await updateDoc(userRef, updates);
             } catch (updateErr) {
                // If it fails (due to old Firestore rules missing previousWeeklyMPoints), fallback:
                if (updates.previousWeeklyMPoints !== undefined) {
                   delete updates.previousWeeklyMPoints;
                   await updateDoc(userRef, updates);
                }
             }
         }
      } else {
        const requestedName = customName || firebaseUser.displayName || (isGuest ? 'Guest User' : 'Player');
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
          previousWeeklyMPoints: 0,
          totalMPoints: 0
        };
        await setDoc(userRef, newProfile);
      }
    } catch (e: any) {
      console.error('fetchOrCreateProfile error:', e.message);
      throw e;
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await fetchOrCreateProfile(currentUser);
        } catch (e) {
          console.error("Failed to fetch/create profile, setting state anyway", e);
        }
        
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
           if (docSnap.exists()) {
             setProfile(docSnap.data() as UserProfile);
           }
        });
      } else {
        setProfile(null);
        if (unsubscribeProfile) {
           unsubscribeProfile();
           unsubscribeProfile = undefined;
        }
      }
      setLoading(false);
    });

    return () => {
       unsubscribeAuth();
       if (unsubscribeProfile) unsubscribeProfile();
    };
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
    if (name && name !== 'Guest User' && name !== 'Player') {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('displayName', '==', name));
      const colSnap = await getDocs(q);
      if (!colSnap.empty) {
        throw new Error('This Display Name is already taken. Please choose another one.');
      }
    }
    
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await fetchOrCreateProfile(cred.user, false, name);
  };

  const signInAsGuest = async () => {
    const cred = await signInAnonymously(auth);
    await fetchOrCreateProfile(cred.user, true);
  };

  const resetPassword = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const logout = () => signOut(auth);

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      if (updates.displayName && updates.displayName !== profile.displayName) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'users'), where('displayName', '==', updates.displayName));
        const colSnap = await getDocs(q);
        if (!colSnap.empty) {
          throw new Error('Name is already taken!');
        }
      }
      
      await updateDoc(userRef, updates);
    } catch (e: any) {
      console.error('updateProfileData error:', e.message);
      throw e;
    }
  };

  const addPoints = async (rawPoints: number) => {
     if (!user || !profile || profile.isGuest) return { sessionPoints: rawPoints, mPointsEarned: 0 };
     
     const mPointsToAdd = rawPoints;
     
     const currentWeekId = getCurrentWeekId();
     let newWeekly = profile.weeklyMPoints;
     let prevWeekly = profile.previousWeeklyMPoints || 0;
     if (profile.currentWeekId !== currentWeekId) {
        prevWeekly = profile.weeklyMPoints;
        newWeekly = 0;
     }

     const updates: Record<string, any> = {
        totalMPoints: increment(mPointsToAdd)
     };

     if (profile.currentWeekId !== currentWeekId) {
        updates.currentWeekId = currentWeekId;
        updates.previousWeeklyMPoints = profile.weeklyMPoints || 0;
        updates.weeklyMPoints = mPointsToAdd; // Reset and add
     } else {
        updates.weeklyMPoints = increment(mPointsToAdd);
     }
     
     try {
       await updateDoc(doc(db, 'users', user.uid), updates);
     } catch (e) {
       // Fallback for old rules
       if (updates.previousWeeklyMPoints !== undefined) {
          delete updates.previousWeeklyMPoints;
          await updateDoc(doc(db, 'users', user.uid), updates);
       } else {
          throw e;
       }
     }
     return { sessionPoints: rawPoints, mPointsEarned: mPointsToAdd };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInAsGuest, signInWithEmail, signUpWithEmail, logout, updateProfileData, addPoints, resetPassword }}>
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
