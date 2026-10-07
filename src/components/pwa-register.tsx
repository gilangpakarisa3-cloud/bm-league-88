"use client";

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);

  useEffect(() => {
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
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return; // Already installed, do not show banners
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const hasSeenPrompt = sessionStorage.getItem('pwa_prompt_dismissed');

    if (isIos && !hasSeenPrompt) {
      // Delay showing iOS prompt slightly so it's not intrusive immediately
      const timer = setTimeout(() => {
        setShowIosPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    // Handle Android / Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!hasSeenPrompt) {
        setShowAndroidPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowAndroidPrompt(false);
    setShowIosPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Android / Desktop Chrome Install Banner */}
      {showAndroidPrompt && deferredPrompt && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#141419]/95 border border-primary/30 backdrop-blur-xl p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-yellow-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(204,253,1,0.4)]">
              <Download className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Install BM LEAGUE 88</p>
              <p className="text-xs text-white/60">Pasang di HP agar lebih cepat dibuka</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-primary text-black font-bold hover:bg-primary/90 text-xs px-3 h-8 shadow-sm"
            >
              Install
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/50 hover:text-white transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Instructions Banner */}
      {showIosPrompt && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#141419]/95 border border-primary/30 backdrop-blur-xl p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-yellow-400 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4 text-black" />
              </div>
              <p className="text-sm font-bold text-white">Pasang di iPhone / iPad</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-white/50 hover:text-white transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Tekan tombol <span className="font-semibold text-primary underline">Share / Bagikan</span> (ikon kotak panah ke atas) di menu bawah Safari, lalu pilih <span className="font-semibold text-white">"Add to Home Screen"</span> (Tambah ke Layar Utama).
          </p>
        </div>
      )}
    </>
  );
}
