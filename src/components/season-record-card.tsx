'use client';

import type { SeasonRecord, WithId } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Award, Trash2, Trophy, User, TrendingUp, ShieldAlert, Zap, Star, Activity, ShieldCheck, Target, ChevronRight, Binary } from "lucide-react";
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
                    "flex flex-col gap-1.5 p-3.5 rounded-xl border-2 transition-all duration-500 relative overflow-hidden group/item",
                    variant === "primary" ? "bg-primary/5 border-primary/20 hover:border-primary/50" : 
                    variant === "destructive" ? "bg-red-500/5 border-red-500/20 hover:border-red-500/50" :
                    "bg-white/5 border-white/10 hover:border-white/20"
                )}>
                    {/* Interior HUD Accent */}
                    <div className={cn(
                        "absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 opacity-20 transition-opacity group-hover/item:opacity-60",
                        variant === "primary" ? "border-primary" : variant === "destructive" ? "border-red-500" : "border-white"
                    )} />
                    
                    <div className="flex items-center gap-2 relative z-10">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            variant === "primary" ? "bg-primary/10 text-primary" : 
                            variant === "destructive" ? "bg-red-500/10 text-red-400" : 
                            "bg-white/10 text-white/40"
                        )}>
                            <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">{label}</span>
                    </div>
                    <span className={cn("font-black text-sm tracking-tighter uppercase italic truncate mt-1 relative z-10 pr-2", valueClassName)}>{value}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#0A192F] border-primary/30 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{tooltip}</p>
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
            {/* Ultra Sport Dynamic Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400/40 via-transparent to-amber-600/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition-all duration-1000" />
            
            <Card className="relative flex flex-col h-full bg-[#0A192F]/80 backdrop-blur-2xl border-2 border-white/5 group-hover:border-yellow-400/40 transition-all duration-700 overflow-hidden rounded-[2.5rem] shadow-2xl">
                
                {/* Immersive Background Ghost Text */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] select-none flex flex-col items-start pt-12 pl-8 overflow-hidden">
                    <span className="text-[10rem] font-black italic leading-none group-hover:text-yellow-400/10 transition-colors duration-700 pr-10">THE</span>
                    <span className="text-[10rem] font-black italic -mt-16 text-primary group-hover:text-yellow-400/20 transition-colors duration-700 pr-10">CHAMPION</span>
                </div>

                {/* HUD Decoration Frame */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-yellow-400/20 rounded-tl-[2.5rem] pointer-events-none group-hover:border-yellow-400/60 transition-colors duration-700" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-yellow-400/10 rounded-br-[2.5rem] pointer-events-none group-hover:border-yellow-400/40 transition-colors duration-700" />

                <CardHeader className="text-center p-8 bg-black/40 backdrop-blur-md relative z-10 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                            <Badge variant="outline" className="bg-yellow-400/10 border-yellow-400/30 text-yellow-400 text-[9px] font-black uppercase tracking-[0.3em] py-1 px-3 italic">
                                RECORD VERIFIED
                            </Badge>
                        </div>
                        {isAdmin && onDelete && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-red-500/20 text-white/20 hover:text-red-500 border border-white/5 rounded-xl transition-all" onClick={onDelete}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase italic pr-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:text-yellow-400 transition-colors">
                            {record.seasonName}
                        </CardTitle>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic pr-2">
                                {formattedDate}
                            </span>
                            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center text-center p-10 flex-grow relative z-10">
                    {/* Winner Spotlight Section */}
                    <div className="relative mb-10 group/avatar">
                        {/* Winner Ambient Glow */}
                        <div className="absolute -inset-12 bg-yellow-400/10 rounded-full blur-[60px] opacity-40 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                        
                        <div className="relative z-10">
                            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-yellow-400/20 animate-spin-slow pointer-events-none" />
                            
                            <Avatar className="w-40 h-40 border-4 border-yellow-400/60 shadow-[0_0_50px_rgba(250,204,21,0.2)] group-hover:scale-110 group-hover:border-yellow-400 transition-all duration-700">
                                <AvatarImage src={record.winnerPhotoUrl} alt={record.winnerPlayerName} className="object-cover" />
                                <AvatarFallback className="bg-black/60">
                                    <User className="w-20 h-20 text-white/10" />
                                </AvatarFallback>
                            </Avatar>
                            
                            {/* Slanted Crown/Trophy Badge */}
                            <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-black h-14 w-14 rounded-2xl flex items-center justify-center border-4 border-[#0A192F] shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500 group-hover:scale-110">
                                <Trophy className="w-7 h-7 drop-shadow-lg" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-10">
                        <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic pr-4 group-hover:text-yellow-400 transition-colors duration-500 drop-shadow-xl">
                            {record.winnerPlayerName}
                        </h3>
                        <div className="flex items-center justify-center gap-3">
                            <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
                                <Shield className="w-4 h-4" />
                            </div>
                            <span className="text-lg font-black text-primary/80 uppercase tracking-widest italic pr-2">{record.winnerTeamName}</span>
                        </div>
                    </div>

                    {/* Elite Stats Scoreboard */}
                    <div className="w-full bg-black/40 rounded-[2rem] p-6 border-2 border-white/5 relative overflow-hidden shadow-inner group/stats">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent opacity-0 group-hover/stats:opacity-100 transition-opacity duration-1000" />
                        
                        <div className="flex items-center justify-between mb-5 px-2">
                            <div className="flex items-center gap-2">
                                <Binary className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">Championship HUD Matrix</span>
                            </div>
                            <Badge className="bg-yellow-400 text-black font-black text-[10px] px-3 h-6 italic shadow-lg" suppressHydrationWarning>
                                {record.winnerStats.points} PTS AGGREGATE
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6 relative">
                            <div className="text-left space-y-1 pl-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white italic tabular-nums leading-none">{record.winnerStats.win}</span>
                                    <span className="text-xs font-black text-primary uppercase italic">Victories</span>
                                </div>
                                <Progress value={100} className="h-1 bg-white/5" color="bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" />
                            </div>
                            <div className="text-right space-y-1 pr-2">
                                <div className="flex items-baseline justify-end gap-2">
                                    <span className="text-xs font-black text-red-500 uppercase italic">Defeats</span>
                                    <span className="text-4xl font-black text-white italic tabular-nums leading-none">{record.winnerStats.loss}</span>
                                </div>
                                <Progress value={Math.max(5, (record.winnerStats.loss / (record.winnerStats.win || 1)) * 100)} className="h-1 bg-white/5" color="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-8 bg-black/60 backdrop-blur-xl relative z-10 border-t-2 border-white/5">
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-3 px-1 mb-2">
                            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic">Performance Sub-Units</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3.5">
                            {record.funStats?.mostWins && (
                                <StatItem 
                                    icon={Award} 
                                    label="WIN KING" 
                                    value={record.funStats.mostWins.playerName} 
                                    variant="primary"
                                    tooltip={t('fun_stats_most_wins_tooltip', { value: record.funStats.mostWins.value })} 
                                />
                            )}
                            {record.funStats?.bestAttacker && (
                                <StatItem 
                                    icon={Target} 
                                    label="APEX STRIKER" 
                                    value={record.funStats.bestAttacker.playerName} 
                                    valueClassName="text-green-400" 
                                    tooltip={t('fun_stats_best_attacker_tooltip', { value: record.funStats.bestAttacker.value })} 
                                />
                            )}
                            {record.funStats?.worstDefender && (
                                <StatItem 
                                    icon={ShieldAlert} 
                                    label="CRITICAL DEF" 
                                    value={record.funStats.worstDefender.playerName} 
                                    variant="destructive"
                                    valueClassName="text-red-400" 
                                    tooltip={t('fun_stats_worst_defense_tooltip', { value: record.funStats.worstDefender.value })} 
                                />
                            )}
                            <StatItem 
                                icon={TrendingUp} 
                                label="NET DELTA" 
                                value={`${record.winnerStats.goalDifference > 0 ? '+' : ''}${record.winnerStats.goalDifference}`} 
                                valueClassName={record.winnerStats.goalDifference > 0 ? "text-primary" : "text-red-400"}
                                tooltip={`Net Goal difference: ${record.winnerStats.goalDifference}`}
                            />
                        </div>

                        {/* Verified Stamp Overlay */}
                        <div className="pt-6 mt-2 flex items-center justify-between border-t border-white/5 opacity-40 group-hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/60">Legacy Integrity Verified</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">SECURE LOG</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}