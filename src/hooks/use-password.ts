
'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'admin-password';
const DEFAULT_PASSWORD = '123123';

export const usePassword = () => {
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Pastikan kode ini hanya berjalan di client
    try {
      const storedPassword = localStorage.getItem(STORAGE_KEY);
      if (storedPassword) {
        setPassword(storedPassword);
      } else {
        // Jika tidak ada kata sandi tersimpan, set default dan simpan
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

  return { password, updatePassword, isLoaded };
};
