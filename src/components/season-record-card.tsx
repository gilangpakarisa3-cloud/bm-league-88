'use client';

import type { SeasonRecord, WithId } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Award, Trash2, Trophy, User, TrendingUp, ShieldAlert, Zap, Star, Activity, ShieldCheck, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguage } from "@/context/language-context";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatItem = ({ icon: Icon, label, value, valueClassName, tooltip, variant = "default" }: { 
    icon: React.ElementType, 
    label: string, 
    value: string, 
    valueClassName?: string, 
    tooltip: string,
    variant?: "default" | "primary" | "destructive"
}) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    "flex flex-col gap-1.5 p-3 rounded-xl border transition-all duration-300",
                    variant === "primary" ? "bg-primary/5 border-primary/20 hover:border-primary/40" : 
                    variant === "destructive" ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" :
                    "bg-white/5 border-white/10 hover:border-white/20"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Icon className={cn("w-3 h-3", variant === "primary" ? "text-primary" : variant === "destructive" ? "text-red-400" : "text-muted-foreground")} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                        </div>
                    </div>
                    <span className={cn("font-black text-sm tracking-tight uppercase truncate", valueClassName)}>{value}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-black/90 border-white/10">
                <p className="text-[10px] font-bold">{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export function SeasonRecordCard({ record, isAdmin, onDelete }: { record: WithId<SeasonRecord>, isAdmin?: boolean, onDelete?: () => void }) {
    const { t } = useTranslation();
    const { language } = useLanguage();
    
    const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
    const formattedDate = new Date(record.completedAt.toDate()).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });

    return (
        <div className="group relative">
            {/* Dynamic Background Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-700" />
            
            <Card className="relative flex flex-col h-full bg-card/60 backdrop-blur-xl border-2 border-white/5 group-hover:border-yellow-400/30 transition-all duration-500 overflow-hidden rounded-2xl">
                {/* Ghost Text Background - Adjusted for visibility */}
                <span className="absolute top-4 left-4 text-5xl font-black text-white/[0.02] uppercase tracking-tighter whitespace-nowrap pointer-events-none group-hover:text-yellow-400/[0.03] transition-colors leading-none pr-4">
                    {record.seasonName}
                </span>

                <CardHeader className="text-center p-6 bg-black/20 backdrop-blur-md relative z-10 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest py-1">
                            COMPLETED
                        </Badge>
                        {isAdmin && onDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 border border-white/5 transition-all" onClick={onDelete}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                    <CardTitle className="text-xl font-black text-yellow-400 tracking-tighter uppercase italic drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                        {record.seasonName}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                        Season Finale • {formattedDate}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center text-center p-8 flex-grow relative z-10">
                    {/* Winner Spotlight */}
                    <div className="relative mb-8">
                        {/* Winner Glow */}
                        <div className="absolute inset-0 bg-yellow-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative z-10">
                            <Avatar className="w-32 h-32 border-4 border-yellow-400/50 shadow-2xl group-hover:border-yellow-400 group-hover:scale-105 transition-all duration-500">
                                <AvatarImage src={record.winnerPhotoUrl} alt={record.winnerPlayerName} />
                                <AvatarFallback className="bg-white/5">
                                    <User className="w-16 h-16 text-white/10" />
                                </AvatarFallback>
                            </Avatar>
                            
                            {/* Crown/Trophy Badge */}
                            <div className="absolute -bottom-3 -right-3 bg-yellow-400 text-black h-12 w-12 rounded-xl flex items-center justify-center border-4 border-background shadow-xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <Trophy className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic group-hover:text-yellow-400 transition-colors pr-2">
                            {record.winnerPlayerName}
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest gap-1.5 py-1">
                                <Star className="w-3 h-3 text-yellow-400" />
                                {record.winnerTeamName}
                            </Badge>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="mt-8 w-full bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-yellow-400/10 transition-all">
                        <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Championship Stats</span>
                            <span className="text-yellow-400">{record.winnerStats.points} PTS Total</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-left">
                                <p className="text-[18px] font-black text-white leading-none tabular-nums">
                                    {record.winnerStats.win}<span className="text-primary text-xs ml-1">W</span>
                                </p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Victories</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[18px] font-black text-white leading-none tabular-nums">
                                    {record.winnerStats.loss}<span className="text-red-500 text-xs ml-1">L</span>
                                </p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Defeats</p>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-6 bg-black/20 backdrop-blur-md relative z-10 border-t border-white/5">
                    <div className="w-full grid grid-cols-2 gap-3">
                        {record.funStats?.mostWins && (
                            <StatItem 
                                icon={Award} 
                                label={t('fun_stats_most_wins')} 
                                value={record.funStats.mostWins.playerName} 
                                variant="primary"
                                tooltip={t('fun_stats_most_wins_tooltip', { value: record.funStats.mostWins.value })} 
                            />
                        )}
                        {record.funStats?.bestAttacker && (
                            <StatItem 
                                icon={Target} 
                                label={t('fun_stats_best_attacker')} 
                                value={record.funStats.bestAttacker.playerName} 
                                valueClassName="text-green-400" 
                                tooltip={t('fun_stats_best_attacker_tooltip', { value: record.funStats.bestAttacker.value })} 
                            />
                        )}
                        {record.funStats?.worstDefender && (
                            <StatItem 
                                icon={ShieldAlert} 
                                label={t('fun_stats_worst_defense')} 
                                value={record.funStats.worstDefender.playerName} 
                                variant="destructive"
                                valueClassName="text-red-400" 
                                tooltip={t('fun_stats_worst_defense_tooltip', { value: record.funStats.worstDefender.value })} 
                            />
                        )}
                        <StatItem 
                            icon={Zap} 
                            label="GOAL DIFF" 
                            value={String(record.winnerStats.goalDifference)} 
                            tooltip={`Net Goal difference of ${record.winnerStats.goalDifference}`}
                        />
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}