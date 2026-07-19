import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '@/api/auth';
import { disconnectSocket } from '@/socket/socket';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `isBootstrapping` covers the brief window on app load where we try to
  // silently restore a session from the refresh-token cookie — routes
  // should show a loading state rather than flash the login page.
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await authApi.refresh(); // exchanges the httpOnly cookie for a fresh access token
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        // No valid session — that's fine, user just sees the login page.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Raised by the axios interceptor when a refresh attempt fails mid-session
  // (e.g. the refresh token finally expired). Drops the user back to logged-out.
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      disconnectSocket();
    };
    window.addEventListener('taskforge:session-expired', handleExpired);
    return () => window.removeEventListener('taskforge:session-expired', handleExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authApi.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const newUser = await authApi.signup(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    disconnectSocket();
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
