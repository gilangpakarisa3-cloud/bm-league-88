'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Play, Check } from 'lucide-react';
import type { Season, WithId } from '@/lib/types';

interface StartSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSeason: WithId<Season> | null;
  participantCount: number;
  matchesCount: number;
  onStartSeason: () => void;
}

export const StartSeasonDialog = ({
  open,
  onOpenChange,
  activeSeason,
  participantCount,
  matchesCount,
  onStartSeason,
}: StartSeasonDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-primary/50 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.4)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />
        
        <div className="p-6 sm:p-7 space-y-5">
          <AlertDialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_25px_rgba(204,253,1,0.4)] shrink-0">
                <Play className="w-5 h-5 fill-primary" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                  Apex Launch <span className="text-primary">Countdown</span>
                </AlertDialogTitle>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                  LIGHTS_OUT_AND_AWAY_WE_GO // ACTIVATION
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
              Apakah Anda siap mengaktifkan musim <strong>{activeSeason?.name}</strong>? Status kompetisi akan beralih ke <strong>IN PROGRESS</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Launch Checklist */}
          <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl space-y-2 font-mono text-[10px]">
            <div className="flex items-center justify-between text-white/60">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> ROSTER_VERIFIED:</span>
              <span className="text-primary font-bold">{participantCount} Atlet Terdaftar</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> FIXTURES_LOCKED:</span>
              <span className="text-primary font-bold">{matchesCount} Pertandingan</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> LEAGUE_TABLE:</span>
              <span className="text-primary font-bold">Inisialisasi Standings 0 PTS</span>
            </div>
          </div>

          <AlertDialogFooter className="flex-row gap-2 pt-1">
            <AlertDialogCancel className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white transition-all">
              STANDBY // BATAL
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={onStartSeason} 
              className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-primary hover:bg-primary/90 text-black shadow-[0_0_35px_rgba(204,253,1,0.6)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>APEX LAUNCH // GO ▶</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
