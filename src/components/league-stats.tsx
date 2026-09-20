'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { 
    Award, 
    ShieldCheck, 
    ShieldAlert, 
    TrendingUp, 
    Handshake, 
    Flame, 
    Target, 
    Zap, 
    Activity, 
    Scan,
    Radio,
    Sparkles,
    Gauge,
    Trophy
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { resolveLogo } from "@/lib/logo-utils";

type StatVariant = 'volt' | 'emerald' | 'cyan' | 'amber' | 'purple' | 'destructive';

interface VariantConfig {
    border: string;
    headerBg: string;
    headerText: string;
    accentText: string;
    glow: string;
    tagBorder: string;
    tagBg: string;
    tagText: string;
    progressBg: string;
    laserGlow: string;
}

const VARIANT_CONFIGS: Record<StatVariant, VariantConfig> = {
    volt: {
        border: "border-primary/40 hover:border-primary/80",
        headerBg: "bg-primary text-black",
        headerText: "text-black",
        accentText: "text-primary",
        glow: "hover:shadow-[0_0_50px_rgba(204,253,1,0.22)]",
        tagBorder: "border-black/20",
        tagBg: "bg-black/15",
        tagText: "text-black/80",
        progressBg: "bg-primary shadow-[0_0_8px_rgba(204,253,1,0.8)]",
        laserGlow: "from-transparent via-primary to-transparent"
    },
    emerald: {
        border: "border-emerald-500/40 hover:border-emerald-400/80",
        headerBg: "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-black",
        headerText: "text-black",
        accentText: "text-emerald-400",
        glow: "hover:shadow-[0_0_50px_rgba(16,185,129,0.22)]",
        tagBorder: "border-black/20",
        tagBg: "bg-black/15",
        tagText: "text-black/80",
        progressBg: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
        laserGlow: "from-transparent via-emerald-400 to-transparent"
    },
    cyan: {
        border: "border-cyan-500/40 hover:border-cyan-400/80",
        headerBg: "bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-400 text-black",
        headerText: "text-black",
        accentText: "text-cyan-400",
        glow: "hover:shadow-[0_0_50px_rgba(6,182,212,0.22)]",
        tagBorder: "border-black/20",
        tagBg: "bg-black/15",
        tagText: "text-black/80",
        progressBg: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
        laserGlow: "from-transparent via-cyan-400 to-transparent"
    },
    amber: {
        border: "border-amber-500/40 hover:border-amber-400/80",
        headerBg: "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-black",
        headerText: "text-black",
        accentText: "text-amber-400",
        glow: "hover:shadow-[0_0_50px_rgba(245,158,11,0.22)]",
        tagBorder: "border-black/20",
        tagBg: "bg-black/15",
        tagText: "text-black/80",
        progressBg: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
        laserGlow: "from-transparent via-amber-400 to-transparent"
    },
    purple: {
        border: "border-purple-500/40 hover:border-purple-400/80",
        headerBg: "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 text-white",
        headerText: "text-white",
        accentText: "text-purple-400",
        glow: "hover:shadow-[0_0_50px_rgba(168,85,247,0.22)]",
        tagBorder: "border-white/20",
        tagBg: "bg-white/10",
        tagText: "text-white/90",
        progressBg: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]",
        laserGlow: "from-transparent via-purple-400 to-transparent"
    },
    destructive: {
        border: "border-red-500/40 hover:border-red-400/80",
        headerBg: "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white",
        headerText: "text-white",
        accentText: "text-red-400",
        glow: "hover:shadow-[0_0_50px_rgba(239,68,68,0.25)]",
        tagBorder: "border-white/20",
        tagBg: "bg-white/10",
        tagText: "text-white/90",
        progressBg: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
        laserGlow: "from-transparent via-red-500 to-transparent"
    },
};

const StatCardSkeleton = () => (
    <div className="h-44 border border-white/10 bg-black/40 backdrop-blur-xl rounded-[2rem] p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
            <div className="h-6 w-1/2 bg-white/10 rounded-xl" />
            <div className="h-6 w-16 bg-white/10 rounded-xl" />
        </div>
        <div className="h-16 w-full bg-white/5 rounded-2xl" />
    </div>
);

