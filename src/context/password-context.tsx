'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'admin-password';
const DEFAULT_PASSWORD = '123123';

interface PasswordContextType {
  password: string;
  updatePassword: (newPassword: string) => boolean;
  isLoaded: boolean;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider = ({ children }: { children: ReactNode }) => {
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    try {
      const storedPassword = localStorage.getItem(STORAGE_KEY);
      if (storedPassword) {
        setPassword(storedPassword);
      } else {
        // If no password is set, use the default and store it
        localStorage.setItem(STORAGE_KEY, DEFAULT_PASSWORD);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  const updatePassword = useCallback((newPassword: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, newPassword);
      setPassword(newPassword);
      return true;
    } catch (error) {
      console.error("Could not save password to localStorage:", error);
      return false;
    }
  }, []);

  const value = { password, updatePassword, isLoaded };

  return (
    <PasswordContext.Provider value={value}>
      {children}
    </PasswordContext.Provider>
  );
};

export const useSharedPassword = () => {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('useSharedPassword must be used within a PasswordProvider');
  }
  return context;
};
