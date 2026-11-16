'use client';

import { memo, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trophy, 
  Crown, 
  Flame, 
  Activity, 
  ShieldAlert, 
  Radio, 
  User, 
  CheckCircle2, 
  Binary, 
  Zap, 
  Target, 
  TrendingUp, 
  Sparkles,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { resolveLogo } from "@/lib/logo-utils";
import { useTranslation } from "@/hooks/use-translation";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";
import type { WithId, Team, Season, CoOpLeagueEntry, LeagueEntry, Match, Player } from "@/lib/types";
import { LeagueTableSkeleton } from "./league-table-skeleton";
import { enrichPlayersWithMmrData, getTierFromMmr, TIER_STYLES } from "@/lib/mmr";
import { cn } from "@/lib/utils";

interface TopScorerTableProps {
  tableData: any[];
  isLoading: boolean;
  seasonType?: Season['type'];
  teamsById: Record<string, WithId<Team>>;
  playersById?: Record<string, WithId<Player>>;
  onSelectPlayer?: (entry: any) => void;
  theme?: TISeasonTheme;
  matches?: WithId<Match>[];
}

export const TopScorerTable = memo(({ 
    tableData, 
    isLoading, 
    seasonType,
    teamsById = {},
    playersById = {},
    onSelectPlayer,
    theme,
    matches = []
}: TopScorerTableProps) => {
    const { t } = useTranslation();
    const currentTheme = theme || getSeasonTheme(null);
    const primaryHex = currentTheme.primaryHex;
    const secondaryHex = currentTheme.secondaryHex;
    const glowRgba = currentTheme.glowRgba;

    // Enriched MMR map
    const enrichedGlobalPlayersMap = useMemo(() => {
        const playerList = Object.values(playersById);
        if (playerList.length === 0) return {};
        const enriched = enrichPlayersWithMmrData(playerList, null);
        const map: Record<string, typeof enriched[0]> = {};
        enriched.forEach(p => {
          map[p.id] = p;
        });
        return map;
    }, [playersById]);

    const { topScorers, totalLeagueGoals, averageGpg } = useMemo(() => {
        if (!tableData || tableData.length === 0) {
            return { topScorers: [], totalLeagueGoals: 0, averageGpg: 0 };
        }

        const completedMatches = (matches || []).filter(m => m.isCompleted);
        const completedPlayoffMatches = completedMatches.filter(m => m.round && m.round !== 'Group');
        const isCoop = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';

        const scorersMap = new Map<string, {
            id: string;
            name: string;
            teamId: string;
            teamName: string;
            logoUrl: string;
            regularGoals: number;
            playoffGoals: number;
            goals: number;
            played: number;
            gpg: number;
            bestSingleMatchGoals: number;
            hattricks: number;
            rawEntry: any;
            division?: string;
        }>();

        tableData.forEach(entry => {
            if (isCoop) {
                const coop = entry as CoOpLeagueEntry;
                const coopTeamId = coop.id;
                
                // Cari pertandingan playoff untuk tim coop ini
                const teamPlayoffMatches = completedPlayoffMatches.filter(
                    m => m.player1Id === coopTeamId || m.player2Id === coopTeamId
                );

                let p1PlayoffGoals = 0;
                let p2PlayoffGoals = 0;
                const teamPlayoffMatchesCount = teamPlayoffMatches.length;

                teamPlayoffMatches.forEach(m => {
                    const isP1 = m.player1Id === coopTeamId;
                    if (isP1) {
                        p1PlayoffGoals += m.player1p1Goals ?? 0;
                        p2PlayoffGoals += m.player1p2Goals ?? 0;
                    } else {
                        p1PlayoffGoals += m.player2p1Goals ?? 0;
                        p2PlayoffGoals += m.player2p2Goals ?? 0;
                    }
                });

                const t1 = teamsById[coop.player1TeamId];
                const p1Id = coop.player1Id;
                const p1RegGoals = coop.player1Goals || 0;
                const p1Played = (coop.played || 0) + teamPlayoffMatchesCount;
                const p1TotalGoals = p1RegGoals + p1PlayoffGoals;

                // Hitung best single match & hattrick untuk p1
                let p1BestMatch = 0;
                let p1Hattricks = 0;
                completedMatches.forEach(m => {
                    if (m.player1Id === coopTeamId || m.player2Id === coopTeamId) {
                        const isP1Team = m.player1Id === coopTeamId;
                        const matchG = isP1Team ? (m.player1p1Goals ?? 0) : (m.player2p1Goals ?? 0);
                        if (matchG > p1BestMatch) p1BestMatch = matchG;
                        if (matchG >= 3) p1Hattricks++;
                    }
                });

                scorersMap.set(p1Id, {
                    id: p1Id,
                    name: coop.player1Name,
                    teamId: coop.player1TeamId,
                    teamName: coop.player1TeamName,
                    logoUrl: resolveLogo(t1?.logoUrl, p1Id, coop.player1Name),
                    regularGoals: p1RegGoals,
                    playoffGoals: p1PlayoffGoals,
                    goals: p1TotalGoals,
                    played: p1Played,
                    gpg: p1Played > 0 ? p1TotalGoals / p1Played : 0,
                    bestSingleMatchGoals: p1BestMatch,
                    hattricks: p1Hattricks,
                    rawEntry: entry,
                    division: coop.division
                });

                const t2 = teamsById[coop.player2TeamId];
                const p2Id = coop.player2Id;
                const p2RegGoals = coop.player2Goals || 0;
                const p2Played = (coop.played || 0) + teamPlayoffMatchesCount;
                const p2TotalGoals = p2RegGoals + p2PlayoffGoals;

                let p2BestMatch = 0;
                let p2Hattricks = 0;
                completedMatches.forEach(m => {
                    if (m.player1Id === coopTeamId || m.player2Id === coopTeamId) {
                        const isP1Team = m.player1Id === coopTeamId;
                        const matchG = isP1Team ? (m.player1p2Goals ?? 0) : (m.player2p2Goals ?? 0);
                        if (matchG > p2BestMatch) p2BestMatch = matchG;
                        if (matchG >= 3) p2Hattricks++;
                    }
                });

                scorersMap.set(p2Id, {
                    id: p2Id,
                    name: coop.player2Name,
                    teamId: coop.player2TeamId,
                    teamName: coop.player2TeamName,
                    logoUrl: resolveLogo(t2?.logoUrl, p2Id, coop.player2Name),
                    regularGoals: p2RegGoals,
                    playoffGoals: p2PlayoffGoals,
                    goals: p2TotalGoals,
                    played: p2Played,
                    gpg: p2Played > 0 ? p2TotalGoals / p2Played : 0,
                    bestSingleMatchGoals: p2BestMatch,
                    hattricks: p2Hattricks,
                    rawEntry: entry,
                    division: coop.division
                });
            } else {
                const single = entry as LeagueEntry;
                const pId = single.playerId || single.id;

                const pPlayoffMatches = completedPlayoffMatches.filter(
                    m => m.player1Id === pId || m.player2Id === pId
                );

                let playoffGoals = 0;
                pPlayoffMatches.forEach(m => {
                    const isP1 = m.player1Id === pId;
                    const myGf = isP1 ? (m.player1Score ?? 0) : (m.player2Score ?? 0);
                    playoffGoals += myGf;
                });

                const regGoals = single.goalsFor || 0;
                const totalPlayed = (single.played || 0) + pPlayoffMatches.length;
                const totalGoals = regGoals + playoffGoals;

                let bestMatch = 0;
                let hattricks = 0;
                completedMatches.forEach(m => {
                    if (m.player1Id === pId || m.player2Id === pId) {
                        const isP1 = m.player1Id === pId;
                        const matchG = isP1 ? (m.player1Score ?? 0) : (m.player2Score ?? 0);
                        if (matchG > bestMatch) bestMatch = matchG;
                        if (matchG >= 3) hattricks++;
                    }
                });

                const t = teamsById[single.teamId];
                scorersMap.set(pId, {
                    id: pId,
                    name: single.playerName,
                    teamId: single.teamId,
                    teamName: single.teamName,
                    logoUrl: resolveLogo(t?.logoUrl, pId, single.playerName),
                    regularGoals: regGoals,
                    playoffGoals: playoffGoals,
                    goals: totalGoals,
                    played: totalPlayed,
                    gpg: totalPlayed > 0 ? totalGoals / totalPlayed : 0,
                    bestSingleMatchGoals: bestMatch,
                    hattricks: hattricks,
                    rawEntry: entry,
                    division: single.division
                });
            }
        });

        const list = Array.from(scorersMap.values())
            .sort((a, b) => b.goals - a.goals || b.gpg - a.gpg || a.name.localeCompare(b.name))
            .map((s, idx) => ({ ...s, rank: idx + 1 }));

        const totalLeagueGoals = list.reduce((sum, s) => sum + s.goals, 0);
        const activePlayersCount = list.filter(s => s.played > 0).length;
        const averageGpg = activePlayersCount > 0 ? totalLeagueGoals / list.reduce((sum, s) => sum + s.played, 0) || 0 : 0;

        return { topScorers: list, totalLeagueGoals, averageGpg };
    }, [tableData, seasonType, teamsById, matches]);

    const maxGoals = useMemo(() => {
        if (topScorers.length === 0) return 1;
        return Math.max(...topScorers.map(s => s.goals), 1);
    }, [topScorers]);

    const predator = useMemo(() => topScorers.find(s => s.goals > 0), [topScorers]);
    
    const mainPedofil = useMemo(() => {
        const activeScorers = topScorers.filter(s => s.played > 0);
        if (activeScorers.length === 0) return null;

        const minGoals = Math.min(...activeScorers.map(s => s.goals));
        const worstScorers = activeScorers.filter(s => s.goals === minGoals);
        
        return worstScorers.sort((a, b) => b.played - a.played)[0];
    }, [topScorers]);

    // Helper untuk MMR & Tier Info pemain
    const getScorerMmrInfo = (scorer: typeof topScorers[0]) => {
        const pId = scorer.id;
        const globalEnriched = enrichedGlobalPlayersMap[pId];
        const playerObj = globalEnriched || (playersById ? playersById[pId] : undefined);
        const playerDivision = scorer.division || playerObj?.division || 'div-1';

        let playerMmr: number = globalEnriched?.mmrRating ?? playerObj?.mmr ?? (playerDivision === 'div-2' ? 600 : 800);
        const isLowMatchOrNC = (playerObj?.overallPlayed || 0) < 20 || !playerObj?.mmr;
        if (isLowMatchOrNC) {
            if (playerDivision === 'div-1') {
                playerMmr = Math.max(playerMmr, 800);
            } else if (playerDivision === 'div-2') {
                playerMmr = playerMmr || 600;
            } else {
                playerMmr = playerMmr || 800;
            }
        }

        let mmrTierId = globalEnriched ? globalEnriched.tierId : null;
        if (!mmrTierId || (playerDivision === 'div-1' && mmrTierId === 'AMATEUR' && playerMmr >= 800)) {
            mmrTierId = getTierFromMmr(playerMmr, playerObj?.overallPlayed || 0, null, playerDivision);
        }
        if (playerDivision === 'div-1' && playerMmr >= 800 && mmrTierId === 'AMATEUR') {
            mmrTierId = 'REGULER';
        }
        const mmrStyle = mmrTierId ? TIER_STYLES[mmrTierId] : null;

        return { mmr: Math.round(playerMmr), mmrTierId, mmrStyle };
    };

    if (isLoading) return <LeagueTableSkeleton isCoop={true} />;

    return (
        <div className="space-y-10 sm:space-y-12">
            {/* 1. BAGIAN ATAS: HERO CARDS (PREDATOR & PEDOFIL - TETAP DIPERTAHANKAN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl 2xl:max-w-7xl mx-auto px-2 sm:px-6">
                {predator ? (
                    <Card 
                        className="relative overflow-hidden border-2 sm:border-4 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 group/pred-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95 cursor-pointer"
                        onClick={() => onSelectPlayer?.(predator.rawEntry)}
                        style={{
                            borderColor: primaryHex,
                            backgroundColor: `${primaryHex}0A`,
                            boxShadow: `0 0 60px ${primaryHex}25`
                        }}
                    >
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                         <div className="absolute -bottom-10 -right-10 w-72 h-72 opacity-[0.08] pointer-events-none z-0" style={{ color: primaryHex }}>
                            <Flame className="w-full h-full animate-float fill-current" />
                         </div>
                         <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 relative z-20">
                            <div className="relative group/badge">
                                <div 
                                    className="absolute -inset-6 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" 
                                    style={{ backgroundColor: `${primaryHex}33` }}
                                />
                                <div className="relative flex flex-col items-center">
                                    <Badge 
                                        className="font-black text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] border-r-4 border-black mb-2 sm:mb-3 rounded-none"
                                        style={{
                                            backgroundColor: primaryHex,
                                            color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                            boxShadow: `0 0 25px ${glowRgba}`
                                        }}
                                    >
                                        PREDATOR
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-8 sm:w-12" style={{ backgroundColor: primaryHex }} />
                                        <span 
                                            className="text-[7px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse"
                                            style={{ color: primaryHex }}
                                        >
                                            TOP SCORER // GOLDEN BOOT
                                        </span>
                                        <div className="h-1 w-8 sm:w-12" style={{ backgroundColor: primaryHex }} />
                                    </div>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3.5 sm:gap-6 relative z-20">
                            <div className="relative shrink-0">
                                <div 
                                    className="absolute -inset-1 rounded-full blur opacity-20 group-hover/pred-card:opacity-60 transition-opacity" 
                                    style={{ backgroundColor: primaryHex }}
                                />
                                <Avatar 
                                    className="h-16 w-16 sm:h-24 sm:w-24 border-2 sm:border-4 shadow-2xl group-hover/pred-card:scale-105 transition-all duration-500"
                                    style={{ borderColor: primaryHex }}
                                >
                                    <AvatarImage src={predator.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-black/40"><User className="w-8 h-8 sm:w-12 sm:h-12 text-white/20"/></AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-lg sm:text-3xl font-black text-white uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight pr-2" suppressHydrationWarning>{predator.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: primaryHex }} />
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: `${primaryHex}CC` }} suppressHydrationWarning>{predator.teamName}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <div className="relative">
                                    <span 
                                        className="text-4xl sm:text-7xl font-black tabular-nums leading-none" 
                                        style={{ 
                                            color: primaryHex,
                                            textShadow: `0 0 20px ${glowRgba}`
                                        }} 
                                        suppressHydrationWarning
                                    >
                                        {predator.goals}
                                    </span>
                                </div>
                                <p 
                                    className="text-[8px] sm:text-xs font-black uppercase tracking-widest mt-1 text-right" 
                                    style={{ color: primaryHex }} 
                                    suppressHydrationWarning
                                >
                                    GOL MUSIM INI
                                </p>
                            </div>
                         </div>
                         <div className="mt-6 sm:mt-8 flex items-center justify-between border-t pt-3 sm:pt-4" style={{ borderColor: `${primaryHex}33` }}>
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" style={{ color: primaryHex }} />
                                <span className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase">RATING PERFORMA</span>
                            </div>
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider" style={{ color: primaryHex }}>PERFORMA: ON FIRE</span>
                         </div>
                    </Card>
                ) : (
                    <Card className="relative overflow-hidden border-2 sm:border-4 border-dashed border-white/10 bg-black/40 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center">
                        <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-white/10 mb-2" />
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/40">AWAITING FIRST GOAL SCORER</p>
                    </Card>
                )}

                {mainPedofil ? (
                    <Card 
                        className="relative overflow-hidden border-2 sm:border-4 border-red-600 bg-red-950/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-[0_0_80px_rgba(220,38,38,0.15)] group/ped-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95 cursor-pointer"
                        onClick={() => onSelectPlayer?.(mainPedofil.rawEntry)}
                    >
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                          <div className="absolute -bottom-10 -right-10 w-72 h-72 text-red-600 opacity-[0.05] pointer-events-none z-0">
                             <ShieldAlert className="w-full h-full animate-pulse fill-current" />
                          </div>
                          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 relative z-20">
                             <div className="relative group/badge">
                                 <div className="absolute -inset-6 bg-red-600/20 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" />
                                 <div className="relative flex flex-col items-center">
                                     <Badge className="bg-red-600 text-white font-black text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(220,38,38,0.2)] border-r-4 border-black mb-2 sm:mb-3 rounded-none">
                                         PEDOFIL
                                     </Badge>
                                     <div className="flex items-center gap-2">
                                         <div className="h-1 w-8 sm:w-12 bg-red-600" />
                                         <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse">
                                           {mainPedofil.goals === 0 ? 'MANDUL GOL' : 'MINIM GOL'}
                                         </span>
                                         <div className="h-1 w-8 sm:w-12 bg-red-600" />
                                     </div>
                                 </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3.5 sm:gap-6 relative z-20">
                              <div className="relative shrink-0">
                                  <div className="absolute -inset-1 bg-red-600 rounded-full blur opacity-20 group-hover/ped-card:opacity-60 transition-opacity" />
                                  <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-2 sm:border-4 border-red-600 shadow-2xl group-hover/ped-card:scale-105 transition-all duration-500">
                                      <AvatarImage src={mainPedofil.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                      <AvatarFallback className="bg-black/40"><User className="w-8 h-8 sm:w-12 sm:h-12 text-white/20"/></AvatarFallback>
                                  </Avatar>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-lg sm:text-3xl font-black text-white uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight pr-2" suppressHydrationWarning>{mainPedofil.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                     <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                     <p className="text-[9px] sm:text-[10px] font-black text-red-500/80 uppercase tracking-widest truncate" suppressHydrationWarning>{mainPedofil.teamName}</p>
                                  </div>
                              </div>
                              <div className="text-right flex flex-col items-end shrink-0">
                                  <div className="relative flex items-center justify-end">
                                     <span 
                                        className="text-4xl sm:text-7xl font-black text-red-600 tabular-nums leading-none"
                                        style={{
                                            textShadow: '0 0 25px rgba(220, 38, 38, 0.7), 0 0 50px rgba(220, 38, 38, 0.3)'
                                        }}
                                        suppressHydrationWarning
                                     >
                                        {mainPedofil.goals}
                                     </span>
                                  </div>
                                  <p className="text-[8px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-1 text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" suppressHydrationWarning>
                                    {mainPedofil.goals === 0 ? `${mainPedofil.played} LAGA MANDUL` : `${mainPedofil.played} LAGA MINIM`}
                                  </p>
                              </div>
                          </div>
                          <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-red-600/30 pt-3 sm:pt-4">
                             <div className="flex items-center gap-2">
                                 <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 animate-pulse" />
                                 <span className="text-[7px] sm:text-[8px] font-black text-red-500/60 uppercase">EFEKTIVITAS RENDAH</span>
                             </div>
                             <span className="text-[8px] font-black text-red-500/40">STATISTIK: COLD FORM</span>
                          </div>
                     </Card>
                 ) : (
                     <Card 
                        className="relative overflow-hidden border-2 sm:border-4 bg-black/40 rounded-2xl sm:rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-700"
                        style={{
                            borderColor: `${primaryHex}35`,
                            boxShadow: `0 0 40px ${primaryHex}15`
                        }}
                     >
                          <div className="flex flex-col items-center gap-4 relative z-10">
                              <div 
                                className="p-4 rounded-full border-2"
                                style={{
                                    backgroundColor: `${primaryHex}15`,
                                    borderColor: `${primaryHex}40`,
                                    boxShadow: `0 0 30px ${glowRgba}`
                                }}
                              >
                                  <CheckCircle2 className="w-10 h-10 animate-pulse" style={{ color: primaryHex }} />
                              </div>
                              <div className="space-y-1 text-center">
                                  <p className="text-[11px] font-black uppercase tracking-[0.4em]" style={{ color: `${primaryHex}BB` }}>BELUM ADA DATA PEMAIN</p>
                                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.3em]">MENUNGGU HASIL PERTANDINGAN LIGA</p>
                              </div>
                          </div>
                          <div className="absolute bottom-4 right-6 flex items-center gap-1.5 opacity-30">
                              <Radio className="w-3 h-3" style={{ color: primaryHex }} />
                              <span className="text-[7px] font-black text-white uppercase">STATUS LIGA AKTIF</span>
                          </div>
                     </Card>
                 )}
            </div>

            {/* 2. BAGIAN UTAMA: TABEL GOLDEN BOOT BROADCAST TELEMETRY (NEW DESIGN) */}
            <div className="max-w-6xl 2xl:max-w-7xl mx-auto w-full overflow-hidden border border-white/10 rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-b from-[#0A101D]/95 via-black/90 to-[#070B14]/95 shadow-2xl relative backdrop-blur-3xl">
                {/* Top Laser Accent */}
                <div 
                    className="h-[2px] w-full"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${primaryHex}, transparent)`,
                        boxShadow: `0 0 20px ${primaryHex}`
                    }}
                />

                {/* Header Banner Deck */}
                <div 
                    className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    style={{
                        background: `linear-gradient(to right, ${primaryHex}15, rgba(0,0,0,0.5), transparent)`
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center border"
                            style={{
                                backgroundColor: `${primaryHex}15`,
                                borderColor: `${primaryHex}40`,
                                color: primaryHex
                            }}
                        >
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] font-headline" style={{ color: primaryHex }}>
                                    GOLDEN BOOT TELEMETRY // DAFTAR PENCETAK GOL
                                </h4>
                                <Badge className="text-[8px] font-mono uppercase bg-white/5 border border-white/10 text-white/60">
                                    LIVE METRICS
                                </Badge>
                            </div>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                KLASEMEN SEPATU EMAS & RASIO KETAJAMAN SERANGAN
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
                        <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 text-right">
                            <Target className="w-3.5 h-3.5 text-white/40" />
                            <div>
                                <span className="block text-[7.5px] font-bold text-white/40 uppercase tracking-wider">TOTAL GOL</span>
                                <span className="font-headline font-bold text-xs sm:text-sm text-white tabular-nums tracking-wider">{totalLeagueGoals} GOL</span>
                            </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 text-right">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <div>
                                <span className="block text-[7.5px] font-bold text-emerald-400/80 uppercase tracking-wider">RATA-RATA GPG</span>
                                <span className="font-headline font-bold text-xs sm:text-sm text-emerald-400 tabular-nums tracking-wider">{averageGpg.toFixed(2)}/laga</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table Content */}
                <div className="overflow-x-auto scrollbar-ultra-sport">
                    <Table className="w-auto min-w-full border-collapse">
                        <TableHeader>
                            <TableRow className="border-b border-white/10 hover:bg-transparent h-11 sm:h-13 bg-black/60">
                                <TableHead className="w-12 sm:w-16 text-center font-black text-[9px] sm:text-[10px] uppercase tracking-[0.18em]" style={{ color: primaryHex }}>
                                    RANK
                                </TableHead>
                                <TableHead className="text-left font-black text-[9px] sm:text-[10px] uppercase tracking-[0.18em] min-w-[200px] sm:min-w-[270px] pl-2 sm:pl-4" style={{ color: primaryHex }}>
                                    ATHLETE / CLUB
                                </TableHead>
                                <TableHead className="text-center font-black text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider w-12 sm:w-16 px-1">
                                    MAIN
                                </TableHead>
                                <TableHead className="hidden md:table-cell text-center font-black text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider w-24 sm:w-28 px-2">
                                    FASE GOL
                                </TableHead>
                                <TableHead className="hidden lg:table-cell text-center font-black text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider w-28 sm:w-32 px-2">
                                    REKOR LAGA
                                </TableHead>
                                <TableHead className="text-left font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[130px] sm:min-w-[170px] px-3" style={{ color: primaryHex }}>
                                    KETAJAMAN (GPG)
                                </TableHead>
                                <TableHead className="text-center font-black text-[9px] sm:text-[10px] uppercase tracking-[0.18em] w-20 sm:w-28 pr-3 sm:pr-6" style={{ color: primaryHex }}>
                                    TOTAL GOL
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topScorers.map((scorer) => {
                                const isRank1 = scorer.rank === 1 && scorer.goals > 0;
                                const isRank2 = scorer.rank === 2 && scorer.goals > 0;
                                const isRank3 = scorer.rank === 3 && scorer.goals > 0;
                                const isCold = scorer.goals === 0 && scorer.played > 0;
                                const { mmr, mmrTierId, mmrStyle } = getScorerMmrInfo(scorer);
                                
                                // Selisih gol dari Rank 1
                                const behindLeader = (predator && predator.goals > scorer.goals) ? (predator.goals - scorer.goals) : 0;
                                
                                // Progress bar width relative to maxGoals
                                const threatPercent = Math.min(100, Math.max(0, (scorer.goals / maxGoals) * 100));

                                return (
                                    <TableRow 
                                        key={scorer.id} 
                                        className={cn(
                                            "h-14 sm:h-18 transition-all border-b border-white/5 relative group/row overflow-hidden",
                                            isRank1 ? "bg-gradient-to-r from-amber-500/[0.08] via-transparent to-transparent hover:bg-amber-500/[0.12]" :
                                            isRank2 ? "bg-gradient-to-r from-sky-500/[0.05] via-transparent to-transparent hover:bg-sky-500/[0.08]" :
                                            isRank3 ? "bg-gradient-to-r from-amber-600/[0.05] via-transparent to-transparent hover:bg-amber-600/[0.08]" :
                                            isCold ? "bg-rose-500/[0.02] hover:bg-rose-500/[0.05]" :
                                            "hover:bg-white/[0.03]"
                                        )}
                                    >
                                        {/* 1. RANK CELL DENGAN LEFT LASER TRACER */}
                                        <TableCell className="relative p-0 text-center w-12 sm:w-16">
                                            {/* Laser Beam Tracer */}
                                            <div
                                                className={cn(
                                                    "absolute left-0 top-2 bottom-2 w-1 sm:w-1.5 rounded-r-full transition-all duration-300",
                                                    isRank1 ? "bg-primary shadow-[0_0_12px_rgba(204,253,1,0.9)]" :
                                                    isRank2 ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" :
                                                    isRank3 ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" :
                                                    isCold ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" :
                                                    "bg-transparent"
                                                )}
                                                style={isRank1 ? { backgroundColor: primaryHex, boxShadow: `0 0 12px ${primaryHex}` } : undefined}
                                            />

                                            <div className="flex items-center justify-center pl-1 sm:pl-2">
                                                {isRank1 ? (
                                                    <div 
                                                        className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl font-headline font-black text-xs sm:text-base flex items-center justify-center shadow-lg group-hover/row:scale-110 transition-transform"
                                                        style={{
                                                            backgroundColor: primaryHex,
                                                            color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                                            boxShadow: `0 0 18px ${glowRgba}`
                                                        }}
                                                    >
                                                        <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                                                    </div>
                                                ) : isRank2 ? (
                                                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 font-headline font-black text-xs sm:text-base flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.3)] group-hover/row:scale-105 transition-all">
                                                        2
                                                    </div>
                                                ) : isRank3 ? (
                                                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-headline font-black text-xs sm:text-base flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)] group-hover/row:scale-105 transition-all">
                                                        3
                                                    </div>
                                                ) : isCold ? (
                                                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-headline font-black text-xs sm:text-base flex items-center justify-center">
                                                        {scorer.rank}
                                                    </div>
                                                ) : (
                                                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/10 text-white/50 font-headline font-black text-xs sm:text-base flex items-center justify-center group-hover/row:text-white transition-all">
                                                        {scorer.rank}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 2. ATHLETE / CLUB */}
                                        <TableCell className="py-2 pl-2 sm:pl-4">
                                            <div 
                                                className="flex items-center gap-2 sm:gap-3.5 cursor-pointer group/node min-w-0"
                                                onClick={() => onSelectPlayer?.(scorer.rawEntry)}
                                                title={`Klik untuk melihat profil & statistik ${scorer.name}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <Avatar 
                                                        className={cn(
                                                            "h-8 w-8 sm:h-11 sm:w-11 rounded-lg sm:rounded-2xl border transition-all duration-300 shadow-md",
                                                            isRank1 ? "border-2 scale-105" : "border-white/15 group-hover/node:scale-105"
                                                        )}
                                                        style={isRank1 ? { borderColor: primaryHex, boxShadow: `0 0 15px ${glowRgba}` } : undefined}
                                                    >
                                                        <AvatarImage src={scorer.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                        <AvatarFallback className="bg-black/60 font-black text-xs">{scorer.name[0]}</AvatarFallback>
                                                    </Avatar>

                                                    {/* Floating MMR Badge */}
                                                    {mmr && mmrStyle && (
                                                        <div
                                                            className={cn(
                                                                "absolute -bottom-1.5 -right-1.5 z-20 px-1 sm:px-1.5 py-[1px] rounded sm:rounded-md font-mono font-black tracking-tight border shadow-md flex items-center justify-center leading-none",
                                                                mmrTierId === 'LEGEND' ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.5)]" :
                                                                mmrTierId === 'TOP_PLAYER' ? "bg-primary text-black border-lime-300 shadow-[0_0_10px_rgba(204,253,1,0.4)]" :
                                                                mmrTierId === 'REGULER' ? "bg-cyan-500 text-black border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]" :
                                                                mmrTierId === 'AMATEUR' ? "bg-pink-500 text-white border-pink-400/80 shadow-[0_0_8px_rgba(236,72,153,0.4)]" :
                                                                "bg-slate-800 text-slate-300 border-slate-600"
                                                            )}
                                                            title={`MMR: ${mmr} (${mmrStyle.title})`}
                                                        >
                                                            <span className="text-[7.5px] sm:text-[9px]">{mmr}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                                                        <span 
                                                            className={cn(
                                                                "font-headline font-bold uppercase tracking-wide transition-colors leading-tight truncate text-xs sm:text-sm xl:text-base",
                                                                isRank1 ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-white group-hover/node:text-primary"
                                                            )}
                                                            style={isRank1 ? { color: primaryHex } : undefined}
                                                            suppressHydrationWarning
                                                        >
                                                            {scorer.name}
                                                        </span>

                                                        {/* Tier Style Title Badge */}
                                                        {mmrStyle && (
                                                            <span
                                                                className={cn(
                                                                    "text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1 sm:px-1.5 py-0.5 rounded shrink-0 leading-none",
                                                                    mmrTierId === 'LEGEND' ? "text-yellow-400 font-extrabold" :
                                                                    mmrTierId === 'TOP_PLAYER' ? "text-primary font-extrabold" :
                                                                    mmrTierId === 'REGULER' ? "text-cyan-400 font-bold" :
                                                                    mmrTierId === 'AMATEUR' ? "text-pink-400 font-bold" :
                                                                    "text-slate-400 font-semibold"
                                                                )}
                                                            >
                                                                {mmrTierId === 'LEGEND' ? '★ LEGEND' : mmrStyle.title}
                                                            </span>
                                                        )}

                                                        {/* Status Badge Kontekstual */}
                                                        {isRank1 ? (
                                                            <Badge 
                                                                className="border-none text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full uppercase shrink-0 font-black shadow-sm"
                                                                style={{
                                                                    backgroundColor: `${primaryHex}25`,
                                                                    color: primaryHex,
                                                                    border: `1px solid ${primaryHex}60`
                                                                }}
                                                            >
                                                                👑 GOLDEN BOOT
                                                            </Badge>
                                                        ) : (isRank2 || isRank3) ? (
                                                            <Badge className="border-none text-[7px] sm:text-[7.5px] px-1.5 py-0.5 rounded-full uppercase shrink-0 font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                🔥 CHASER {behindLeader > 0 ? `(-${behindLeader}G)` : ''}
                                                            </Badge>
                                                        ) : isCold && scorer.played >= 3 ? (
                                                            <Badge className="border-none text-[7px] sm:text-[7.5px] px-1.5 py-0.5 rounded-full uppercase shrink-0 font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                                                                ❄️ MANDUL
                                                            </Badge>
                                                        ) : null}
                                                    </div>

                                                    <div className="text-[7.5px] sm:text-[10px] font-bold text-white/40 uppercase tracking-wider truncate flex items-center gap-1 mt-0.5">
                                                        <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                        <span className="truncate">{scorer.teamName || 'Independent'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 3. MAIN (MATCHES PLAYED) */}
                                        <TableCell className="text-center px-1 text-xs sm:text-sm font-black font-mono text-white/80 tabular-nums">
                                            {scorer.played}
                                        </TableCell>

                                        {/* 4. BREAKDOWN GOL (LIGA / PLAYOFF) */}
                                        <TableCell className="hidden md:table-cell text-center px-2">
                                            <div className="flex flex-col items-center justify-center font-mono">
                                                <span className="text-xs font-bold text-white/90 tabular-nums">
                                                    {scorer.regularGoals} <span className="text-[8px] text-white/40 font-normal">LIGA</span>
                                                </span>
                                                {scorer.playoffGoals > 0 ? (
                                                    <span className="text-[9px] font-black text-amber-400 tabular-nums">
                                                        +{scorer.playoffGoals} PO
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] text-white/20">- PO</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 5. REKOR LAGA (BEST SINGLE MATCH & HATTRICKS) */}
                                        <TableCell className="hidden lg:table-cell text-center px-2">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs font-headline font-bold text-white/80 tabular-nums">
                                                    MAX {scorer.bestSingleMatchGoals}G
                                                </span>
                                                {scorer.hattricks > 0 ? (
                                                    <span className="text-[8.5px] font-bold text-emerald-400 tracking-tight flex items-center gap-0.5">
                                                        <Zap className="w-2.5 h-2.5" />
                                                        {scorer.hattricks}x 3G+
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] text-white/20">-</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 6. KETAJAMAN (GPG & THREAT BAR) */}
                                        <TableCell className="px-3">
                                            <div className="w-full max-w-[150px] flex flex-col justify-center">
                                                <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                                                    <span className={cn(
                                                        "tabular-nums",
                                                        scorer.gpg >= 2.0 ? "text-emerald-400 font-black" :
                                                        scorer.gpg >= 1.0 ? "text-white" :
                                                        "text-white/50"
                                                    )}>
                                                        {scorer.gpg.toFixed(2)} <span className="text-[8px] opacity-70">/laga</span>
                                                    </span>
                                                    <span className="text-[8.5px] font-mono text-white/30 tabular-nums">
                                                        {threatPercent.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex">
                                                    <div 
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            isRank1 ? "bg-primary shadow-[0_0_8px_rgba(204,253,1,0.8)]" :
                                                            isRank2 ? "bg-sky-400" :
                                                            isRank3 ? "bg-amber-400" :
                                                            scorer.goals > 0 ? "bg-emerald-400/80" :
                                                            "bg-rose-500/50"
                                                        )}
                                                        style={{ 
                                                            width: `${threatPercent}%`,
                                                            ...(isRank1 ? { backgroundColor: primaryHex } : {})
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 7. TOTAL GOL (HERO PILL BADGE) */}
                                        <TableCell className="text-center pr-3 sm:pr-6">
                                            <div className="flex items-center justify-center">
                                                <div 
                                                    className={cn(
                                                        "min-w-[2.5rem] sm:min-w-[3.5rem] px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl font-headline font-black text-sm sm:text-xl tabular-nums transition-all border shadow-sm",
                                                        isRank1 ? "border-primary/50 text-black shadow-lg" :
                                                        isRank2 ? "bg-sky-500/15 border-sky-400/40 text-sky-300" :
                                                        isRank3 ? "bg-amber-500/15 border-amber-400/40 text-amber-300" :
                                                        scorer.goals > 0 ? "bg-white/[0.04] border-white/15 text-white" :
                                                        "bg-white/[0.02] border-white/5 text-white/20"
                                                    )}
                                                    style={isRank1 ? {
                                                        backgroundColor: primaryHex,
                                                        color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                                        boxShadow: `0 0 15px ${glowRgba}`
                                                    } : undefined}
                                                >
                                                    {scorer.goals}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* 3. BROADCAST FOOTER LEGEND */}
                <div className="p-3.5 px-6 bg-black/85 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[9px] sm:text-[10px] font-mono text-white/50 tracking-wider">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-primary shadow-[0_0_6px_rgba(204,253,1,0.8)]" style={{ backgroundColor: primaryHex }} />
                            <strong className="text-white font-bold">PREDATOR (#1)</strong> Sepatu Emas
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                            <strong className="text-sky-300 font-bold">CHASER (#2-#3)</strong> Pengejar Gol
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                            <strong className="text-rose-400 font-bold">MANDUL</strong> 0 Gol
                        </span>
                    </div>
                    <div className="flex items-center gap-3 uppercase">
                        <span>GPG = GOL PER LAGA</span>
                        <span className="text-white/20">•</span>
                        <span>MAX = REKOR 1 LAGA</span>
                        <span className="text-white/20">•</span>
                        <span>3G+ = HATTRICK/LEBIH</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

TopScorerTable.displayName = 'TopScorerTable';
