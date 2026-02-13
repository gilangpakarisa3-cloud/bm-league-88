'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User, ShieldAlert, TrendingUp, Handshake, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";

const StatCardSkeleton = () => (
    <Card>
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
                worstDefender: [],
                kingOfDraws: [],
                championshipContenders: [],
            };
        }

        const playersWhoPlayed = tableData.filter(p => p.played > 0);
        if (playersWhoPlayed.length === 0) {
             return { mostWins: [], unbeaten: [], bestAttacker: [], bestDefense: [], worstDefender: [], kingOfDraws: [], championshipContenders: [] };
        }

        const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
        const mostWins = playersWhoPlayed.filter(p => p.win === maxWins && maxWins > 0);

        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0 && p.played > 0);
        
        let bestAttacker: any[] = [];
        let bestDefense: any[] = [];
        let worstDefender: any[] = [];
        let kingOfDraws: any[] = [];
        let championshipContenders: any[] = [];
        const leaderPoints = tableData.length > 0 ? tableData[0].points : 0;


        // Enable these stats for Single and Hybrid modes (any mode that isn't Co-Op)
        if (seasonType !== 'Co-Op') {
            const maxGoalsFor = Math.max(...playersWhoPlayed.map(p => p.goalsFor || 0));
            bestAttacker = playersWhoPlayed.filter(p => p.goalsFor === maxGoalsFor && maxGoalsFor > 0);
            
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

            championshipContenders = tableData
                .filter(p => p.rank === 2 || p.rank === 3)
                .map(p => ({...p, pointsBehind: leaderPoints - p.points }));
        }

        return { mostWins, unbeaten, bestAttacker, bestDefense, worstDefender, kingOfDraws, championshipContenders };
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

    if (stats.mostWins.length === 0 && !showUnbeaten && stats.bestAttacker.length === 0 && stats.bestDefense.length === 0 && stats.worstDefender.length === 0 && stats.kingOfDraws.length === 0 && stats.championshipContenders.length === 0) {
        return (
             <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Belum ada statistik untuk ditampilkan.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
             {stats.mostWins.length > 0 && (
                <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                             <Award className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">
                                {t('fun_stats_most_wins')}
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_most_wins_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.mostWins.map(player => (
                             <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                        <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold">{player.playerName}</p>
                                        <p className="text-xs text-muted-foreground">{player.teamName}</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-yellow-400">{player.win} <span className="text-sm">kali</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

             {seasonType !== 'Co-Op' && stats.kingOfDraws.length > 0 && (
                <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Handshake className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">
                                {t('fun_stats_king_of_draws')}
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_king_of_draws_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.kingOfDraws.map(player => (
                             <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-sm font-semibold">{player.playerName}</p><p className="text-xs text-muted-foreground">{player.teamName}</p></div>
                                </div>
                                <span className="text-2xl font-bold text-yellow-400">{player.draw} <span className="text-sm">kali</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {seasonType !== 'Co-Op' && stats.championshipContenders.length > 0 && (
                <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Flame className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">
                                {t('fun_stats_championship_contender')}
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_championship_contender_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.championshipContenders.map(player => (
                             <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-sm font-semibold">{player.playerName}</p><p className="text-xs text-muted-foreground">{player.teamName}</p></div>
                                </div>
                                <Badge variant="outline" className="text-primary border-primary">-{player.pointsBehind} Poin</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {seasonType !== 'Co-Op' && stats.bestAttacker.length > 0 && (
                 <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">{t('fun_stats_best_attacker')}</CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_best_attacker_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.bestAttacker.map(player => (
                            <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-sm font-semibold">{player.playerName}</p><p className="text-xs text-muted-foreground">{player.teamName}</p></div>
                                </div>
                                <span className="text-2xl font-bold text-green-400">{player.goalsFor} <span className="text-sm">gol</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {seasonType !== 'Co-Op' && stats.bestDefense.length > 0 && (
                 <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">{t('fun_stats_best_defense')}</CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_best_defense_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.bestDefense.map(player => (
                            <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-sm font-semibold">{player.playerName}</p><p className="text-xs text-muted-foreground">{player.teamName}</p></div>
                                </div>
                                <span className="text-2xl font-bold text-green-400">{player.goalsAgainst} <span className="text-sm">kebobolan</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

             {showUnbeaten && (
                <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                       <div className="flex items-center gap-2">
                         <ShieldCheck className="text-primary h-5 w-5"/>
                        <CardTitle className="text-base font-bold text-foreground">
                            {t('fun_stats_unbeaten')}
                        </CardTitle>
                       </div>
                       <CardDescription className="text-xs pt-1">{t('fun_stats_unbeaten_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.unbeaten.map(player => (
                             <div key={player.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold">{player.playerName}</p>
                                    <p className="text-xs text-muted-foreground">{player.teamName}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {seasonType !== 'Co-Op' && stats.worstDefender.length > 0 && (
                 <Card className="bg-card border-2 border-destructive">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-destructive h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">{t('fun_stats_worst_defense')}</CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">{t('fun_stats_worst_defense_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.worstDefender.map(player => (
                             <div key={player.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8"><AvatarImage src={player.team?.logoUrl} alt={player.playerName} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div><p className="text-sm font-semibold">{player.playerName}</p><p className="text-xs text-muted-foreground">{player.teamName}</p></div>
                                </div>
                                <span className="text-2xl font-bold text-red-400">{player.goalsAgainst} <span className="text-sm">gol</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
