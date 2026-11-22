import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PublicUser } from '../types/campus';
import { authApi, connectionsApi, LoginPayload, SignupPayload } from '../services/api';

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  pendingCount: number;
  login: (payload: LoginPayload) => Promise<PublicUser>;
  signup: (payload: SignupPayload) => Promise<PublicUser>;
  logout: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  refreshPendingCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const overview = await connectionsApi.listOverview();
      setPendingCount(overview.pendingReceivedCount);
    } catch {
      // Ignore silent badge refresh failure
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authApi.restoreSession();
        if (active) {
          setUserState(res.user);
          const overview = await connectionsApi.listOverview().catch(() => null);
          if (active && overview) {
            setPendingCount(overview.pendingReceivedCount);
          }
        }
      } catch {
        if (active) {
          setUserState(null);
          setPendingCount(0);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    setUserState(res.user);
    connectionsApi
      .listOverview()
      .then((o) => setPendingCount(o.pendingReceivedCount))
      .catch(() => {});
    return res.user;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const res = await authApi.signup(payload);
    setUserState(res.user);
    setPendingCount(0);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUserState(null);
    setPendingCount(0);
  }, []);

  const setUser = useCallback((updated: PublicUser) => {
    setUserState(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        pendingCount,
        login,
        signup,
        logout,
        setUser,
        refreshPendingCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
