'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PopoutWinnerData {
  winnerName: string;
  teamName: string;
  teamLogoUrl: string;
  teamTier: number;
}

interface DraftWinnerModalProps {
  popoutWinner: PopoutWinnerData | null;
  onClose: () => void;
  primaryHex: string;
}

export const DraftWinnerModal = ({
  popoutWinner,
  onClose,
  primaryHex
}: DraftWinnerModalProps) => {
  if (!popoutWinner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#0e1626] to-[#060a12] border rounded-[2rem] p-6 text-center shadow-2xl relative overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-300"
        style={{
          borderColor: `${primaryHex}66`,
          boxShadow: `0 0 50px ${primaryHex}4D`
        }}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{
            background: `linear-gradient(90deg, transparent, ${primaryHex}, transparent)`,
            boxShadow: `0 0 15px ${primaryHex}`
          }}
        />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 mb-4">
          <span 
            className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] italic flex items-center gap-1.5 border"
            style={{
              backgroundColor: `${primaryHex}1A`,
              borderColor: `${primaryHex}66`,
              color: primaryHex,
              boxShadow: `0 0 12px ${primaryHex}4D`
            }}
          >
            <Sparkles className="w-3 h-3 animate-spin-slow" />
            HASIL UNDIAN ROULETTE
          </span>
        </div>

        <div className="relative mb-6">
          <div 
            className="absolute -inset-4 rounded-2xl animate-radar-pulse pointer-events-none border opacity-40"
            style={{ borderColor: primaryHex }}
          />
          <div 
            className="relative px-5 py-2.5 rounded-2xl border"
            style={{
              backgroundColor: `${primaryHex}14`,
              borderColor: `${primaryHex}4D`
            }}
          >
            <span className="text-[8px] font-black uppercase tracking-widest text-white/50 block mb-0.5">
              PESERTA TERPILIH
            </span>
            <h3 
              className="text-xl sm:text-2xl font-black uppercase italic tracking-tight font-headline"
              style={{
                color: '#ffffff',
                textShadow: `0 0 20px ${primaryHex}`
              }}
            >
              {popoutWinner.winnerName}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 w-full px-6">
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(to right, transparent, ${primaryHex}66)` }} />
          <span className="text-[8px] font-black uppercase tracking-widest italic text-white/40">
            MEMPEROLEH KLUB
          </span>
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(to left, transparent, ${primaryHex}66)` }} />
        </div>

        <div 
          className="w-full p-4 rounded-2xl border bg-black/60 flex items-center gap-3.5 mb-6 text-left"
          style={{ borderColor: `${primaryHex}40` }}
        >
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/20 bg-black shadow-xl">
              <AvatarImage src={popoutWinner.teamLogoUrl} className="object-cover" />
              <AvatarFallback className="font-black text-xs">TM</AvatarFallback>
            </Avatar>
            <div 
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border text-black shadow-md font-black text-[9px]"
              style={{ backgroundColor: primaryHex, borderColor: '#ffffff' }}
            >
              <Crown className="w-3 h-3 text-black fill-black" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge className={cn(
                "text-[8px] font-black italic h-4 px-1.5 rounded",
                popoutWinner.teamTier === 1 
                  ? "bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                  : popoutWinner.teamTier === 2 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                    : "bg-white/10 text-white/60"
              )}>
                TIER {popoutWinner.teamTier}
              </Badge>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">OFFICIAL SEED</span>
            </div>
            <h4 
              className="text-base sm:text-lg font-black uppercase italic tracking-tight truncate font-headline"
              style={{ color: primaryHex }}
            >
              {popoutWinner.teamName}
            </h4>
          </div>
        </div>

        <Button
          type="button"
          onClick={onClose}
          className="w-full h-10 font-black uppercase italic text-xs tracking-wider rounded-xl transition-all shadow-xl font-headline text-black hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: primaryHex,
            boxShadow: `0 0 25px ${primaryHex}80`
          }}
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
          Lanjutkan Draft
        </Button>
      </div>
    </div>
  );
};
