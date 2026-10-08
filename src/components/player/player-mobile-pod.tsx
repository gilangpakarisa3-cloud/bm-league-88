'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Trophy, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Team, WithId, SeasonRecord } from "@/lib/types";
import type { PlayerTierConfig } from "./player-holo-card";

interface PlayerMobilePodProps {
  player: any;
  team: WithId<Team> | null | undefined;
  tier: PlayerTierConfig;
  wonSeasons: SeasonRecord[];
  isAdmin: boolean;
  onEdit: (player: WithId<Player>) => void;
  onDelete: (player: WithId<Player>) => void;
}

export const PlayerMobilePod = ({
  player,
  team,
  tier,
  wonSeasons,
  isAdmin,
  onEdit,
  onDelete
}: PlayerMobilePodProps) => {
  const isPodium1 = player.ovrRank === 1;
  const isPodium2 = player.ovrRank === 2;
  const isPodium3 = player.ovrRank === 3;
  const isTopPodium = player.ovrRank !== null && player.ovrRank <= 3;
  const winPercent = player.winRate || 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 backdrop-blur-xl shadow-lg",
        isPodium1 ? "bg-gradient-to-br from-yellow-500/[0.12] via-black/80 to-[#0A192F]/90 border-yellow-400/50 shadow-[0_0_25px_rgba(250,204,21,0.15)]" :
        isPodium2 ? "bg-gradient-to-br from-slate-300/[0.1] via-black/80 to-[#0A192F]/90 border-slate-300/40 shadow-[0_0_20px_rgba(203,213,225,0.12)]" :
        isPodium3 ? "bg-gradient-to-br from-amber-600/[0.1] via-black/80 to-[#0A192F]/90 border-amber-500/40 shadow-[0_0_20px_rgba(217,119,6,0.12)]" :
        "bg-gradient-to-br from-white/[0.04] via-black/85 to-[#0A192F]/80 border-white/10 hover:border-white/20"
      )}
    >
      {/* Futuristic Top Glowing Laser Strip */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isPodium1 ? "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.8)]" :
        isPodium2 ? "bg-gradient-to-r from-slate-300 via-white to-slate-400 shadow-[0_0_12px_rgba(203,213,225,0.8)]" :
        isPodium3 ? "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 shadow-[0_0_12px_rgba(217,119,6,0.8)]" :
        "bg-gradient-to-r from-transparent via-white/20 to-transparent"
      )} />

      {/* Header Row: Rank Badge + Athlete Info + OVR Pod */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            {player.isCalibrated && player.ovrRank ? (
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center font-black italic text-xs tracking-tighter shadow-md",
                isPodium1 ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.6)]" :
                isPodium2 ? "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-black shadow-[0_0_12px_rgba(203,213,225,0.5)]" :
                isPodium3 ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_0_12px_rgba(217,119,6,0.5)]" :
                "bg-white/10 text-white/80 border border-white/15"
              )}>
                {isPodium1 ? <Crown className="w-4 h-4 fill-black" /> : `#${player.ovrRank}`}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs bg-slate-500/15 text-slate-400 border border-slate-500/20">
                -
              </div>
            )}
          </div>

          <div className="relative shrink-0">
            <Avatar className={cn(
              "h-11 w-11 rounded-2xl border-2 shadow-md",
              isTopPodium && player.isCalibrated ? "border-primary/60 shadow-[0_0_15px_rgba(204,253,1,0.3)]" : "border-white/15"
            )}>
              <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
              <AvatarFallback className="bg-black/90 text-xs font-black text-white italic">
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isTopPodium && player.isCalibrated && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(204,253,1,0.9)]">
                <Sparkles className="w-2 h-2 text-black" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <span className="block font-black text-sm uppercase italic tracking-tight text-white truncate drop-shadow-sm font-headline">
              {player.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                {team?.name || 'Free Agent'}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end">
          {player.isCalibrated ? (
            <div className={cn(
              "px-3 py-1.5 rounded-xl bg-black/80 border font-black italic tabular-nums text-lg tracking-tight flex items-baseline gap-1 shadow-inner",
              player.ovrRating >= 70 ? "border-yellow-400/50 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)]" :
              player.ovrRating >= 55 ? "border-primary/50 text-primary shadow-[0_0_15px_rgba(204,253,1,0.25)]" :
              player.ovrRating >= 45 ? "border-accent/50 text-accent shadow-[0_0_15px_rgba(100,255,218,0.25)]" :
              "border-white/15 text-white/80"
            )}>
              <span>{player.ovrRating.toFixed(0)}</span>
              <span className="text-[9px] font-mono opacity-60 not-italic">OVR</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-xl bg-black/60 border border-slate-500/25 font-bold text-[9px] uppercase text-slate-400 tracking-wider">
              N/C
            </div>
          )}
          <div className="mt-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[7.5px] font-black uppercase tracking-[0.15em] italic px-2 py-0.5 rounded-full border whitespace-nowrap",
                tier.bgPill
              )}
            >
              {tier.title}
            </Badge>
          </div>
        </div>
      </div>

      {/* Telemetry Stats Grid: Played, Win, Draw, Loss, Goals */}
      <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-white/10 text-center">
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-1.5">
          <span className="block text-[8px] font-mono text-white/40 uppercase">MAIN</span>
          <span className="font-mono font-black text-xs text-white tabular-nums">{player.overallPlayed || 0}</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-1.5">
          <span className="block text-[8px] font-mono text-emerald-400/60 uppercase">W</span>
          <span className="font-mono font-black text-xs text-emerald-400 tabular-nums">{player.overallWin || 0}</span>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-1.5">
          <span className="block text-[8px] font-mono text-yellow-400/60 uppercase">D</span>
          <span className="font-mono font-black text-xs text-yellow-400 tabular-nums">{player.overallDraw || 0}</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-1.5">
          <span className="block text-[8px] font-mono text-rose-400/60 uppercase">L</span>
          <span className="font-mono font-black text-xs text-rose-400 tabular-nums">{player.overallLoss || 0}</span>
        </div>
        <div className="bg-primary/10 border border-primary/25 rounded-xl p-1.5">
          <span className="block text-[8px] font-mono text-primary/70 uppercase">GOL</span>
          <span className="font-mono font-black text-xs text-primary tabular-nums">{player.overallGoalsFor || 0}</span>
        </div>
      </div>

      {/* Win Rate Progress & Titles Ribbon */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono font-black">
            <span className="text-white/40 uppercase">WIN RATE</span>
            <span className={cn(
              winPercent >= 60 ? "text-primary" :
              winPercent >= 45 ? "text-accent" : "text-white/70"
            )}>
              {winPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-black/70 border border-white/10 rounded-full overflow-hidden p-[1px]">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700",
                winPercent >= 60 ? "bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_8px_rgba(204,253,1,0.8)]" :
                winPercent >= 45 ? "bg-gradient-to-r from-accent/80 to-accent shadow-[0_0_8px_rgba(100,255,218,0.8)]" :
                "bg-gradient-to-r from-white/30 to-white/60"
              )} 
              style={{ width: `${Math.min(100, Math.max(5, winPercent))}%` }} 
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          {wonSeasons.length > 0 ? (
            <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(250,204,21,0.2)]">
              <Trophy className="w-3 h-3 fill-yellow-400/20" />
              <span className="text-[9px] font-black italic">{wonSeasons.length}x JUARA</span>
            </div>
          ) : (
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest px-2">0 TROFI</span>
          )}
        </div>
      </div>

      {/* Admin Action Buttons */}
      {isAdmin && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(player)}
            className="h-7 px-3 text-[9px] font-black uppercase tracking-wider text-white/70 hover:text-primary hover:bg-primary/10 rounded-lg border border-white/10"
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(player)}
            className="h-7 px-3 text-[9px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Hapus
          </Button>
        </div>
      )}
    </div>
  );
};
