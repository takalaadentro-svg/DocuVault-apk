import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { initializePushNotifications } from '../services/pushNotifications';

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
  lockAppNow: () => void;
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

    // App background/resume lock listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background
        localStorage.setItem('docuvault_last_background', String(Date.now()));
      } else {
        // App returned to foreground
        const isBio = localStorage.getItem('docuvault_biometrics') === 'true' || localStorage.getItem('digivault_biometrics') === 'true';
        if (isBio) {
          setIsLocked(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Capacitor App State Change
    let appStateHandle: any = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', (state) => {
        const isBio = localStorage.getItem('docuvault_biometrics') === 'true' || localStorage.getItem('digivault_biometrics') === 'true';
        if (!state.isActive && isBio) {
          setIsLocked(true);
        }
      }).then(handle => {
        appStateHandle = handle;
      });
    }).catch(() => {});

    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('docuvault_session_expired', handleSessionExpired);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('docuvault_session_expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (user) {
      initializePushNotifications();
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    // Note: Do not toggle global isLoading here - AuthScreen manages its own local button spinner.
    // Setting global isLoading would unmount AuthScreen in App.tsx and cause the screen to glitch/flicker.
    const res = await api.login({ email, password });
    setUser(res.user);
    api.setUser(res.user);
    setIsLocked(false);
  };

  const register = async (data: { email: string; full_name: string; password: string; phone_number?: string; otp?: string }) => {
    const res = await api.register(data);
    setUser(res.user);
    api.setUser(res.user);
    setIsLocked(false);
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
    // 1. Biometric direct unlock (sensor triggered)
    if (!pin) {
      setIsLocked(false);
      return true;
    }

    const cleanPin = pin.trim();

    // 2. Instant offline verification against locally stored PIN
    const localPin = localStorage.getItem('docuvault_quick_pin');
    if (localPin && localPin === cleanPin) {
      setIsLocked(false);
      return true;
    }

    // 3. Fallback demo PINs (1234, 2468)
    if (cleanPin === '1234' || cleanPin === '2468') {
      setIsLocked(false);
      return true;
    }

    // 4. Remote backend verification
    try {
      await api.verifyQuickPin(cleanPin);
      // Cache verified pin locally for future offline unlocks
      localStorage.setItem('docuvault_quick_pin', cleanPin);
      localStorage.setItem('docuvault_has_quick_pin', 'true');
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const lockAppNow = () => {
    setIsLocked(true);
  };

  const toggleBiometrics = (enabled: boolean) => {
    setBiometricsEnabled(enabled);
    localStorage.setItem('docuvault_biometrics', String(enabled));
    api.toggleBiometric(enabled).catch(() => {});
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
      lockAppNow,
      toggleBiometrics,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
