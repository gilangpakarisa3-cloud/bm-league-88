"use client";

import { usePwa } from '@/context/pwa-context';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function PwaRegister() {
  const { canInstall, isStandalone, isIos, installApp, showIosInstruction, setShowIosInstruction, showInstallHelp, setShowInstallHelp } = usePwa();
  const [showAutoBanner, setShowAutoBanner] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    const hasSeenPrompt = sessionStorage.getItem('pwa_prompt_dismissed');
    if (!hasSeenPrompt && canInstall) {
      const timer = setTimeout(() => {
        setShowAutoBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isStandalone]);

  const handleDismiss = () => {
    setShowAutoBanner(false);
    setShowIosInstruction(false);
    setShowInstallHelp(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    await installApp();
    setShowAutoBanner(false);
  };

  return (
    <>
      {/* Auto prompt Banner for Android / Chrome */}
      {showAutoBanner && !isIos && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#141419]/95 border border-primary/30 backdrop-blur-xl p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-yellow-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(204,253,1,0.4)]">
              <Download className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Install BM LEAGUE 88</p>
              <p className="text-xs text-white/60">Pasang di perangkat agar lebih cepat dibuka</p>
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

      {/* iOS Safari Instructions Modal / Banner */}
      {(showIosInstruction || (showAutoBanner && isIos)) && (
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
            Tekan tombol <span className="font-semibold text-primary underline">Share / Bagikan</span> (ikon kotak panah ke atas) di menu Safari, lalu pilih <span className="font-semibold text-white">"Add to Home Screen"</span> (Tambah ke Layar Utama).
          </p>
        </div>
      )}

      {/* Desktop / Manual Browser Install Guide Dialog */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141419] border border-primary/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
            <button
              onClick={() => setShowInstallHelp(false)}
              className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black font-black">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase italic">Install BM LEAGUE 88</h3>
                <p className="text-xs text-white/50">Panduan Pemasangan Aplikasi Web (PWA)</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-white/80 leading-relaxed">
              <p>
                Aplikasi ini mendukung teknologi <strong>Progressive Web App (PWA)</strong>:
              </p>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                <p className="font-semibold text-primary">Untuk Komputer / Laptop (Chrome, Edge, Brave):</p>
                <p>Klik ikon <strong>Install / Komputer dengan panah ke bawah</strong> di bagian paling kanan address bar browser Anda (di samping tombol bookmark bintang ⭐️).</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                <p className="font-semibold text-primary">Untuk HP Android (Chrome):</p>
                <p>Ketuk menu titik tiga (⋮) di pojok kanan atas browser, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => setShowInstallHelp(false)}
                className="bg-primary text-black font-bold text-xs px-4 h-9"
              >
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
