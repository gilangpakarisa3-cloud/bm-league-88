
'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldCheck, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

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
}

export function LeagueStats({ tableData, isLoading }: LeagueStatsProps) {
    const stats = useMemo(() => {
        if (!tableData || tableData.length === 0) {
            return {
                mostWins: [],
                unbeaten: [],
            };
        }

        const playersWhoPlayed = tableData.filter(p => p.played > 0);
        if (playersWhoPlayed.length === 0) {
             return {
                mostWins: [],
                unbeaten: [],
            };
        }

        const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
        const mostWins = playersWhoPlayed.filter(p => p.win === maxWins && maxWins > 0);

        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0);

        return { mostWins, unbeaten };
    }, [tableData]);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
        );
    }
    
    const showUnbeaten = stats.unbeaten.length > 0;

    if (stats.mostWins.length === 0 && !showUnbeaten) {
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
                                Raja Kemenangan
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">Pemain dengan jumlah kemenangan terbanyak.</CardDescription>
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
             
             {showUnbeaten && (
                <Card className="bg-card border-2 border-primary">
                    <CardHeader className="pb-2">
                       <div className="flex items-center gap-2">
                         <ShieldCheck className="text-primary h-5 w-5"/>
                        <CardTitle className="text-base font-bold text-foreground">
                            Tak Terkalahkan
                        </CardTitle>
                       </div>
                       <CardDescription className="text-xs pt-1">Pemain yang belum pernah kalah di musim ini.</CardDescription>
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
        </div>
    );
}
