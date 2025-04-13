import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, ADMIN_EMAIL } from '../firebase';
import { doc, getDoc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { User, UserPermissions } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, permissions: UserPermissions) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Uğurla daxil oldunuz');
    } catch (error) {
      toast.error('Giriş zamanı xəta baş verdi');
      throw error;
    }
  };

  const createUser = async (email: string, password: string, permissions: UserPermissions) => {
    if (!isAdmin) {
      toast.error('Bu əməliyyat üçün icazəniz yoxdur');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        uid: userCredential.user.uid,
        email: email,
        permissions: permissions,
        createdAt: new Date(),
      };

      await setDoc(doc(collection(db, 'users'), userCredential.user.uid), newUser);
      toast.success('İstifadəçi uğurla yaradıldı');
    } catch (error) {
      toast.error('İstifadəçi yaradılarkən xəta baş verdi');
      throw error;
    }
  };

  const updateUserPermissions = async (userId: string, permissions: UserPermissions) => {
    if (!isAdmin) {
      toast.error('Bu əməliyyat üçün icazəniz yoxdur');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { permissions });
      toast.success('İstifadəçi icazələri yeniləndi');
    } catch (error) {
      toast.error('İcazələr yenilənərkən xəta baş verdi');
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Şifrə yeniləmə linki email ünvanınıza göndərildi');
    } catch (error) {
      toast.error('Şifrə yeniləmə zamanı xəta baş verdi');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Uğurla çıxış etdiniz');
    } catch (error) {
      toast.error('Çıxış zamanı xəta baş verdi');
      throw error;
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  const value = {
    user,
    userData,
    signIn,
    signOut,
    createUser,
    updateUserPermissions,
    resetPassword,
    isAdmin,
    isLoading: loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};