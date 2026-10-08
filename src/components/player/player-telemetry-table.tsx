'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Trophy, Pencil, Trash2, User, Shield, Flame, TrendingUp, Target, Binary } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Team, WithId, SeasonRecord } from "@/lib/types";
import type { PlayerTierConfig } from "./player-holo-card";

interface PlayerTelemetryTableProps {
  players: any[];
  teamsById: Record<string, WithId<Team>>;
  hallOfFame: SeasonRecord[] | null | undefined;
  tiersConfig: PlayerTierConfig[];
  isAdmin: boolean;
  onEdit: (player: WithId<Player>) => void;
  onDelete: (player: WithId<Player>) => void;
}

export const PlayerTelemetryTable = ({
  players,
  teamsById,
  hallOfFame,
  tiersConfig,
  isAdmin,
  onEdit,
  onDelete
}: PlayerTelemetryTableProps) => {
  return (
    <div className="hidden lg:block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0A192F]/90 via-black/85 to-[#0A192F]/95 backdrop-blur-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] relative group/matrix">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <table className="w-full text-left text-xs text-white border-collapse font-sans">
          <thead>
            <tr className="border-b border-white/10 bg-black/70 text-[9px] font-black uppercase tracking-[0.25em] text-white/40 select-none">
              <th className="py-4 px-4 text-center w-20">RANK</th>
              <th className="py-4 px-4 min-w-[220px]">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  PEMAIN // SKUAD KLUB
                </span>
              </th>
              <th className="py-4 px-3 text-center">
                <span className="inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  TIER
                </span>
              </th>
              <th className="py-4 px-4 text-center text-primary">
                <span className="inline-flex items-center gap-1 text-primary">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  OVR RATING
                </span>
              </th>
              <th className="py-4 px-3 text-center">MAIN</th>
              <th className="py-4 px-3 text-center text-emerald-400">W</th>
              <th className="py-4 px-3 text-center text-yellow-400">D</th>
              <th className="py-4 px-3 text-center text-rose-400">L</th>
              <th className="py-4 px-4 text-center text-primary min-w-[140px]">
                <span className="inline-flex items-center gap-1 text-primary">
                  <TrendingUp className="w-3.5 h-3.5" />
                  WIN RATE
                </span>
              </th>
              <th className="py-4 px-3 text-center min-w-[80px]">
                <span className="inline-flex items-center gap-1 text-white/80">
                  <Target className="w-3.5 h-3.5 text-white/40" />
                  GOL
                </span>
              </th>
              <th className="py-4 px-4 min-w-[220px]">
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  GELAR JUARA
                </span>
              </th>
              {isAdmin && <th className="py-4 px-4 text-center w-24">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {players.map((player) => {
              const team = player.teamId ? teamsById[player.teamId] : null;
              const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
              const tier = tiersConfig.find(t => t.players && t.players.some((p: any) => p.id === player.id)) || tiersConfig[3] || tiersConfig[0];
              const isPodium1 = player.ovrRank === 1;
              const isPodium2 = player.ovrRank === 2;
              const isPodium3 = player.ovrRank === 3;
              const isTopPodium = player.ovrRank !== null && player.ovrRank <= 3;
              const winPercent = player.winRate || 0;

              return (
                <tr 
                  key={player.id}
                  className={cn(
                    "transition-all duration-300 group/row relative",
                    isPodium1 ? "bg-gradient-to-r from-yellow-500/[0.1] via-transparent to-transparent hover:bg-yellow-500/[0.14]" :
                    isPodium2 ? "bg-gradient-to-r from-slate-300/[0.08] via-transparent to-transparent hover:bg-slate-300/[0.12]" :
                    isPodium3 ? "bg-gradient-to-r from-amber-600/[0.08] via-transparent to-transparent hover:bg-amber-600/[0.12]" :
                    "hover:bg-white/[0.04]"
                  )}
                >
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center">
                      {player.isCalibrated && player.ovrRank ? (
                        <div className={cn(
                          "relative w-9 h-9 rounded-xl flex items-center justify-center font-black italic tracking-tighter text-xs transition-transform duration-300 group/row:scale-110",
                          isPodium1 ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] border border-yellow-200" :
                          isPodium2 ? "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-black shadow-[0_0_15px_rgba(203,213,225,0.5)] border border-white" :
                          isPodium3 ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)] border border-amber-400/40" :
                          "bg-white/5 text-white/50 border border-white/10 group-hover/row:border-white/30 group-hover/row:text-white"
                        )}>
                          {isPodium1 ? (
                            <Crown className="w-4 h-4 fill-black" />
                          ) : (
                            <span>#{player.ovrRank}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          -
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className={cn(
                          "h-11 w-11 rounded-2xl border-2 transition-transform duration-300 group-hover/row:scale-105 shadow-md",
                          isTopPodium && player.isCalibrated ? "border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.25)]" : "border-white/10"
                        )}>
                          <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
                          <AvatarFallback className="bg-black/80 text-[11px] font-black text-white italic">
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
                        <span className="block font-black text-sm uppercase italic tracking-tight text-white group-hover/row:text-primary transition-colors truncate drop-shadow-sm font-headline">
                          {player.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-white/50 truncate">
                            {team?.name || 'Free Agent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-3 text-center">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[8px] font-black uppercase tracking-[0.2em] italic px-2.5 py-1 rounded-full border shadow-sm transition-all whitespace-nowrap",
                        tier.bgPill
                      )}
                    >
                      {tier.title}
                    </Badge>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center justify-center">
                      {player.isCalibrated ? (
                        <div className={cn(
                          "px-3.5 py-1.5 rounded-xl bg-black/60 border font-black italic tabular-nums text-base tracking-tight shadow-inner flex items-baseline gap-1",
                          player.ovrRating >= 70 ? "border-yellow-400/40 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]" :
                          player.ovrRating >= 55 ? "border-primary/40 text-primary shadow-[0_0_15px_rgba(204,253,1,0.2)]" :
                          player.ovrRating >= 45 ? "border-accent/40 text-accent shadow-[0_0_15px_rgba(100,255,218,0.2)]" :
                          "border-white/10 text-white/70"
                        )}>
                          <span>{player.ovrRating.toFixed(0)}</span>
                          <span className="text-[8px] font-mono opacity-50 not-italic">OVR</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-xl bg-black/40 border border-slate-500/20 font-bold text-[10px] uppercase text-slate-400 tracking-wider">
                          N/C
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-3 text-center font-mono font-black text-white/80 tabular-nums">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                      {player.overallPlayed || 0}
                    </span>
                  </td>

                  <td className="py-4 px-3 text-center font-mono font-black text-emerald-400 tabular-nums">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      {player.overallWin || 0}
                    </span>
                  </td>

                  <td className="py-4 px-3 text-center font-mono font-black text-yellow-400 tabular-nums">
                    <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      {player.overallDraw || 0}
                    </span>
                  </td>

                  <td className="py-4 px-3 text-center font-mono font-black text-rose-400 tabular-nums">
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      {player.overallLoss || 0}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col gap-1.5 w-full max-w-[130px] mx-auto">
                      <div className="flex items-center justify-between text-[10px] font-black italic tabular-nums leading-none">
                        <span className="text-white/40 text-[8px] uppercase tracking-wider">VICTORY</span>
                        <span className={cn(
                          winPercent >= 60 ? "text-primary drop-shadow-[0_0_8px_rgba(204,253,1,0.6)]" :
                          winPercent >= 45 ? "text-accent" : "text-white/70"
                        )}>
                          {winPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-black/70 border border-white/10 rounded-full overflow-hidden p-[1px] relative shadow-inner">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-700 relative",
                            winPercent >= 60 ? "bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" :
                            winPercent >= 45 ? "bg-gradient-to-r from-accent/80 to-accent shadow-[0_0_10px_rgba(100,255,218,0.8)]" :
                            "bg-gradient-to-r from-white/30 to-white/60"
                          )} 
                          style={{ width: `${Math.min(100, Math.max(6, winPercent))}%` }} 
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-3 text-center font-mono font-black text-white tabular-nums text-sm">
                    <div className="inline-flex items-center gap-1">
                      <span>{player.overallGoalsFor || 0}</span>
                      <span className="text-[8px] text-white/30 uppercase">G</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    {wonSeasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {wonSeasons.map(rec => (
                          <div 
                            key={rec.seasonId}
                            className="group/badge inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/40 text-amber-400 rounded-lg px-2.5 py-1 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] transition-all"
                          >
                            <Trophy className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400/20" />
                            <span className="text-[9px] font-black uppercase tracking-tight italic text-amber-300 truncate max-w-[160px]">
                              {rec.seasonName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/20 font-mono tracking-widest pl-2">-</span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(player)}
                          className="h-8 w-8 text-white/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Edit Athlete"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(player)}
                          className="h-8 w-8 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Delete Athlete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3.5 px-6 bg-black/70 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[9px] font-mono text-white/40">
        <div className="flex items-center gap-2">
          <Binary className="w-3.5 h-3.5 text-primary" />
          <span className="uppercase tracking-widest">MATCH STATS ENCODED // FIFA ULTIMATE PROTOCOL</span>
        </div>
        <div className="flex items-center gap-4 uppercase tracking-wider">
          <span>RATING TIERS: TITAN / PRO / CORE / ROOKIE</span>
          <span className="text-white/20">•</span>
          <span className="text-primary font-bold">STATUS: OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
};
