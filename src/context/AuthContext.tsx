import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ===================== TYPES ===================== */

interface User {
  id: string;
  first_name: string;
  last_name: string;
  contact: string;
  role: 'leader' | 'user' | 'admin';
  avatar_url?: string;
  bio?: string;
  is_live?: boolean;
  is_online?: boolean;
  dob?: string;
  village_id?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  activeRole: 'leader' | 'user';
  login: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  setActiveRole: (role: 'leader' | 'user') => Promise<void>;
  updateAccessToken: (token: string) => Promise<void>;
  isLeaderMode: () => boolean;
}

/* ===================== CONSTANTS ===================== */

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const ROLE_KEY = 'active_role';

// 👇 1. ADD THIS GLOBAL BRIDGE
// This allows Axios (outside React) to call these functions
export const authActions = {
  logout: () => {},
  updateToken: (token: string) => {},
};

/* ===================== CONTEXT ===================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ===================== PROVIDER ===================== */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<'leader' | 'user'>('user');
  const [isLoading, setIsLoading] = useState(true);

  /* ---------- INITIALIZE AUTH ---------- */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [storedAccess, storedRefresh, storedUser, storedRole] = await Promise.all([
          AsyncStorage.getItem(ACCESS_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(ROLE_KEY),
        ]);

        if (storedAccess && storedRefresh && storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setAccessToken(storedAccess);
          setUser(parsedUser);
          if (parsedUser.role === 'leader' && storedRole === 'leader') {
            setActiveRoleState('leader');
          } else {
            setActiveRoleState('user');
          }
        }
      } catch (err) {
        console.error('❌ Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  /* ---------- HELPER FUNCTIONS ---------- */
  const updateAccessToken = async (newToken: string) => {
    setAccessToken(newToken);
    await AsyncStorage.setItem(ACCESS_KEY, newToken);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY, ROLE_KEY]);
    setUser(null);
    setAccessToken(null);
    setActiveRoleState('user');
  };

  // 👇 2. CONNECT BRIDGE TO STATE
  // Whenever the provider mounts, we link the global actions to the state functions
  useEffect(() => {
    authActions.logout = logout;
    authActions.updateToken = updateAccessToken;
  }, [logout]); // dependencies

  /* ---------- LOGIN ---------- */
  const login = async (newAccessToken: string, newRefreshToken: string, userData: User) => {
    const defaultRole: 'leader' | 'user' = userData.role === 'leader' ? 'leader' : 'user';
    await AsyncStorage.multiSet([
      [ACCESS_KEY, newAccessToken],
      [REFRESH_KEY, newRefreshToken],
      [USER_KEY, JSON.stringify(userData)],
      [ROLE_KEY, defaultRole],
    ]);
    setAccessToken(newAccessToken);
    setUser(userData);
    setActiveRoleState(defaultRole);
  };

  /* ---------- UPDATE USER ---------- */
  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  /* ---------- ROLE SWITCHING ---------- */
  const setActiveRole = async (role: 'leader' | 'user') => {
    if (!user) return;
    if (user.role !== 'leader') {
      setActiveRoleState('user');
      await AsyncStorage.setItem(ROLE_KEY, 'user');
      return;
    }
    setActiveRoleState(role);
    await AsyncStorage.setItem(ROLE_KEY, role);
  };

  const isLeaderMode = () => activeRole === 'leader';

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        activeRole,
        login,
        logout,
        updateUser,
        setActiveRole,
        updateAccessToken,
        isLeaderMode,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ===================== HOOK ===================== */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