const StatCard = ({ 
    title, 
    subtitle,
    icon: Icon, 
    players, 
    valueSuffix, 
    valueKey, 
    variant = "volt",
    ghostText
}: { 
    title: string;
    subtitle?: string;
    icon: any;
    players: any[];
    valueSuffix?: string;
    valueKey: string;
    variant?: StatVariant;
    ghostText?: string;
}) => {
    const conf = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.volt;

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-500 border-2 bg-gradient-to-b from-[#0D111A]/95 via-[#070A12]/95 to-[#030508]/95 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.3rem] p-0 shadow-[0_20px_60px_rgba(0,0,0,0.8)]",
            conf.border,
            conf.glow
        )}>
            <div className={cn(
                "absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r opacity-80 pointer-events-none z-20",
                conf.laserGlow
            )} />

            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />

            <span className="absolute -bottom-2 -right-3 text-7xl sm:text-9xl font-black text-white/[0.025] uppercase tracking-tighter italic pointer-events-none select-none leading-none z-0">
                {ghostText || title.split(' ')[0]}
            </span>

            <div className={cn(
                "py-3 px-5 sm:px-6 flex items-center justify-between overflow-hidden shrink-0 shadow-md relative z-10",
                conf.headerBg
            )}>
                <div className="absolute top-0 right-0 w-1/3 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />

                <div className="flex items-center gap-2.5 relative z-10 min-w-0">
                    <div className="bg-black/20 p-1.5 rounded-xl border border-black/10 shadow-inner shrink-0">
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black tracking-[0.08em] uppercase italic leading-none truncate font-headline">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className={cn(
                                "text-[8px] font-black uppercase tracking-widest font-mono truncate mt-0.5",
                                conf.headerText === "text-white" ? "text-white/70" : "text-black/70"
                            )}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[8px] font-black font-mono uppercase tracking-widest shrink-0 relative z-10",
                    conf.tagBorder,
                    conf.tagBg,
                    conf.tagText
                )}>
                    <Scan className="w-2.5 h-2.5 animate-pulse" />
                    <span>INTEL // VERIFIED</span>
                </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3 relative z-10">
                {players.map((player, pIdx) => {
                    const teamLogo = resolveLogo(player.team?.logoUrl, player.teamId, player.playerName);
                    const rawVal = player[valueKey];
                    const numVal = typeof rawVal === 'number' ? rawVal : (Number(rawVal) || 0);

                    return (
                        <div 
                            key={player.id || pIdx} 
                            className="group/item flex items-center justify-between bg-black/50 hover:bg-white/[0.04] p-3 sm:p-3.5 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 relative overflow-hidden shadow-sm"
                        >
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 opacity-40 group-hover/item:opacity-100 transition-opacity",
                                conf.progressBg
                            )} />

                            <div className="flex items-center gap-3 overflow-hidden pl-1 min-w-0">
                                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-white/10 shadow-lg group-hover/item:scale-105 transition-transform shrink-0">
                                    <AvatarImage 
                                        src={teamLogo} 
                                        alt={player.playerName} 
                                        className="object-cover" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <AvatarFallback className="bg-black/60 font-black text-xs text-white/50">
                                        {player.playerName ? player.playerName.substring(0, 2).toUpperCase() : 'P'}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs sm:text-sm font-black truncate uppercase italic text-white group-hover/item:text-primary transition-colors font-headline">
                                            {player.playerName}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-mono font-black text-white/40 uppercase tracking-wider truncate">
                                            {player.teamName || 'Independent'}
                                        </span>
                                        {player.pointsBehind !== undefined && (
                                            <Badge variant="outline" className="text-[7px] font-mono uppercase px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10">
                                                -{player.pointsBehind} PTS GAP
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right shrink-0 ml-3 flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-3xl sm:text-4xl font-black italic tabular-nums tracking-tighter leading-none font-headline drop-shadow-md",
                                        conf.accentText
                                    )}>
                                        {numVal > 0 && valueKey === 'goalDifference' ? `+${numVal}` : numVal}
                                    </span>
                                    {valueSuffix && (
                                        <span className="text-[9px] font-black uppercase tracking-wider font-mono text-white/40">
                                            {valueSuffix}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[7px] font-mono uppercase tracking-widest text-white/30">
                                    METRIC LOGGED
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
        );
    }
    
    const showUnbeaten = stats.unbeaten.length > 0;

    if (
        stats.mostWins.length === 0 && 
        !showUnbeaten && 
        stats.bestAttacker.length === 0 && 
        stats.bestDefense.length === 0 && 
        stats.bestGD.length === 0 && 
        stats.worstDefender.length === 0 && 
        stats.kingOfDraws.length === 0 && 
        stats.championshipContenders.length === 0
    ) {
        return (
            <Card className="border-2 border-dashed border-white/10 bg-black/40 backdrop-blur-2xl w-full rounded-[2.5rem] p-12 sm:p-16 flex flex-col items-center justify-center gap-3 text-center shadow-2xl">
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-pulse">
                    <Radio className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white/90 font-headline italic">
                    Telemetric Radar Initialized
                </h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest font-mono max-w-sm leading-relaxed">
                    Awaiting match results to generate live performance telemetry and leaderboard records.
                </p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {stats.mostWins.length > 0 && (
                <StatCard 
                    title={t('fun_stats_most_wins')}
                    subtitle="VICTORY_APEX // WIN RECORD"
                    icon={Trophy}
                    players={stats.mostWins}
                    valueKey="win"
                    valueSuffix="W"
                    variant="volt"
                    ghostText="VICTORY"
                />
            )}

            {seasonType !== 'Co-Op' && stats.bestGD.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_gd')}
                    subtitle="NET_GOAL_DELTA // SUPERIORITY"
                    icon={Gauge}
                    players={stats.bestGD}
                    valueKey="goalDifference"
                    valueSuffix="GD"
                    variant="emerald"
                    ghostText="DELTA"
                />
            )}

            {seasonType !== 'Co-Op' && stats.bestDefense.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_defense')}
                    subtitle="AEGIS_SHIELD // MIN CONCEDED"
                    icon={ShieldCheck}
                    players={stats.bestDefense}
                    valueKey="goalsAgainst"
                    valueSuffix="GA"
                    variant="cyan"
                    ghostText="WALL"
                />
            )}

            {seasonType !== 'Co-Op' && stats.bestAttacker.length > 0 && (
                <StatCard 
                    title={t('fun_stats_best_attacker')}
                    subtitle="KINETIC_STRIKE // GOAL MACHINE"
                    icon={Target}
                    players={stats.bestAttacker}
                    valueKey="goalsFor"
                    valueSuffix="GLS"
                    variant="amber"
                    ghostText="APEX"
                />
            )}

            {seasonType !== 'Co-Op' && stats.kingOfDraws.length > 0 && (
                <StatCard 
                    title={t('fun_stats_king_of_draws')}
                    subtitle="EQUILIBRIUM // DRAW SPECIALIST"
                    icon={Handshake}
                    players={stats.kingOfDraws}
                    valueKey="draw"
                    valueSuffix="DRW"
                    variant="purple"
                    ghostText="EQUIL"
                />
            )}

            {seasonType !== 'Co-Op' && stats.worstDefender.length > 0 && (
                <StatCard 
                    title={t('fun_stats_worst_defense')}
                    subtitle="DEFENSIVE_BREACH // HIGH GA"
                    icon={ShieldAlert}
                    players={stats.worstDefender}
                    valueKey="goalsAgainst"
                    valueSuffix="GA"
                    variant="destructive"
                    ghostText="BREACH"
                />
            )}

            {showUnbeaten && (
                <StatCard 
                    title={t('fun_stats_unbeaten')}
                    subtitle="IMMORTAL_RUN // ZERO LOSS"
                    icon={Zap}
                    players={stats.unbeaten}
                    valueKey="played"
                    valueSuffix="M"
                    variant="volt"
                    ghostText="INVINCIBLE"
                />
            )}

            {seasonType === 'Single' && stats.championshipContenders.length > 0 && (
                <StatCard 
                    title={t('fun_stats_championship_contender')}
                    subtitle="PODIUM_PRESSURE // TITLE CHASE"
                    icon={Flame}
                    players={stats.championshipContenders}
                    valueKey="points"
                    valueSuffix="PTS"
                    variant="amber"
                    ghostText="TITLE"
                />
            )}
        </div>
    );
}