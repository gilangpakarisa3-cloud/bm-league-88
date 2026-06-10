'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User, ShieldAlert, TrendingUp, Handshake, Flame, Target, Zap, Activity, Scan } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatCardSkeleton = () => (
    <Card className="h-32 border-white/5 bg-white/5 animate-pulse rounded-2xl">
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
        "group relative overflow-hidden transition-all duration-700 border-0 bg-transparent rounded-[2rem] sm:rounded-[2.5rem] p-[2px] hover:scale-[1.01]",
        variant === "destructive" 
            ? "bg-red-500/20 hover:shadow-[0_0_60px_rgba(239,68,68,0.2)]" 
            : "bg-primary/20 hover:shadow-[0_0_60px_rgba(204,253,1,0.2)]"
    )}>
        {/* Inner Border Layout */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        <div className="relative h-full bg-card/90 backdrop-blur-3xl rounded-[calc(2rem-2px)] sm:rounded-[calc(2.5rem-2px)] overflow-hidden flex flex-col">
            
            {/* SOLID SPORT HEADER */}
            <div className={cn(
                "relative py-2 px-6 sm:px-8 flex items-center justify-between overflow-hidden shrink-0",
                variant === "destructive" ? "bg-red-500 text-white" : "bg-primary text-black"
            )}>
                {/* Slanted Decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-black/20 p-1.5 rounded-lg border border-black/10">
                        <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black tracking-[0.1em] uppercase italic leading-none pr-2">{title}</h3>
                </div>
                
                <div className="flex items-center gap-2 relative z-10 opacity-60">
                    <Scan className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest hidden xs:block">Live Intel</span>
                </div>
            </div>

            {/* GLASSY BODY */}
            <div className="flex-1 p-5 sm:p-8 space-y-4 relative overflow-hidden">
                {/* HUD Decoration Texture */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px:20px] pointer-events-none" />
                
                {/* HUD Corner Decorations */}
                <div className={cn(
                    "absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 opacity-20 pointer-events-none rounded-tl-2xl",
                    variant === "destructive" ? "border-red-500" : "border-primary"
                )} />
                <div className={cn(
                    "absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 opacity-10 pointer-events-none rounded-br-xl",
                    variant === "destructive" ? "border-red-500" : "border-primary"
                )} />

                {/* Ghost Text */}
                <span className="absolute bottom-2 left-6 text-8xl sm:text-[10rem] font-black text-white/[0.02] uppercase tracking-tighter italic pointer-events-none leading-none select-none pr-10">
                    {ghostText || title.split(' ')[0]}
                </span>

                <div className="space-y-3 relative z-10">
                    {players.map(player => (
                        <div key={player.id} className="group/item flex items-center justify-between bg-white/[0.03] p-3 sm:p-4 rounded-2xl border border-white/5 hover:border-primary/20 transition-all duration-500 hover:translate-x-1 shadow-sm relative overflow-hidden">
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 opacity-20 transition-all duration-500 group-hover/item:opacity-100",
                                variant === "destructive" ? "bg-red-500" : "bg-primary"
                            )} />
                            
                            <div className="flex items-center gap-4 overflow-hidden relative z-10">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/10 shadow-lg group-hover/item:scale-105 transition-transform duration-500">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                    <AvatarFallback className="bg-black/60 font-black text-xs">P</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="text-sm sm:text-base font-black truncate uppercase italic text-white group-hover/item:text-primary transition-colors leading-tight pr-4">{player.playerName}</p>
                                    <p className="text-[9px] text-white/30 font-black tracking-widest truncate uppercase group-hover/item:text-white/50 transition-colors">{player.teamName || 'Independent'}</p>
                                </div>
                            </div>
                            
                            <div className="text-right ml-4 shrink-0 flex items-baseline gap-1 relative z-10">
                                <span className={cn(
                                    "text-3xl sm:text-4xl font-black italic tabular-nums leading-none drop-shadow-md",
                                    variant === "destructive" ? "text-red-500" : "text-primary"
                                )}>
                                    {player[valueKey]}
                                </span>
                                {valueSuffix && <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{valueSuffix}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
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


        if (seasonType !== 'Co-Op') {
            const maxGoalsFor = Math.max(...playersWhoPlayed.map(p => p.goalsFor || 0));
            bestAttacker = playersWhoPlayed.filter(p => p.goalsFor === maxGoalsFor && maxGoalsFor > 0);
            
            const maxGoalDiff = Math.max(...playersWhoPlayed.map(p => p.goalDifference || 0));
            bestGD = playersWhoPlayed.filter(p => p.goalDifference === maxGoalDiff && maxGoalDiff > 0);

            const qualifiedForDefense = playersWhoPlayed.filter(p => p.played >= 3);
            if (qualifiedForDefense.length > 0) {
                const minGoalsAgainst = Math.min(...qualifiedForDefense.map(p => p.goalsAgainst || 0));
                bestDefense = qualifiedForDefense.filter(p => p.goalsAgainst === minGoalsAgainst);
            }

            const maxGoalsAgainst = Math.max(...playersWhoPlayed.map(p => p.goalsAgainst || 0));
            worstDefender = playersWhoPlayed.filter(p => p.goalsAgainst === maxGoalsAgainst && maxGoalsAgainst > 0);
            
            const maxDraws = Math.max(...playersWhoPlayed.map(p => p.draw || 0));
            kingOfDraws = playersWhoPlayed.filter(p => p.draw === maxDraws && maxDraws > 0);

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
             <Card className="border-dashed border-4 border-white/5 bg-white/[0.02] w-full rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
                <Activity className="w-12 h-12 text-white/5" />
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] italic pr-2">Awaiting Match Logs</p>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
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

            {showUnbeaten && (
                <StatCard 
                    title={t('fun_stats_unbeaten')}
                    icon={ShieldCheck}
                    players={stats.unbeaten}
                    valueKey="played"
                    valueSuffix="Log"
                    ghostText="IMMORTAL"
                />
            )}

            {seasonType === 'Single' && stats.championshipContenders.length > 0 && (
                <StatCard 
                    title={t('fun_stats_championship_contender')}
                    icon={Flame}
                    players={stats.championshipContenders}
                    valueKey="points"
                    valueSuffix="Pts"
                    ghostText="TITLE"
                />
            )}
        </div>
    );
}