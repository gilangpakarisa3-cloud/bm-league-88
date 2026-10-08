'use client';

import { useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Undo2, Swords, Clock, Zap, Activity, Trophy, Shield, ChevronRight, Scan, CheckCircle2, Radio, Plus, Minus, Crown, Share2, Calendar, Binary } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';
import { useTranslation } from '@/hooks/use-translation';
import type { WithId, Match, Season, Team } from '@/lib/types';

export const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, onQuickUpdate, onShareMatch, isAdmin, activeSeason, hasPlayoffs }: {
    match: any;
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    onQuickUpdate: (matchId: string, field: string, delta: number) => void;
    onShareMatch: (match: any) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
    hasPlayoffs: boolean;
}) {
    const { t } = useTranslation();
    const displayDate = format(match.matchDate.toDate(), 'd MMM, HH:mm', { locale: localeId });
    const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
    const isMatchBo3 = isSeasonCoop ? (match.round && match.round !== 'Group') : (match.round && match.round !== 'Group');
    
    const isEditDisabled = 
        activeSeason?.status !== 'In Progress' || 
        (match.isCompleted && !isAdmin) || 
        (match.player1Id === 'TBD' || match.player2Id === 'TBD') ||
        (hasPlayoffs && (match.round === 'Group' || !match.round) && !isAdmin);

    const score1 = match.player1Score ?? 0;
    const score2 = match.player2Score ?? 0;
    const wins1 = match.player1Wins ?? 0;
    const wins2 = match.player2Wins ?? 0;

    const hasValidScore = (match.isCompleted || match.status === 'Live') && (score1 !== null || match.player1Score !== null);
    const isW1 = match.isCompleted && (isMatchBo3 ? wins1 > wins2 : score1 > score2);
    const isW2 = match.isCompleted && (isMatchBo3 ? wins2 > wins1 : score2 > score1);
    const isL1 = match.isCompleted && (isMatchBo3 ? wins1 < wins2 : score1 < score2);
    const isL2 = match.isCompleted && (isMatchBo3 ? wins2 < wins1 : score2 < score1);

    const gameIdx = isMatchBo3 ? (wins1 + wins2 + 1) : 1;
    const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
    const primaryHex = theme.primaryHex;
    const secondaryHex = theme.secondaryHex;
    const glowRgba = theme.glowRgba;

    const PlayerCombatantPod = ({ 
        name, 
        team, 
        teamId, 
        alignment = 'left', 
        isWinner, 
        isLoser, 
        wins,
        subPlayer1,
        subPlayer2
    }: { 
        name: string; 
        team: WithId<Team> | null; 
        teamId: string; 
        alignment?: 'left' | 'right'; 
        isWinner: boolean; 
        isLoser: boolean; 
        wins?: number | null;
        subPlayer1?: string;
        subPlayer2?: string;
    }) => {
        const logoUrl = resolveLogo(team?.logoUrl, teamId, name);
        const isRight = alignment === 'right';

        return (
            <div className={cn(
                "flex items-center gap-2.5 sm:gap-5 w-full min-w-0 transition-all duration-500",
                isRight ? "flex-row-reverse text-right" : "flex-row text-left"
            )}>
                {/* Team Crest / Visor Shield */}
                <div className="relative shrink-0 group/crest">
                    {/* Glowing Aura ring in Season Theme */}
                    <div 
                        className={cn(
                            "absolute -inset-1 sm:-inset-1.5 rounded-2xl sm:rounded-3xl blur-md transition-all duration-700 pointer-events-none",
                            isWinner 
                                ? "opacity-100 animate-pulse" 
                                : isLoser
                                    ? "opacity-0"
                                    : "opacity-40 group-hover/crest:opacity-80"
                        )}
                        style={isWinner ? {
                            backgroundColor: `${primaryHex}60`,
                            boxShadow: `0 0 25px ${glowRgba}`
                        } : isLoser ? undefined : {
                            backgroundColor: `${primaryHex}20`
                        }}
                    />

                    <div 
                        className={cn(
                            "relative z-10 h-10 w-10 sm:h-20 sm:w-20 rounded-xl sm:rounded-3xl p-0.5 sm:p-1 transition-all duration-500 flex items-center justify-center overflow-hidden border",
                            isWinner 
                                ? "scale-105" 
                                : isLoser
                                    ? "border-white/5 bg-black/60 opacity-60 grayscale"
                                    : "border-white/15 bg-gradient-to-b from-white/10 via-black/80 to-black/90 shadow-xl"
                        )}
                        style={isWinner ? {
                            borderColor: primaryHex,
                            background: `linear-gradient(to bottom, ${primaryHex}35, #000000 80%)`,
                            boxShadow: `0 0 30px ${glowRgba}`
                        } : undefined}
                    >
                        <Avatar className="h-full w-full rounded-lg sm:rounded-2xl bg-black/60 overflow-hidden">
                            <AvatarImage 
                                key={logoUrl} 
                                src={logoUrl} 
                                alt={team?.name || name} 
                                className="object-contain w-full h-full p-0.5 sm:p-1" 
                                referrerPolicy="no-referrer" 
                            />
                            <AvatarFallback className="bg-black/60 font-black text-[8px] sm:text-xs text-white/50 flex items-center justify-center">
                                {name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        {/* Top Winner Crown / Star */}
                        {isWinner && (
                            <div 
                                className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 rounded-full shadow-md animate-bounce"
                                style={{
                                    backgroundColor: primaryHex,
                                    color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                    boxShadow: `0 0 10px ${glowRgba}`
                                }}
                            >
                                <Crown className="w-2 h-2 sm:w-3 sm:h-3 fill-current text-current" />
                            </div>
                        )}
                    </div>

                    {/* Series Wins Badge for Bo3 */}
                    {isMatchBo3 && wins !== undefined && wins !== null && (
                        <div 
                            className={cn(
                                "absolute -bottom-1 z-20 flex items-center justify-center h-5 sm:h-6 px-1.5 sm:px-2 rounded-full border border-black font-black text-[8px] sm:text-[10px] tracking-wider shadow-lg",
                                isRight ? "-right-1" : "-left-1",
                                wins > 0 
                                    ? "" 
                                    : "bg-white/10 text-white/40 border-white/20"
                            )}
                            style={wins > 0 ? {
                                backgroundColor: primaryHex,
                                color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                boxShadow: `0 0 15px ${glowRgba}`
                            } : undefined}
                        >
                            {wins} W
                        </div>
                    )}
                </div>

                {/* Athlete / Team Identity */}
                <div className={cn("flex flex-col min-w-0 flex-1", isRight ? "items-end" : "items-start")}>
                    {/* Club / Flag Micro-Pill */}
                    <div 
                        className={cn(
                            "inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 rounded-full border mb-0.5 sm:mb-1 max-w-full transition-all duration-300",
                            isWinner 
                                ? "" 
                                : "bg-white/[0.04] border-white/10 text-white/50"
                        )}
                        style={isWinner ? {
                            backgroundColor: `${primaryHex}18`,
                            borderColor: `${primaryHex}40`,
                            color: primaryHex
                        } : undefined}
                    >
                        <Shield className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 opacity-70" />
                        <span className="text-[6.5px] sm:text-[9px] font-black uppercase tracking-wider truncate inline-block pr-0.5">
                            {team?.name || 'ATHLETE UNIT'}
                        </span>
                    </div>

                    {/* Primary Name with generous padding preventing italic clipping */}
                    <h4 
                        title={name}
                        className={cn(
                            "font-headline text-[11px] sm:text-2xl font-black uppercase italic tracking-normal sm:tracking-tight truncate max-w-full leading-none transition-colors duration-500 inline-block pr-1.5 py-0.5",
                            isWinner 
                                ? "drop-shadow-md" 
                                : isLoser
                                    ? "text-white/40"
                                    : "text-white hover:text-white/90"
                        )}
                        style={isWinner ? {
                            color: primaryHex,
                            textShadow: `0 0 18px ${glowRgba}`
                        } : undefined}
                    >
                        {name}
                    </h4>

                    {/* Co-Op Sub-athletes micro tags */}
                    {(subPlayer1 || subPlayer2) && (
                        <div className={cn(
                            "flex items-center gap-1 mt-1 text-[7px] sm:text-[9px] font-bold text-white/40 tracking-wider truncate uppercase",
                            isRight ? "justify-end" : "justify-start"
                        )}>
                            <span className="truncate">{subPlayer1}</span>
                            <span className="font-black" style={{ color: `${primaryHex}B3` }}>+</span>
                            <span className="truncate">{subPlayer2}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "group relative overflow-hidden transition-all duration-500 rounded-2xl sm:rounded-3xl border backdrop-blur-3xl shadow-[0_15px_40px_rgba(0,0,0,0.75)]",
            match.status === 'Live'
                ? "border-red-500/80 bg-gradient-to-br from-[#1c0404]/90 via-black/95 to-[#150404]/90 shadow-[0_0_35px_rgba(239,68,68,0.25)]"
                : match.isCompleted
                    ? "border-white/10 bg-gradient-to-br from-black/90 via-[#060913]/90 to-black/95 hover:border-white/20"
                    : "border-white/10 bg-gradient-to-br from-black/90 via-[#070D18]/90 to-black/95 hover:scale-[1.008]"
        )}>
            {/* Top Laser Accent Tracer in Season Theme */}
            <div 
                className={cn(
                    "absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 z-20",
                    match.status === 'Live'
                        ? "bg-gradient-to-r from-red-500 via-rose-400 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                        : match.isCompleted
                            ? "opacity-50 group-hover:opacity-100"
                            : "opacity-40 group-hover:opacity-100"
                )} 
                style={match.status !== 'Live' ? {
                    background: `linear-gradient(to right, transparent, ${primaryHex}, transparent)`,
                    boxShadow: `0 0 15px ${glowRgba}`
                } : undefined}
            />

            {/* Background Angled Ghost Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.025] group-hover:opacity-[0.045] transition-opacity duration-700 overflow-hidden">
                <span className="text-[80px] sm:text-[180px] font-black italic text-white uppercase tracking-tighter transform -skew-x-12 select-none whitespace-nowrap">
                    {match.isCompleted ? (isW1 || isW2 ? 'VICTORY' : 'RESULT') : match.status === 'Live' ? 'LIVE COMBAT' : 'CHAMPIONSHIP'}
                </span>
            </div>

            {/* Top Telemetry Header Bar inside capsule */}
            <div className="relative z-10 flex items-center justify-between px-3 sm:px-8 pt-2.5 sm:pt-4 pb-1">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/50 text-[8px] sm:text-[10px] font-mono tracking-wider">
                        <Calendar className="w-2.5 h-2.5" style={{ color: `${primaryHex}B3` }} />
                        <span suppressHydrationWarning>{displayDate}</span>
                    </div>

                    {activeSeason?.hasDivisions && match.division && (
                        <Badge 
                            className={cn(
                                "text-[7px] sm:text-[9px] h-4.5 sm:h-5 font-black px-2.5 italic rounded-full uppercase tracking-wider border shadow-sm",
                                match.division === 'div-2' 
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            )}
                        >
                            {match.division === 'div-2' 
                                ? (activeSeason.division2Name || 'Divisi 2') 
                                : (activeSeason.division1Name || 'Divisi 1')}
                        </Badge>
                    )}

                    {match.round && match.round !== 'Group' && (
                        <Badge 
                            className="text-[7px] sm:text-[9px] h-4.5 sm:h-5 font-black px-2.5 italic rounded-full uppercase tracking-wider border shadow-sm"
                            style={{
                                backgroundColor: `${primaryHex}18`,
                                color: primaryHex,
                                borderColor: `${primaryHex}40`
                            }}
                        >
                            {match.round}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {match.status === 'Live' ? (
                        <Badge className="bg-red-500 text-white font-black text-[8px] sm:text-[9px] h-5 px-2.5 sm:px-3 uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse flex items-center gap-1.5">
                            <Radio className="w-2.5 h-2.5 animate-ping" />
                            LIVE COMBAT
                        </Badge>
                    ) : match.isCompleted ? (
                        <Badge variant="outline" className="border-cyan-500/20 text-cyan-400/80 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider px-2.5 sm:px-3 h-5 rounded-full bg-cyan-500/[0.04] flex items-center gap-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                            FINAL RESULT
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-white/10 text-white/40 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider px-2.5 sm:px-3 h-5 rounded-full bg-white/[0.02] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: primaryHex }} />
                            QUEUED
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main Battle Arena Grid */}
            <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-6 px-2.5 sm:px-8 py-2.5 sm:py-5">
                {/* Left Athlete Pod */}
                <div className="w-full flex items-center gap-2 min-w-0">
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1.5 shrink-0 animate-in fade-in duration-300">
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl active:scale-90 transition-transform" 
                                style={{ borderColor: `${primaryHex}40`, backgroundColor: `${primaryHex}15`, color: primaryHex }}
                                onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', 1)}
                            >
                                <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl border-white/10 bg-white/5 hover:bg-red-500 hover:text-white active:scale-90 transition-transform" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', -1)}><Minus className="h-4 w-4 sm:h-3 sm:w-3" /></Button>
                        </div>
                    )}
                    <PlayerCombatantPod 
                        name={match.player1?.name || 'TBD'} 
                        team={match.team1} 
                        teamId={match.teamId1 || match.player1Id} 
                        alignment="right" 
                        isWinner={isW1} 
                        isLoser={isL1}
                        wins={isMatchBo3 ? wins1 : undefined} 
                        subPlayer1={match.p1n1}
                        subPlayer2={match.p1n2}
                    />
                </div>
                
                {/* Center Battle Core (VS / Scoreboard) */}
                <div className="flex flex-col items-center justify-center shrink-0 relative px-0.5 sm:px-4">
                    {hasValidScore ? (
                        <div className="flex flex-col items-center gap-1">
                            {/* Scoreboard Pod */}
                            <div className={cn(
                                "relative overflow-hidden flex items-center justify-center gap-1.5 sm:gap-6 px-2 sm:px-7 py-1 sm:py-3 rounded-lg sm:rounded-3xl border transition-all duration-500 shadow-xl",
                                match.status === 'Live'
                                    ? "bg-gradient-to-b from-[#2a0808] to-black border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)] animate-pulse"
                                    : "bg-gradient-to-b from-black/95 via-black/80 to-[#0A101D] border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
                            )}>
                                {/* Score 1 */}
                                <span 
                                    className={cn(
                                        "text-base sm:text-5xl font-black italic tabular-nums font-headline leading-none transition-all duration-500",
                                        isW1 
                                            ? "scale-110" 
                                            : match.status === 'Live' 
                                                ? "text-white" 
                                                : "text-white/40"
                                    )}
                                    style={isW1 ? {
                                        color: primaryHex,
                                        filter: `drop-shadow(0 0 18px ${glowRgba})`
                                    } : undefined}
                                >
                                    {score1}
                                </span>

                                {/* Score Divider */}
                                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                    <div className={cn(
                                        "w-0.5 sm:w-1 h-0.5 sm:h-1 rounded-full",
                                        match.status === 'Live' ? "bg-red-500 animate-ping" : "bg-white/20"
                                    )} />
                                    <div className="w-px h-3 sm:h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                                    <div className={cn(
                                        "w-0.5 sm:w-1 h-0.5 sm:h-1 rounded-full",
                                        match.status === 'Live' ? "bg-red-500 animate-ping" : "bg-white/20"
                                    )} />
                                </div>

                                {/* Score 2 */}
                                <span 
                                    className={cn(
                                        "text-base sm:text-5xl font-black italic tabular-nums font-headline leading-none transition-all duration-500",
                                        isW2 
                                            ? "scale-110" 
                                            : match.status === 'Live' 
                                                ? "text-white" 
                                                : "text-white/40"
                                    )}
                                    style={isW2 ? {
                                        color: primaryHex,
                                        filter: `drop-shadow(0 0 18px ${glowRgba})`
                                    } : undefined}
                                >
                                    {score2}
                                </span>
                            </div>

                            {/* Sub-badge for Live or Bo3 status */}
                            {match.status === 'Live' && isMatchBo3 && (
                                <Badge 
                                    variant="outline" 
                                    className="text-[7px] sm:text-[8px] h-4 sm:h-5 px-2 font-black italic rounded-full border"
                                    style={{
                                        backgroundColor: `${primaryHex}15`,
                                        borderColor: `${primaryHex}35`,
                                        color: primaryHex
                                    }}
                                >
                                    GAME {gameIdx}
                                </Badge>
                            )}
                            {match.status !== 'Live' && isMatchBo3 && (
                                <span 
                                    className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] italic px-2 py-0.5 rounded-full border shadow-sm"
                                    style={{
                                        backgroundColor: `${primaryHex}15`,
                                        borderColor: `${primaryHex}35`,
                                        color: primaryHex
                                    }}
                                >
                                    BO3 SERIES
                                </span>
                            )}
                        </div>
                    ) : (
                        /* Upcoming / Scheduled VS Reactor Pod */
                        <div className="flex flex-col items-center gap-1 group/vscore">
                            <div className="relative">
                                {/* Glowing reactor aura in Season Theme */}
                                <div 
                                    className="absolute -inset-2 rounded-2xl blur-md opacity-0 group-hover/vscore:opacity-100 transition-opacity duration-500 pointer-events-none" 
                                    style={{ backgroundColor: `${primaryHex}30` }}
                                />
                                
                                <div 
                                    className="relative z-10 border px-3.5 sm:px-6 py-1 sm:py-2 rounded-2xl flex items-center justify-center transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(to bottom, ${primaryHex}20, rgba(0,0,0,0.95), ${primaryHex}10)`,
                                        borderColor: `${primaryHex}40`,
                                        boxShadow: `0 0 25px ${glowRgba}`
                                    }}
                                >
                                    <span 
                                        className="font-headline text-xs sm:text-base font-black tracking-widest uppercase italic"
                                        style={{
                                            color: primaryHex,
                                            textShadow: `0 0 10px ${glowRgba}`
                                        }}
                                    >
                                        VS
                                    </span>
                                </div>
                            </div>

                            {isMatchBo3 ? (
                                <Badge 
                                    variant="outline" 
                                    className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.15em] px-2 h-4 rounded-full border"
                                    style={{
                                        backgroundColor: `${primaryHex}15`,
                                        borderColor: `${primaryHex}35`,
                                        color: primaryHex
                                    }}
                                >
                                    BO3
                                </Badge>
                            ) : (
                                <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-white/30 italic">
                                    DUEL
                                </span>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Right Athlete Pod */}
                <div className="w-full flex items-center gap-2 min-w-0">
                    <PlayerCombatantPod 
                        name={match.player2?.name || 'TBD'} 
                        team={match.team2} 
                        teamId={match.teamId2 || match.player2Id} 
                        alignment="left" 
                        isWinner={isW2} 
                        isLoser={isL2}
                        wins={isMatchBo3 ? wins2 : undefined} 
                        subPlayer1={match.p2n1}
                        subPlayer2={match.p2n2}
                    />
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1.5 shrink-0 animate-in fade-in duration-300">
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl active:scale-90 transition-transform" 
                                style={{ borderColor: `${primaryHex}40`, backgroundColor: `${primaryHex}15`, color: primaryHex }}
                                onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', 1)}
                            >
                                <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl border-white/10 bg-white/5 hover:bg-red-500 hover:text-white active:scale-90 transition-transform" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', -1)}><Minus className="h-4 w-4 sm:h-3 sm:w-3" /></Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Cockpit Action Bar inside capsule */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-8 py-3 bg-black/60 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-white/30 italic">
                        STADIUM PITCH // FIXTURE-{match.id.substring(0, 4).toUpperCase()}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                    <Button 
                        variant="ghost" 
                        size="icon"
                        title="Bagikan Kartu Pertandingan ke WhatsApp"
                        className="h-11 w-11 sm:h-10 sm:w-10 text-white/70 hover:text-white border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-full transition-all group/share active:scale-95"
                        onClick={() => onShareMatch(match)}
                    >
                        <Share2 className="h-4 w-4 group-hover/share:scale-110 transition-transform" />
                    </Button>

                    <Button 
                        variant="ghost" 
                        className={cn(
                            "h-11 sm:h-10 px-5 sm:px-7 text-[10px] sm:text-[11px] font-black uppercase tracking-wider italic transition-all duration-300 rounded-full active:scale-95",
                            hasValidScore 
                                ? "text-white/80 border border-white/20 bg-white/5 hover:border-white/30 hover:text-white hover:bg-white/10" 
                                : "font-black border-none hover:scale-105"
                        )}
                        style={!hasValidScore ? {
                            background: `linear-gradient(to right, ${primaryHex}, ${secondaryHex})`,
                            color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                            boxShadow: `0 0 25px ${glowRgba}`
                        } : undefined}
                        onClick={() => onEditMatch(match)}
                        disabled={isEditDisabled}
                    >
                        <span className="flex items-center gap-2">
                            {match.isCompleted ? (
                                <>
                                    <Binary className="w-3.5 h-3.5" />
                                    <span>ANALYSIS</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    <span>UPDATE SCORE</span>
                                </>
                            )}
                        </span>
                    </Button>
                    
                    {isAdmin && match.isCompleted && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Revert match result"
                            className="h-11 w-11 sm:h-10 sm:w-10 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 rounded-full transition-all active:scale-95" 
                            onClick={() => onRevertMatch(match)}
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});
