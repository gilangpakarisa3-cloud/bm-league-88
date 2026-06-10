'use client';

import { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, Award, Zap, Loader2, ChevronRight, Binary, BarChart3, Scan, Percent, Star, Undo2, Flame, ShieldAlert, Target, Calendar as CalendarIcon, Clock, Save, Settings2, Shield, Activity, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const MatchCard = ({ bid, label, bracketData, projections, handleCardClick, teamsById }: { bid: string, label: string, bracketData: Record<string, any>, projections: Record<string, any> | null, handleCardClick: (matchData: any) => void, teamsById: Record<string, WithId<Team>> }) => {
  const m = bracketData[bid]; const p = projections?.[bid];
  
  if (!m && p) return (
      <div className="flex flex-col gap-1.5 items-center group/proj">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase">{label}</span>
            <Badge variant="outline" className="h-4 text-[7px] border-amber-500/50 text-amber-500 py-0 px-2 font-black uppercase italic bg-amber-500/10">PROYEKSI</Badge>
          </div>
          <Card className="w-44 sm:w-48 border-2 border-amber-500/20 border-dashed bg-black/40 backdrop-blur-xl cursor-pointer hover:border-amber-500/50 transition-all duration-500 rounded-xl relative overflow-hidden group-hover/proj:scale-105" onClick={() => handleCardClick({ ...p, player1Id: p.p1.playerId || p.p1.id || 'TBD', player2Id: p.p2.playerId || p.p2.id || 'TBD', id: `proj-${bid}`, isProjection: true, round: label, p1: { name: p.p1.playerName || p.p1.name || p.p1.teamName, playerId: p.p1.playerId || p.p1.id }, p2: { name: p.p2.playerName || p.p2.name || p.p2.teamName, playerId: p.p2.playerId || p.p2.id } })}>
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                  <div className="w-full h-1 bg-amber-500/10 blur-[1px] animate-scanning" />
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/40" />
              <CardContent className="p-0 flex flex-col divide-y divide-white/5 relative z-10 h-20">
                  {[p.p1, p.p2].map((player, idx) => {
                      const teamId = player.teamId || player.player1TeamId || '';
                      const team = teamId ? teamsById[teamId] : null;
                      const logoUrl = resolveLogo(team?.logoUrl, teamId || player.playerId || player.id, player.playerName || player.name || player.teamName);
                      return (
                        <div key={idx} className="flex items-center px-3 h-10 group-hover/proj:bg-amber-500/5 transition-colors">
                            <Avatar className="h-6 w-6 border border-white/10 opacity-60 mr-2 group-hover/proj:opacity-100 transition-opacity">
                                <AvatarImage key={logoUrl} src={logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                <AvatarFallback className="bg-black/40 font-black text-[8px]"><User className="w-2.5 h-2.5"/></AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-black truncate uppercase italic text-white/40 group-hover/proj:text-white/80 transition-colors pr-2" suppressHydrationWarning>{player.playerName || player.name || player.teamName || 'TBD'}</span>
                        </div>
                      );
                  })}
              </CardContent>
          </Card>
      </div>
  );

  if (!m) return (
      <div className="flex flex-col gap-1.5 opacity-30 items-center">
          <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">{label}</span>
          <div className="w-44 sm:w-48 h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1.5">
              <Loader2 className="w-4 h-4 text-white/10 animate-spin"/>
              <span className="text-[7px] font-black tracking-widest text-white/20 uppercase">CALIBRATING</span>
          </div>
      </div>
  );

  const isBattleReady = !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';

  return (
      <div className="flex flex-col gap-1.5 relative items-center group/match">
          <div className="flex items-center gap-2">
            <span className={cn("text-[8px] font-black tracking-widest uppercase", isBattleReady ? "text-primary" : "text-white/40")}>{label}</span>
            {isBattleReady && (
                <div className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                    </span>
                    <span className="text-[6px] font-black text-primary uppercase tracking-tighter">Live Signal</span>
                </div>
            )}
          </div>
          <Card className={cn(
              "w-44 sm:w-48 overflow-hidden border-2 transition-all duration-500 cursor-pointer hover:ring-4 hover:ring-primary/20 rounded-xl relative group-hover/match:scale-105", 
              m.isCompleted 
                ? "border-primary/30 bg-black/60 shadow-xl" 
                : isBattleReady
                    ? "animate-battle-glow border-primary/40 bg-primary/[0.03] shadow-2xl"
                    : "border-white/10 bg-black/40 border-dashed"
          )} onClick={() => handleCardClick(m)}>
              {isBattleReady && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                      <div className="w-full h-1 bg-primary/20 blur-[1px] animate-scanning" />
                  </div>
              )}
              <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                  m.isCompleted ? "bg-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" : "bg-white/5"
              )} />
              <CardContent className="p-0 flex flex-col divide-y divide-white/5 relative z-10 h-20">
                  {[1, 2].map(i => {
                      const isW = i === 1 ? m.isW1 : m.isW2; const p = i === 1 ? m.p1 : m.p2; const t = i === 1 ? m.t1 : m.t2; const s = i === 1 ? m.s1 : m.s2;
                      const logoUrl = resolveLogo(t?.logoUrl, m[`player${i}Id`], p.name);
                      return (
                          <div key={i} className={cn("flex items-center justify-between px-3 h-10 relative transition-colors", isW ? "bg-primary/15" : "bg-transparent")}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <Avatar className={cn("h-6 w-6 border-2 transition-all duration-500 shadow-sm", isW ? "border-primary scale-110" : "border-white/10")}>
                                      <AvatarImage key={logoUrl} src={logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                      <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-2.5 h-2.5"/></AvatarFallback>
                                  </Avatar>
                                  <span className={cn("text-[10px] font-black truncate uppercase italic transition-colors pr-2", isW ? "text-primary" : "text-white/80")} suppressHydrationWarning>{p.name}</span>
                              </div>
                              <div className={cn(
                                  "px-1.5 py-0.5 rounded border min-w-[24px] text-center transition-all",
                                  isW ? "bg-primary/20 border-primary/40" : "bg-white/5 border-white/5"
                              )}>
                                <span className={cn("text-xs font-black italic tabular-nums leading-none", isW ? "text-primary" : "text-white/40")} suppressHydrationWarning>{m.isCompleted ? s : '-'}</span>
                              </div>
                          </div>
                      )
                  })}
              </CardContent>
          </Card>
      </div>
  );
};

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season, isAdmin = false, defendingChampionId, onRevertMatch }: TournamentBracketProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
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
        const poss = (p.overallPlayed || 0) * 3;
        const act = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
        return { ...p, ovrRating: poss > 0 ? (act / poss) * 100 : 0 };
    });
    return [...withOvr].sort((a, b) => b.ovrRating - a.ovrRating || b.overallPlayed - a.overallPlayed).map((p, i) => ({ ...p, masterRank: i + 1 }));
  }, [playersById]);

  const getPlayerAnalysis = (playerId: string) => {
    if (!playerId || playerId === 'TBD' || playerId.includes('TBD') || playerId.includes('Loser')) return null;
    const playerMatches = matches.filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId)).sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());
    const entry = rankedTable.find(e => (e.playerId || e.id) === playerId);
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
    if (gA.length >= 6 && gB.length >= 6) {
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
        const e1 = rankedTable.find(e => (e.playerId || e.id) === m.player1Id); const e2 = rankedTable.find(e => (e.playerId || e.id) === m.player2Id);
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
        p1: analysis1?.chartData[i]?.points ?? (i >= len1 && len1 > 0 ? analysis1.chartData[len1-1].points : 0),
        p2: analysis2?.chartData[i]?.points ?? (i >= len2 && len2 > 0 ? analysis2.chartData[len2-1].points : 0)
    }));
  }, [analysis1, analysis2]);

  const editHour = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[0];
  const editMin = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[1];

  const isCoopHybrid = season?.type === 'Co-Op Hybrid';

  return (
    <div className="w-full relative">
        <div className="absolute top-0 left-0 pointer-events-none opacity-[0.03] flex flex-col items-start pt-4 pl-10"><span className="text-[4rem] sm:text-[6rem] font-black italic leading-none">BM LEAGUE</span><span className="text-[1.5rem] sm:text-[2rem] font-black italic -mt-4 tracking-[0.8em]">EIGHTY EIGHT</span></div>
        
        {(!matches || matches.filter(m => m.bracketId).length === 0) && rankedTable.length > 0 && (
            <div className="mb-6 px-4 sm:px-8"><div className="relative overflow-hidden bg-amber-500/[0.03] border-2 border-amber-500/20 rounded-xl p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" /><div className="flex items-start gap-4"><div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shadow-lg"><Scan className="w-5 h-5" /></div><div className="flex-1">
                    <div className="flex items-center gap-3 mb-1"><Badge className="bg-amber-500 text-black font-black uppercase italic text-[9px]">Live Simulation v2.4</Badge></div><p className="text-xs font-bold text-amber-200/90 leading-tight">Bagan ini adalah proyeksi dinamis berdasarkan peringkat grup saat ini. Jadwal final akan dikunci saat Admin memulai babak playoff.</p>
                </div></div>
            </div></div>
        )}

        <div ref={scrollRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} className="w-full overflow-x-auto pb-10 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-primary/20">
            <div className="min-w-[1400px] flex items-stretch gap-0 p-4 sm:p-6 animate-in fade-in duration-1000">
                <div className="basis-[65%] shrink-0 flex flex-col gap-4 sm:gap-8 relative pr-4 sm:pr-8">
                    <div className="flex-1 relative bg-primary/[0.02] border-2 border-primary/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 backdrop-blur-sm transition-all duration-700">
                        <div className="space-y-6 relative h-full flex flex-col justify-center">
                            <div className="flex items-center gap-3"><div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.8)]" /><div className="flex flex-col"><h3 className="text-lg sm:text-xl font-black tracking-widest text-primary uppercase italic">UPPER BRACKET</h3><span className="text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">Double Life Active</span></div></div>
                            <div className="flex items-center gap-4 sm:gap-8 pl-2 sm:pl-4">
                                {!isCoopHybrid && (
                                  <>
                                    <div className="flex flex-col gap-8 relative">
                                      <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                    </div>
                                    <div className="flex flex-col gap-28 py-12">
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-primary opacity-20"/></div>
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-primary opacity-20"/></div>
                                    </div>
                                  </>
                                )}
                                <div className="flex flex-col gap-28 py-12">
                                  <MatchCard bid="playoff-m9" label={isCoopHybrid ? "UB SEMI 1" : "UB SEMI 1"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                  <MatchCard bid="playoff-m10" label={isCoopHybrid ? "UB SEMI 2" : "UB SEMI 2"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                </div>
                                <div className="flex flex-col justify-center opacity-20"><ChevronRight className="w-4 h-4 text-primary"/></div>
                                <div className="flex flex-col justify-center"><MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-yellow-500/[0.02] border-2 border-yellow-500/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 backdrop-blur-sm transition-all duration-700">
                        <div className="space-y-6 relative h-full flex flex-col justify-center">
                            <div className="flex items-center gap-3"><div className="h-6 w-1 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)]" /><div className="flex flex-col"><h3 className="text-lg sm:text-xl font-black tracking-widest text-amber-500 uppercase italic">LOWER BRACKET</h3><span className="text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">Sudden Death Protocol</span></div></div>
                            <div className="flex items-center gap-4 pl-2 sm:pl-4">
                                {!isCoopHybrid && (
                                  <>
                                    <div className="flex flex-col gap-8">
                                      <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                    </div>
                                    <div className="flex flex-col gap-28 py-12">
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                    </div>
                                    <div className="flex flex-col gap-28 py-12">
                                      <MatchCard bid="playoff-m11" label="LB R2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                      <MatchCard bid="playoff-m12" label="LB R2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                    </div>
                                    <div className="flex flex-col gap-28 py-12">
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                      <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                    </div>
                                  </>
                                )}
                                <div className="flex flex-col gap-28 py-12">
                                  <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                  <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                </div>
                                <div className="flex flex-col justify-center opacity-20"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                <div className="flex flex-col justify-center gap-8">
                                  <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                  <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="basis-[35%] shrink-0 flex flex-col items-center justify-center gap-10 sm:gap-16 border-l-4 border-primary/20 bg-gradient-to-b from-primary/[0.05] via-background to-primary/[0.05] px-6 sm:px-16 rounded-r-[3rem] sm:rounded-r-[4rem] relative group/final overflow-hidden shadow-[inset_0_0_100px_rgba(204,253,1,0.05)]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.08] rounded-full blur-[120px] -translate-y-1/2 animate-pulse-soft" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/[0.08] rounded-full blur-[120px] translate-y-1/2 animate-pulse-soft" />
                    </div>
                    <div className="flex flex-col items-center gap-8 sm:gap-12 relative z-10">
                        <div className="relative group/trophy cursor-default">
                            <div className="absolute -inset-16 bg-yellow-400/10 rounded-full blur-3xl opacity-40 animate-pulse" />
                            <div className="relative p-12 sm:p-20 bg-gradient-to-br from-yellow-400/20 to-amber-600/5 rounded-full border-4 sm:border-8 border-yellow-400/60 shadow-[0_0_80px_rgba(250,204,21,0.3)] backdrop-blur-sm transition-transform duration-700 group-hover/trophy:scale-110">
                                <Trophy className="text-yellow-400 w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] drop-shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-float" />
                            </div>
                        </div>
                        <div className="text-center space-y-2 sm:space-y-4">
                            <h3 className="text-5xl sm:text-7xl font-black tracking-tighter text-white uppercase italic leading-none">Grand Final</h3>
                        </div>
                    </div>
                    <div className="scale-[1.5] sm:scale-[2.2] transform transition-all duration-1000 py-20 sm:py-32 relative z-10 hover:scale-[1.6] sm:hover:scale-[2.3]">
                        <div className="absolute -inset-10 bg-primary/10 rounded-3xl blur-3xl opacity-40 group-hover/final:opacity-40 transition-opacity" />
                        <MatchCard bid="playoff-m18" label="THE ULTIMATE BATTLE" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} />
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-4xl border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_150px_rgba(204,253,1,0.2)]">
                <ScrollArea className="max-h-[90vh]">
                    <div className="p-4 sm:p-10 space-y-6 sm:space-y-10 relative">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
                        <DialogHeader className="p-6 bg-primary text-black relative z-10 border-b-4 border-black/10 rounded-t-[1.5rem] sm:rounded-t-[2.2rem]">
                            <div className="flex items-center gap-4 justify-center sm:justify-start">
                                <div className="p-3 bg-black/10 rounded-2xl ring-2 ring-black/20 shadow-lg"><BarChart3 className="w-8 h-8" /></div>
                                <div className="text-center sm:text-left">
                                    <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic leading-none">HUD ANALISIS PERTANDINGAN</DialogTitle>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                                        <Badge className="bg-black text-primary border-none font-black tracking-widest text-[8px] px-3 h-5 shadow-lg uppercase">{selectedMatch?.round || 'Playoff Battle'}</Badge>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {!selectedMatch?.isProjection && (
                            <div className="relative z-10 space-y-6 animate-in slide-in-from-top-4 duration-700 px-2 sm:px-0">
                                <div className="max-w-2xl mx-auto bg-black/80 backdrop-blur-2xl border-y-4 border-primary/40 p-8 rounded-none relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Tanggal Pertandingan</Label>
                                            <Popover><PopoverTrigger asChild disabled={!isAdmin}><Button variant="outline" className="w-full h-14 bg-white/5 border-2 border-white/10 font-black text-sm uppercase rounded-none tracking-tighter transition-all px-4 text-center">{editDate ? format(editDate, "eeee, d MMM yyyy", { locale: localeId }) : "TBD"}</Button></PopoverTrigger>
                                            {isAdmin && <PopoverContent className="w-auto p-0 bg-background border-primary/30" align="center"><Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="rounded-none" /></PopoverContent>}</Popover>
                                        </div>
                                        <div className="flex flex-col items-center space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic flex items-center gap-2"><Clock className="w-3 h-3" /> Waktu Kick-Off (24H)</Label>
                                            <div className="flex items-center justify-center gap-3">
                                                <Select value={editHour} onValueChange={(val) => setEditTime(`${val}:${editMin}`)} disabled={!isAdmin}><SelectTrigger className="h-14 bg-white/5 border-2 border-white/10 focus:border-primary/50 font-black text-xl tabular-nums w-32 rounded-none text-center"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0A192F] border-primary/30">{Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}</SelectContent></Select>
                                                <span className="text-primary font-black text-2xl">:</span>
                                                <Select value={editMin} onValueChange={(val) => setEditTime(`${editHour}:${val}`)} disabled={!isAdmin}><SelectTrigger className="h-14 bg-white/5 border-2 border-white/10 focus:border-primary/50 font-black text-xl tabular-nums w-32 rounded-none text-center"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0A192F] border-primary/30">{Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}</SelectContent></Select>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="mt-10 flex flex-col items-center gap-4">
                                            <Button onClick={handleSaveManualSchedule} disabled={isUpdatingSchedule} className="h-14 px-12 font-black uppercase italic tracking-[0.2em] gap-3 shadow-[0_0_30px_rgba(204,253,1,0.2)] rounded-none">{isUpdatingSchedule ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SIMPAN KONFIGURASI JADWAL</Button>
                                            {selectedMatch?.isCompleted && onRevertMatch && <Button variant="outline" className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-black uppercase italic tracking-widest text-[9px] h-10 px-6 rounded-none transition-all gap-2" onClick={() => { onRevertMatch(selectedMatch); setSelectedMatch(null); }}><Undo2 className="w-3.5 h-3.5" /> RESET VALIDASI SKOR</Button>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_1fr] items-center relative z-10 px-2 sm:px-0">
                            <div className="flex flex-col items-center text-center gap-4 w-full">
                                {analysis1 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                                                <AvatarImage key={analysis1.logoUrl} src={analysis1.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-12 h-12 text-white/10"/></AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-xl bg-background border-2 border-primary text-primary font-black text-base z-20 rotate-12 shadow-xl" suppressHydrationWarning>{analysis1.entry?.rank || '?'}</div>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black uppercase italic text-white text-center w-full leading-none" suppressHydrationWarning>{selectedMatch?.p1?.name}</h3>
                                        <Badge variant="outline" className="border-primary/30 text-primary uppercase text-[8px] tracking-widest bg-primary/5">{analysis1.team?.name || 'Independent'}</Badge>
                                    </>
                                ) : <div className="flex flex-col items-center gap-4 opacity-10"><div className="h-24 w-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-12 h-12 text-white/20" /></div><h3 className="text-lg font-black uppercase italic text-center">SLOT TERSEDIA</h3></div>}
                            </div>
                            <div className="flex items-center justify-center py-10 sm:py-0 h-full relative"><div className="bg-[#0A192F] border-4 border-primary rounded-2xl w-16 h-16 flex items-center justify-center shadow-[0_0_40px_rgba(204,253,1,0.2)] z-10 rotate-45 group/vs"><span className="text-primary font-black text-2xl italic -rotate-45 pr-0.5 group-hover/vs:scale-110 transition-transform">VS</span></div></div>
                            <div className="flex flex-col items-center text-center gap-4 w-full">
                                {analysis2 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                                                <AvatarImage key={analysis2.logoUrl} src={analysis2.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-12 h-12 text-white/10"/></AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-xl bg-background border-2 border-white text-white font-black text-base z-20 rotate-12 shadow-xl" suppressHydrationWarning>{analysis2.entry?.rank || '?'}</div>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black uppercase italic text-white text-center w-full leading-none" suppressHydrationWarning>{selectedMatch?.p2?.name}</h3>
                                        <Badge variant="outline" className="border-white/20 text-white/60 uppercase text-[8px] tracking-widest bg-white/5">{analysis2.team?.name || 'Independent'}</Badge>
                                    </>
                                ) : <div className="flex flex-col items-center gap-4 opacity-10"><div className="h-24 w-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-12 h-12 text-white/20" /></div><h3 className="text-lg font-black uppercase italic text-center">SLOT TERSEDIA</h3></div>}
                            </div>
                        </div>

                        {analysis1 && analysis2 && (
                            <div className="space-y-10 relative z-10 animate-in fade-in duration-1000 delay-300">
                                <div className="bg-black/40 border-2 border-white/5 rounded-[2rem] p-8 space-y-8 relative overflow-hidden group/stats">
                                     <div className="flex flex-col items-center gap-2 mb-4">
                                         <h3 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase italic flex items-center gap-3"><Zap className="w-3.5 h-3.5 text-primary" /> Probability Matrix</h3>
                                         <div className="flex items-center gap-6 w-full max-w-sm">
                                             <span className="text-2xl font-black text-primary italic tabular-nums" suppressHydrationWarning>{analysis1.winRate.toFixed(0)}%</span>
                                             <div className="h-3 flex-1 bg-white/5 rounded-full overflow-hidden flex border border-white/10">
                                                 <div className="h-full bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" style={{ width: `${analysis1.winRate}%` }} />
                                                 <div className="h-full bg-white/20" style={{ width: `${analysis2.winRate}%` }} />
                                             </div>
                                             <span className="text-2xl font-black text-white/40 italic tabular-nums" suppressHydrationWarning>{analysis2.winRate.toFixed(0)}%</span>
                                         </div>
                                     </div>

                                     <div className="space-y-5">
                                         {[
                                             { label: 'MATCH LOGS', v1: analysis1.stats.played, v2: analysis2.stats.played },
                                             { label: 'TOTAL VICTORIES', v1: analysis1.stats.win, v2: analysis2.stats.win, color: 'text-green-400' },
                                             { label: 'UNIT GOALS', v1: analysis1.stats.gf, v2: analysis2.stats.gf, color: 'text-primary' },
                                             { label: 'MASTER OVR', v1: analysis1.masterInfo?.ovrRating.toFixed(0) || '0', v2: analysis2.masterInfo?.ovrRating.toFixed(0) || '0', color: 'text-yellow-500' }
                                         ].map((stat, i) => (
                                             <div key={i} className="space-y-1.5">
                                                 <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/20">
                                                     <span suppressHydrationWarning>{stat.v1} Units</span>
                                                     <span className="text-white/40 italic">{stat.label}</span>
                                                     <span suppressHydrationWarning>{stat.v2} Units</span>
                                                 </div>
                                                 <div className="flex items-center gap-2 h-1.5 w-full">
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden flex justify-end">
                                                         <div className={cn("h-full transition-all duration-1000", stat.color ? stat.color.replace('text-', 'bg-') : "bg-primary/40")} style={{ width: `${(Number(stat.v1) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%` }} />
                                                     </div>
                                                     <div className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden">
                                                         <div className={cn("h-full transition-all duration-1000", stat.color ? stat.color.replace('text-', 'bg-') : "bg-white/20")} style={{ width: `${(Number(stat.v2) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%` }} />
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <Card className="bg-black/60 border-2 border-primary/20 rounded-2xl p-6 relative overflow-hidden group/p1">
                                         <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(204,253,1,0.5)]" />
                                         <div className="flex flex-col gap-4 relative z-10">
                                             <div className="flex justify-between items-start">
                                                 <div className="flex flex-col"><span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary/60 italic mb-1">Play Style</span><h4 className="text-lg font-black uppercase italic text-white pr-2">{analysis1.playStyleText}</h4></div>
                                                 <div className="flex gap-1">{analysis1.form.map((f, i) => (<div key={i} className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black", f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50")}>{f}</div>))}</div>
                                             </div>
                                             <p className="text-[10px] font-bold text-white/40 leading-relaxed italic" suppressHydrationWarning>"{analysis1.playStyleDescription}"</p>
                                         </div>
                                     </Card>
                                     <Card className="bg-black/60 border-2 border-white/10 rounded-2xl p-6 relative overflow-hidden group/p2">
                                         <div className="absolute right-0 top-0 w-1 h-full bg-white/20" />
                                         <div className="flex flex-col gap-4 relative z-10 text-right">
                                             <div className="flex justify-between items-start flex-row-reverse">
                                                 <div className="flex flex-col"><span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 italic mb-1">Tactical DNA</span><h4 className="text-lg font-black uppercase italic text-white pr-2">{analysis2.playStyleText}</h4></div>
                                                 <div className="flex gap-1">{analysis2.form.map((f, i) => (<div key={i} className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black", f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50")}>{f}</div>))}</div>
                                             </div>
                                             <p className="text-[10px] font-bold text-white/40 leading-relaxed italic" suppressHydrationWarning>"{analysis2.playStyleDescription}"</p>
                                         </div>
                                     </Card>
                                </div>
                            </div>
                        )}
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center relative overflow-hidden"><p className="text-[9px] font-bold text-primary/60 italic leading-relaxed uppercase tracking-tighter">Data di atas disinkronisasi secara real-time berdasarkan performa di seluruh fase kompetisi.</p></div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}
