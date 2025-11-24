
'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldAlert, ShieldCheck, Flame, User, Swords } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface LeagueStatsProps {
    tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
    isLoading: boolean;
}

const StatCard = ({ icon, title, value, player, team }: { icon: React.ReactNode, title: string, value: string | number, player?: string, team?: string }) => (
    <Card className="bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-primary">{value}</div>
            <p className="text-xs text-muted-foreground">{player}</p>
            <p className="text-xs text-muted-foreground">{team}</p>
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
                mostWins: null,
                unbeaten: []
            };
        }

        const playersWhoPlayed = tableData.filter(p => p.played > 0);
        if (playersWhoPlayed.length === 0) {
             return {
                bestAttacker: null,
                worstDefender: null,
                mostWins: null,
                unbeaten: []
            };
        }

        const bestAttacker = [...playersWhoPlayed].sort((a, b) => b.goalsFor - a.goalsFor)[0];
        const worstDefender = [...playersWhoPlayed].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0];
        const mostWins = [...playersWhoPlayed].sort((a, b) => b.win - a.win)[0];
        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0);

        return { bestAttacker, worstDefender, mostWins, unbeaten };
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

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {stats.bestAttacker && (
                    <StatCard 
                        icon={<Flame className="h-4 w-4 text-muted-foreground" />}
                        title="Penyerang Terbaik"
                        value={stats.bestAttacker.goalsFor}
                        player={stats.bestAttacker.playerName}
                        team={stats.bestAttacker.teamName}
                    />
                )}
                {stats.worstDefender && (
                     <StatCard 
                        icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                        title="Pertahanan Terburuk"
                        value={stats.worstDefender.goalsAgainst}
                        player={stats.worstDefender.playerName}
                        team={stats.worstDefender.teamName}
                    />
                )}
                 {stats.mostWins && stats.mostWins.win > 0 && (
                     <StatCard 
                        icon={<Award className="h-4 w-4 text-muted-foreground" />}
                        title="Raja Kemenangan"
                        value={stats.mostWins.win}
                        player={stats.mostWins.playerName}
                        team={stats.mostWins.teamName}
                    />
                )}
            </div>
             {stats.unbeaten.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="text-primary"/>
                            Tak Terkalahkan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
        </div>
    );
}
