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
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { Season, WithId } from '@/lib/types';

interface GenerateFixturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSeason: WithId<Season> | null;
  participantCount: number;
  hasFixtures: boolean;
  onGenerate: () => void;
}

export const GenerateFixturesDialog = ({
  open,
  onOpenChange,
  activeSeason,
  participantCount,
  hasFixtures,
  onGenerate,
}: GenerateFixturesDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-indigo-500/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_90px_rgba(99,102,241,0.3)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.9)] pointer-events-none" />
        
        <div className="p-6 sm:p-7 space-y-5">
          <AlertDialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <AlertDialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                  Fixture Generator <span className="text-indigo-400">Matrix</span>
                </AlertDialogTitle>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400/80 font-mono">
                  RADAR_CALIBRATION // MISSION_DISPATCH
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
              Tindakan ini akan menggenerasikan seluruh jadwal pertandingan liga secara otomatis dan acak.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Telemetry Status Pod */}
          <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl space-y-2 font-mono text-[10px]">
            <div className="flex justify-between items-center text-white/50">
              <span>TARGET_EDITION:</span>
              <span className="text-white font-bold">{activeSeason?.name}</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>COMPETITION_FORMAT:</span>
              <span className="text-indigo-400 font-bold uppercase">{activeSeason?.type || 'Single'}</span>
            </div>
            <div className="flex justify-between items-center text-white/50">
              <span>ROSTER_REGISTERED:</span>
              <span className="text-primary font-bold">{participantCount} Atlet</span>
            </div>
            {hasFixtures && (
              <div className="pt-2 border-t border-red-500/20 text-red-400 flex items-center gap-1.5 text-[9px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>PERINGATAN: Jadwal lama akan di-reset dan ditimpa!</span>
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex-row gap-2 pt-1">
            <AlertDialogCancel className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white transition-all">
              BATALKAN // STANDBY
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={onGenerate} 
              className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>GENERATE FIXTURES</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
