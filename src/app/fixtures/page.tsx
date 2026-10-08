
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, KeyRound, CalendarIcon, Shield, ChevronRight, Scan, CheckCircle2, Loader2, Binary, Radio, Plus, Minus, Crown, Share2 } from 'lucide-react';
import { MatchShareDialog } from '@/components/match-share-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, getDocs, getDoc, where, runTransaction, Timestamp, orderBy, increment, updateDoc } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useSharedPassword } from '@/context/password-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';
import { LiveScoreTicker } from '@/components/live-score-ticker';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP, getPlayoffSuccessorMap } from '@/lib/constants';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';


const LEAGUE_ID = 'main-league';

const ROUND_ORDER: Record<string, number> = {
    'Group': 1,
    'Quarterfinal': 2,
    'UB-Quarter': 2,
    'LB-Round 1': 3,
    'Semifinal': 4,
    'UB-Semi': 4,
    'LB-Round 2': 5,
    'LB-Round 3': 6,
    'UB-Final': 7,
    'LB-Semifinal': 8,
    'LB-Final': 9,
    'Grand-Final': 10
};

const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, onQuickUpdate, onShareMatch, isAdmin, activeSeason, hasPlayoffs }: {
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

const FixtureContent = memo(function FixtureContent({ activeSeasonId, onEditMatch, onRevertMatch, onQuickUpdate, onShareMatch, isAdmin, allPlayers, allTeams, matches, isLoadingMatches, activeSeason, hasPlayoffs }: { activeSeasonId: string | null; onEditMatch: (match: any) => void; onRevertMatch: (match: WithId<Match>) => void; onQuickUpdate: (matchId: string, field: string, delta: number) => void; onShareMatch: (match: any) => void; isAdmin: boolean; allPlayers: WithId<Player>[]; allTeams: WithId<Team>[]; matches: WithId<Match>[] | null; isLoadingMatches: boolean; activeSeason: WithId<Season> | null; hasPlayoffs: boolean; }) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [divisionFilter, setDivisionFilter] = useState<'all' | 'div-1' | 'div-2'>('all');
    const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
    
    const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
    const singleLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && !isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);
    const coopLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    const playersById = useMemo(() => allPlayers.reduce((acc, player) => { acc[player.id] = player; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
    const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);
    const leagueTableByPlayerId = useMemo(() => (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, LeagueEntry>), [singleLeagueTable]);
    const coopTableById = useMemo(() => (coopLeagueTable || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>), [coopLeagueTable]);
    
    const div1MatchCount = useMemo(() => matches?.filter(m => m.division !== 'div-2').length || 0, [matches]);
    const div2MatchCount = useMemo(() => matches?.filter(m => m.division === 'div-2').length || 0, [matches]);

    const { groupedMatches, upcomingCount, completedCount, liveCount } = useMemo(() => {
        if (!matches || !activeSeason) return { groupedMatches: { upcoming: {}, completed: {}, live: {} }, upcomingCount: 0, completedCount: 0, liveCount: 0 };
        const isCoop = activeSeason.type === 'Co-Op' || activeSeason.type === 'Co-Op Hybrid';
        const enrichedMatches = matches.map(match => {
            let p1, p2, t1, t2, tid1, tid2, p1n1, p1n2, p2n1, p2n2;
            if (isCoop) {
                const e1 = coopTableById[match.player1Id];
                const e2 = coopTableById[match.player2Id];
                p1 = e1 ? { name: e1.teamName, id: e1.id } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                p2 = e2 ? { name: e2.teamName, id: e2.id } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                tid1 = e1?.player1TeamId;
                tid2 = e2?.player1TeamId;
                t1 = tid1 ? teamsById[tid1] : null;
                t2 = tid2 ? teamsById[tid2] : null;
                p1n1 = e1?.player1Name; p1n2 = e1?.player2Name;
                p2n1 = e2?.player1Name; p2n2 = e2?.player2Name;
            } else {
                const e1 = leagueTableByPlayerId[match.player1Id];
                const e2 = leagueTableByPlayerId[match.player2Id];
                p1 = e1 ? { name: e1.playerName, id: e1.playerId } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player1Id] || null));
                p2 = e2 ? { name: e2.playerName, id: e2.playerId } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player2Id] || null));
                tid1 = e1 ? e1.teamId : playersById[match.player1Id]?.teamId;
                tid2 = e2 ? e2.teamId : playersById[match.player2Id]?.teamId;
                t1 = tid1 ? teamsById[tid1] : null;
                t2 = tid2 ? teamsById[tid2] : null;
            }
            if (!p1 || !p2) return null;
            return { ...match, player1: p1, player2: p2, team1: t1, team2: t2, teamId1: tid1, teamId2: tid2, p1n1, p1n2, p2n1, p2n2 };
        }).filter(Boolean) as any[];

        const filtered = enrichedMatches.filter(m => {
            if (activeSeason?.hasDivisions && divisionFilter !== 'all') {
                if (divisionFilter === 'div-1' && m.division === 'div-2') return false;
                if (divisionFilter === 'div-2' && m.division !== 'div-2') return false;
            }
            if (searchTerm.trim()) {
                const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
                const pn1 = m.player1?.name.toLowerCase() || '';
                const pn2 = m.player2?.name.toLowerCase() || '';
                if (!terms.every(t => pn1.includes(t) || pn2.includes(t))) return false;
            }
            if (hasPlayoffs && !m.isCompleted && m.status !== 'Live' && (m.round === 'Group' || !m.round)) {
                return false;
            }
            return true;
        });
        
        const grouped = filtered.reduce((acc, m) => {
            const rd = m.round || 'Group';
            const st = m.isCompleted ? 'completed' : (m.status === 'Live' ? 'live' : 'upcoming');
            if (!acc[st][rd]) acc[st][rd] = [];
            acc[st][rd].push(m);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]>, live: {} as Record<string, any[]> });
        
        const sortRounds = (entries: [string, any[]][]) => {
            return entries.sort(([rdA], [rdB]) => {
                return (ROUND_ORDER[rdB] || 99) - (ROUND_ORDER[rdA] || 99);
            });
        };

        const upcomingSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.upcoming)).forEach(([rd, ms]) => {
            upcomingSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        const completedSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.completed)).forEach(([rd, ms]) => {
            completedSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        const liveSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.live)).forEach(([rd, ms]) => {
            liveSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        return { 
            groupedMatches: { upcoming: upcomingSorted, completed: completedSorted, live: liveSorted }, 
            upcomingCount: Object.values(grouped.upcoming).flat().length, 
            completedCount: Object.values(grouped.completed).flat().length,
            liveCount: Object.values(grouped.live).flat().length
        };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId, hasPlayoffs, divisionFilter]);

    const roundNames: Record<string, string> = { 
        'Group': 'Fase Grup', 
        'Quarterfinal': 'Perempat Final (Top 8)',
        'Semifinal': 'Semifinal',
        'UB-Quarter': 'UB - Perempat Final', 
        'UB-Semi': 'UB - Semi Final', 
        'UB-Final': 'Upper Bracket Final', 
        'LB-Round 1': 'LB-R1 (vs Loser M1-M4)', 
        'LB-Round 2': 'LB-R2 (Win M5-M8)', 
        'LB-Round 3': 'LB-R3 (vs Loser UB Semi)', 
        'LB-Semifinal': 'LB - Semifinal', 
        'LB-Final': 'LB - vs Loser UB Final', 
        'Grand-Final': 'Grand Final' 
    };

    if (isLoadingMatches) return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
                <div 
                  className="absolute -inset-8 rounded-full blur-3xl animate-pulse" 
                  style={{ backgroundColor: `${theme.primaryHex}33` }}
                />
                <Zap className="w-16 h-16 animate-spin" style={{ color: theme.primaryHex }} />
            </div>
            <p className="text-xs font-black tracking-[0.5em] uppercase italic animate-pulse" style={{ color: theme.primaryHex }}>Syncing Tactical Data Hub...</p>
        </div>
    );

    if (!matches || matches.length === 0) return (
        <div className="border-4 border-dashed border-white/5 rounded-none p-20 text-center bg-black/20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-700 max-w-4xl mx-auto">
            <Swords className="w-24 h-24 text-white/5 mx-auto mb-8" />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic pr-4">{t('no_fixtures_generated_title')}</h2>
            <p className="text-white/40 mt-4 max-w-sm mx-auto font-bold uppercase text-[11px] tracking-[0.3em] leading-relaxed">{t('no_fixtures_generated_desc')}</p>
        </div>
    );
    
    return (
        <div className="space-y-8 sm:space-y-12">
            {/* MULTI-DIVISION FILTER SWITCHER */}
            {activeSeason?.hasDivisions && (
                <div className="flex justify-center -mb-2 sm:-mb-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="inline-flex p-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-2xl gap-1.5 sm:gap-2 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('all')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic",
                                divisionFilter === 'all'
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                    : "text-white/50 hover:text-white"
                            )}
                        >
                            Semua ({matches?.length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('div-1')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic flex items-center gap-1.5",
                                divisionFilter === 'div-1'
                                    ? "bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                                    : "text-emerald-400/70 hover:text-emerald-300"
                            )}
                        >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            {activeSeason.division1Name || 'Divisi 1'} ({div1MatchCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('div-2')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic flex items-center gap-1.5",
                                divisionFilter === 'div-2'
                                    ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                                    : "text-amber-400/70 hover:text-amber-300"
                            )}
                        >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                            {activeSeason.division2Name || 'Divisi 2'} ({div2MatchCount})
                        </button>
                    </div>
                </div>
            )}

            {/* AERODYNAMIC COCKPIT SEARCH HUB */}
            <div className="relative max-w-3xl mx-auto group/search">
                <div 
                  className="absolute -inset-2 rounded-full blur-2xl opacity-0 group-hover/search:opacity-40 transition-opacity duration-700 pointer-events-none" 
                  style={{ backgroundColor: theme.primaryHex }}
                />
                <div 
                  className="relative flex items-center bg-black/70 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden rounded-full p-2 pl-3 transition-all duration-500"
                  style={{ borderColor: `${theme.primaryHex}35` }}
                >
                    <div 
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-transform duration-300 group-hover/search:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
                        color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                        boxShadow: `0 0 25px ${theme.glowRgba}`
                      }}
                    >
                        <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <Input 
                        type="text" 
                        placeholder="SEARCH BATTLE NODE / UNIT..." 
                        className="flex-1 h-12 sm:h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-xl font-black italic tracking-tight uppercase placeholder:text-white/20 transition-all relative z-10 px-4 sm:px-6 text-white" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <div className="hidden sm:flex flex-col items-end gap-0.5 pr-6 opacity-40 group-hover/search:opacity-80 transition-opacity">
                        <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full animate-pulse" 
                              style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 8px ${theme.glowRgba}` }}
                            />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: theme.primaryHex }}>UPLINK_READY</span>
                        </div>
                        <span className="text-[7px] font-black text-white/60 tracking-wider uppercase font-mono">{theme.sysTag}</span>
                    </div>
                </div>
            </div>

            {(upcomingCount === 0 && completedCount === 0 && liveCount === 0 && searchTerm) ? (
                <div className="text-center py-20 flex flex-col items-center gap-5 rounded-3xl bg-black/40 border border-white/10 p-10 max-w-xl mx-auto backdrop-blur-xl">
                    <div className="relative">
                        <Activity className="w-14 h-14 text-white/30" />
                        <div 
                          className="absolute -inset-3 border border-dashed rounded-full animate-spin-slow" 
                          style={{ borderColor: `${theme.primaryHex}55` }}
                        />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-[0.3em] text-white/60">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue={liveCount > 0 ? "live" : "upcoming"} className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="grid grid-cols-3 w-full max-w-2xl h-16 sm:h-18 bg-black/70 p-2 border border-white/10 relative overflow-hidden backdrop-blur-3xl rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                            <TabsTrigger 
                                value="live" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Radio className={cn("w-4 h-4", liveCount > 0 && "animate-pulse text-red-500")} />
                                    <span>LIVE</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{liveCount}</span>
                                </span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="upcoming" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Scan className="w-4 h-4" />
                                    <span>QUEUE</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{upcomingCount}</span>
                                </span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="completed" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>HISTORY</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{completedCount}</span>
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="live" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.live).map(([rd, rms]) => (
                                <section key={`live-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-red-500/40 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.3em] border-red-500/30 text-red-500 py-0.5 h-6 mt-1 animate-pulse bg-red-500/10 px-5 rounded-full">BROADCAST_ACTIVE</Badge>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-red-500/40 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {liveCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Radio className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">SIGNAL_LOST: NO_LIVE_BROADCAST</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.upcoming).map(([rd, rms]) => (
                                <section key={`upcoming-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div 
                                              className="h-0.5 flex-1 rounded-full" 
                                              style={{ 
                                                background: `linear-gradient(to right, transparent, ${theme.primaryHex}66, ${theme.primaryHex})`,
                                                boxShadow: `0 0 15px ${theme.glowRgba}`
                                              }} 
                                            />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-[9px] font-black uppercase tracking-[0.3em] py-0.5 h-6 mt-1 px-5 rounded-full border shadow-sm"
                                                  style={{
                                                    borderColor: `${theme.primaryHex}40`,
                                                    color: theme.primaryHex,
                                                    backgroundColor: `${theme.primaryHex}15`
                                                  }}
                                                >
                                                  UPCOMING_FIXTURES
                                                </Badge>
                                            </div>
                                            <div 
                                              className="h-0.5 flex-1 rounded-full" 
                                              style={{ 
                                                background: `linear-gradient(to left, transparent, ${theme.primaryHex}66, ${theme.primaryHex})`,
                                                boxShadow: `0 0 15px ${theme.glowRgba}`
                                              }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {upcomingCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Trophy className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">PROTOCOL_COMPLETE: NO_PENDING_UNITS</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.completed).map(([rd, rms]) => (
                                <section key={`completed-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/60 rounded-full" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white/70 uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.3em] border-white/10 text-white/40 py-0.5 h-6 mt-1 px-5 rounded-full">LOGS_ARCHIVE</Badge>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/60 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {completedCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Zap className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">EMPTY_ARCHIVE: NO_MATCH_RECORDS</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
});

export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [sharingMatch, setSharingMatch] = useState<any | null>(null);
  const [revertingMatch, setRevertingMatch] = useState<WithId<Match> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const seasonsCol = useMemoFirebase(() => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCol);
  
  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCol);
  
  const allTeamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(allTeamsCol);
  
  const matchesCol = useMemoFirebase(() => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null, [firestore, activeSeasonId]);
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCol);
  
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    return `${format(activeSeason.startDate.toDate(), 'd LLL')} - ${format(activeSeason.endDate.toDate(), 'd LLL yyyy')}`;
  }, [activeSeason]);
  
  const hasPlayoffs = useMemo(() => matches?.some(m => m.round && m.round !== 'Group') || false, [matches]);

  const { progressPercentage, totalMatchesForDisplay, completedMatchesForDisplay } = useMemo(() => {
    if (!matches || matches.length === 0) return { progressPercentage: 0, totalMatchesForDisplay: 0, completedMatchesForDisplay: 0 };
    const comp = matches.filter(m => m.isCompleted).length;
    return { progressPercentage: (comp / matches.length) * 100, totalMatchesForDisplay: matches.length, completedMatchesForDisplay: comp };
  }, [matches]);

  useEffect(() => { if (seasons && !activeSeasonId && seasons.length > 0) setActiveSeasonId(seasons[0].id); }, [seasons, activeSeasonId]);
  
  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setPasswordPromptOpen(false); toast({ title: t('admin_mode_unlocked_title') }); } else { toast({ variant: 'destructive', title: t('incorrect_password') }); }
    setPasswordInput('');
  };

  const handleQuickUpdate = async (matchId: string, field: string, delta: number) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    try {
        await updateDoc(matchRef, { [field]: increment(delta) });
    } catch (e) {
        console.error("Quick update failed:", e);
    }
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    
    try {
        const mDoc = await getDoc(matchRef);
        if (!mDoc.exists()) throw new Error("Match data not found.");
        const orig = mDoc.data() as Match;
        
        const [h, m] = values.time.split(':').map(Number); 
        const matchTimestamp = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
        
        const isCompleted = values.status === 'Completed';

        const matchUpdateData: any = {
            player1Score: values.player1Score,
            player2Score: values.player2Score,
            matchDate: matchTimestamp,
            status: values.status,
            isCompleted: isCompleted,
            player1Wins: values.player1Wins !== undefined ? values.player1Wins : null,
            player2Wins: values.player2Wins !== undefined ? values.player2Wins : null,
            player1p1Goals: values.player1p1Goals !== undefined ? values.player1p1Goals : null,
            player1p2Goals: values.player1p2Goals !== undefined ? values.player1p2Goals : null,
            player2p1Goals: values.player2p1Goals !== undefined ? values.player2p1Goals : null,
            player2p2Goals: values.player2p2Goals !== undefined ? values.player2p2Goals : null,
        };

        if (isCompleted) {
            await runTransaction(firestore, async (transaction) => {
                const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
                const sSnap = await transaction.get(seasonRef);
                const sData = sSnap.data() as Season;
                const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
                const isGroupMatch = orig.round === 'Group' || !orig.round;
                const succMap = getPlayoffSuccessorMap(sData?.type, orig);

                let winMatchRef = null;
                let losMatchRef = null;
                if (orig.round && orig.round !== 'Group' && orig.bracketId) {
                    const succ = succMap[orig.bracketId];
                    if (succ) {
                        const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                        const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                        if (!winSnap.empty) winMatchRef = winSnap.docs[0].ref;
                        if (succ.loser) {
                            const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                            if (!losSnap.empty) losMatchRef = losSnap.docs[0].ref;
                        }
                    }
                }

                let p1EntryRef = null;
                let p2EntryRef = null;
                let e1Data: any = null;
                let e2Data: any = null;

                if (isGroupMatch) {
                    const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                    const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                    if (isSeasonCoop) {
                        p1EntryRef = doc(tblCol, orig.player1Id);
                        p2EntryRef = doc(tblCol, orig.player2Id);
                    } else {
                        const snap1 = await getDocs(query(tblCol, where('playerId', '==', orig.player1Id)));
                        const snap2 = await getDocs(query(tblCol, where('playerId', '==', orig.player2Id)));
                        if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                        if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                    }
                    
                    if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                    if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
                }

                const updateOverallStats = (pId: string, change: any) => {
                    if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                    transaction.update(doc(firestore, 'players', pId), {
                        overallPlayed: increment(change.played || 0),
                        overallWin: increment(change.win || 0),
                        overallDraw: increment(change.draw || 0),
                        overallLoss: increment(change.loss || 0),
                        overallGoalsFor: increment(change.gf || 0),
                        overallGoalsAgainst: increment(change.ga || 0),
                    });
                };

                if (orig.isCompleted) {
                    const oldBo3 = !isGroupMatch;
                    const oldS1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                    const oldS2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                    
                    if (isSeasonCoop && e1Data && e2Data) {
                        const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        [d1.player1Id, d1.player2Id].forEach(id => {
                            const playerGoals = id === d1.player1Id ? (orig.player1p1Goals || 0) : (orig.player1p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(orig.player2Score || 0) });
                        });
                        [d2.player1Id, d2.player2Id].forEach(id => {
                            const playerGoals = id === d2.player1Id ? (orig.player2p1Goals || 0) : (orig.player2p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(orig.player1Score || 0) });
                        });
                    } else {
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        updateOverallStats(orig.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                        updateOverallStats(orig.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                    }
                }

                const newBo3 = !isGroupMatch;
                const newS1 = newBo3 ? (values.player1Wins ?? 0) : values.player1Score;
                const newS2 = newBo3 ? (values.player2Wins ?? 0) : values.player2Score;

                if (isSeasonCoop && e1Data && e2Data) {
                    const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    [d1.player1Id, d1.player2Id].forEach(id => {
                        const playerGoals = id === d1.player1Id ? (values.player1p1Goals || 0) : (values.player1p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: playerGoals, ga: values.player2Score });
                    });
                    [d2.player1Id, d2.player2Id].forEach(id => {
                        const playerGoals = id === d2.player1Id ? (values.player2p1Goals || 0) : (values.player2p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: playerGoals, ga: values.player1Score });
                    });
                } else {
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    updateOverallStats(orig.player1Id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: values.player1Score, ga: values.player2Score });
                    updateOverallStats(orig.player2Id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: values.player2Score, ga: values.player1Score });
                }

                if (winMatchRef) {
                    const winnerId = newS1 > newS2 ? orig.player1Id : orig.player2Id;
                    const succ = succMap[orig.bracketId!];
                    transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: winnerId });
                    if (losMatchRef && succ.loser) {
                        const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
                        transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: loserId });
                    }
                }

                if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                    const e1 = { ...e1Data }; const e2 = { ...e2Data };
                    if (orig.isCompleted) {
                        const oldBo3 = isSeasonCoop && !isGroupMatch;
                        const os1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                        const os2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                        e1.played--; e2.played--;
                        if (os1 > os2) { e1.win--; e1.points -= 3; e2.loss--; }
                        else if (os1 < os2) { e2.win--; e2.points -= 3; e1.loss--; }
                        else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                        e1.goalsFor -= (orig.player1Score || 0); e1.goalsAgainst -= (orig.player2Score || 0);
                        e2.goalsFor -= (orig.player2Score || 0); e2.goalsAgainst -= (orig.player1Score || 0);
                        if (isSeasonCoop) {
                            e1.player1Goals -= (orig.player1p1Goals || 0); e1.player2Goals -= (orig.player1p2Goals || 0);
                            e2.player1Goals -= (orig.player2p1Goals || 0); e2.player2Goals -= (orig.player2p2Goals || 0);
                        }
                    }
                    e1.played++; e2.played++;
                    if (newS1 > newS2) { e1.win++; e1.points += 3; e2.loss++; }
                    else if (newS1 < newS2) { e2.win++; e2.points += 3; e1.loss++; }
                    else { e1.draw++; e1.points += 1; e2.draw++; e2.points += 1; }
                    e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score;
                    e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                    if (isSeasonCoop) {
                        e1.player1Goals += values.player1p1Goals; e1.player2Goals += values.player1p2Goals;
                        e2.player1Goals += values.player2p1Goals; e2.player2Goals += values.player2p2Goals;
                    }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
                }

                transaction.update(matchRef, matchUpdateData);
            });
        } else {
            await updateDoc(matchRef, matchUpdateData);
        }

        toast({ title: t('score_updated_title') });
        setEditingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRevertMatch = useCallback(async (matchToRevert?: WithId<Match>) => {
    const matchToUse = matchToRevert || revertingMatch;
    if (!firestore || !activeSeasonId || !matchToUse || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchToUse.id);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed or found.");
        
        const mToRev = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
        const isGroupMatch = mToRev.round === 'Group' || !mToRev.round;

        await runTransaction(firestore, async (transaction) => {
            let winMatchRef = null;
            let losMatchRef = null;
            const succMap = getPlayoffSuccessorMap(sData?.type, mToRev);
            if (mToRev.round && mToRev.round !== 'Group' && mToRev.bracketId) {
                const succ = succMap[mToRev.bracketId];
                if (succ) {
                    const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                    const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                    if (!winSnap.empty) {
                        winMatchRef = winSnap.docs[0].ref;
                        if (winSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                    }
                    if (succ.loser) {
                        const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                        if (!losSnap.empty) {
                            losMatchRef = losSnap.docs[0].ref;
                            if (losSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                        }
                    }
                }
            }

            let p1EntryRef = null;
            let p2EntryRef = null;
            let e1Data: any = null;
            let e2Data: any = null;

            if (isGroupMatch) {
                const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                if (isSeasonCoop) {
                    p1EntryRef = doc(tblCol, mToRev.player1Id);
                    p2EntryRef = doc(tblCol, mToRev.player2Id);
                } else {
                    const snap1 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id)));
                    const snap2 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)));
                    if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                    if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                }
                
                if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
            }

            const updateOverallStats = (pId: string, change: any) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                transaction.update(doc(firestore, 'players', pId), {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const oldBo3 = !isGroupMatch;
            const os1 = oldBo3 ? (mToRev.player1Wins ?? 0) : (mToRev.player1Score ?? 0);
            const os2 = oldBo3 ? (mToRev.player2Wins ?? 0) : (mToRev.player2Score ?? 0);

            if (isSeasonCoop && e1Data && e2Data) {
                const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                [d1.player1Id, d1.player2Id].forEach(id => {
                    const playerGoals = id === d1.player1Id ? (mToRev.player1p1Goals || 0) : (mToRev.player1p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player2Score || 0) });
                });
                [d2.player1Id, d2.player2Id].forEach(id => {
                    const playerGoals = id === d2.player1Id ? (mToRev.player2p1Goals || 0) : (mToRev.player2p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player1Score || 0) });
                });
            } else {
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                updateOverallStats(mToRev.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updateOverallStats(mToRev.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                if (res === 'W') { e1.win--; e1.points -= 3; e2.loss--; }
                else if (res === 'L') { e2.win--; e2.points -= 3; e1.loss--; }
                else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                e1.goalsFor -= (mToRev.player1Score || 0); e1.goalsAgainst -= (mToRev.player2Score || 0);
                e2.goalsFor -= (mToRev.player2Score || 0); e2.goalsAgainst -= (mToRev.player1Score || 0);
                if (isSeasonCoop) {
                    e1.player1Goals -= (mToRev.player1p1Goals || 0); e1.player2Goals -= (mToRev.player1p2Goals || 0);
                    e2.player1Goals -= (mToRev.player2p1Goals || 0); e2.player2Goals -= (mToRev.player2p2Goals || 0);
                }
                e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            if (winMatchRef) transaction.update(winMatchRef, { [`player${succMap[mToRev.bracketId!].winner.slot}Id`]: 'TBD' });
            if (losMatchRef && succMap[mToRev.bracketId!].loser) transaction.update(losMatchRef, { [`player${succMap[mToRev.bracketId!].loser!.slot}Id`]: 'TBD' });

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, player1p1Goals: null, player1p2Goals: null, player2p1Goals: null, player2p2Goals: null, isCompleted: false, status: 'Scheduled' });
        });

        toast({ title: t('match_reverted_title') });
        setRevertingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  }, [firestore, activeSeasonId, revertingMatch, isProcessing, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  
  return (
    <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-5 sm:py-8 relative">
       <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 sm:space-y-12">
        <div className="flex flex-col lg:flex-row justify-between items-stretch mb-6 sm:mb-10 gap-4 sm:gap-6 min-h-[140px] sm:min-h-[190px]">
          <div 
            className="flex flex-col justify-between flex-1 w-full min-w-0 py-6 sm:py-8 px-4 sm:px-8 xl:px-10 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 min-w-0">
                <div className="space-y-3 min-w-0 flex-1">
                    {/* Top Telemetry Strip */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div 
                          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full backdrop-blur-md border shrink-0"
                          style={{ backgroundColor: `${theme.primaryHex}15`, borderColor: `${theme.primaryHex}40` }}
                        >
                            <div 
                              className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full animate-pulse" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            <span 
                              className="text-[9px] sm:text-xs font-black uppercase tracking-[0.25em] sm:tracking-[0.4em] italic"
                              style={{ color: theme.primaryHex }}
                            >
                              Live Match Feed
                            </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm max-w-full">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono text-white/60 truncate">
                              {theme.sysTag} • {theme.editionName}
                            </span>
                        </div>
                    </div>
                    
                    {/* Ultra Futuristic & Ultra Sport Dual-Tone Headline */}
                    <div className="relative min-w-0">
                      <h1 className="font-headline text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase italic leading-[0.95] flex flex-wrap items-baseline gap-x-2 sm:gap-x-4">
                          <span className="inline-block headline-white-gradient break-words">
                              {t('fixtures_page_title').split(' ')[0]}
                          </span>
                          <span 
                            className="inline-block break-words"
                            style={{ 
                              color: theme.primaryHex,
                            }}
                          >
                              {t('fixtures_page_title').split(' ').slice(1).join(' ')}
                          </span>
                      </h1>
                      {/* Aerodynamic Speed Conduit Line */}
                      <div 
                        className="h-[2px] w-28 sm:w-56 mt-2 rounded-full" 
                        style={{ 
                          background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex}, transparent)`, 
                          boxShadow: `0 0 14px ${theme.glowRgba}` 
                        }} 
                      />
                    </div>
                </div>

                {activeSeason && (
                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
                        <Badge 
                          className="font-black tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs h-7 sm:h-8 px-3.5 sm:px-5 uppercase italic rounded-full backdrop-blur-md flex items-center gap-2 border shadow-lg shrink-0"
                          style={{ 
                            backgroundColor: `${theme.primaryHex}20`, 
                            color: theme.primaryHex, 
                            borderColor: `${theme.primaryHex}50`,
                          }}
                        >
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-ping" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            {activeSeason.status}
                        </Badge>
                        <div className="flex items-center gap-2 bg-white/[0.04] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/10 backdrop-blur-sm shadow-inner shrink-0">
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primaryHex }} />
                            {formattedDateRange && <p className="text-[10px] sm:text-xs font-black text-white/70 uppercase tracking-wider sm:tracking-widest italic">{formattedDateRange}</p>}
                        </div>
                    </div>
                )}
            </div>

            {activeSeason && (
                <div className="relative z-10 pt-4 mt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 min-w-0">
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-3.5 sm:px-4 py-2 rounded-2xl backdrop-blur-sm min-w-0 flex-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 10px ${theme.glowRgba}` }}
                        />
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-white/90 tracking-tight uppercase italic break-words min-w-0">
                          {activeSeason.name}
                        </p>
                    </div>
                    
                    {matches && matches.length > 0 && (
                        <div className="w-full md:w-[320px] lg:w-[350px] shrink-0 space-y-2 bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 animate-pulse shrink-0" style={{ color: theme.primaryHex }} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40">Engagement Progress</span>
                                </div>
                                <span className="text-xs font-black italic" style={{ color: theme.primaryHex }} suppressHydrationWarning>
                                  [{progressPercentage.toFixed(0)}%]
                                </span>
                            </div>
                            <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <div 
                                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ 
                                    width: `${progressPercentage}%`,
                                    background: `linear-gradient(to right, ${theme.secondaryHex}, ${theme.primaryHex})`,
                                    boxShadow: `0 0 15px ${theme.glowRgba}`
                                  }} 
                                />
                            </div>
                            <p className="text-[8px] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white/30 italic text-right">
                                {completedMatchesForDisplay} / {totalMatchesForDisplay} UNITS ANALYZED
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="w-full lg:w-[380px] xl:w-[420px] flex items-stretch shrink-0"><LiveClock className="h-full" theme={theme} /></div>
        </div>

        <LiveScoreTicker activeSeasonId={activeSeasonId} teamsById={teamsById} playersById={playersById} isAdmin={isAdmin} theme={theme} />

        {/* AERODYNAMIC CONTROLS HUB */}
        <div 
          className={cn(
            "relative bg-black/70 border p-2.5 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-500 rounded-2xl sm:rounded-3xl",
            isAdmin ? "w-full" : "w-fit mx-auto"
          )}
          style={{
            borderColor: `${theme.primaryHex}25`
          }}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto relative group/select min-w-0">
                <div 
                  className="p-3 hidden xs:flex rounded-2xl items-center justify-center border shrink-0"
                  style={{
                    backgroundColor: `${theme.primaryHex}15`,
                    color: theme.primaryHex,
                    borderColor: `${theme.primaryHex}35`
                  }}
                >
                    <Scan className="w-4 h-4" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={activeSeasonId => setActiveSeasonId(activeSeasonId)} disabled={isLoadingSeasons}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[280px] max-w-full sm:max-w-[650px] lg:max-w-[780px] h-12 sm:h-14 bg-white/5 border border-white/10 font-black uppercase italic tracking-tight text-xs sm:text-sm rounded-2xl sm:rounded-full focus:border-white/30 transition-all px-5 sm:px-8 pr-10 sm:pr-12 whitespace-nowrap min-w-0 shadow-inner">
                        <SelectValue placeholder={t('select_a_season')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A192F]/98 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-3xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[350px]">
                        {seasons?.map(s => (
                            <SelectItem 
                                key={s.id} 
                                value={s.id} 
                                className="font-black uppercase italic text-xs text-white/90 focus:bg-white/10 focus:text-white py-3 px-6 rounded-xl border-b border-white/5 last:border-0 cursor-pointer"
                            >
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex items-center gap-2", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                    className={cn(
                        "h-12 sm:h-14 px-8 font-black text-xs uppercase tracking-[0.2em] italic rounded-2xl sm:rounded-full transition-all duration-500 relative overflow-hidden group/admin border", 
                        isAdmin 
                            ? "hover:brightness-110" 
                            : "hover:brightness-125"
                    )}
                    style={isAdmin ? {
                      backgroundColor: theme.primaryHex,
                      color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                      borderColor: theme.primaryHex,
                      boxShadow: `0 0 25px ${theme.glowRgba}`
                    } : {
                      backgroundColor: `${theme.primaryHex}15`,
                      color: theme.primaryHex,
                      borderColor: `${theme.primaryHex}40`
                    }}
                    disabled={!isPasswordLoaded}
                >
                    <div className="flex items-center relative z-10">
                        {isAdmin ? <Unlock className="mr-2.5 h-4 w-4" /> : <Lock className="mr-2.5 h-4 w-4" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-8">
                <div className="relative">
                    <div className="absolute -inset-12 bg-primary/10 rounded-full border-4 border-primary/20 animate-ping" />
                    <div className="w-20 h-20 border-8 border-primary border-t-transparent rounded-full animate-spin relative z-10 shadow-[0_0_40px_rgba(204,253,1,0.3)]" />
                </div>
                <p className="font-black tracking-[0.6em] text-sm uppercase italic text-primary animate-pulse">UPLINKING_TACTICAL_HUB</p>
            </div>
        ) : (
            <FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} onQuickUpdate={handleQuickUpdate} onShareMatch={setSharingMatch} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
        )}

        <MatchShareDialog 
            open={!!sharingMatch} 
            onOpenChange={(open) => !open && setSharingMatch(null)} 
            match={sharingMatch} 
            activeSeason={activeSeason} 
        />

        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && !isProcessing && setEditingMatch(null)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className={cn(
                    "!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-2xl max-h-[90vh] flex flex-col border p-0 overflow-hidden bg-black/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] focus:outline-none focus-visible:outline-none [&>button:last-child]:top-5 [&>button:last-child]:right-5 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white [&>button:last-child]:hover:text-black [&>button:last-child]:transition-all [&>button:last-child]:z-50 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:opacity-100", 
                    isProcessing && "opacity-80 scale-95 pointer-events-none"
                )}
                style={{
                    borderColor: `${theme.primaryHex}4D`,
                    boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 40px ${theme.primaryHex}26`
                }}
            >
                {/* Top Racing Accent Tracer */}
                <div 
                    className="absolute top-0 left-0 right-0 h-[2px] z-20" 
                    style={{
                        background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
                        boxShadow: `0 0 20px ${theme.primaryHex}`
                    }}
                />
                
                <DialogHeader className="p-6 sm:p-8 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border-b border-white/10 shrink-0 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <div 
                            className="p-3 border rounded-2xl shadow-lg flex items-center justify-center"
                            style={{
                                backgroundColor: `${theme.primaryHex}1A`,
                                borderColor: `${theme.primaryHex}4D`,
                                color: theme.primaryHex,
                                boxShadow: `0 0 25px ${theme.primaryHex}4D`
                            }}
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" style={{ fill: theme.primaryHex }} />}
                        </div>
                        <div>
                            <div 
                                className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em] italic mb-1.5 border shadow-sm"
                                style={{
                                    backgroundColor: `${theme.primaryHex}1A`,
                                    borderColor: `${theme.primaryHex}4D`,
                                    color: theme.primaryHex
                                }}
                            >
                                <span 
                                    className="w-1.5 h-1.5 rounded-full animate-pulse" 
                                    style={{ backgroundColor: theme.primaryHex }}
                                />
                                Engagement Uplink // {theme.seasonBadge || activeSeason?.name}
                            </div>
                            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-6 leading-none text-white drop-shadow-md">
                                {isProcessing ? "Menyinkronkan..." : "Update Match Engagement"}
                            </DialogTitle>
                        </div>
                    </div>
                    {editingMatch && (
                        <DialogDescription className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-3 relative z-10 italic border-t border-white/5 pt-2.5">
                            {t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-180px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {editingMatch && activeSeason && (
                        <ScoreForm 
                            match={editingMatch} 
                            onSave={(v) => handleUpdateScore(editingMatch.id, v)} 
                            seasonType={activeSeason.type} 
                            theme={theme}
                            player1Info={{ 
                                name: editingMatch.player1.name, 
                                team: editingMatch.team1,
                                p1Name: editingMatch.p1n1,
                                p2Name: editingMatch.p1n2
                            }} 
                            player2Info={{ 
                                name: editingMatch.player2.name, 
                                team: editingMatch.team2,
                                p1Name: editingMatch.p2n1,
                                p2Name: editingMatch.p2n2
                            }} 
                        />
                    )}
                </div>
                <DialogFooter className="p-4 px-8 bg-black/60 border-t border-white/10 shrink-0 flex items-center justify-end">
                    <Button variant="ghost" onClick={() => setEditingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.25em] italic text-[11px] text-white/50 hover:text-white transition-all h-10 px-6 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5">
                        <span>{t('cancel')}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && !isProcessing && setRevertingMatch(null)}>
            <AlertDialogContent className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-lg border border-amber-500/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] p-6 sm:p-8">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/40">
                            {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Undo2 className="w-8 h-8" />}
                        </div>
                        <div className="text-left">
                            <AlertDialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-4 leading-none">{t('revert_match_confirm_title')}</AlertDialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/70 mt-1.5">Protocol: Reset_Node_State</p>
                        </div>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/60 uppercase tracking-wide border-l-2 border-amber-500/40 pl-4 py-1.5 leading-relaxed text-left">{t('revert_match_confirm_desc', { player1: revertingMatch.player1Id, player2: revertingMatch.player2Id })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-8">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.2em] italic rounded-xl h-12 border border-white/10 bg-white/5 text-white/50 hover:text-white transition-all">
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} disabled={isProcessing} className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-[0.2em] italic rounded-xl h-12 shadow-lg shadow-amber-500/25">
                        {t('revert_match_action')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={passwordPromptOpen => setPasswordPromptOpen(passwordPromptOpen)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-md border bg-black/95 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 focus:outline-none focus-visible:outline-none"
                style={{
                    borderColor: `${theme.primaryHex}4D`,
                    boxShadow: `0 0 100px ${theme.glowRgba}`
                }}
            >
                <DialogHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div 
                            className="p-3 rounded-2xl border flex items-center justify-center"
                            style={{
                                backgroundColor: `${theme.primaryHex}1A`,
                                borderColor: `${theme.primaryHex}4D`,
                                color: theme.primaryHex
                            }}
                        >
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-4 leading-none text-white">{t('admin_auth')}</DialogTitle>
                            <p 
                                className="text-[10px] font-black uppercase tracking-[0.25em] mt-1"
                                style={{ color: theme.primaryHex }}
                            >
                                Status: Restricted_Access
                            </p>
                        </div>
                    </div>
                    <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[11px] leading-relaxed text-left border-l-2 border-white/10 pl-3.5">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                    <div className="space-y-2">
                        <Label 
                            htmlFor="password-input" 
                            className="text-[10px] font-black uppercase tracking-[0.3em] ml-1 italic"
                            style={{ color: theme.primaryHex }}
                        >
                            ENCRYPTED_KEY_TRANSMISSION
                        </Label>
                        <div className="relative group/input">
                            <Input 
                                id="password-input" 
                                type="password" 
                                value={passwordInput} 
                                onChange={(e) => setPasswordInput(e.target.value)} 
                                className="h-14 bg-black/60 border-white/10 rounded-2xl focus:border-white/40 text-xl font-black tracking-[0.25em] px-5" 
                                style={{ color: theme.primaryHex }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handlePasswordCheck} 
                        className="w-full h-14 font-black tracking-[0.25em] text-base uppercase italic rounded-2xl transition-all flex items-center justify-center gap-3"
                        style={{
                            backgroundColor: theme.primaryHex,
                            color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                            boxShadow: `0 0 30px ${theme.glowRgba}`
                        }}
                    >
                        <Scan className="w-5 h-5" />
                        {t('unlock')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
