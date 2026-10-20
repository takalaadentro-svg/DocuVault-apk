import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLocked: boolean;
  biometricsEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; full_name: string; password: string; phone_number?: string; otp?: string }) => Promise<void>;
  sendOtp: (email: string, purpose?: string) => Promise<{ status: string; message: string; email_dispatched: boolean; dev_code?: string }>;
  verifyOtp: (email: string, otp: string, purpose?: string) => Promise<{ status: string; message: string; verified: boolean }>;
  logout: () => void;
  unlockApp: (pin?: string) => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Immediately restore the user from local storage so the session persists across app restarts!
  const [user, setUser] = useState<User | null>(() => {
    const token = api.getToken();
    return token ? api.getCachedUser() : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const token = api.getToken();
    const cached = api.getCachedUser();
    // If we already have token and cached user, app loads instantly without loading screen
    return !(token && cached);
  });

  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('docuvault_biometrics') === 'true' || localStorage.getItem('digivault_biometrics') === 'true';
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('docuvault_biometrics') === 'true' || localStorage.getItem('digivault_biometrics') === 'true';
  });

  const checkAuth = async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // 15s timeout for Render backend cold-starts
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timed out')), 15000)
      );
      const userData = await Promise.race([api.getMe(), timeoutPromise]);
      setUser(userData);
      api.setUser(userData);
    } catch (e: any) {
      const errMsg = e?.message || '';
      // Only log out if token was rejected as unauthorized (401)
      if (errMsg.includes('401') || errMsg.includes('expired') || errMsg.includes('Unauthorized')) {
        console.warn('Session explicitly expired or invalid, logging out:', e);
        api.setToken(null);
        api.setUser(null);
        setUser(null);
      } else {
        console.info('Server offline, sleeping, or network delay; retaining persistent logged-in session.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    checkAuth();

    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('docuvault_session_expired', handleSessionExpired);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('docuvault_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      api.setUser(res.user);
      setIsLocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; full_name: string; password: string; phone_number?: string; otp?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      api.setUser(res.user);
      setIsLocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string, purpose?: string) => {
    return api.sendOtp(email, purpose);
  };

  const verifyOtp = async (email: string, otp: string, purpose?: string) => {
    return api.verifyOtp(email, otp, purpose);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setIsLocked(false);
  };

  const unlockApp = async (pin?: string): Promise<boolean> => {
    if (!pin) {
      setIsLocked(false);
      return true;
    }
    try {
      await api.verifyQuickPin(pin);
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const toggleBiometrics = (enabled: boolean) => {
    setBiometricsEnabled(enabled);
    localStorage.setItem('docuvault_biometrics', String(enabled));
  };

  const refreshProfile = async () => {
    if (!api.getToken()) return;
    try {
      const u = await api.getMe();
      setUser(u);
      api.setUser(u);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isLocked: isLocked && !!user,
      biometricsEnabled,
      login,
      register,
      sendOtp,
      verifyOtp,
      logout,
      unlockApp,
      toggleBiometrics,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
