'use client';

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ElementType } from 'react';

interface IntelCardProps {
  icon: ElementType;
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "gold";
  tooltip?: string;
  primaryHex?: string;
  glowRgba?: string;
}

export const IntelCard = ({ 
  icon: Icon, 
  label, 
  value, 
  variant = "default", 
  tooltip,
  primaryHex,
  glowRgba
}: IntelCardProps) => {
  const isPrimary = variant === "primary";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className={cn(
            "flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group/intel cursor-help backdrop-blur-md shadow-md hover:scale-[1.02]",
            variant === "gold" ? "bg-amber-500/[0.07] border-amber-500/30 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]" : 
            !isPrimary ? "bg-white/[0.03] border-white/10 hover:border-white/20" : ""
          )}
          style={isPrimary && primaryHex ? {
            backgroundColor: `${primaryHex}12`,
            borderColor: `${primaryHex}45`,
            boxShadow: `0 0 15px ${primaryHex}15`
          } : undefined}
        >
          <div className="flex items-center justify-center gap-1.5 relative z-10">
            <Icon 
              className={cn("w-3.5 h-3.5", variant === "gold" ? "text-amber-400" : !isPrimary ? "text-white/60" : "")} 
              style={isPrimary && primaryHex ? { color: primaryHex } : undefined}
            />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-white/60">{label}</span>
          </div>
          <span 
            className={cn(
              "font-black text-sm sm:text-base uppercase italic leading-none relative z-10 mt-0.5", 
              variant === "gold" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
              !isPrimary ? "text-white" : ""
            )} 
            style={isPrimary && primaryHex ? { 
              color: primaryHex,
              textShadow: `0 0 10px ${glowRgba || primaryHex}`
            } : undefined}
            suppressHydrationWarning
          >
            {value}
          </span>
        </div>
      </PopoverTrigger>
      {tooltip && (
        <PopoverContent 
          className="w-60 text-center bg-black/95 backdrop-blur-2xl rounded-2xl shadow-xl z-50 border"
          style={primaryHex ? { borderColor: `${primaryHex}50` } : undefined}
        >
          <p className="text-[10px] font-bold text-white/80 leading-relaxed">{tooltip}</p>
        </PopoverContent>
      )}
    </Popover>
  );
};
