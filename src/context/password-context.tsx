'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const PASSWORD_DOC_PATH = 'appConfig/admin';

interface PasswordContextType {
  password?: string;
  updatePassword: (newPassword: string) => boolean;
  isLoaded: boolean;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();

  const passwordDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, PASSWORD_DOC_PATH) : null),
    [firestore]
  );
  const { data: passwordData, isLoading: isPasswordLoading } = useDoc<{password: string}>(passwordDocRef);
  
  const updatePassword = useCallback((newPassword: string) => {
    if (!passwordDocRef) return false;
    
    setDocumentNonBlocking(passwordDocRef, { password: newPassword }, {});
    return true;
  }, [passwordDocRef]);

  const value = { 
      password: passwordData?.password, 
      updatePassword, 
      isLoaded: !isPasswordLoading 
  };

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
