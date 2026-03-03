'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User, ShieldAlert, TrendingUp, Handshake, Flame, Target, Zap, Activity } from "lucide-react";
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
        "group relative overflow-hidden transition-all duration-700 border-2 hover:scale-[1.01] bg-card/80 backdrop-blur-3xl rounded-[1.5rem] sm:rounded-[2rem]",
        variant === "destructive" 
            ? "border-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_50px_rgba(239,68,68,0.15)]" 
            : "border-primary/20 hover:border-primary/50 hover:shadow-[0_0_50px_rgba(204,253,1,0.15)]"
    )}>
        {/* Ultra Sport Background Textures */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[size:4px_4px] opacity-20 pointer-events-none" />
        
        {/* HUD Decoration Corners */}
        <div className={cn(
            "absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 opacity-30 pointer-events-none transition-all duration-700 group-hover:opacity-100 rounded-tl-[1.5rem] sm:rounded-tl-[2rem]",
            variant === "destructive" ? "border-red-500" : "border-primary"
        )} />
        <div className={cn(
            "absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 opacity-10 pointer-events-none transition-all duration-700 group-hover:opacity-40 rounded-br-[1.5rem] sm:rounded-br-[2rem]",
            variant === "destructive" ? "border-red-500" : "border-primary"
        )} />
        
        {/* Large Ghost Text Background */}
        <span className="absolute bottom-[-10px] left-0 text-7xl sm:text-9xl font-black text-white/[0.02] uppercase tracking-tighter italic pointer-events-none group-hover:text-white/[0.04] transition-all duration-700 leading-none pl-6 pb-2 select-none pr-8">
            {ghostText || title.split(' ')[0]}
        </span>

        <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center gap-4">
                <div className={cn(
                    "p-3 rounded-2xl transition-all duration-700 shadow-2xl relative overflow-hidden group-hover:rotate-6",
                    variant === "destructive" 
                        ? "bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white" 
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black"
                )}>
                    <div className="absolute inset-0 bg-current opacity-20 animate-pulse" />
                    <Icon className="h-6 w-6 relative z-10" />
                </div>
                <div className="flex flex-col">
                    <CardTitle className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase italic pr-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] text-white/90">{title}</CardTitle>
                    <div className={cn("h-0.5 w-8 rounded-full mt-1", variant === "destructive" ? "bg-red-500/40" : "bg-primary/40")} />
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-4 relative z-10">
            {players.map(player => (
                <div key={player.id} className="group/item flex items-center justify-between bg-black/40 p-3 sm:p-4 rounded-2xl border-2 border-white/5 hover:border-primary/30 transition-all duration-500 hover:translate-x-2 shadow-inner relative overflow-hidden">
                    <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                        variant === "destructive" ? "bg-red-500/20 group-hover/item:bg-red-500" : "bg-primary/20 group-hover/item:bg-primary"
                    )} />
                    
                    <div className="flex items-center gap-4 overflow-hidden relative z-10">
                        <div className="relative shrink-0">
                            <div className={cn(
                                "absolute -inset-1.5 rounded-full blur-md opacity-0 transition-opacity duration-500 group-hover/item:opacity-40",
                                variant === "destructive" ? "bg-red-500" : "bg-primary"
                            )} />
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-2xl relative z-10 transition-transform group-hover/item:scale-110">
                                <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                <AvatarFallback className="bg-black/60"><User className="h-6 w-6 text-white/10" /></AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm sm:text-base font-black truncate uppercase italic pr-4 transition-colors text-white group-hover/item:text-primary leading-tight">{player.playerName}</p>
                            <p className="text-[10px] text-muted-foreground font-black tracking-widest truncate uppercase opacity-40 group-hover/item:opacity-80 transition-opacity">{player.teamName || 'Independent'}</p>
                        </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0 flex items-baseline gap-1.5 relative z-10">
                        <span className={cn(
                            "text-3xl sm:text-4xl font-black italic tabular-nums leading-none drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]",
                            variant === "destructive" ? "text-red-500" : "text-primary"
                        )}>
                            {player[valueKey]}
                        </span>
                        {valueSuffix && <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{valueSuffix}</span>}
                    </div>
                </div>
            ))}
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
                <Card className="group relative overflow-hidden transition-all duration-700 border-2 border-primary/20 hover:border-primary/50 bg-card/80 backdrop-blur-3xl hover:shadow-[0_0_50px_rgba(204,253,1,0.15)] rounded-[1.5rem] sm:rounded-[2rem]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,253,1,0.05),transparent)] pointer-events-none" />
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary/30 opacity-30 pointer-events-none group-hover:opacity-100 transition-all rounded-tl-[1.5rem] sm:rounded-tl-[2rem]" />
                    <span className="absolute bottom-[-10px] left-0 text-7xl sm:text-9xl font-black text-white/[0.02] uppercase tracking-tighter italic pointer-events-none leading-none pl-6 pb-2 select-none pr-8">IMMORTAL</span>
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all duration-700 shadow-2xl relative overflow-hidden group-hover:-rotate-6">
                                <div className="absolute inset-0 bg-current opacity-20 animate-pulse" />
                                <ShieldCheck className="h-6 w-6 relative z-10" />
                            </div>
                            <div className="flex flex-col">
                                <CardTitle className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase italic pr-4 text-white/90">{t('fun_stats_unbeaten')}</CardTitle>
                                <div className="h-0.5 w-8 bg-primary/40 rounded-full mt-1" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 relative z-10">
                        {stats.unbeaten.map(player => (
                            <div key={player.id} className="group/item flex items-center gap-4 bg-black/40 p-3 sm:p-4 rounded-2xl border-2 border-white/5 hover:border-primary/30 transition-all duration-500 hover:translate-x-2 shadow-inner relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover/item:bg-primary transition-all duration-500" />
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-2xl relative z-10 group-hover/item:scale-110 transition-transform">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                    <AvatarFallback className="bg-black/60"><User className="h-6 w-6 text-white/10" /></AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="text-sm sm:text-base font-black uppercase italic pr-4 truncate text-white group-hover/item:text-primary transition-colors">{player.playerName}</p>
                                    <p className="text-[10px] text-white/30 font-black tracking-widest uppercase truncate opacity-40 group-hover/item:opacity-80">{player.teamName || 'Independent'}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {seasonType === 'Single' && stats.championshipContenders.length > 0 && (
                <Card className="group relative overflow-hidden transition-all duration-700 border-2 border-yellow-500/20 hover:border-yellow-500/50 bg-card/80 backdrop-blur-3xl hover:shadow-[0_0_50px_rgba(234,179,8,0.15)] rounded-[1.5rem] sm:rounded-[2rem]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.05),transparent)] pointer-events-none" />
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-yellow-500/30 opacity-30 pointer-events-none group-hover:opacity-100 transition-all rounded-tl-[1.5rem] sm:rounded-tl-[2rem]" />
                    <span className="absolute bottom-[-10px] left-0 text-7xl sm:text-9xl font-black text-white/[0.02] uppercase tracking-tighter italic pointer-events-none leading-none pl-6 pb-2 select-none pr-8">TITLE</span>
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-all duration-700 shadow-2xl relative overflow-hidden group-hover:rotate-12">
                                <div className="absolute inset-0 bg-current opacity-20 animate-pulse" />
                                <Flame className="h-6 w-6 relative z-10" />
                            </div>
                            <div className="flex flex-col">
                                <CardTitle className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase italic pr-4 text-white/90">{t('fun_stats_championship_contender')}</CardTitle>
                                <div className="h-0.5 w-8 bg-yellow-500/40 rounded-full mt-1" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 relative z-10">
                        {stats.championshipContenders.map(player => (
                             <div key={player.id} className="group/item flex items-center justify-between bg-black/40 p-3 sm:p-4 rounded-2xl border-2 border-white/5 hover:border-yellow-500/30 transition-all duration-500 hover:translate-x-2 shadow-inner relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/20 group-hover/item:bg-yellow-500 transition-all duration-500" />
                                <div className="flex items-center gap-4 overflow-hidden relative z-10">
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-2xl relative z-10 group-hover/item:scale-110 transition-transform">
                                        <AvatarImage src={player.team?.logoUrl} alt={player.playerName} className="object-cover" />
                                        <AvatarFallback className="bg-black/60"><User className="h-6 w-6 text-white/10" /></AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <p className="text-sm sm:text-base font-black uppercase italic pr-4 truncate text-white group-hover/item:text-yellow-500 transition-colors leading-tight">{player.playerName}</p>
                                        <p className="text-[10px] text-white/30 font-black tracking-widest uppercase truncate opacity-40 group-hover/item:opacity-80">{player.teamName || 'Independent'}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black border-yellow-500/50 text-yellow-500 bg-yellow-500/10 py-1 h-6 animate-pulse px-3">-{player.pointsBehind} PTS</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
