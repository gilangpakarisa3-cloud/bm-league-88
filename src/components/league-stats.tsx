'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User, ShieldAlert, TrendingUp, Handshake, Flame, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatCardSkeleton = () => (
    <Card className="h-32">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
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
             <Card className="border-dashed border-2">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Belum ada statistik performa untuk ditampilkan.
                </CardContent>
            </Card>
        )
    }

    const StatCard = ({ 
        title, 
        desc, 
        icon: Icon, 
        players, 
        valueSuffix, 
        valueKey, 
        variant = "primary" 
    }: { 
        title: string, 
        desc: string, 
        icon: any, 
        players: any[], 
        valueSuffix?: string, 
        valueKey: string,
        variant?: "primary" | "destructive"
    }) => (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300 border-2 hover:scale-[1.02] bg-card",
            variant === "destructive" 
                ? "border-destructive/20 hover:border-destructive hover:shadow-lg hover:shadow-destructive/10" 
                : "border-primary/20 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
        )}>
            {/* Overlay Effect */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none",
                variant === "destructive" ? "from-destructive" : "from-primary"
            )} />
            
            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg transition-colors duration-300",
                        variant === "destructive" 
                            ? "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground" 
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-black tracking-tight">{title}</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-medium leading-tight pt-1 opacity-80">
                    {desc}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3 pt-2 relative z-10">
                {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-muted/20 p-2 rounded-md border border-transparent hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                                <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold truncate">{player.playerName}</p>
                                <p className="text-[9px] text-muted-foreground font-black tracking-tighter truncate">{player.teamName}</p>
                            </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                            <span className={cn(
                                "text-lg font-black",
                                variant === "destructive" ? "text-destructive" : "text-primary"
                            )}>
                                {player[valueKey]}
                            </span>
                            {valueSuffix && <span className="text-[9px] ml-1 font-bold text-muted-foreground">{valueSuffix}</span>}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            {/* 1. Raja Kemenangan */}
            {stats.mostWins.length > 0 && (
                <StatCard 
                    title={t('fun_stats_most_wins')}
                    desc={t('fun_stats_most_wins_desc')}
                    icon={Award}
                    players={stats.mostWins}
                    valueKey="win"
                    valueSuffix="kali"
                />
            )}

            {/* 1.5. Selisih Gol Terbaik (Best GA) */}
            {seasonType !== 'Co-Op' && stats.bestGD.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_gd')}
                    desc={t('fun_stats_best_gd_desc')}
                    icon={TrendingUp}
                    players={stats.bestGD}
                    valueKey="goalDifference"
                    valueSuffix={t('gd_short')}
                />
            )}

            {/* 2. Pertahanan Terbaik */}
            {seasonType !== 'Co-Op' && stats.bestDefense.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_defense')}
                    desc={t('fun_stats_best_defense_desc')}
                    icon={ShieldCheck}
                    players={stats.bestDefense}
                    valueKey="goalsAgainst"
                    valueSuffix="GA"
                />
            )}

            {/* 3. Penyerang Terbaik */}
            {seasonType !== 'Co-Op' && stats.bestAttacker.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_attacker')}
                    desc={t('fun_stats_best_attacker_desc')}
                    icon={Target}
                    players={stats.bestAttacker}
                    valueKey="goalsFor"
                    valueSuffix="Gol"
                />
            )}

            {/* 4. Raja Seri */}
            {seasonType !== 'Co-Op' && stats.kingOfDraws.length > 0 && (
                <StatCard 
                    title={t('fun_stats_king_of_draws')}
                    desc={t('fun_stats_king_of_draws_desc')}
                    icon={Handshake}
                    players={stats.kingOfDraws}
                    valueKey="draw"
                    valueSuffix="Seri"
                />
            )}

            {/* 5. Pertahanan Terburuk */}
            {seasonType !== 'Co-Op' && stats.worstDefender.length > 0 && (
                <StatCard 
                    title={t('fun_stats_worst_defense')}
                    desc={t('fun_stats_worst_defense_desc')}
                    icon={ShieldAlert}
                    players={stats.worstDefender}
                    valueKey="goalsAgainst"
                    valueSuffix="Gol"
                    variant="destructive"
                />
            )}

            {/* 6. Tidak Terkalahkan */}
            {showUnbeaten && (
                <Card className="group relative overflow-hidden transition-all duration-300 border-2 border-primary/20 hover:border-primary bg-card hover:shadow-lg hover:shadow-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-sm font-black tracking-tight">{t('fun_stats_unbeaten')}</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-medium leading-tight pt-1 opacity-80">{t('fun_stats_unbeaten_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-2 relative z-10">
                        {stats.unbeaten.map(player => (
                            <div key={player.id} className="flex items-center gap-3 bg-muted/20 p-2 rounded-md border border-transparent hover:border-primary/30 transition-all">
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs font-bold">{player.playerName}</p>
                                    <p className="text-[9px] text-muted-foreground font-black tracking-tighter">{player.teamName}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Peluang Juara (Hanya Single Mode) */}
            {seasonType === 'Single' && stats.championshipContenders.length > 0 && (
                <Card className="group relative overflow-hidden transition-all duration-300 border-2 border-primary/20 hover:border-primary bg-card hover:shadow-lg hover:shadow-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                    <CardHeader className="pb-2 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                <Flame className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-sm font-black tracking-tight">{t('fun_stats_championship_contender')}</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-medium leading-tight pt-1 opacity-80">{t('fun_stats_championship_contender_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-2 relative z-10">
                        {stats.championshipContenders.map(player => (
                             <div key={player.id} className="flex items-center justify-between bg-muted/20 p-2 rounded-md border border-transparent hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border-2 border-background"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-xs font-bold">{player.playerName}</p><p className="text-[9px] text-muted-foreground font-black tracking-tighter">{player.teamName}</p></div>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black border-primary/50 text-primary bg-primary/5">-{player.pointsBehind} Poin</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
