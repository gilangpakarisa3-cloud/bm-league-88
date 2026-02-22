'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User, ShieldAlert, TrendingUp, Handshake, Flame, Target, Zap, Scan } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatCardSkeleton = () => (
    <Card className="h-32 border-white/5 bg-white/5 animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
        </CardContent>
    </Card>
);

interface LeagueStatsProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>; team?: WithId<Team> })[];
  isLoading?: boolean;
  seasonType?: Season['type'];
}

export function LeagueStats({ tableData, isLoading, seasonType }: LeagueStatsProps) {
    const { t } = useTranslation();
    const stats = useMemo(() => {
        if (!tableData || tableData.length === 0) {
            return {
                mostWins: [],
                unbeaten: [],
                bestAttacker: [],
                bestDefense: [],
                bestGD: [],
                worstDefender: [],
                kingOfDraws: [],
                championshipContenders: [],
            };
        }

        const playersWhoPlayed = tableData.filter(p => p.played > 0);
        if (playersWhoPlayed.length === 0) {
             return { mostWins: [], unbeaten: [], bestAttacker: [], bestDefense: [], bestGD: [], worstDefender: [], kingOfDraws: [], championshipContenders: [] };
        }

        const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
        const mostWins = playersWhoPlayed.filter(p => p.win === maxWins && maxWins > 0);

        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0 && p.played > 0);
        
        let bestAttacker: any[] = [];
        let bestDefense: any[] = [];
        let bestGD: any[] = [];
        let worstDefender: any[] = [];
        let kingOfDraws: any[] = [];
        let championshipContenders: any[] = [];
        const leaderPoints = tableData.length > 0 ? tableData[0].points : 0;


        // Enable these stats for Single and Hybrid modes (any mode that isn't Co-Op)
        if (seasonType !== 'Co-Op') {
            const maxGoalsFor = Math.max(...playersWhoPlayed.map(p => p.goalsFor || 0));
            bestAttacker = playersWhoPlayed.filter(p => p.goalsFor === maxGoalsFor && maxGoalsFor > 0);
            
            // Best GD logic
            const maxGoalDiff = Math.max(...playersWhoPlayed.map(p => p.goalDifference || 0));
            bestGD = playersWhoPlayed.filter(p => p.goalDifference === maxGoalDiff && maxGoalDiff > 0);

            // Best Defense logic: fewest goals conceded with min 3 matches
            const qualifiedForDefense = playersWhoPlayed.filter(p => p.played >= 3);
            if (qualifiedForDefense.length > 0) {
                const minGoalsAgainst = Math.min(...qualifiedForDefense.map(p => p.goalsAgainst || 0));
                bestDefense = qualifiedForDefense.filter(p => p.goalsAgainst === minGoalsAgainst);
            }

            const maxGoalsAgainst = Math.max(...playersWhoPlayed.map(p => p.goalsAgainst || 0));
            worstDefender = playersWhoPlayed.filter(p => p.goalsAgainst === maxGoalsAgainst && maxGoalsAgainst > 0);
            
            const maxDraws = Math.max(...playersWhoPlayed.map(p => p.draw || 0));
            kingOfDraws = playersWhoPlayed.filter(p => p.draw === maxDraws && maxDraws > 0);

            // Hide championship contenders in Hybrid mode per user request
            if (seasonType === 'Single') {
                championshipContenders = tableData
                    .filter(p => p.rank === 2 || p.rank === 3)
                    .map(p => ({...p, pointsBehind: leaderPoints - p.points }));
            }
        }

        return { mostWins, unbeaten, bestAttacker, bestDefense, bestGD, worstDefender, kingOfDraws, championshipContenders };
    }, [tableData, seasonType]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
        );
    }
    
    const showUnbeaten = stats.unbeaten.length > 0;

    if (stats.mostWins.length === 0 && !showUnbeaten && stats.bestAttacker.length === 0 && stats.bestDefense.length === 0 && stats.bestGD.length === 0 && stats.worstDefender.length === 0 && stats.kingOfDraws.length === 0 && stats.championshipContenders.length === 0) {
        return (
             <Card className="border-dashed border-2 border-white/10 bg-white/5 w-full">
                <CardContent className="p-6 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    Belum ada data statistik.
                </CardContent>
            </Card>
        )
    }

    const StatCard = ({ 
        title, 
        icon: Icon, 
        players, 
        valueSuffix, 
        valueKey, 
        variant = "primary",
        ghostText
    }: { 
        title: string, 
        icon: any, 
        players: any[], 
        valueSuffix?: string, 
        valueKey: string,
        variant?: "primary" | "destructive",
        ghostText?: string
    }) => (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-500 border-2 hover:scale-[1.02] bg-card/60 backdrop-blur-xl",
            variant === "destructive" 
                ? "border-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]" 
                : "border-primary/20 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(204,253,1,0.15)]"
        )}>
            {/* HUD Decoration Corners */}
            <div className={cn(
                "absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 opacity-20 pointer-events-none transition-all duration-500 group-hover:opacity-100",
                variant === "destructive" ? "border-red-500" : "border-primary"
            )} />
            
            {/* Ghost Text Background - Precise Left Alignment */}
            <span className="absolute bottom-0 left-0 text-7xl font-black text-white/[0.03] uppercase tracking-tighter italic pointer-events-none group-hover:text-white/[0.06] transition-all duration-500 leading-none pl-6 pb-2">
                {ghostText || title.split(' ')[0]}
            </span>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg transition-all duration-500 shadow-lg relative",
                        variant === "destructive" 
                            ? "bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white" 
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black"
                    )}>
                        <div className="absolute inset-0 rounded-lg animate-pulse opacity-20 bg-current" />
                        <Icon className="h-5 w-5 relative z-10" />
                    </div>
                    <CardTitle className="text-xs font-black tracking-widest uppercase italic pr-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{title}</CardTitle>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-3 pt-2 relative z-10">
                {players.map(player => (
                    <div key={player.id} className="group/item flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all hover:translate-x-1 duration-300">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="relative">
                                <Avatar className="h-9 w-9 border-2 border-background shadow-xl group-hover/item:border-primary transition-colors">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                    <AvatarFallback className="bg-black/40"><User className="h-5 w-5 text-white/20" /></AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-black truncate uppercase italic pr-4 transition-colors group-hover/item:text-primary">{player.playerName}</p>
                                <p className="text-[9px] text-muted-foreground font-black tracking-tighter truncate uppercase opacity-60">{player.teamName || 'Independent'}</p>
                            </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0 flex items-baseline gap-1">
                            <span className={cn(
                                "text-2xl font-black italic tabular-nums leading-none drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                variant === "destructive" ? "text-red-500" : "text-primary"
                            )}>
                                {player[valueKey]}
                            </span>
                            {valueSuffix && <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter">{valueSuffix}</span>}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Raja Kemenangan */}
            {stats.mostWins.length > 0 && (
                <StatCard 
                    title={t('fun_stats_most_wins')}
                    icon={Award}
                    players={stats.mostWins}
                    valueKey="win"
                    valueSuffix="W"
                    ghostText="RAJA"
                />
            )}

            {/* 1.5. Selisih Gol Terbaik */}
            {seasonType !== 'Co-Op' && stats.bestGD.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_gd')}
                    icon={TrendingUp}
                    players={stats.bestGD}
                    valueKey="goalDifference"
                    valueSuffix="SG"
                    ghostText="TREND"
                />
            )}

            {/* 2. Pertahanan Terbaik */}
            {seasonType !== 'Co-Op' && stats.bestDefense.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_defense')}
                    icon={ShieldCheck}
                    players={stats.bestDefense}
                    valueKey="goalsAgainst"
                    valueSuffix="GA"
                    ghostText="WALL"
                />
            )}

            {/* 3. Penyerang Terbaik */}
            {seasonType !== 'Co-Op' && stats.bestAttacker.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_attacker')}
                    icon={Target}
                    players={stats.bestAttacker}
                    valueKey="goalsFor"
                    valueSuffix="Gol"
                    ghostText="APEX"
                />
            )}

            {/* 4. Raja Seri */}
            {seasonType !== 'Co-Op' && stats.kingOfDraws.length > 0 && (
                <StatCard 
                    title={t('fun_stats_king_of_draws')}
                    icon={Handshake}
                    players={stats.kingOfDraws}
                    valueKey="draw"
                    valueSuffix="Seri"
                    ghostText="NODE"
                />
            )}

            {/* 5. Pertahanan Terburuk */}
            {seasonType !== 'Co-Op' && stats.worstDefender.length > 0 && (
                <StatCard 
                    title={t('fun_stats_worst_defense')}
                    icon={ShieldAlert}
                    players={stats.worstDefender}
                    valueKey="goalsAgainst"
                    valueSuffix="Gol"
                    variant="destructive"
                    ghostText="CRITICAL"
                />
            )}

            {/* 6. Tidak Terkalahkan */}
            {showUnbeaten && (
                <Card className="group relative overflow-hidden transition-all duration-500 border-2 border-primary/20 hover:border-primary/50 bg-card/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(204,253,1,0.15)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20 opacity-20 pointer-events-none group-hover:opacity-100" />
                    <span className="absolute bottom-0 left-0 text-7xl font-black text-white/[0.03] uppercase tracking-tighter italic pointer-events-none leading-none pl-6 pb-2">IMMORTAL</span>
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-lg">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-xs font-black tracking-widest uppercase italic pr-4">{t('fun_stats_unbeaten')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-2 relative z-10">
                        {stats.unbeaten.map(player => (
                            <div key={player.id} className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all hover:translate-x-1">
                                <Avatar className="h-9 w-9 border-2 border-background shadow-xl group-hover:border-primary transition-colors">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                    <AvatarFallback className="bg-black/40"><User className="h-5 w-5 text-white/20" /></AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black uppercase italic pr-4 truncate group-hover:text-primary transition-colors">{player.playerName}</p>
                                    <p className="text-[9px] text-white/30 font-black tracking-tighter uppercase">{player.teamName || 'Independent'}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Peluang Juara */}
            {seasonType === 'Single' && stats.championshipContenders.length > 0 && (
                <Card className="group relative overflow-hidden transition-all duration-500 border-2 border-yellow-500/20 hover:border-yellow-500/50 bg-card/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-500/20 opacity-20 pointer-events-none group-hover:opacity-100" />
                    <span className="absolute bottom-0 left-0 text-7xl font-black text-white/[0.03] uppercase tracking-tighter italic pointer-events-none leading-none pl-6 pb-2">TITLE</span>
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-all duration-500 shadow-lg">
                                <Flame className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-xs font-black tracking-widest uppercase italic pr-4">{t('fun_stats_championship_contender')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-2 relative z-10">
                        {stats.championshipContenders.map(player => (
                             <div key={player.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all hover:translate-x-1">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="h-9 w-9 border-2 border-background shadow-xl group-hover:border-yellow-500 transition-colors">
                                        <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                        <AvatarFallback className="bg-black/40"><User className="h-5 w-5 text-white/20" /></AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-black uppercase italic pr-4 truncate group-hover:text-yellow-500 transition-colors">{player.playerName}</p>
                                        <p className="text-[9px] text-white/30 font-black tracking-tighter uppercase">{player.teamName || 'Independent'}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-black border-yellow-500/50 text-yellow-500 bg-yellow-500/5 py-0.5 animate-pulse">-{player.pointsBehind} PTS</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}