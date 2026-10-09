import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res?.data?.user) {
            setUser(res.data.user);
          }
        } catch (error) {
          console.warn('Session verification failed, logging out:', error.message);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    const { token: receivedToken, user: receivedUser } = response.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    const { token: receivedToken, user: receivedUser } = response.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = async () => {
    let browserSubscription = null;
    let registeredToCurrentAccount = false;
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        browserSubscription = registration ? await registration.pushManager.getSubscription() : null;
      }
      const status = await notificationService.getSubscriptionStatus(browserSubscription?.endpoint || null);
      registeredToCurrentAccount = Boolean(status.data?.serverRegisteredForBrowser);
    } catch (error) {
      console.warn('Could not verify the push subscription during logout:', error.message);
    }
    if (registeredToCurrentAccount && browserSubscription) {
      try {
        await notificationService.unsubscribePush(browserSubscription.endpoint);
      } catch (error) {
        console.warn('Could not remove the server push subscription during logout:', error.message);
      }
      try {
        await browserSubscription.unsubscribe();
      } catch (error) {
        console.warn('Could not remove the browser push subscription during logout:', error.message);
      }
    }
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateToken = (updatedToken) => {
    setToken(updatedToken);
    localStorage.setItem('token', updatedToken);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    updateUser,
    updateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
