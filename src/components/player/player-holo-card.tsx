'use client';

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Shield, TrendingUp, Zap, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Team, WithId, SeasonRecord } from "@/lib/types";

export interface PlayerTierConfig {
  id: string;
  title: string;
  badgeTitle: string;
  color: string;
  borderColor: string;
  accentGlow: string;
  bgBadge: string;
  bgPill: string;
  hudBar: string;
  players?: any[];
}

interface PlayerHoloCardProps {
  player: any;
  team: WithId<Team> | null | undefined;
  tier: PlayerTierConfig;
  wonSeasons: SeasonRecord[];
  isAdmin: boolean;
  onEdit: (player: WithId<Player>) => void;
  onDelete: (player: WithId<Player>) => void;
  editLabel: string;
}

export const PlayerHoloCard = ({
  player,
  team,
  tier,
  wonSeasons,
  isAdmin,
  onEdit,
  onDelete,
  editLabel
}: PlayerHoloCardProps) => {
  const hasWins = wonSeasons.length > 0;
  const winRate = player.winRate || 0;
  const goalsPerMatch = player.overallPlayed > 0 
    ? ((player.overallGoalsFor || 0) / player.overallPlayed).toFixed(1) 
    : '0.0';

  return (
    <div className="group relative">
      {/* Ambient Holographic Aura Glow on Hover */}
      <div className={cn(
        "absolute -inset-1 rounded-[2.2rem] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700 pointer-events-none bg-gradient-to-b",
        tier.accentGlow
      )} />

      <Card className={cn(
        "relative flex flex-col h-full bg-gradient-to-b from-[#0B1526]/90 via-[#070D18]/95 to-[#040810] border border-white/10 rounded-[2.2rem] overflow-hidden transition-all duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.8)]",
        tier.borderColor,
        "hover:-translate-y-1.5"
      )}>
        {/* Top Laser Accent Line */}
        <div className={cn("h-1 w-full", tier.hudBar)} />

        {/* Card Header & Avatar Area */}
        <div className="relative pt-6 pb-4 px-6 flex flex-col items-center overflow-hidden">
          {/* Background Watermark Player Name */}
          <span className="absolute top-2 left-4 text-5xl font-black text-white/[0.02] uppercase tracking-tighter whitespace-nowrap pointer-events-none group-hover:text-white/[0.05] transition-colors select-none">
            {player.name}
          </span>

          {/* Top Card Badge / Rank Pill */}
          <div className="w-full flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-1.5">
              {player.isCalibrated && player.ovrRank ? (
                <>
                  <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border", tier.bgPill)}>
                    #{player.ovrRank} RANK
                  </Badge>
                  {player.ovrRank <= 3 && (
                    <Medal className={cn(
                      "w-4 h-4",
                      player.ovrRank === 1 ? "text-yellow-400" :
                      player.ovrRank === 2 ? "text-slate-300" : "text-amber-600"
                    )} />
                  )}
                </>
              ) : (
                <Badge className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-300 border-slate-500/30">
                  {player.overallPlayed || 0}/20 LAGA
                </Badge>
              )}
            </div>

            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
              ID_{player.id.slice(0, 5)}
            </span>
          </div>

          {/* Avatar with OVR Hex Badge */}
          <div className="relative z-10 mb-3">
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-20 opacity-0 group-hover:opacity-30 transition-opacity">
              <div className={cn("w-full h-1 blur-[1px] animate-scanning", tier.hudBar)} />
            </div>

            <Avatar className={cn(
              "h-24 w-24 border-2 transition-all duration-500 shadow-2xl scale-100 group-hover:scale-105",
              !player.isCalibrated ? "border-slate-500/40 group-hover:border-slate-400" :
              tier.color.includes('yellow') ? "border-yellow-400/50 group-hover:border-yellow-400" :
              tier.color.includes('primary') ? "border-primary/50 group-hover:border-primary" :
              tier.color.includes('accent') ? "border-accent/50 group-hover:border-accent" :
              "border-rose-400/50 group-hover:border-rose-400"
            )}>
              <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
              <AvatarFallback className="bg-black/80 font-black text-white/30 text-xl">
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className={cn(
              "absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl flex flex-col items-center justify-center border-2 border-[#0A192F] shadow-2xl transition-transform duration-500 group-hover:scale-110",
              tier.bgBadge
            )}>
              <span className="text-[7px] font-black leading-none uppercase tracking-tighter opacity-70">OVR</span>
              {player.isCalibrated ? (
                <span className="text-base font-black leading-none italic tabular-nums tracking-tighter mt-0.5">
                  {player.ovrRating.toFixed(0)}
                </span>
              ) : (
                <span className="text-[9px] font-black leading-none uppercase tracking-tighter text-slate-300 mt-1">
                  N/C
                </span>
              )}
            </div>
          </div>

          {/* Player Identity */}
          <div className="text-center space-y-1.5 z-10 w-full px-2">
            <h3 className={cn(
              "font-black text-xl tracking-tight uppercase italic truncate transition-colors",
              "text-white group-hover:text-white"
            )}>
              {player.name}
            </h3>
            <div className="flex items-center justify-center gap-2">
              {team ? (
                <Badge variant="outline" className={cn(
                  "bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest gap-1 py-0.5 px-2.5 rounded-full text-white/80"
                )}>
                  <Shield className="w-2.5 h-2.5 text-primary" />
                  <span className="truncate max-w-[130px]">{team.name}</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 py-0.5 px-2.5 rounded-full">
                  Free Agent
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Card Content & Telemetry Section */}
        <CardContent className="flex-grow space-y-4 px-5 pb-5 pt-2 relative z-10">
          <div className="space-y-1.5 bg-black/40 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
              <span className="text-white/40 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" /> Victory Rate
              </span>
              <span className={cn("font-mono font-black italic", tier.color)}>
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", tier.hudBar)} 
                style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/20 hover:border-emerald-500/50 transition-colors">
              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">WIN</span>
              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                {player.overallWin || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-0.5">DRAW</span>
              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                {player.overallDraw || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-rose-500/20 hover:border-rose-500/50 transition-colors">
              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-rose-400 mb-0.5">LOSS</span>
              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                {player.overallLoss || 0}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-white/40">Total Goals</span>
                <span className="text-lg font-black italic tabular-nums text-white leading-none">
                  {player.overallGoalsFor || 0} <span className="text-[9px] font-normal text-white/40">PTS</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-white/40">Per Match</span>
              <span className="text-sm font-black font-mono text-primary italic leading-none">
                {goalsPerMatch}
              </span>
            </div>
          </div>

          <div className={cn(
            "rounded-2xl p-3 border transition-all relative overflow-hidden",
            hasWins 
              ? "bg-yellow-400/10 border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.05)]" 
              : "bg-white/[0.02] border-white/5"
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Trophy className={cn("w-3 h-3", hasWins ? "text-yellow-400" : "text-white/30")} />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest",
                  hasWins ? "text-yellow-400" : "text-white/40"
                )}>
                  Championship Legacy
                </span>
              </div>
              <span className="text-[9px] font-black font-mono text-white/60">
                {hasWins ? `${wonSeasons.length} TITLES` : '0 TITLES'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
              {hasWins ? (
                wonSeasons.map(rec => (
                  <Badge 
                    key={rec.seasonId}
                    className="bg-yellow-400/20 border-yellow-400/40 text-yellow-400 text-[8px] font-black uppercase tracking-tight py-0 px-2 rounded-md"
                  >
                    🏆 {rec.seasonName}
                  </Badge>
                ))
              ) : (
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">
                  Menunggu gelar pertama
                </span>
              )}
            </div>
          </div>

          {!player.isCalibrated && (
            <div className="rounded-2xl p-2.5 bg-slate-500/10 border border-slate-500/20 text-center space-y-1">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400">
                <span>PROVISIONAL STATUS</span>
                <span className="text-white font-mono">{player.overallPlayed || 0} / 20</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((player.overallPlayed || 0) / 20) * 100)}%` }} 
                />
              </div>
              <span className="block text-[7.5px] font-bold text-slate-400/80 italic leading-tight">
                Butuh {Math.max(0, 20 - (player.overallPlayed || 0))} laga resmi lagi untuk kalkulasi OVR
              </span>
            </div>
          )}
        </CardContent>

        {isAdmin && (
          <CardFooter className="grid grid-cols-2 gap-2 p-3 border-t border-white/10 bg-black/80 rounded-b-[2.2rem]">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(player)}
              className="font-black text-[9px] uppercase tracking-widest h-9 rounded-xl border border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              {editLabel}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(player)}
              className="font-black text-[9px] uppercase tracking-widest h-9 rounded-xl border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/40 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
