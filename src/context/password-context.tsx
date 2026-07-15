
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AdminConfig } from '@/lib/types';

const PASSWORD_DOC_PATH = 'appConfig/admin';

interface PasswordContextType {
  password?: string;
  updatePassword: (newPassword: string) => boolean;
  isDeactivated: boolean;
  updateDeactivationStatus: (status: boolean) => boolean;
  isLoaded: boolean;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();

  const passwordDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, PASSWORD_DOC_PATH) : null),
    [firestore]
  );
  const { data: configData, isLoading: isConfigLoading } = useDoc<AdminConfig>(passwordDocRef);
  
  const updatePassword = useCallback((newPassword: string) => {
    if (!passwordDocRef) return false;
    
    setDocumentNonBlocking(passwordDocRef, { password: newPassword }, { merge: true });
    return true;
  }, [passwordDocRef]);

  const updateDeactivationStatus = useCallback((status: boolean) => {
    if (!passwordDocRef) return false;
    updateDocumentNonBlocking(passwordDocRef, { isDeactivated: status });
    return true;
  }, [passwordDocRef]);

  const value = useMemo(() => ({ 
      password: configData?.password, 
      updatePassword,
      isDeactivated: !!configData?.isDeactivated,
      updateDeactivationStatus,
      isLoaded: !isConfigLoading 
  }), [configData, updatePassword, updateDeactivationStatus, isConfigLoading]);

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
