'use client';

import { memo, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Award, Target, Flame, Activity, ShieldAlert, Radio, User, CheckCircle2, Binary } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { resolveLogo } from "@/lib/logo-utils";
import { useTranslation } from "@/hooks/use-translation";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";
import type { WithId, Team, Season, CoOpLeagueEntry, LeagueEntry } from "@/lib/types";
import { LeagueTableSkeleton } from "./league-table-skeleton";

export const TopScorerTable = memo(({ 
    tableData, 
    isLoading, 
    seasonType,
    teamsById,
    theme
}: { 
    tableData: any[], 
    isLoading: boolean, 
    seasonType?: Season['type'],
    teamsById: Record<string, WithId<Team>>,
    theme?: TISeasonTheme
}) => {
    const { t } = useTranslation();
    const currentTheme = theme || getSeasonTheme(null);
    const primaryHex = currentTheme.primaryHex;
    const secondaryHex = currentTheme.secondaryHex;
    const glowRgba = currentTheme.glowRgba;

    const topScorers = useMemo(() => {
        if (!tableData || tableData.length === 0) return [];
        const scorers: { name: string, goals: number, teamId: string, teamName: string, id: string, played: number, logoUrl: string }[] = [];
        
        tableData.forEach(entry => {
            if (seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid') {
                const coop = entry as CoOpLeagueEntry;
                const t1 = teamsById[coop.player1TeamId];
                scorers.push({ 
                    id: coop.player1Id, name: coop.player1Name, goals: coop.player1Goals || 0, teamId: coop.player1TeamId, teamName: coop.player1TeamName, played: coop.played,
                    logoUrl: resolveLogo(t1?.logoUrl, coop.player1Id, coop.player1Name)
                });
                const t2 = teamsById[coop.player2TeamId];
                scorers.push({ 
                    id: coop.player2Id, name: coop.player2Name, goals: coop.player2Goals || 0, teamId: coop.player2TeamId, teamName: coop.player2TeamName, played: coop.played,
                    logoUrl: resolveLogo(t2?.logoUrl, coop.player2Id, coop.player2Name)
                });
            } else {
                const single = entry as LeagueEntry;
                const t = teamsById[single.teamId];
                scorers.push({ 
                    id: single.playerId, name: single.playerName, goals: single.goalsFor || 0, teamId: single.teamId, teamName: single.teamName, played: single.played,
                    logoUrl: resolveLogo(t?.logoUrl, single.playerId, single.playerName)
                });
            }
        });

        const uniqueScorers = scorers.reduce((acc, current) => {
            const x = acc.find(item => item.id === current.id);
            if (!x) return acc.concat([current]);
            return acc;
        }, [] as typeof scorers);

        return uniqueScorers.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).map((s, i) => ({ ...s, rank: i + 1 }));
    }, [tableData, seasonType, teamsById]);

    const predator = useMemo(() => topScorers.find(s => s.goals > 0), [topScorers]);
    
    const mainPedofil = useMemo(() => {
        const activeScorers = topScorers.filter(s => s.played > 0);
        if (activeScorers.length === 0) return null;

        const minGoals = Math.min(...activeScorers.map(s => s.goals));
        const worstScorers = activeScorers.filter(s => s.goals === minGoals);
        
        return worstScorers.sort((a, b) => b.played - a.played)[0];
    }, [topScorers]);

    if (isLoading) return <LeagueTableSkeleton isCoop={true} />;

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto px-2 sm:px-4">
                {predator ? (
                    <Card 
                        className="relative overflow-hidden border-2 sm:border-4 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 group/pred-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95"
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
                                        className="font-black italic text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] border-r-4 border-black mb-2 sm:mb-3 rounded-none"
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
                                <h4 className="text-lg sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{predator.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: primaryHex }} />
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: `${primaryHex}CC` }} suppressHydrationWarning>{predator.teamName}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <div className="relative">
                                    <span 
                                        className="text-4xl sm:text-7xl font-black italic tabular-nums leading-none" 
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
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/40 italic">AWAITING FIRST GOAL SCORER</p>
                    </Card>
                )}

                {mainPedofil ? (
                    <Card className="relative overflow-hidden border-2 sm:border-4 border-red-600 bg-red-950/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-[0_0_80px_rgba(220,38,38,0.15)] group/ped-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95">
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                          <div className="absolute -bottom-10 -right-10 w-72 h-72 text-red-600 opacity-[0.05] pointer-events-none z-0">
                             <ShieldAlert className="w-full h-full animate-pulse fill-current" />
                          </div>
                          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 relative z-20">
                             <div className="relative group/badge">
                                 <div className="absolute -inset-6 bg-red-600/20 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" />
                                 <div className="relative flex flex-col items-center">
                                     <Badge className="bg-red-600 text-white font-black italic text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(220,38,38,0.2)] border-r-4 border-black mb-2 sm:mb-3 rounded-none">
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
                                  <h4 className="text-lg sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{mainPedofil.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                     <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                     <p className="text-[9px] sm:text-[10px] font-black text-red-500/80 uppercase tracking-widest truncate" suppressHydrationWarning>{mainPedofil.teamName}</p>
                                  </div>
                              </div>
                              <div className="text-right flex flex-col items-end shrink-0">
                                  <div className="relative flex items-center justify-end">
                                     <span 
                                        className="text-4xl sm:text-7xl font-black italic text-red-600 tabular-nums leading-none"
                                        style={{
                                            textShadow: '0 0 25px rgba(220, 38, 38, 0.7), 0 0 50px rgba(220, 38, 38, 0.3)'
                                        }}
                                        suppressHydrationWarning
                                     >
                                        {mainPedofil.goals}
                                     </span>
                                  </div>
                                  <p className="text-[8px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-1 text-right drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" suppressHydrationWarning>
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
                                  <p className="text-[11px] font-black uppercase tracking-[0.4em] italic" style={{ color: `${primaryHex}BB` }}>BELUM ADA DATA PEMAIN</p>
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

            <div className="max-w-4xl mx-auto w-full overflow-hidden border-2 border-white/10 rounded-2xl sm:rounded-[2.5rem] bg-black/40 shadow-2xl relative">
                <div 
                    className="p-5 border-b border-white/10 flex items-center justify-between"
                    style={{
                        background: `linear-gradient(to right, ${primaryHex}20, rgba(0,0,0,0.4), transparent)`
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Binary className="w-4 h-4" style={{ color: primaryHex }} />
                        <h4 className="text-xs font-black uppercase tracking-widest italic" style={{ color: primaryHex }}>DAFTAR PENCETAK GOL LIGA</h4>
                    </div>
                    <span className="text-[9px] font-bold text-white/30">URUTKAN: JUMLAH GOL TERBANYAK</span>
                </div>
                <div className="overflow-x-auto scrollbar-ultra-sport">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/10 hover:bg-transparent h-12 bg-black/60">
                                <TableHead className="w-16 text-center font-black text-[10px] uppercase" style={{ color: primaryHex }}>RANK</TableHead>
                                <TableHead className="text-left font-black text-[10px] uppercase" style={{ color: primaryHex }}>ATHLETE / ROSTER</TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase w-28" style={{ color: primaryHex }}>GOAL COUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topScorers.map((scorer) => {
                                const isRank1 = scorer.rank === 1;
                                const hasGoals = scorer.goals > 0;
                                return (
                                    <TableRow 
                                        key={scorer.id} 
                                        className="h-16 transition-all border-b border-white/5 group/row hover:bg-white/[0.03]"
                                        style={isRank1 && hasGoals ? {
                                            backgroundColor: `${primaryHex}10`
                                        } : undefined}
                                    >
                                        <TableCell className="text-center font-black text-base sm:text-xl italic">
                                            <span 
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all" 
                                                style={isRank1 && hasGoals ? {
                                                    backgroundColor: primaryHex,
                                                    color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                                    boxShadow: `0 0 18px ${glowRgba}`
                                                } : undefined}
                                                suppressHydrationWarning
                                            >
                                                {scorer.rank}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar 
                                                    className="h-10 w-10 border border-white/10 rounded-xl transition-colors"
                                                    style={isRank1 && hasGoals ? { borderColor: primaryHex } : undefined}
                                                >
                                                    <AvatarImage src={scorer.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                    <AvatarFallback className="bg-black/60 font-black text-xs">{scorer.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span 
                                                        className="font-black uppercase italic tracking-tight text-sm transition-colors" 
                                                        style={isRank1 && hasGoals ? { color: primaryHex } : undefined}
                                                        suppressHydrationWarning
                                                    >
                                                        {scorer.name}
                                                    </span>
                                                    <span 
                                                        className="text-[8px] sm:text-[11px] font-black uppercase tracking-widest mt-1 text-white/30" 
                                                        style={isRank1 && hasGoals ? { color: `${primaryHex}99` } : undefined}
                                                        suppressHydrationWarning
                                                    >
                                                        {scorer.teamName}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell 
                                            className="text-center font-black text-2xl sm:text-4xl italic tabular-nums transition-all" 
                                            style={isRank1 && hasGoals ? { 
                                                color: primaryHex,
                                                textShadow: `0 0 20px ${glowRgba}`
                                            } : hasGoals ? {
                                                color: 'rgba(255,255,255,0.8)'
                                            } : {
                                                color: 'rgba(255,255,255,0.2)'
                                            }}
                                            suppressHydrationWarning
                                        >
                                            {scorer.goals}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
});
TopScorerTable.displayName = 'TopScorerTable';

