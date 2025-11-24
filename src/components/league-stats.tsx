
'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldAlert, ShieldCheck, Flame, User, Swords, Handshake } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

interface LeagueStatsProps {
    tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
    isLoading: boolean;
}

const StatCard = ({ icon, title, value, player, valueClassName }: { icon: React.ReactNode, title: string, value: string | number, player?: WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>}, valueClassName?: string }) => (
    <Card className="bg-card/50 border-2 border-primary">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            {icon}
            <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
             {player && (
                 <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={player.player?.photoUrl} alt={player.playerName} />
                          <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="text-sm font-semibold text-foreground truncate">{player.playerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.teamName}</p>
                      </div>
                    </div>
                     <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
                </div>
            )}
        </CardContent>
    </Card>
);

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

export function LeagueStats({ tableData, isLoading }: LeagueStatsProps) {
    const stats = useMemo(() => {
        if (!tableData || tableData.length === 0) {
            return {
                bestAttacker: null,
                worstDefender: null,
                mostWins: [],
                unbeaten: [],
                mostDraws: [],
            };
        }

        const playersWhoPlayed = tableData.filter(p => p.played > 0);
        if (playersWhoPlayed.length === 0) {
             return {
                bestAttacker: null,
                worstDefender: null,
                mostWins: [],
                unbeaten: [],
                mostDraws: [],
            };
        }

        const bestAttacker = [...playersWhoPlayed].sort((a, b) => b.goalsFor - a.goalsFor)[0];
        const worstDefender = [...playersWhoPlayed].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0];
        
        const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
        const mostWins = playersWhoPlayed.filter(p => p.win === maxWins && maxWins > 0);

        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0);

        const maxDraws = Math.max(...playersWhoPlayed.map(p => p.draw));
        const mostDraws = playersWhoPlayed.filter(p => p.draw === maxDraws && maxDraws > 0);

        return { bestAttacker, worstDefender, mostWins, unbeaten, mostDraws };
    }, [tableData]);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
        );
    }

    if (!stats.bestAttacker) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Belum ada statistik untuk ditampilkan.
                </CardContent>
            </Card>
        );
    }
    
    const showUnbeaten = stats.unbeaten.length > 0;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {stats.bestAttacker && (
                    <StatCard 
                        icon={<Flame className="h-5 w-5 text-primary" />}
                        title="Penyerang Terbaik"
                        value={stats.bestAttacker.goalsFor}
                        player={stats.bestAttacker}
                        valueClassName="text-primary"
                    />
                )}
                {stats.worstDefender && (
                     <StatCard 
                        icon={<ShieldAlert className="h-5 w-5 text-primary" />}
                        title="Pertahanan Terburuk"
                        value={stats.worstDefender.goalsAgainst}
                        player={stats.worstDefender}
                        valueClassName="text-destructive"
                    />
                )}
            </div>
             {stats.mostWins.length > 0 && (
                <Card className="bg-card/50 border-2 border-primary">
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                        <Award className="text-primary h-5 w-5"/>
                        <CardTitle className="text-base font-bold text-foreground">
                            Raja Kemenangan
                        </CardTitle>
                        <span className="ml-auto text-2xl font-bold text-yellow-400">{stats.mostWins[0].win}</span>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.mostWins.map(player => (
                             <div key={player.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.player?.photoUrl} alt={player.playerName} />
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
             
             {showUnbeaten && (
                <Card className="bg-card/50 border-2 border-primary">
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                        <ShieldCheck className="text-primary h-5 w-5"/>
                        <CardTitle className="text-base font-bold text-foreground">
                            Tak Terkalahkan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.unbeaten.map(player => (
                             <div key={player.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.player?.photoUrl} alt={player.playerName} />
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

            {!showUnbeaten && stats.mostDraws.length > 0 && (
                 <Card className="bg-card/50 border-2 border-primary">
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                        <Handshake className="text-primary h-5 w-5"/>
                        <CardTitle className="text-base font-bold text-foreground">
                            Raja Seri
                        </CardTitle>
                        <span className="ml-auto text-2xl font-bold text-blue-400">{stats.mostDraws[0].draw}</span>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.mostDraws.map(player => (
                             <div key={player.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.player?.photoUrl} alt={player.playerName} />
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
        </div>
    );
}

    