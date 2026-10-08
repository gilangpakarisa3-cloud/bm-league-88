'use client';

import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowDown, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveLogo } from "@/lib/logo-utils";
import type { WithId, Team, Player, LeagueEntry, Season, Match } from "@/lib/types";
import type { TISeasonTheme as SeasonDesignTheme } from "@/lib/season-theme";

export interface RelegationPlacementRadarProps {
  rankedTable: (WithId<LeagueEntry> & { rank?: number })[];
  season: WithId<Season> | null;
  teamsById: Record<string, WithId<Team>>;
  playersById: Record<string, WithId<Player>>;
  theme: SeasonDesignTheme;
  isSingleHybrid?: boolean;
  matches?: WithId<Match>[];
}

export const RelegationPlacementRadar = ({
  rankedTable,
  season,
  teamsById,
  playersById,
  theme,
  isSingleHybrid = true,
  matches = [],
}: RelegationPlacementRadarProps) => {
  const totalPlayers = rankedTable.length;
  const hasDivisions = season?.hasDivisions ?? false;
  const actualRelegationSpots = Math.max(1, season?.relegationSpots ?? 2);
  const div2Name = season?.division2Name || 'Divisi 2';
  const div1Name = season?.division1Name || 'Divisi 1';

  // In Single Hybrid:
  // Top 8 qualify for playoff (#1 - #8)
  // Non-playoff teams: #9 to #totalPlayers
  const nonPlayoffSpots = Math.max(0, totalPlayers - 8);
  const directRelegationCount = hasDivisions 
    ? (isSingleHybrid ? Math.min(actualRelegationSpots, nonPlayoffSpots) : Math.min(actualRelegationSpots, totalPlayers))
    : 0;
  const playoffRelegationCount = hasDivisions && isSingleHybrid 
    ? Math.max(0, actualRelegationSpots - directRelegationCount) 
    : 0;
  const startDirectRelegationRank = totalPlayers - directRelegationCount + 1;

  // Track playoff eliminations to determine playoff relegation victims
  const playoffEliminatedTeams = useMemo(() => {
    if (!isSingleHybrid || !hasDivisions || playoffRelegationCount <= 0 || matches.length === 0) {
      return [];
    }

    // Single Hybrid playoff matches:
    // QF: playoff-m1, playoff-m2, playoff-m3, playoff-m4
    // SF: playoff-sf1, playoff-sf2
    // Final: playoff-final or playoff-m18
    const qfMatches = matches.filter(m => 
      m.bracketId === 'playoff-m1' || 
      m.bracketId === 'playoff-m2' || 
      m.bracketId === 'playoff-m3' || 
      m.bracketId === 'playoff-m4'
    );

    const losersInQf: { playerId: string; entry: (WithId<LeagueEntry> & { rank?: number }) }[] = [];

    qfMatches.forEach(m => {
      if (m.isCompleted) {
        const isBo3 = m.round && m.round !== 'Group';
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const loserId = s1 > s2 ? m.player2Id : (s2 > s1 ? m.player1Id : null);
        if (loserId) {
          const entry = rankedTable.find(e => (e.playerId || e.id) === loserId);
          if (entry && !losersInQf.some(l => l.playerId === loserId)) {
            losersInQf.push({ playerId: loserId, entry });
          }
        }
      }
    });

    // Urutkan yang kalah di QF berdasarkan performa regular season mereka
    // (Poin terendah / Rank reguler terburuk = prioritas pertama terkena kuota degradasi)
    losersInQf.sort((a, b) => {
      const rA = a.entry.rank ?? 0;
      const rB = b.entry.rank ?? 0;
      return rB - rA; // Rank 8, 7, 6, 5 (terburuk duluan)
    });

    return losersInQf;
  }, [matches, rankedTable, isSingleHybrid, hasDivisions, playoffRelegationCount]);

  // Combine teams to display in the Relegation / Placement Radar
  const displayTeams = useMemo(() => {
    if (isSingleHybrid) {
      // 1. Tim di luar 8 besar (rank 9+)
      const nonPlayoff = rankedTable.filter(e => (e.rank ?? 0) > 8);

      // 2. Jika ada kuota degradasi dari playoff (playoffRelegationCount > 0),
      // masukkan peserta 8 besar yang gugur di Playoff (dimulai dari yang gugur di QF)
      const playoffLosers = playoffEliminatedTeams.map((item, idx) => {
        const isRelegatedFromPlayoff = idx < playoffRelegationCount;
        return {
          ...item.entry,
          isFromPlayoff: true,
          isPlayoffRelegated: isRelegatedFromPlayoff,
        };
      });

      return [...nonPlayoff, ...playoffLosers];
    }

    // For other formats (Double Elimination): show direct relegation or bottom spots
    const threshold = Math.max(1, totalPlayers - actualRelegationSpots + 1);
    return rankedTable.filter(e => (e.rank ?? 0) >= threshold);
  }, [rankedTable, isSingleHybrid, totalPlayers, actualRelegationSpots, playoffEliminatedTeams, playoffRelegationCount]);

  if (rankedTable.length === 0) return null;

  return (
    <div className={cn(
      "w-full relative bg-gradient-to-br from-black/95 via-[#0b0709]/90 to-black/95 border-2 rounded-[2rem] p-4 sm:p-6 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-500",
      hasDivisions ? "border-rose-500/40" : "border-white/15"
    )}>
      {/* Top Laser Conduit Tracer */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]" 
        style={{
          background: hasDivisions 
            ? 'linear-gradient(to right, transparent, #F43F5E, #FB7185, #F43F5E, transparent)'
            : `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
          boxShadow: hasDivisions ? '0 0 16px rgba(244,63,94,0.9)' : `0 0 16px ${theme.primaryHex}`
        }}
      />

      {/* Cyber Grid Texture Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-7 w-1.5 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.8)]",
            hasDivisions ? "bg-rose-500" : "bg-white/40"
          )} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black tracking-wider text-white uppercase italic font-headline flex items-center gap-2">
                <AlertTriangle className={cn("w-4 h-4", hasDivisions ? "text-rose-400 animate-pulse" : "text-amber-400")} />
                {hasDivisions ? 'ZONA DEGRADASI & STATUS FINISH' : 'STATUS FINISH LUAR PLAYOFF'}
              </h4>
              <Badge className={cn(
                "text-[7.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm",
                hasDivisions ? "bg-rose-500/15 border-rose-500/50 text-rose-300" : "bg-white/10 border-white/20 text-white/70"
              )}>
                {hasDivisions ? `${actualRelegationSpots} TIM DEGRADASI` : 'NON-PLAYOFF'}
              </Badge>
            </div>
            <p className="text-[8px] sm:text-[9px] font-mono text-white/50 uppercase tracking-widest mt-0.5">
              {hasDivisions 
                ? `MONITORING KUOTA DEGRADASI DARI ${div1Name.toUpperCase()} MENUJU ${div2Name.toUpperCase()}`
                : 'FINAL STANDING & ELIMINASI SEBELUM TAHAP KNOCKOUT'}
            </p>
          </div>
        </div>

        {/* Quota & Rules Badges */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-[8px] sm:text-[9px]">
          {hasDivisions && directRelegationCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">
                Langsung: {directRelegationCount === 1 ? `#${totalPlayers}` : `#${startDirectRelegationRank} - #${totalPlayers}`}
              </span>
            </div>
          )}
          {hasDivisions && playoffRelegationCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span className="font-bold">
                +{playoffRelegationCount} dari Gugur Playoff
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info Callout if Playoff Relegation Exists */}
      {hasDivisions && playoffRelegationCount > 0 && (
        <div className="relative z-10 mb-4 p-2.5 sm:p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 flex items-start gap-2.5 text-[9px] sm:text-[10px] text-amber-200/90 font-mono">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-amber-300 uppercase tracking-wider block">
              ATURAN INTEGRASI PLAYOFF + DEGRADASI ({actualRelegationSpots} KUOTA)
            </span>
            <p className="leading-relaxed opacity-90">
              Karena kuota degradasi ({actualRelegationSpots} tim) melebihi jumlah tim di luar 8 besar ({nonPlayoffSpots} tim), 
              maka <strong>{directRelegationCount} tim</strong> peringkat terbawah langsung degradasi, sedangkan <strong>{playoffRelegationCount} slot sisa</strong> akan dialokasikan kepada tim peringkat 8 besar yang <strong>gugur paling awal di Babak 8 Besar</strong> (berdasarkan poin dan agregat musim reguler).
            </p>
          </div>
        </div>
      )}

      {/* Team Cards Grid */}
      <div className="relative z-10">
        {displayTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {displayTeams.map((entry: any) => {
              const rank = entry.rank ?? 0;
              const isFromPlayoff = !!entry.isFromPlayoff;
              const isDirectRelegated = hasDivisions && !isFromPlayoff && rank >= startDirectRelegationRank;
              const isPlayoffRelegated = hasDivisions && isFromPlayoff && !!entry.isPlayoffRelegated;
              const isTotalRelegated = isDirectRelegated || isPlayoffRelegated;
              const isPlayoffEligibleSurvivor = hasDivisions && !isFromPlayoff && rank > 8 && rank < startDirectRelegationRank;
              const teamId = entry.teamId || entry.player1TeamId || '';
              const team = teamId ? teamsById[teamId] : null;
              const playerName = entry.playerName || (entry.playerId && playersById[entry.playerId]?.name) || 'Pemain';
              const teamName = entry.teamName || team?.name || 'Unit BM';
              const logo = resolveLogo(team?.logoUrl, teamId || entry.playerId || entry.id, playerName);

              return (
                <div
                  key={entry.id || `${entry.playerId}-${rank}-${isFromPlayoff ? 'po' : 'reg'}`}
                  className={cn(
                    "p-3 rounded-xl border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between gap-2.5 relative overflow-hidden group/relegation",
                    isTotalRelegated 
                      ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]" 
                      : isPlayoffEligibleSurvivor
                      ? "bg-amber-950/20 border-amber-500/35 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Neon Status Glow Marker */}
                  <div className={cn(
                    "absolute top-0 left-0 bottom-0 w-1",
                    isTotalRelegated 
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" 
                      : isPlayoffEligibleSurvivor 
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" 
                      : "bg-white/20"
                  )} />

                  {/* Top Row: Rank & Status Badge */}
                  <div className="flex items-center justify-between pl-1.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-black italic px-2 py-0.5 rounded-md border",
                        isTotalRelegated 
                          ? "bg-rose-500 text-white border-rose-400 font-headline" 
                          : isPlayoffEligibleSurvivor
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-white/10 text-white/70 border-white/20"
                      )}>
                        #{rank}
                      </span>
                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
                        {isFromPlayoff ? 'GUGUR PLAYOFF' : 'FINISH REGULER'}
                      </span>
                    </div>

                    {/* Status Pill */}
                    {hasDivisions ? (
                      isTotalRelegated ? (
                        <Badge className="bg-rose-500/20 border border-rose-500/60 text-rose-300 text-[7px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5">
                          <ArrowDown className="w-2.5 h-2.5 text-rose-400" />
                          <span>DEGRADASI</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[7px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5">
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                          <span>SURVIVOR</span>
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-white/10 border border-white/20 text-white/60 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5">
                        GUGUR
                      </Badge>
                    )}
                  </div>

                  {/* Middle Row: Player & Team Profile */}
                  <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
                    <Avatar className="h-9 w-9 rounded-lg border border-white/20 bg-black/60 p-0.5 shrink-0">
                      <AvatarImage src={logo} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-black/60 text-[9px] font-black text-white/60">
                        {playerName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-black uppercase italic tracking-wide text-white truncate font-headline group-hover/relegation:text-rose-300 transition-colors">
                        {playerName}
                      </span>
                      <span className="text-[8px] font-mono text-white/50 truncate uppercase tracking-wider">
                        {teamName}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Match Stats & Destination */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 pl-1.5 font-mono text-[8px] text-white/60">
                    <div className="flex items-center gap-2">
                      <span>M: <strong className="text-white">{entry.played ?? 0}</strong></span>
                      <span>SG: <strong className={cn((entry.goalDifference ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>{(entry.goalDifference ?? 0) > 0 ? `+${entry.goalDifference}` : entry.goalDifference ?? 0}</strong></span>
                      <span>PTS: <strong className="text-white text-[9px]">{entry.points ?? 0}</strong></span>
                    </div>

                    <div className="text-[7.5px] font-black uppercase tracking-widest text-right">
                      {hasDivisions ? (
                        isTotalRelegated ? (
                          <span className="text-rose-400 flex items-center gap-1 font-bold">
                            ➔ {div2Name.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            TETAP {div1Name.toUpperCase()}
                          </span>
                        )
                      ) : (
                        <span className="text-white/40">GUGUR</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center font-mono text-xs text-white/40 italic">
            Semua peserta ({totalPlayers} tim) saat ini terdaftar di babak playoff.
          </div>
        )}
      </div>
    </div>
  );
};

