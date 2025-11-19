import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  token: string | null;
  isLoading: boolean;
  activeRole: 'leader' | 'user';
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  setActiveRole: (role: 'leader' | 'user') => Promise<void>;
  isLeaderMode: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<'leader' | 'user'>('user');

  // ✅ Load persisted auth from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const [storedToken, storedUser, storedRole] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('user_data'),
          AsyncStorage.getItem('active_role'),
        ]);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // 🔐 Only restore leader mode if user is actually a leader
          if (parsedUser.role === 'leader' && storedRole === 'leader') {
            setActiveRoleState('leader');
          } else {
            setActiveRoleState('user');
          }
        }
      } catch (error) {
        console.error('Error loading auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 🔐 Secure login
  const login = async (accessToken: string, userData: User) => {
    if (!accessToken) throw new Error('Missing auth token');

    try {
      const defaultRole: 'leader' | 'user' = userData.role === 'leader' ? 'leader' : 'user';

      await AsyncStorage.multiSet([
        ['auth_token', accessToken],
        ['user_data', JSON.stringify(userData)],
        ['active_role', defaultRole],
      ]);

      setToken(accessToken);
      setUser(userData);
      setActiveRoleState(defaultRole);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // 🚪 Logout user
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'active_role']);
      setUser(null);
      setToken(null);
      setActiveRoleState('user');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // 👤 Update user info
  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user) return;
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // 🔄 Secure role switching
  const setActiveRole = async (role: 'leader' | 'user') => {
    if (!user) return;

    // 🔒 Only allow switching if backend role is leader
    if (user.role !== 'leader') {
      console.warn('Unauthorized role switch attempt blocked.');
      setActiveRoleState('user');
      await AsyncStorage.setItem('active_role', 'user');
      return;
    }

    try {
      setActiveRoleState(role);
      await AsyncStorage.setItem('active_role', role);
      console.log(`🌍 Global mode switched to: ${role}`);
    } catch (error) {
      console.error('Error setting active role:', error);
    }
  };

  const isLeaderMode = () => activeRole === 'leader';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeRole,
        login,
        logout,
        updateUser,
        setActiveRole,
        isLeaderMode,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
