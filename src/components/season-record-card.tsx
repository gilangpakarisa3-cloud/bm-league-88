
'use client';

import type { SeasonRecord, WithId } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Award, Flame, ShieldAlert, Star, Trophy, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const StatItem = ({ icon: Icon, label, value, valueClassName, tooltip }: { icon: React.ElementType, label: string, value: string, valueClassName?: string, tooltip: string }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-xs">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{label}:</span>
                    <span className={`font-bold ml-auto ${valueClassName}`}>{value}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export function SeasonRecordCard({ record }: { record: WithId<SeasonRecord>}) {

    return (
        <Card className="flex flex-col overflow-hidden border-2 bg-card border-primary/50 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/20">
            <CardHeader className="text-center p-4 bg-secondary/30">
                <CardTitle className="text-lg font-bold text-primary">{record.seasonName}</CardTitle>
                <CardDescription>{new Date(record.completedAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center p-6 flex-grow">
                 <div className="relative mb-4">
                    <Avatar className="w-28 h-28 border-4 border-yellow-400 shadow-lg">
                        <AvatarImage src={record.winnerPhotoUrl} alt={record.winnerPlayerName} />
                        <AvatarFallback>
                            <User className="w-12 h-12" />
                        </AvatarFallback>
                    </Avatar>
                     <div className="absolute -bottom-2 -right-2 bg-card p-2 rounded-full shadow-xl border border-border">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                    </div>
                </div>
                <h3 className="text-xl font-bold">{record.winnerPlayerName}</h3>
                <p className="text-sm text-muted-foreground">{record.winnerTeamName}</p>
                <p className="text-xs font-bold text-yellow-400 mt-2">
                    {record.winnerStats.points} PTS | {record.winnerStats.win}W - {record.winnerStats.draw}D - {record.winnerStats.loss}L
                </p>
            </CardContent>
            <CardFooter className="p-4 bg-secondary/30">
                <div className="w-full space-y-2">
                    {record.funStats?.mostWins && (
                        <StatItem icon={Award} label="Most Wins" value={record.funStats.mostWins.playerName} tooltip={`With ${record.funStats.mostWins.value} wins`} />
                    )}
                    {record.funStats?.bestAttacker && (
                        <StatItem icon={Flame} label="Best Attacker" value={record.funStats.bestAttacker.playerName} tooltip={`Scored ${record.funStats.bestAttacker.value} goals`} valueClassName="text-green-400" />
                    )}
                    {record.funStats?.worstDefender && (
                        <StatItem icon={ShieldAlert} label="Worst Defense" value={record.funStats.worstDefender.playerName} tooltip={`Conceded ${record.funStats.worstDefender.value} goals`} valueClassName="text-red-400" />
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

