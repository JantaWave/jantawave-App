import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_KEYS, APP_KEYS } from '@/src/constants/storage';

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
  address?: any;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  activeRole: 'leader' | 'user';
  login: (
    accessToken: string,
    refreshToken: string,
    userData: User,
    sessionId: string
  ) => Promise<void>;
  localLogout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  setActiveRole: (role: 'leader' | 'user') => Promise<void>;
  updateAccessToken: (token: string) => Promise<void>;
  isLeaderMode: () => boolean;
}

/* ===================== GLOBAL BRIDGE ===================== */
// Allows Axios (outside React) to call these functions
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
          AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN),
          AsyncStorage.getItem(AUTH_KEYS.USER_DATA),
          AsyncStorage.getItem(AUTH_KEYS.USER_ROLE),
          // AUTH_KEYS.SESSION_ID will be read directly by axios interceptor when needed
        ]);

        if (storedAccess && storedRefresh && storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setAccessToken(storedAccess);
          setUser(parsedUser);

          // Restore role state
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

  /* ---------- HELPERS ---------- */

  const updateAccessToken = async (newToken: string) => {
    setAccessToken(newToken);
    await AsyncStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, newToken);
  };

  const localLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        AUTH_KEYS.ACCESS_TOKEN,
        AUTH_KEYS.REFRESH_TOKEN,
        AUTH_KEYS.USER_DATA,
        AUTH_KEYS.USER_ROLE,
        AUTH_KEYS.SESSION_ID, // ✅ important for server session revoke
        APP_KEYS.SEARCH_HISTORY,
        APP_KEYS.EXPO_PUSH_TOKENS, // ✅ make sure this key exists in storage constants
      ]);

      setUser(null);
      setAccessToken(null);
      setActiveRoleState('user');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setAccessToken(null);
      setActiveRoleState('user');
    }
  };

  /* ---------- CONNECT BRIDGE FOR AXIOS ---------- */
  useEffect(() => {
    authActions.logout = localLogout;
    authActions.updateToken = updateAccessToken;
  }, []);

  /* ---------- LOGIN ---------- */
  const login = async (
    newAccessToken: string,
    newRefreshToken: string,
    userData: User,
    sessionId: string
  ) => {
    const defaultRole: 'leader' | 'user' = userData.role === 'leader' ? 'leader' : 'user';

    try {
      await AsyncStorage.multiSet([
        [AUTH_KEYS.ACCESS_TOKEN, newAccessToken],
        [AUTH_KEYS.REFRESH_TOKEN, newRefreshToken],
        [AUTH_KEYS.USER_DATA, JSON.stringify(userData)],
        [AUTH_KEYS.SESSION_ID, sessionId],
        [AUTH_KEYS.USER_ROLE, defaultRole],
      ]);

      setAccessToken(newAccessToken);
      setUser(userData);
      setActiveRoleState(defaultRole);
    } catch (error) {
      console.error('Login storage error:', error);
    }
  };

  /* ---------- UPDATE USER ---------- */
  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    await AsyncStorage.setItem(AUTH_KEYS.USER_DATA, JSON.stringify(updatedUser));
  };

  /* ---------- ROLE SWITCHING ---------- */
  const setActiveRole = async (role: 'leader' | 'user') => {
    if (!user) return;

    // Security check: simple users cannot become leaders locally
    if (user.role !== 'leader') {
      setActiveRoleState('user');
      await AsyncStorage.setItem(AUTH_KEYS.USER_ROLE, 'user');
      return;
    }

    setActiveRoleState(role);
    await AsyncStorage.setItem(AUTH_KEYS.USER_ROLE, role);
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
        localLogout,
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
