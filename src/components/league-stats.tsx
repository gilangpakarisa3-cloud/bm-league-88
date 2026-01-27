
'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Award, ShieldAlert, ShieldCheck, Flame, User, Swords, Handshake, PercentSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";

const StatCard = ({ icon, title, description, value, valueLabel, player, valueClassName }: { icon: React.ReactNode, title: string, description: string, value: string | number, valueLabel?: string, player?: WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>}, valueClassName?: string }) => (
    <Card className="bg-card border-2 border-primary">
        <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
                 {icon}
                <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
            </div>
             <CardDescription className="text-xs pt-1">
                {description}
            </CardDescription>
        </CardHeader>
        <CardContent>
             {player && (
                 <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                          <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                          <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="text-sm font-semibold text-foreground truncate">{player.playerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.teamName}</p>
                      </div>
                    </div>
                     <div className={cn("text-2xl font-bold", valueClassName)}>
                        {value}
                        {valueLabel && <span className="text-sm"> {valueLabel}</span>}
                     </div>
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

const ChampionChanceCard = ({ topContenders }: { topContenders: (WithId<LeagueEntry> & { chance: number, player?: WithId<Player>, team?: WithId<Team> })[] }) => {
    if (!topContenders || topContenders.length === 0) return null;

    // Use theme-based chart colors for gold, silver, bronze equivalent
    const colors = ["bg-chart-1", "bg-chart-2", "bg-chart-3"];

    return (
        <Card className="bg-card border-2 border-primary">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <PercentSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                    Peluang Juara
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <CardDescription className="text-xs pt-1 mb-4">
                    Berdasarkan poin dan selisih gol saat ini.
                </CardDescription>
                <div className="space-y-4 pt-4">
                    {topContenders.map((player, index) => (
                        <div key={player.id}>
                            <div className="flex items-center gap-3 mb-1">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold">{player.playerName}</p>
                                    <p className="text-xs text-muted-foreground">{player.teamName}</p>
                                </div>
                                <span className="ml-auto text-lg font-bold text-primary">{player.chance.toFixed(1)}%</span>
                            </div>
                            <Progress value={player.chance} color={cn("h-2", colors[index] || "bg-primary")} />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

interface LeagueStatsProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>; team?: WithId<Team> })[];
  isLoading?: boolean;
}

export function LeagueStats({ tableData, isLoading }: LeagueStatsProps) {
    const stats = useMemo(() => {
        if (!tableData || tableData.length === 0) {
            return {
                bestAttacker: null,
                worstDefender: null,
                mostWins: [],
                unbeaten: [],
                mostDraws: [],
                topContenders: [],
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
                topContenders: [],
            };
        }

        const bestAttacker = [...playersWhoPlayed].sort((a, b) => b.goalsFor - a.goalsFor)[0];
        const worstDefender = [...playersWhoPlayed].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0];
        
        const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
        const mostWins = playersWhoPlayed.filter(p => p.win === maxWins && maxWins > 0);

        const unbeaten = playersWhoPlayed.filter(p => p.loss === 0);

        const maxDraws = Math.max(...playersWhoPlayed.map(p => p.draw));
        const mostDraws = playersWhoPlayed.filter(p => p.draw === maxDraws && maxDraws > 0);
        
        // --- Champion Chance Logic ---
        let topContenders: (WithId<LeagueEntry> & { chance: number })[] = [];

        // Only calculate chance if at least one match has been played
        const anyMatchPlayed = tableData.some(p => p.played > 0);

        if (anyMatchPlayed) {
            const contenders = tableData.map(player => {
                // The chance score is now based only on current points and goal difference as a tie-breaker.
                const chanceScore = player.points + (player.goalDifference * 0.01);
                return { ...player, chanceScore };
            });

            const totalChanceScore = contenders.reduce((sum, player) => sum + Math.max(0, player.chanceScore), 0);

            const contendersWithChance = contenders.map(player => ({
                ...player,
                chance: totalChanceScore > 0 ? (Math.max(0, player.chanceScore) / totalChanceScore) * 100 : 0,
            })).sort((a, b) => b.chance - a.chance);

            topContenders = contendersWithChance.slice(0, 3);
        }


        return { bestAttacker, worstDefender, mostWins, unbeaten, mostDraws, topContenders };
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
    const anyMatchPlayed = tableData.some(p => p.played > 0);


    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {stats.bestAttacker && (
                    <StatCard 
                        icon={<Flame className="h-5 w-5 text-primary" />}
                        title="Penyerang Terbaik"
                        description="Pemain dengan jumlah gol terbanyak."
                        value={stats.bestAttacker.goalsFor}
                        valueLabel="Gol"
                        player={stats.bestAttacker}
                        valueClassName="text-primary"
                    />
                )}
                {stats.worstDefender && (
                     <StatCard 
                        icon={<ShieldAlert className="h-5 w-5 text-primary" />}
                        title="Pertahanan Terburuk"
                        description="Pemain dengan jumlah kebobolan terbanyak."
                        value={stats.worstDefender.goalsAgainst}
                        valueLabel="Gol"
                        player={stats.worstDefender}
                        valueClassName="text-destructive"
                    />
                )}
            </div>
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

            {!showUnbeaten && stats.mostDraws.length > 0 && (
                 <Card className="bg-card border-2 border-primary">
                     <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Handshake className="text-primary h-5 w-5"/>
                            <CardTitle className="text-base font-bold text-foreground">
                                Raja Seri
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1">Pemain dengan jumlah seri terbanyak.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                        {stats.mostDraws.map(player => (
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
                                <span className="text-2xl font-bold text-sky-400">{player.draw} <span className="text-sm">kali</span></span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
             {anyMatchPlayed && stats.topContenders.length > 0 && <ChampionChanceCard topContenders={stats.topContenders} />}
        </div>
    );
}
