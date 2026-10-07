"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaContextType {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  installApp: () => Promise<void>;
  showIosInstruction: boolean;
  setShowIosInstruction: (show: boolean) => void;
  showInstallHelp: boolean;
  setShowInstallHelp: (show: boolean) => void;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isStandalone: false,
  isIos: false,
  installApp: async () => {},
  showIosInstruction: false,
  setShowIosInstruction: () => {},
  showInstallHelp: false,
  setShowInstallHelp: () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstruction, setShowIosInstruction] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // Check if running in standalone mode (already installed)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(iosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error', err);
        setShowInstallHelp(true);
      }
    } else if (isIos) {
      setShowIosInstruction(true);
    } else {
      setShowInstallHelp(true);
    }
  };

  // Show button once mounted on client unless running as standalone app
  const canInstall = mounted ? !isStandalone : true;

  return (
    <PwaContext.Provider
      value={{
        canInstall,
        isStandalone,
        isIos,
        installApp,
        showIosInstruction,
        setShowIosInstruction,
        showInstallHelp,
        setShowInstallHelp,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
