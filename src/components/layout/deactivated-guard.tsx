
'use client';

import { useSharedPassword } from '@/context/password-context';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Zap, Flame, Scan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function DeactivatedGuard({ children }: { children: React.ReactNode }) {
  const { isDeactivated, isLoaded } = useSharedPassword();
  const pathname = usePathname();

  // If loading, or if the website is active, or if we're on the settings page, allow content
  if (!isLoaded || !isDeactivated || pathname === '/settings') {
    return children;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A192F] flex items-center justify-center p-4">
      {/* Background HUD Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-full h-[3px] bg-red-600 blur-[2px] absolute top-0 left-0 animate-scanning opacity-30" />
      </div>

      <div className="max-w-3xl w-full bg-black/80 border-4 border-red-600 p-10 sm:p-20 relative overflow-hidden shadow-[0_0_150px_rgba(220,38,38,0.3)] text-center backdrop-blur-3xl group">
        {/* HUD Decoration Corners */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-red-600 rounded-tl-sm pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-red-600 rounded-br-sm pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex flex-col items-center gap-4">
              <div className="p-8 bg-red-600/10 rounded-full border-4 border-red-600/40 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                  <ShieldAlert className="w-24 h-24 text-red-600" />
              </div>
              <Badge className="bg-red-600 text-white font-black italic text-xs px-10 h-10 tracking-[0.6em] shadow-xl border-r-4 border-black/20">
                SYSTEM_TERMINATED
              </Badge>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-7xl font-black text-white uppercase italic tracking-tighter leading-none pr-4 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">
              LIGA DI HENTIKAN <br />
              <span className="text-red-600">SAMPAI WAKTU YANNG DI TENTUKAN</span>
            </h1>
            <div className="flex items-center justify-center gap-4 opacity-30">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-white" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Protocol Node 88-HALT</span>
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-white" />
            </div>
          </div>

          <div className="pt-10 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-red-600 fill-red-600 animate-pulse" />
                  <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] italic">Station Broadcast Status: OFFLINE</p>
              </div>
              
              {/* Minimal Admin Access Link */}
              <Link href="/settings" className="text-[8px] font-black text-white/10 hover:text-white/40 transition-colors uppercase tracking-widest mt-8">
                ADMIN_SECURE_OVERRIDE_AUTH
              </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
