'use client';

import { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, Award, Zap, Loader2, ChevronRight, Binary, BarChart3, Scan, Percent, Star, Undo2, Flame, ShieldAlert, Target, Calendar as CalendarIcon, Clock, Save, Settings2, Shield, Activity, Sparkles, TrendingUp, CheckCircle2, Crown, Layers, Share2, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KnockoutShareDialog } from './knockout-share-dialog';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme, type TISeasonTheme as SeasonDesignTheme } from '@/lib/season-theme';

import { CyberConnectorFork, BracketConnectorFork, BracketConnectorStraight } from './bracket/bracket-connectors';
import { MatchCard } from './bracket/match-card';
import { GrandFinalPodium } from './bracket/grand-final-podium';
import { RelegationPlacementRadar } from './bracket/relegation-radar';

export { getSeasonTheme, type SeasonDesignTheme };
export { CyberConnectorFork, BracketConnectorFork, BracketConnectorStraight } from './bracket/bracket-connectors';
export { MatchCard } from './bracket/match-card';
export { GrandFinalPodium } from './bracket/grand-final-podium';
export { RelegationPlacementRadar } from './bracket/relegation-radar';

interface TournamentBracketProps {
  matches: WithId<Match>[];
  playersById: Record<string, WithId<Player>>;
  teamsById: Record<string, WithId<Team>>;
  leagueTable: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  season: WithId<Season> | null;
  isAdmin?: boolean;
  defendingChampionId?: string;
  onRevertMatch?: (match: WithId<Match>) => void;
}

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season, isAdmin = false, defendingChampionId, onRevertMatch }: TournamentBracketProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const mouseMoved = useRef(false);

  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('00:00');
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (selectedMatch && !selectedMatch.isProjection && selectedMatch.matchDate) {
        const d = selectedMatch.matchDate.toDate();
        setEditDate(d);
        setEditTime(format(d, 'HH:mm'));
    }
  }, [selectedMatch]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true; mouseMoved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft; scrollLeft.current = scrollRef.current.scrollLeft;
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current);
    if (Math.abs(walk) > 10) { mouseMoved.current = true; scrollRef.current.scrollLeft = scrollLeft.current - walk; }
  };

  const onMouseUp = () => { isDragging.current = false; document.body.style.userSelect = ''; };
  const onMouseLeave = () => { isDragging.current = false; document.body.style.userSelect = ''; };
  const handleCardClick = (matchData: any) => { if (!mouseMoved.current) setSelectedMatch(matchData); };

  const handleSaveManualSchedule = async () => {
    if (!firestore || !season || !selectedMatch || !editDate || !editTime) return;
    setIsUpdatingSchedule(true);
    const [h, m] = editTime.split(':').map(Number);
    const newDate = new Date(editDate);
    newDate.setHours(h, m, 0, 0);
    const matchRef = doc(firestore, 'leagues', 'main-league', 'seasons', season.id, 'matches', selectedMatch.id);
    try {
        await updateDoc(matchRef, { matchDate: Timestamp.fromDate(newDate) });
        toast({ title: "Jadwal Diperbarui", description: "Waktu pertandingan telah berhasil disinkronisasi." });
    } catch (error: any) {
        const permissionError = new FirestorePermissionError({ path: matchRef.path, operation: 'update', requestResourceData: { matchDate: Timestamp.fromDate(newDate) } });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdatingSchedule(false);
    }
  };

  const rankedTable = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return [];
    
    const sortFn = (a: any, b: any) => {
        const nameA = a.playerName || a.teamName || "";
        const nameB = b.playerName || b.teamName || "";
        return (
            b.points - a.points || 
            (b.goalDifference || 0) - (a.goalDifference || 0) || 
            (b.goalsFor || 0) - (a.goalsFor || 0) || 
            (b.win || 0) - (a.win || 0) ||
            nameA.localeCompare(nameB)
        );
    };

    if (season?.type === 'Hybrid' || season?.type === 'Co-Op Hybrid') {
      const gA = [...leagueTable].filter(p => p.group === 'A').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gB = [...leagueTable].filter(p => p.group === 'B').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gAll = season.type === 'Co-Op Hybrid' ? [...leagueTable].sort(sortFn).map((p, i) => ({ ...p, rank: i+1 })) : [];
      return season.type === 'Co-Op Hybrid' ? gAll : [...gA, ...gB];
    }
    return [...leagueTable].sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leagueTable, season]);

  const masterPlayersRanked = useMemo(() => {
    const players = Object.values(playersById);
    const withOvr = players.map(p => {
        const played = p.overallPlayed || 0;
        const isCalibrated = played >= 20;
        const poss = played * 3;
        const act = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
        const ovrRating = isCalibrated && poss > 0 ? (act / poss) * 100 : 0;
        return { ...p, ovrRating, isCalibrated };
    });

    const calibrated = withOvr
        .filter(p => p.isCalibrated)
        .sort((a, b) => b.ovrRating - a.ovrRating || (b.overallPlayed || 0) - (a.overallPlayed || 0))
        .map((p, i) => ({ ...p, masterRank: i + 1 }));

    const notCalibrated = withOvr
        .filter(p => !p.isCalibrated)
        .map(p => ({ ...p, masterRank: null }));

    return [...calibrated, ...notCalibrated];
  }, [playersById]);

  const getPlayerAnalysis = (playerId: string) => {
    if (!playerId || playerId === 'TBD' || playerId.includes('TBD') || playerId.includes('Loser')) return null;
    const playerMatches = matches.filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId)).sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());
    const entry = rankedTable.find(e => (e.playerId || e.id) === playerId) as any;
    const teamId = entry?.teamId || entry?.player1TeamId || playersById[playerId]?.teamId || '';
    const team = teamId ? teamsById[teamId] : null;
    const masterInfo = masterPlayersRanked.find(p => p.id === playerId);
    
    const stats = playerMatches.reduce((acc, m) => {
      acc.played++; const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2; const oRes = isP1 ? s2 : s1;
      if (pRes > oRes) acc.win++; else if (pRes < oRes) acc.loss++; else acc.draw++;
      if (m.player1Score !== null && m.player2Score !== null) { acc.gf += isP1 ? m.player1Score : m.player2Score; acc.ga += isP1 ? m.player2Score : m.player1Score; }
      return acc;
    }, { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 });

    const possiblePoints = stats.played * 3;
    const actualPoints = (stats.win * 3) + (stats.draw * 1);
    const winRate = possiblePoints > 0 ? (actualPoints / possiblePoints) * 100 : 0;
    
    const form = playerMatches.slice(-5).map(m => {
      const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = isP1 ? s2 : s1;
      if (pR > oR) return 'W';
      if (pR < oR) return 'L';
      return 'D';
    });

    let cum = 0; const chartData = [{ match: 0, points: 0 }, ...playerMatches.map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = i+1 ? s2 : s1;
      cum += (pR > oR ? 1 : (pR < oR ? -1 : 0)); return { match: i + 1, points: cum };
    })];

    let pST = "Balance"; let pSType: 'attacking' | 'defensive' | 'balanced' = 'balanced'; let pSD = t('play_style_balanced_desc');
    if (stats.played > 0) { const avgGF = stats.gf / stats.played; const avgGA = stats.ga / stats.played; if (avgGF > 1.6) { pST = "Attacking"; pSType = 'attacking'; pSD = t('play_style_attacking_desc'); } else if (avgGA < 1.2 && stats.played >= 3) { pST = "Defense & Counter"; pSType = 'defensive'; pSD = t('play_style_defensive_desc'); } }
    
    let q = "Stabil"; let qC = "text-white/60"; const rWC = form.filter(f => f === 'W').length;
    if (rWC === 5) { q = "Tak terkalahkan"; qC = "text-green-400"; } else if (rWC >= 3) { q = "Performa bagus"; qC = "text-green-400"; } else if (form.filter(f => f === 'L').length >= 3) { q = "Performa menurun"; qC = "text-red-400"; }
    
    const logoUrl = resolveLogo(team?.logoUrl, playerId, entry?.playerName || entry?.teamName || playersById[playerId]?.name);
    return { stats, winRate, form, chartData, playStyleText: pST, playStyleType: pSType, playStyleDescription: pSD, quote: q, quoteColor: qC, team, entry, masterInfo, isDefendingChampion: playerId === defendingChampionId, logoUrl };
  };

  const projections = useMemo(() => {
    if (!rankedTable || rankedTable.length === 0) return null;
    const proj: Record<string, any> = {};
    if (season?.type === 'Single Hybrid') {
        if (rankedTable.length >= 8) {
            proj['playoff-m1'] = { p1: rankedTable[0], p2: rankedTable[7] }; // 1 vs 8
            proj['playoff-m2'] = { p1: rankedTable[3], p2: rankedTable[4] }; // 4 vs 5
            proj['playoff-m3'] = { p1: rankedTable[1], p2: rankedTable[6] }; // 2 vs 7
            proj['playoff-m4'] = { p1: rankedTable[2], p2: rankedTable[5] }; // 3 vs 6
            proj['playoff-sf1'] = { p1: { playerName: 'Pemenang QF 1', teamName: 'Unit TBD', id: 'TBD-W1' }, p2: { playerName: 'Pemenang QF 2', teamName: 'Unit TBD', id: 'TBD-W2' } };
            proj['playoff-sf2'] = { p1: { playerName: 'Pemenang QF 3', teamName: 'Unit TBD', id: 'TBD-W3' }, p2: { playerName: 'Pemenang QF 4', teamName: 'Unit TBD', id: 'TBD-W4' } };
            proj['playoff-final'] = { p1: { playerName: 'Pemenang SF 1', teamName: 'Unit TBD', id: 'TBD-WSF1' }, p2: { playerName: 'Pemenang SF 2', teamName: 'Unit TBD', id: 'TBD-WSF2' } };
            proj['playoff-m18'] = proj['playoff-final'];
        }
        return proj;
    }
    if (season?.type === 'Co-Op Hybrid') {
        if (rankedTable.length >= 4) {
            proj['playoff-m9'] = { p1: rankedTable[0], p2: rankedTable[3] };
            proj['playoff-m10'] = { p1: rankedTable[1], p2: rankedTable[2] };
        }
        if (rankedTable.length >= 6) {
            proj['playoff-m13'] = { p1: rankedTable[4], p2: { playerName: 'Loser UB-SF 1', teamName: 'Unit TBD', id: 'TBD-L1' } };
            proj['playoff-m14'] = { p1: rankedTable[5], p2: { playerName: 'Loser UB-SF 2', teamName: 'Unit TBD', id: 'TBD-L2' } };
        }
        return proj;
    }
    const sR = (data: any[]) => [...data].sort((a, b) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0));
    const gA = sR(rankedTable.filter(p => p.group === 'A')); const gB = sR(rankedTable.filter(p => p.group === 'B'));
    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3] }; proj['playoff-m2'] = { p1: gB[1], p2: gA[2] };
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3] }; proj['playoff-m4'] = { p1: gA[1], p2: gB[2] };
    }
    // Jika format 8 Besar Knockout (salah satu grup < 6 peserta):
    if (gA.length < 6 || gB.length < 6) {
        if (gA.length >= 4 && gB.length >= 4) {
            proj['playoff-sf1'] = { p1: { playerName: 'Pemenang QF 1', teamName: 'Seed A1/B4', id: 'TBD-W1' }, p2: { playerName: 'Pemenang QF 2', teamName: 'Seed B2/A3', id: 'TBD-W2' } };
            proj['playoff-sf2'] = { p1: { playerName: 'Pemenang QF 3', teamName: 'Seed B1/A4', id: 'TBD-W3' }, p2: { playerName: 'Pemenang QF 4', teamName: 'Seed A2/B3', id: 'TBD-W4' } };
            proj['playoff-final'] = { p1: { playerName: 'Pemenang SF 1', teamName: 'Unit TBD', id: 'TBD-WSF1' }, p2: { playerName: 'Pemenang SF 2', teamName: 'Unit TBD', id: 'TBD-WSF2' } };
            proj['playoff-m18'] = proj['playoff-final'];
        }
    } else {
        // Double Elimination (12 tim)
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser UB-QF 1', teamName: 'Unit TBD', id: 'TBD-L1' } };
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser UB-QF 2', teamName: 'Unit TBD', id: 'TBD-L2' } };
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser UB-QF 3', teamName: 'Unit TBD', id: 'TBD-L3' } };
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser UB-QF 4', teamName: 'Unit TBD', id: 'TBD-L4' } };
    }
    return proj;
  }, [rankedTable, season]);

  const bracketData = useMemo(() => {
    const d: Record<string, any> = {};
    matches.forEach(m => {
      if (m.bracketId) {
        const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
        const e1 = rankedTable.find(e => (e.playerId || e.id) === m.player1Id) as any; const e2 = rankedTable.find(e => (e.playerId || e.id) === m.player2Id) as any;
        const t1Id = e1?.teamId || e1?.player1TeamId || playersById[m.player1Id]?.teamId || '';
        const t2Id = e2?.teamId || e2?.player1TeamId || playersById[m.player2Id]?.teamId || '';
        const t1 = t1Id ? teamsById[t1Id] : null; const t2 = t2Id ? teamsById[t2Id] : null;
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        d[m.bracketId] = { ...m, p1: e1 ? { name: e1.playerName || e1.teamName, playerId: e1.playerId || e1.id } : (playersById[m.player1Id] || { name: m.player1Id, playerId: m.player1Id }), p2: e2 ? { name: e2.playerName || e2.teamName, playerId: e2.playerId || e2.id } : (playersById[m.player2Id] || { name: m.player2Id, playerId: m.player2Id }), t1, t2, s1, s2, isW1: m.isCompleted && s1 > s2, isW2: m.isCompleted && s2 > s1 };
      }
    });
    return d;
  }, [matches, playersById, teamsById, rankedTable, season]);

  const analysis1 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player1Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t, season]);
  const analysis2 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player2Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t, season]);
  
  const combinedTrendData = useMemo(() => {
    if (!analysis1 && !analysis2) return [];
    const len1 = analysis1?.chartData.length || 0;
    const len2 = analysis2?.chartData.length || 0;
    const maxLen = Math.max(len1, len2);
    return Array.from({ length: maxLen }).map((_, i) => ({
        match: i,
        p1: analysis1?.chartData[i]?.points ?? (i >= len1 && len1 > 0 && analysis1 ? analysis1.chartData[len1-1].points : 0),
        p2: analysis2?.chartData[i]?.points ?? (i >= len2 && len2 > 0 && analysis2 ? analysis2.chartData[len2-1].points : 0)
    }));
  }, [analysis1, analysis2]);

  const editHour = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[0];
  const editMin = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[1];

  const isCoopHybrid = season?.type === 'Co-Op Hybrid';
  const groupACount = rankedTable.filter(p => p.group === 'A').length;
  const groupBCount = rankedTable.filter(p => p.group === 'B').length;
  const has8TeamKnockoutMatches = matches.some(m => m.round === 'Quarterfinal' || m.bracketId === 'playoff-sf1');
  const isHybrid8Knockout = season?.type === 'Hybrid' && (has8TeamKnockoutMatches || (groupACount > 0 && (groupACount < 6 || groupBCount < 6)));
  const isSingleHybrid = season?.type === 'Single Hybrid' || isHybrid8Knockout;
  const is12TeamHybrid = season?.type === 'Hybrid' && !isHybrid8Knockout;
  const theme = getSeasonTheme(season);

  const [mobileRoundTab, setMobileRoundTab] = useState<string>('all');
  const [mobileViewMode, setMobileViewMode] = useState<'stage' | 'canvas'>('stage');

  const scrollToStage = (stage: string) => {
    setMobileRoundTab(stage);
    if (!scrollRef.current) return;
    if (stage === 'all' || stage === 'qf' || stage === 'ub') {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (stage === 'sf' || stage === 'lb') {
      scrollRef.current.scrollTo({ left: Math.min(scrollRef.current.scrollWidth / 2, 450), behavior: 'smooth' });
    } else if (stage === 'final' || stage === 'relegation') {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative">
        <div className="absolute top-0 left-0 pointer-events-none opacity-[0.03] flex flex-col items-start pt-4 pl-10"><span className="text-[4rem] sm:text-[6rem] font-black italic leading-none">BM LEAGUE</span><span className="text-[1.5rem] sm:text-[2rem] font-black italic -mt-4 tracking-[0.8em]">EIGHTY EIGHT</span></div>
        
        {(!matches || matches.filter(m => m.bracketId).length === 0) && rankedTable.length > 0 && (
            <div className="mb-4 sm:mb-6 px-3 sm:px-8"><div className="relative overflow-hidden bg-amber-500/[0.03] border-2 border-amber-500/20 rounded-xl p-3 sm:p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" /><div className="flex items-start gap-3 sm:gap-4"><div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shadow-lg shrink-0"><Scan className="w-4 h-4 sm:w-5 sm:h-5" /></div><div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1"><Badge className="bg-amber-500 text-black font-black uppercase italic text-[8.5px] sm:text-[9px]">Live Simulation v2.4</Badge></div><p className="text-[11px] sm:text-xs font-bold text-amber-200/90 leading-tight">Bagan ini adalah proyeksi dinamis berdasarkan peringkat grup saat ini. Jadwal final akan dikunci saat Admin memulai babak playoff.</p>
                </div></div>
            </div></div>
        )}

        {/* Adaptive Mobile Controls Bar (Visible on screens < xl) */}
        <div className="xl:hidden px-1.5 sm:px-3 mb-2.5 sm:mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1.5 bg-black/80 backdrop-blur-2xl border border-white/10 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-xl">
                <div className="flex items-center gap-1 bg-white/[0.05] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => setMobileViewMode('stage')}
                        className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 font-headline",
                            mobileViewMode === 'stage' 
                                ? "bg-primary text-black shadow-[0_0_12px_rgba(204,253,1,0.5)]" 
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Per Babak</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileViewMode('canvas')}
                        className={cn(
                            "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 font-headline",
                            mobileViewMode === 'canvas' 
                                ? "bg-primary text-black shadow-[0_0_12px_rgba(204,253,1,0.5)]" 
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Scan className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Bagan Utuh</span>
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        type="button"
                        onClick={() => setIsShareDialogOpen(true)}
                        className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-md sm:rounded-lg text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-sm active:scale-95 transition-all"
                    >
                        <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>Share Bagan</span>
                    </Button>
                    <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest hidden sm:inline-block pr-2">
                        {mobileViewMode === 'stage' ? 'Adaptive Mobile Flow' : 'Swipe Canvas'}
                    </span>
                </div>
            </div>

            {/* Quick Round Navigation Filter (Stage Mode) */}
            {mobileViewMode === 'stage' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {isSingleHybrid ? (
                        <>
                            <button
                                type="button"
                                onClick={() => scrollToStage('all')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'all' 
                                        ? "bg-white/20 text-white border-white/40 shadow-sm" 
                                        : "bg-black/50 text-white/50 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('qf')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'qf' 
                                        ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(204,253,1,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                8 Besar (QF)
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('sf')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'sf' 
                                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semifinal
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('final')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'final' 
                                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Grand Final 🏆
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('relegation')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all flex items-center gap-1",
                                    mobileRoundTab === 'relegation' 
                                        ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]" 
                                        : "bg-black/50 text-rose-300/80 border-rose-500/20 hover:border-rose-500/40"
                                )}
                            >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Degradasi</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => scrollToStage('all')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'all' 
                                        ? "bg-white/20 text-white border-white/40 shadow-sm" 
                                        : "bg-black/50 text-white/50 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('ub')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'ub' 
                                        ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(204,253,1,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Upper Bracket
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('lb')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'lb' 
                                        ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Lower Bracket
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('final')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'final' 
                                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Grand Final 🏆
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('relegation')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all flex items-center gap-1",
                                    mobileRoundTab === 'relegation' 
                                        ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]" 
                                        : "bg-black/50 text-rose-300/80 border-rose-500/20 hover:border-rose-500/40"
                                )}
                            >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Degradasi</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Adaptive Stacked Mobile Cards (Visible on mobile when mobileViewMode === 'stage') */}
        {mobileViewMode === 'stage' && (
            <div className="xl:hidden px-3 space-y-4 pb-8 animate-in fade-in duration-500">
                {isSingleHybrid ? (
                    <>
                        {/* Mobile Section: Quarterfinals (8 Besar) */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'qf') && (
                            <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl", theme.primaryBorder)}>
                                <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-4 w-1 rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase italic font-headline">
                                            8 BESAR (QUARTERFINALS)
                                        </h4>
                                    </div>
                                    <Badge className="bg-primary/10 border border-primary/40 text-primary text-[8px] font-black uppercase">
                                        BO3 • GUGUR
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <MatchCard bid="playoff-m1" label={season?.type === 'Hybrid' ? "QF 1 (A1 vs B4)" : "QF 1 (#1 vs #8)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m2" label={season?.type === 'Hybrid' ? "QF 2 (B2 vs A3)" : "QF 2 (#4 vs #5)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m3" label={season?.type === 'Hybrid' ? "QF 3 (B1 vs A4)" : "QF 3 (#2 vs #7)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m4" label={season?.type === 'Hybrid' ? "QF 4 (A2 vs B3)" : "QF 4 (#3 vs #6)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                </div>
                            </div>
                        )}

                        {/* Mobile Section: Semifinals */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'sf') && (
                            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase italic font-headline">
                                            SEMIFINALS
                                        </h4>
                                    </div>
                                    <Badge className="bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-[8px] font-black uppercase">
                                        STAGE 02
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <MatchCard bid="playoff-sf1" label="SEMIFINAL 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-sf2" label="SEMIFINAL 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                </div>
                            </div>
                        )}

                        {/* Mobile Section: Grand Final Podium */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'final') && (
                            <GrandFinalPodium
                                bid={bracketData['playoff-final'] ? 'playoff-final' : (bracketData['playoff-m18'] ? 'playoff-m18' : 'playoff-final')}
                                label="CHAMPIONSHIP BATTLE"
                                bracketData={bracketData}
                                projections={projections}
                                handleCardClick={handleCardClick}
                                teamsById={teamsById}
                                seriesLabel={theme.seriesBadge}
                                season={season}
                            />
                        )}

                        {/* Mobile Section: Relegation & Placement Radar */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'relegation') && (
                            <RelegationPlacementRadar
                                rankedTable={rankedTable}
                                season={season}
                                teamsById={teamsById}
                                playersById={playersById}
                                theme={theme}
                                isSingleHybrid={isSingleHybrid}
                                matches={matches}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* Double Elimination Mobile: Upper Bracket */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'ub') && (
                            <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl", theme.primaryBorder)}>
                                <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-4 w-1 rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <h4 className={cn("text-xs sm:text-sm font-black tracking-wider uppercase italic font-headline", theme.primaryText)}>
                                            UPPER BRACKET
                                        </h4>
                                    </div>
                                    <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                        {theme.seasonBadge}
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {!isCoopHybrid && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m9" label="UB SEMI 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        <MatchCard bid="playoff-m10" label="UB SEMI 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                    <div className="pt-1">
                                        <MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Double Elimination Mobile: Lower Bracket */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'lb') && (
                            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-rose-500/30 bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-rose-400 uppercase italic font-headline">
                                            LOWER BRACKET
                                        </h4>
                                    </div>
                                    <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[7.5px] font-black uppercase">
                                        SUDDEN DEATH
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {is12TeamHybrid && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Double Elimination Mobile: Grand Final Podium */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'final') && (
                            <GrandFinalPodium
                                bid="playoff-m18"
                                label="THE ULTIMATE BATTLE"
                                bracketData={bracketData}
                                projections={projections}
                                handleCardClick={handleCardClick}
                                teamsById={teamsById}
                                seriesLabel={theme.seriesBadge}
                                season={season}
                            />
                        )}

                        {/* Double Elimination Mobile: Relegation & Placement Radar */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'relegation') && (
                            <RelegationPlacementRadar
                                rankedTable={rankedTable}
                                season={season}
                                teamsById={teamsById}
                                playersById={playersById}
                                theme={theme}
                                isSingleHybrid={false}
                            />
                        )}
                    </>
                )}
            </div>
        )}

        {/* Full Interactive Canvas View (Default on desktop, and available on mobile via toggle) */}
        <div 
            ref={scrollRef} 
            onMouseDown={onMouseDown} 
            onMouseMove={onMouseMove} 
            onMouseUp={onMouseUp} 
            onMouseLeave={onMouseLeave} 
            className={cn(
                "w-full overflow-x-auto pb-10 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-primary/20",
                mobileViewMode === 'stage' ? "hidden xl:block" : "block"
            )}
        >
            {isSingleHybrid ? (
                <>
                {/* SINGLE HYBRID: 8-BESAR SINGLE ELIMINATION BRACKET (BEST OF 3, KALAH = GUGUR) */}
                <div className="w-full min-w-[920px] xl:min-w-0 flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-6 p-2 sm:p-4 2xl:p-6 animate-in fade-in duration-1000">
                    {/* KNOCKOUT ARENA: QUARTERFINALS & SEMIFINALS */}
                    <div className="flex-[1.3] 2xl:flex-[1.4] min-w-0 flex flex-col relative">
                        <div className={cn("flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2rem] p-4 sm:p-6 2xl:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-700 aero-card cyber-carbon overflow-hidden", theme.primaryBorder)}>
                            {/* Top neon racing tracer */}
                            <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                            <div className="absolute top-3 right-5 flex items-center gap-2 font-mono opacity-75">
                                <span className={cn("text-[7.5px] font-black tracking-[0.3em] uppercase italic", theme.primaryText)}>
                                    {theme.sysTag}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            </div>

                            <div className="space-y-4 relative h-full flex flex-col justify-center">
                                {/* 1. Cockpit Header Bar */}
                                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_15px_rgba(204,253,1,0.9)]", theme.laserConduit)} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase italic font-headline">
                                                    {theme.knockoutArenaTitle}
                                                </h3>
                                                <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                                    {theme.seasonBadge}
                                                </Badge>
                                            </div>
                                            <span className="text-[7.5px] font-mono font-bold text-white/40 uppercase tracking-[0.25em]">
                                                {theme.knockoutArenaSubtitle}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("hidden sm:flex px-2.5 py-0.5 rounded-full bg-black/60 border items-center gap-1.5 font-mono text-[7.5px]", theme.tagBorder, theme.primaryText)}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                            </span>
                                            <span className="font-black uppercase tracking-wider">LIVE MATCH DATA // KALAH = GUGUR</span>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setIsShareDialogOpen(true)}
                                            className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span>Share Bagan</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* 2. Stage Progress Route Indicators */}
                                <div className="flex items-center justify-between px-2 font-mono text-[8px] text-white/40 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span 
                                          className="font-black uppercase px-2.5 py-0.5 rounded-full border"
                                          style={{
                                            color: theme.primaryHex,
                                            backgroundColor: `${theme.primaryHex}1A`,
                                            borderColor: `${theme.primaryHex}4D`
                                          }}
                                        >
                                            STAGE 01 // 8 BESAR (QUARTERFINALS)
                                        </span>
                                        <span className="text-white/20">❯❯❯</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span 
                                          className="font-black uppercase px-2.5 py-0.5 rounded-full border"
                                          style={{
                                            color: theme.secondaryHex || theme.primaryHex,
                                            backgroundColor: `${theme.secondaryHex || theme.primaryHex}1A`,
                                            borderColor: `${theme.secondaryHex || theme.primaryHex}4D`
                                          }}
                                        >
                                            STAGE 02 // SEMIFINALS
                                        </span>
                                        <span className="text-white/20">❯❯❯</span>
                                    </div>
                                    <div 
                                      className="flex items-center gap-1.5 font-bold uppercase"
                                      style={{ color: theme.secondaryHex || theme.primaryHex }}
                                    >
                                        <Trophy className="w-3 h-3" style={{ color: theme.secondaryHex || theme.primaryHex }} />
                                        <span>APEX GRAND FINAL</span>
                                    </div>
                                </div>

                                {/* 3. Precision Synchronized Bracket Grid */}
                                <div className="w-full flex items-center justify-between gap-1 sm:gap-2">
                                    {/* Column 1: QUARTERFINALS */}
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6">
                                        {/* Pair 1 (QF 1 & QF 2) */}
                                        <div className="flex flex-col gap-2">
                                            <MatchCard bid="playoff-m1" label={season?.type === 'Hybrid' ? "QF 1 (A1 vs B4)" : "QF 1 (#1 vs #8)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m2" label={season?.type === 'Hybrid' ? "QF 2 (B2 vs A3)" : "QF 2 (#4 vs #5)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        {/* Pair 2 (QF 3 & QF 4) */}
                                        <div className="flex flex-col gap-2">
                                            <MatchCard bid="playoff-m3" label={season?.type === 'Hybrid' ? "QF 3 (B1 vs A4)" : "QF 3 (#2 vs #7)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m4" label={season?.type === 'Hybrid' ? "QF 4 (A2 vs B3)" : "QF 4 (#3 vs #6)"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    </div>

                                    {/* Column 2: LASER CONNECTORS QF -> SF */}
                                    <div className="shrink-0 flex flex-col gap-6 items-center justify-center">
                                        <CyberConnectorFork 
                                          color={theme.connectorColor} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="standard" 
                                        />
                                        <CyberConnectorFork 
                                          color={theme.connectorColor} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="standard" 
                                        />
                                    </div>

                                    {/* Column 3: SEMIFINALS */}
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-around h-[376px] py-1">
                                        <div className="flex items-center">
                                            <MatchCard bid="playoff-sf1" label="SEMIFINAL 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        <div className="flex items-center">
                                            <MatchCard bid="playoff-sf2" label="SEMIFINAL 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    </div>

                                    {/* Column 4: TALL LASER CONNECTOR SF -> GRAND FINAL */}
                                    <div className="shrink-0 flex items-center justify-center h-[376px]">
                                        <CyberConnectorFork 
                                          color={theme.secondaryConnectorColor || "amber"} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="tall" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRAND FINAL PODIUM */}
                    <GrandFinalPodium
                        bid={bracketData['playoff-final'] ? 'playoff-final' : (bracketData['playoff-m18'] ? 'playoff-m18' : 'playoff-final')}
                        label="CHAMPIONSHIP BATTLE"
                        bracketData={bracketData}
                        projections={projections}
                        handleCardClick={handleCardClick}
                        teamsById={teamsById}
                        seriesLabel={theme.seriesBadge}
                        season={season}
                    />
                </div>

                {/* SINGLE HYBRID: ZONA DEGRADASI & FINAL PLACEMENT RADAR */}
                <div className="w-full px-2 sm:px-4 2xl:px-6 mt-4">
                    <RelegationPlacementRadar
                        rankedTable={rankedTable}
                        season={season}
                        teamsById={teamsById}
                        playersById={playersById}
                        theme={theme}
                        isSingleHybrid={true}
                        matches={matches}
                    />
                </div>
                </>
            ) : (
                <>
                {/* DOUBLE ELIMINATION FORMAT (12-TEAM HYBRID & CO-OP HYBRID) */}
                <div className={cn("w-full xl:min-w-0 flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-6 p-2 sm:p-4 2xl:p-6 animate-in fade-in duration-1000", isCoopHybrid ? "min-w-[960px]" : "min-w-[1100px]")}>
                    <div className="flex-[1.4] 2xl:flex-[1.5] min-w-0 flex flex-col gap-5 sm:gap-6 relative">
                        {/* UPPER BRACKET ARENA */}
                        <div className={cn("flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2.5rem] p-5 sm:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-700 aero-card cyber-carbon overflow-hidden", theme.primaryBorder)}>
                            {/* Top neon tracer */}
                            <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                            <div className="absolute top-4 right-6 flex items-center gap-2 opacity-75 font-mono">
                                <span className={cn("text-[7.5px] font-black tracking-[0.3em] uppercase italic", theme.primaryText)}>
                                    {`${theme.sysTag}_UB`}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            </div>

                            <div className="space-y-6 relative h-full flex flex-col justify-center">
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_15px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className={cn("text-lg sm:text-xl font-black tracking-widest uppercase italic font-headline", theme.primaryText)}>
                                                    {theme.upperTitle}
                                                </h3>
                                                <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                                    {theme.seasonBadge}
                                                </Badge>
                                            </div>
                                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                                                {theme.upperSubtitle}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setIsShareDialogOpen(true)}
                                        className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        <span>Share Bagan</span>
                                    </Button>
                                </div>
                                <div className="w-full flex items-center justify-between gap-2 sm:gap-4 pl-1 sm:pl-3">
                                    {!isCoopHybrid && (
                                      <>
                                        <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6 relative">
                                          <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        <div className="shrink-0 flex flex-col gap-6 py-2">
                                          <BracketConnectorFork 
                                            color={theme.connectorColor} 
                                            customHex={theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                          <BracketConnectorFork 
                                            color={theme.connectorColor} 
                                            customHex={theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className={cn("flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col", isCoopHybrid ? "justify-around h-[220px] py-2" : "gap-32 py-10")}>
                                      <MatchCard bid="playoff-m9" label={isCoopHybrid ? "UB SEMI 1" : "UB SEMI 1"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                      <MatchCard bid="playoff-m10" label={isCoopHybrid ? "UB SEMI 2" : "UB SEMI 2"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                    <div className="shrink-0 flex flex-col justify-center">
                                      <BracketConnectorFork 
                                        color={theme.connectorColor} 
                                        customHex={theme.primaryHex} 
                                        customGlow={theme.glowRgba} 
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-center">
                                      <MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LOWER BRACKET ARENA */}
                        <div
                          className="flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2.5rem] p-5 sm:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-700 aero-card cyber-carbon overflow-hidden"
                          style={{ borderColor: `${theme.primaryHex}4D` }}
                        >
                            {/* Top neon tracer */}
                            <div
                              className="absolute top-0 left-0 right-0 h-[2px]"
                              style={{
                                background: `linear-gradient(to right, transparent, ${theme.secondaryHex || theme.primaryHex}, transparent)`,
                                boxShadow: `0 0 20px ${theme.primaryHex}`
                              }}
                            />
                            <div className="absolute top-4 right-6 flex items-center gap-2 opacity-75 font-mono">
                                <span
                                  className="text-[7.5px] font-black tracking-[0.3em] uppercase italic"
                                  style={{ color: theme.secondaryHex || theme.primaryHex }}
                                >
                                    {`${theme.sysTag}_LB`}
                                </span>
                                <div
                                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: theme.primaryHex }}
                                />
                            </div>

                            <div className="space-y-6 relative h-full flex flex-col justify-center">
                                <div className="flex items-center gap-3">
                                    <div
                                      className="h-7 w-1 rounded-full shadow-md"
                                      style={{
                                        backgroundColor: theme.primaryHex,
                                        boxShadow: `0 0 15px ${theme.primaryHex}`
                                      }}
                                    />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3
                                              className="text-lg sm:text-xl font-black tracking-widest uppercase italic font-headline"
                                              style={{ color: theme.secondaryHex || theme.primaryHex }}
                                            >
                                                {theme.lowerTitle}
                                            </h3>
                                            <Badge
                                              className="text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm"
                                              style={{
                                                backgroundColor: `${theme.primaryHex}26`,
                                                borderColor: `${theme.primaryHex}66`,
                                                color: theme.secondaryHex || theme.primaryHex
                                              }}
                                            >
                                                SUDDEN DEATH PROTOCOL
                                            </Badge>
                                        </div>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                                            {theme.lowerSubtitle}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-between gap-2 sm:gap-4 pl-1 sm:pl-3">
                                    {is12TeamHybrid && (
                                      <>
                                        <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6">
                                          <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        </div>
                                        <div className="shrink-0 flex flex-col gap-6 py-2">
                                          <BracketConnectorFork 
                                            color={theme.lowerConnectorColor} 
                                            customHex={theme.secondaryHex || theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                          <BracketConnectorFork 
                                            color={theme.lowerConnectorColor} 
                                            customHex={theme.secondaryHex || theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className={cn("flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col", isCoopHybrid ? "justify-around h-[220px] py-2" : "gap-32 py-10")}>
                                      <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                      <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                    <div className="shrink-0 flex flex-col justify-center">
                                      <BracketConnectorFork 
                                        color={theme.lowerConnectorColor} 
                                        customHex={theme.secondaryHex || theme.primaryHex} 
                                        customGlow={theme.glowRgba} 
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-center gap-8">
                                      <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                      <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRAND FINAL PODIUM */}
                    <GrandFinalPodium
                        bid="playoff-m18"
                        label="THE ULTIMATE BATTLE"
                        bracketData={bracketData}
                        projections={projections}
                        handleCardClick={handleCardClick}
                        teamsById={teamsById}
                        seriesLabel={theme.seriesBadge}
                        season={season}
                    />
                </div>

                {/* DOUBLE ELIMINATION: ZONA DEGRADASI & FINAL PLACEMENT RADAR */}
                <div className="w-full px-2 sm:px-4 2xl:px-6 mt-4">
                    <RelegationPlacementRadar
                        rankedTable={rankedTable}
                        season={season}
                        teamsById={teamsById}
                        playersById={playersById}
                        theme={theme}
                        isSingleHybrid={false}
                        matches={matches}
                    />
                </div>
                </>
            )}
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[88vw] max-w-3xl max-h-[88vh] flex flex-col border p-0 overflow-hidden bg-black/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] focus:outline-none focus-visible:outline-none [&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5 [&>button:last-child]:h-8 [&>button:last-child]:w-8 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white [&>button:last-child]:hover:text-black [&>button:last-child]:transition-all [&>button:last-child]:z-50 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:opacity-100"
                style={{
                    borderColor: `${theme.primaryHex}40`,
                    boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 35px ${theme.primaryHex}26`
                }}
            >
                {/* Top Racing Tracer */}
                <div 
                    className="absolute top-0 left-0 right-0 h-[2px] z-20" 
                    style={{
                        background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
                        boxShadow: `0 0 16px ${theme.primaryHex}`
                    }}
                />
                
                <ScrollArea className="max-h-[88vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 relative">
                        <div 
                            className="absolute inset-0 pointer-events-none opacity-25"
                            style={{
                                backgroundImage: `radial-gradient(${theme.primaryHex}33 1px, transparent 1px)`,
                                backgroundSize: '18px 18px'
                            }}
                        />

                        {/* Compact Header Bar */}
                        <DialogHeader className="p-3.5 sm:p-4.5 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border-b border-white/10 relative z-10 rounded-t-[2rem] -mx-3.5 -mt-3.5 sm:-mx-6 sm:-mt-6 mb-1">
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <div 
                                    className="p-2 border rounded-xl shadow-md shrink-0 flex items-center justify-center"
                                    style={{
                                        backgroundColor: `${theme.primaryHex}1A`,
                                        borderColor: `${theme.primaryHex}4D`,
                                        color: theme.primaryHex,
                                        boxShadow: `0 0 15px ${theme.primaryHex}33`
                                    }}
                                >
                                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-center sm:text-left min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                                        <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight uppercase italic leading-none text-white font-headline drop-shadow-md">
                                            HUD ANALISIS PERTANDINGAN
                                        </DialogTitle>
                                        <Badge 
                                            className="font-black tracking-widest text-[8px] sm:text-[9px] px-2.5 h-4.5 rounded-full uppercase italic border shadow-sm"
                                            style={{
                                                backgroundColor: `${theme.primaryHex}1A`,
                                                borderColor: `${theme.primaryHex}4D`,
                                                color: theme.primaryHex
                                            }}
                                        >
                                            {selectedMatch?.round || theme.seasonBadge || 'Playoff Battle'}
                                        </Badge>
                                    </div>
                                    <p className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/40 mt-1">
                                        {theme.sysTag} • FIFA MATCH ANALYTICS MATRIX
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Admin Schedule Configuration */}
                        {!selectedMatch?.isProjection && (
                            <div className="relative z-10 animate-in slide-in-from-top-3 duration-500">
                                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 p-3 sm:p-4 rounded-2xl relative overflow-hidden shadow-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center text-center">
                                        <div className="flex flex-col items-center space-y-2">
                                            <Label 
                                                className="text-[9.5px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5"
                                                style={{ color: theme.primaryHex }}
                                            >
                                                <CalendarIcon className="w-3.5 h-3.5" /> Tanggal Pertandingan
                                            </Label>
                                            <Popover>
                                                <PopoverTrigger asChild disabled={!isAdmin}>
                                                    <Button variant="outline" className="w-full h-11 bg-white/[0.04] border border-white/15 font-black text-xs uppercase rounded-xl tracking-tight transition-all px-3.5 text-center hover:border-white/30 active:scale-[0.99]">
                                                        {editDate ? format(editDate, "eeee, d MMM yyyy", { locale: localeId }) : "TBD"}
                                                    </Button>
                                                </PopoverTrigger>
                                                {isAdmin && (
                                                    <PopoverContent className="w-auto p-0 bg-black/95 border-white/20 rounded-2xl" align="center">
                                                        <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="rounded-2xl" />
                                                    </PopoverContent>
                                                )}
                                            </Popover>
                                        </div>
                                        <div className="flex flex-col items-center space-y-2">
                                            <Label 
                                                className="text-[9.5px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5"
                                                style={{ color: theme.primaryHex }}
                                            >
                                                <Clock className="w-3.5 h-3.5" /> Waktu Kick-Off (24H)
                                            </Label>
                                            <div className="flex items-center justify-center gap-2">
                                                <Select value={editHour} onValueChange={(val) => setEditTime(`${val}:${editMin}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className="h-11 bg-white/[0.04] border border-white/15 focus:border-white/40 font-black text-base tabular-nums w-24 rounded-xl text-center active:scale-[0.99]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/95 border-white/20 rounded-xl max-h-56">
                                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black text-sm py-2">{v}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="font-black text-xl" style={{ color: theme.primaryHex }}>:</span>
                                                <Select value={editMin} onValueChange={(val) => setEditTime(`${editHour}:${val}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className="h-11 bg-white/[0.04] border border-white/15 focus:border-white/40 font-black text-base tabular-nums w-24 rounded-xl text-center active:scale-[0.99]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/95 border-white/20 rounded-xl max-h-56">
                                                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black text-sm py-2">{v}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-2.5">
                                            <Button 
                                                onClick={handleSaveManualSchedule} 
                                                disabled={isUpdatingSchedule} 
                                                className="h-11 px-7 font-black uppercase italic tracking-wider text-[10px] gap-2 rounded-xl text-black transition-all active:scale-95"
                                                style={{
                                                    backgroundColor: theme.primaryHex,
                                                    boxShadow: `0 0 15px ${theme.primaryHex}4D`
                                                }}
                                            >
                                                {isUpdatingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} SIMPAN JADWAL
                                            </Button>
                                            {selectedMatch?.isCompleted && onRevertMatch && (
                                                <Button 
                                                    variant="outline" 
                                                    className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-black uppercase italic tracking-wider text-[10px] h-11 px-5 rounded-xl transition-all gap-2 active:scale-95" 
                                                    onClick={() => { onRevertMatch(selectedMatch); setSelectedMatch(null); }}
                                                >
                                                    <Undo2 className="w-4 h-4" /> RESET SKOR
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VS Matchup Section (Compact & Proportional) */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 relative z-10 py-1">
                            {/* Player 1 */}
                            <div className="flex flex-col items-center text-center gap-2 w-full min-w-0">
                                {analysis1 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar 
                                                className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-[3px] shadow-xl relative z-10 transition-transform duration-300 bg-black/70 overflow-hidden flex items-center justify-center p-1.5"
                                                style={{
                                                    borderColor: theme.primaryHex,
                                                    boxShadow: `0 0 20px ${theme.primaryHex}4D`
                                                }}
                                            >
                                                <AvatarImage key={analysis1.logoUrl} src={analysis1.logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/50 font-black text-xs"><User className="w-8 h-8 text-white/20"/></AvatarFallback>
                                            </Avatar>
                                            <div 
                                                className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-black border text-[10px] sm:text-xs font-black z-20 rotate-6 shadow-md" 
                                                style={{
                                                    borderColor: theme.primaryHex,
                                                    color: theme.primaryHex
                                                }}
                                                suppressHydrationWarning
                                            >
                                                {analysis1.entry?.rank || '?'}
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-lg font-black uppercase italic text-white text-center w-full leading-tight truncate px-1" suppressHydrationWarning>
                                            {selectedMatch?.p1?.name}
                                        </h3>
                                        <Badge 
                                            variant="outline" 
                                            className="text-[7.5px] sm:text-[8px] uppercase tracking-wider font-bold max-w-[130px] truncate"
                                            style={{
                                                borderColor: `${theme.primaryHex}40`,
                                                color: theme.primaryHex,
                                                backgroundColor: `${theme.primaryHex}0D`
                                            }}
                                        >
                                            {analysis1.team?.name || 'Independent'}
                                        </Badge>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                            <User className="w-8 h-8 text-white/30" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase italic">SLOT TERSEDIA</h3>
                                    </div>
                                )}
                            </div>

                            {/* Center VS Emblem */}
                            <div className="flex items-center justify-center px-1">
                                <div 
                                    className="border-2 rounded-xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center z-10 rotate-45 group/vs transition-transform shadow-lg"
                                    style={{
                                        backgroundColor: '#070C14',
                                        borderColor: theme.primaryHex,
                                        boxShadow: `0 0 20px ${theme.primaryHex}40`
                                    }}
                                >
                                    <span 
                                        className="font-black text-xs sm:text-base italic -rotate-45 font-headline"
                                        style={{ color: theme.primaryHex }}
                                    >
                                        VS
                                    </span>
                                </div>
                            </div>

                            {/* Player 2 */}
                            <div className="flex flex-col items-center text-center gap-2 w-full min-w-0">
                                {analysis2 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar 
                                                className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-[3px] shadow-xl relative z-10 transition-transform duration-300 bg-black/70 overflow-hidden flex items-center justify-center p-1.5"
                                                style={{
                                                    borderColor: theme.secondaryHex || '#FFFFFF',
                                                    boxShadow: `0 0 20px ${(theme.secondaryHex || '#FFFFFF')}4D`
                                                }}
                                            >
                                                <AvatarImage key={analysis2.logoUrl} src={analysis2.logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/50 font-black text-xs"><User className="w-8 h-8 text-white/20"/></AvatarFallback>
                                            </Avatar>
                                            <div 
                                                className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-black border text-[10px] sm:text-xs font-black z-20 -rotate-6 shadow-md"
                                                style={{
                                                    borderColor: theme.secondaryHex || '#FFFFFF',
                                                    color: theme.secondaryHex || '#FFFFFF'
                                                }}
                                                suppressHydrationWarning
                                            >
                                                {analysis2.entry?.rank || '?'}
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-lg font-black uppercase italic text-white text-center w-full leading-tight truncate px-1" suppressHydrationWarning>
                                            {selectedMatch?.p2?.name}
                                        </h3>
                                        <Badge 
                                            variant="outline" 
                                            className="text-[7.5px] sm:text-[8px] uppercase tracking-wider font-bold max-w-[130px] truncate"
                                            style={{
                                                borderColor: `${theme.secondaryHex || '#FFFFFF'}40`,
                                                color: theme.secondaryHex || 'rgba(255,255,255,0.7)',
                                                backgroundColor: `${theme.secondaryHex || '#FFFFFF'}0D`
                                            }}
                                        >
                                            {analysis2.team?.name || 'Independent'}
                                        </Badge>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                            <User className="w-8 h-8 text-white/30" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase italic">SLOT TERSEDIA</h3>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Telemetry Matrix & Playstyle Cards */}
                        {analysis1 && analysis2 && (() => {
                            // Calculate normalized Head-to-Head Probability (Total 100%)
                            const w1 = analysis1.winRate || 0;
                            const w2 = analysis2.winRate || 0;
                            let prob1 = 50;
                            let prob2 = 50;

                            if (w1 + w2 > 0) {
                                prob1 = Math.round((w1 / (w1 + w2)) * 100);
                                prob2 = 100 - prob1;
                            }

                            return (
                            <div className="space-y-3 sm:space-y-4 relative z-10 animate-in fade-in duration-700">
                                {/* Probability Matrix Card */}
                                <div 
                                    className="bg-black/60 border rounded-2xl p-3.5 sm:p-4.5 space-y-3 relative overflow-hidden"
                                    style={{ borderColor: `${theme.primaryHex}26` }}
                                >
                                     {/* Probability Bar */}
                                     <div className="flex flex-col items-center gap-1.5">
                                         <h4 
                                            className="text-[9px] font-black tracking-[0.25em] uppercase italic flex items-center gap-1.5"
                                            style={{ color: theme.primaryHex }}
                                         >
                                             <Zap className="w-3 h-3" style={{ color: theme.primaryHex }} /> Probability Matrix
                                         </h4>
                                         <div className="flex items-center gap-3 w-full max-w-xs">
                                             <span 
                                                className="text-lg sm:text-xl font-black italic tabular-nums" 
                                                style={{ color: theme.primaryHex }}
                                                suppressHydrationWarning
                                             >
                                                 {prob1}%
                                             </span>
                                             <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden flex border border-white/10">
                                                 <div 
                                                    className="h-full transition-all duration-700" 
                                                    style={{ 
                                                        width: `${prob1}%`,
                                                        backgroundColor: theme.primaryHex,
                                                        boxShadow: `0 0 10px ${theme.primaryHex}`
                                                    }} 
                                                 />
                                                 <div 
                                                    className="h-full transition-all duration-700" 
                                                    style={{ 
                                                        width: `${prob2}%`,
                                                        backgroundColor: theme.secondaryHex || '#94A3B8'
                                                    }} 
                                                 />
                                             </div>
                                             <span 
                                                className="text-lg sm:text-xl font-black italic tabular-nums" 
                                                style={{ color: theme.secondaryHex || 'rgba(255,255,255,0.5)' }}
                                                suppressHydrationWarning
                                             >
                                                 {prob2}%
                                             </span>
                                         </div>
                                     </div>

                                     {/* Stats Breakdown Bars */}
                                     <div className="space-y-2 pt-1 border-t border-white/5">
                                         {[
                                             { label: 'MATCH LOGS', v1: analysis1.stats.played, v2: analysis2.stats.played },
                                             { label: 'TOTAL VICTORIES', v1: analysis1.stats.win, v2: analysis2.stats.win, customColor: theme.primaryHex },
                                             { label: 'UNIT GOALS', v1: analysis1.stats.gf, v2: analysis2.stats.gf, customColor: theme.secondaryHex || theme.primaryHex },
                                             { label: 'MASTER OVR', v1: analysis1.masterInfo?.isCalibrated ? analysis1.masterInfo.ovrRating.toFixed(0) : 'N/C', v2: analysis2.masterInfo?.isCalibrated ? analysis2.masterInfo.ovrRating.toFixed(0) : 'N/C', customColor: '#F59E0B' }
                                         ].map((stat, i) => (
                                             <div key={i} className="space-y-1">
                                                 <div className="flex justify-between items-center text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest text-white/30">
                                                     <span suppressHydrationWarning className="text-white/60 font-mono">{stat.v1} Units</span>
                                                     <span className="text-white/50 italic font-headline">{stat.label}</span>
                                                     <span suppressHydrationWarning className="text-white/60 font-mono">{stat.v2} Units</span>
                                                 </div>
                                                 <div className="flex items-center gap-1.5 h-1.5 w-full">
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden flex justify-end">
                                                         <div 
                                                             className="h-full transition-all duration-700" 
                                                             style={{ 
                                                                 width: `${(Number(stat.v1) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%`,
                                                                 backgroundColor: stat.customColor || theme.primaryHex
                                                             }} 
                                                         />
                                                     </div>
                                                     <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden">
                                                         <div 
                                                             className="h-full transition-all duration-700" 
                                                             style={{ 
                                                                 width: `${(Number(stat.v2) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%`,
                                                                 backgroundColor: stat.customColor ? `${stat.customColor}99` : 'rgba(255,255,255,0.3)'
                                                             }} 
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                </div>

                                {/* Compact Play Style Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                     <Card 
                                        className="bg-black/60 border rounded-xl p-3 relative overflow-hidden"
                                        style={{ borderColor: `${theme.primaryHex}33` }}
                                     >
                                         <div 
                                            className="absolute top-0 left-0 w-1 h-full" 
                                            style={{ 
                                                backgroundColor: theme.primaryHex,
                                                boxShadow: `0 0 8px ${theme.primaryHex}`
                                            }} 
                                         />
                                         <div className="flex flex-col gap-1.5 relative z-10 pl-1.5">
                                             <div className="flex justify-between items-start">
                                                 <div className="flex flex-col">
                                                     <span 
                                                        className="text-[6.5px] font-black uppercase tracking-[0.25em] italic"
                                                        style={{ color: theme.primaryHex }}
                                                     >
                                                         Play Style
                                                     </span>
                                                     <h4 className="text-xs sm:text-sm font-black uppercase italic text-white pr-1">
                                                         {analysis1.playStyleText}
                                                     </h4>
                                                 </div>
                                                 <div className="flex gap-0.5">
                                                     {analysis1.form.map((f, i) => (
                                                         <div 
                                                             key={i} 
                                                             className={cn(
                                                                 "w-4 h-4 rounded flex items-center justify-center text-[7px] font-black", 
                                                                 f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                                                                 f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                                                                 "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                                             )}
                                                         >
                                                             {f}
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <p className="text-[8.5px] sm:text-[9px] font-semibold text-white/40 leading-snug italic line-clamp-2" suppressHydrationWarning>
                                                 "{analysis1.playStyleDescription}"
                                             </p>
                                         </div>
                                     </Card>

                                     <Card 
                                        className="bg-black/60 border rounded-xl p-3 relative overflow-hidden"
                                        style={{ borderColor: `${theme.secondaryHex || 'rgba(255,255,255,0.2)'}33` }}
                                     >
                                         <div 
                                            className="absolute right-0 top-0 w-1 h-full" 
                                            style={{ 
                                                backgroundColor: theme.secondaryHex || 'rgba(255,255,255,0.5)',
                                                boxShadow: theme.secondaryHex ? `0 0 8px ${theme.secondaryHex}` : undefined
                                            }} 
                                         />
                                         <div className="flex flex-col gap-1.5 relative z-10 text-right pr-1.5">
                                             <div className="flex justify-between items-start flex-row-reverse">
                                                 <div className="flex flex-col">
                                                     <span 
                                                        className="text-[6.5px] font-black uppercase tracking-[0.25em] italic"
                                                        style={{ color: theme.secondaryHex || 'rgba(255,255,255,0.5)' }}
                                                     >
                                                         Tactical DNA
                                                     </span>
                                                     <h4 className="text-xs sm:text-sm font-black uppercase italic text-white pl-1">
                                                         {analysis2.playStyleText}
                                                     </h4>
                                                 </div>
                                                 <div className="flex gap-0.5">
                                                     {analysis2.form.map((f, i) => (
                                                         <div 
                                                             key={i} 
                                                             className={cn(
                                                                 "w-4 h-4 rounded flex items-center justify-center text-[7px] font-black", 
                                                                 f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                                                                 f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                                                                 "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                                             )}
                                                         >
                                                             {f}
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <p className="text-[8.5px] sm:text-[9px] font-semibold text-white/40 leading-snug italic line-clamp-2" suppressHydrationWarning>
                                                 "{analysis2.playStyleDescription}"
                                             </p>
                                         </div>
                                     </Card>
                                </div>
                            </div>
                            );
                        })()}

                        {/* Live Sync Footer Notice */}
                        <div 
                            className="rounded-xl p-2.5 text-center relative overflow-hidden border"
                            style={{
                                backgroundColor: `${theme.primaryHex}0D`,
                                borderColor: `${theme.primaryHex}26`
                            }}
                        >
                            <p 
                                className="text-[8px] font-bold italic leading-tight uppercase tracking-tight"
                                style={{ color: `${theme.primaryHex}CC` }}
                            >
                                Data disinkronisasi real-time sesuai statistik turnamen & match report {theme.seasonBadge}.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Playoff Knockout Share Dialog */}
        <KnockoutShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          matches={matches || []}
          playersById={playersById}
          teamsById={teamsById}
          leagueTable={leagueTable}
          season={season}
        />
    </div>
  );
}
