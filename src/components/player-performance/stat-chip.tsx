'use client';

import { cn } from "@/lib/utils";

interface StatChipProps {
  code: string;
  label: string;
  value: string | number;
  variant?: 'default' | 'primary' | 'gold' | 'win' | 'draw' | 'loss';
  primaryHex?: string;
  glowRgba?: string;
  isCrimson?: boolean;
}

export const StatChip = ({
  code,
  label,
  value,
  variant = 'default',
  primaryHex,
  glowRgba,
  isCrimson = false
}: StatChipProps) => {
  const isPrimary = variant === 'primary';
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-2xl border transition-all duration-300 relative overflow-hidden backdrop-blur-md group/stat",
        variant === "gold" ? "bg-amber-500/[0.08] border-amber-500/40 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]" :
        variant === "win" ? "bg-green-500/[0.08] border-green-500/30 hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]" :
        variant === "loss" ? "bg-red-500/[0.08] border-red-500/30 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]" :
        variant === "draw" ? "bg-yellow-500/[0.08] border-yellow-500/30 hover:border-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]" :
        !isPrimary ? "bg-white/[0.03] border-white/10 hover:border-white/20" : ""
      )}
      style={isPrimary && primaryHex ? {
        backgroundColor: `${primaryHex}14`,
        borderColor: `${primaryHex}50`,
        boxShadow: `0 0 16px ${primaryHex}20`
      } : undefined}
    >
      <div className="flex items-center gap-1">
        <span className="text-[7px] font-black uppercase text-white/30 tracking-widest">{code}</span>
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white/60">{label}</span>
      </div>
      <span
        className={cn(
          "text-lg sm:text-2xl font-black italic tabular-nums leading-none mt-1.5 font-headline",
          variant === "gold" ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" :
          variant === "win" ? "text-green-400" :
          variant === "loss" ? "text-red-400" :
          variant === "draw" ? "text-yellow-400" :
          !isPrimary ? "text-white" : ""
        )}
        style={isPrimary && primaryHex ? {
          color: primaryHex,
          textShadow: `0 0 12px ${glowRgba || primaryHex}`
        } : undefined}
        suppressHydrationWarning
      >
        {value}
      </span>
    </div>
  );
};
