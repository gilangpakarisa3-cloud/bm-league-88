'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, Award, Zap, Loader2, ChevronRight, Binary, BarChart3, Scan, Percent, Star, Undo2, Flame, ShieldAlert, Target, Calendar as CalendarIcon, Clock, Save, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { useTranslation } from '@/hooks/use-translation';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const IntelCard = ({ icon: Icon, label, value, variant = "default" }: { icon: any, label: string, value: string | number, variant?: "default" | "primary" | "gold" }) => (
  <div className={cn("flex flex-col items-center text-center gap-1.5 p-3 rounded-xl border transition-all duration-300", variant === "primary" ? "bg-primary/10 border-primary/20" : variant === "gold" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-white/5 border-white/10")}>
      <div className="flex items-center justify-center gap-1.5"><Icon className={cn("w-3 h-3", variant === "primary" ? "text-primary" : variant === "gold" ? "text-yellow-500" : "text-white/60")} /><span className="text-[8px] font-black uppercase tracking-widest text-white/60">{label}</span></div>
      <span className={cn("font-black text-sm uppercase italic leading-none", variant === "primary" ? "text-primary" : variant === "gold" ? "text-yellow-500" : "text-white")} suppressHydrationWarning>{value}</span>
  </div>
);

const MatchCard = ({ bid, label, bracketData, projections, handleCardClick }: { bid: string, label: string, bracketData: Record<string, any>, projections: Record<string, any> | null, handleCardClick: (matchData: any) => void }) => {
  const m = bracketData[bid]; const p = projections?.[bid];
  
  if (!m && p) return (
      <div className="flex flex-col gap-1 opacity-70 items-center">
          <div className="flex items-center gap-2"><span className="text-[8px] font-black tracking-widest text-primary/60 uppercase">{label}</span><Badge variant="outline" className="h-3.5 text-[7px] border-amber-500/30 text-amber-500 py-0 px-1 font-black uppercase italic">Proyeksi</Badge></div>
          <Card className="w-44 sm:w-48 border-2 border-white/10 border-dashed bg-white/[0.03] cursor-pointer hover:border-primary/40 rounded-xl" onClick={() => handleCardClick({ ...p, player1Id: p.p1.playerId || 'TBD', player2Id: p.p2.playerId || 'TBD', id: `proj-${bid}`, isProjection: true, round: label, p1: { name: p.p1.playerName || p.p1.name, playerId: p.p1.playerId }, p2: { name: p.p2.playerName || p.p2.name, playerId: p.p2.playerId } })}>
              <CardContent className="p-0 flex flex-col divide-y divide-white/5 relative h-20">
                  <div className="flex items-center px-3 h-10"><Avatar className="h-6 w-6 border border-white/10 opacity-40 mr-2"><AvatarFallback><User className="w-2.5 h-2.5"/></AvatarFallback></Avatar><span className="text-[10px] font-black truncate uppercase italic pr-4 text-white/40" suppressHydrationWarning>{p.p1.playerName || p.p1.name || 'TBD'}</span></div>
                  <div className="flex items-center px-3 h-10"><Avatar className="h-6 w-6 border border-white/10 opacity-40 mr-2"><AvatarFallback><User className="w-2.5 h-2.5"/></AvatarFallback></Avatar><span className="text-[10px] font-black truncate uppercase italic pr-4 text-white/40" suppressHydrationWarning>{p.p2.playerName || p.p2.name || 'TBD'}</span></div>
              </CardContent>
          </Card>
      </div>
  );

  if (!m) return (
      <div className="flex flex-col gap-1 opacity-30 items-center">
          <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">{label}</span>
          <div className="w-44 sm:w-48 h-20 bg-white/5 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-1.5"><Loader2 className="w-4 h-4 text-white/10 animate-spin"/><span className="text-[7px] font-black tracking-widest text-white/20 uppercase">KALIBRASI</span></div>
      </div>
  );

  const isBattleReady = !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';

  return (
      <div className="flex flex-col gap-1 relative items-center">
          <div className="flex items-center gap-2">
            <span className={cn("text-[8px] font-black tracking-widest uppercase", isBattleReady ? "text-primary" : "text-primary/80")}>{label}</span>
            {isBattleReady && (
                <div className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                    </span>
                    <span className="text-[6px] font-black text-primary uppercase tracking-tighter">Live</span>
                </div>
            )}
          </div>
          <Card className={cn(
              "w-44 sm:w-48 overflow-hidden border-2 transition-all duration-500 cursor-pointer hover:ring-4 hover:ring-primary/20 rounded-xl relative", 
              m.isCompleted 
                ? "border-primary/30 bg-white/5" 
                : isBattleReady
                    ? "animate-battle-glow border-primary/40 bg-primary/[0.03]"
                    : "border-white/20 bg-white/5 border-dashed"
          )} onClick={() => handleCardClick(m)}>
              {isBattleReady && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                      <div className="w-full h-1 bg-primary/20 blur-[2px] animate-scanning" />
                  </div>
              )}
              
              <CardContent className="p-0 flex flex-col divide-y divide-white/5 relative z-10">
                  {[1, 2].map(i => {
                      const isW = i === 1 ? m.isW1 : m.isW2; const p = i === 1 ? m.p1 : m.p2; const t = i === 1 ? m.t1 : m.t2; const s = i === 1 ? m.s1 : m.s2;
                      return (
                          <div key={i} className={cn("flex items-center justify-between px-3 h-10 relative", isW ? "bg-primary/15" : "bg-transparent")}>
                              {isW && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" />}
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <Avatar className={cn("h-6 w-6 border-2 transition-all", isW ? "border-primary scale-110" : "border-white/10")}><AvatarImage src={t?.logoUrl} /><AvatarFallback><User className="w-2.5 h-2.5"/></AvatarFallback></Avatar>
                                  <span className={cn("text-[10px] font-black truncate uppercase italic transition-colors pr-4", isW ? "text-primary" : "text-white/80")} suppressHydrationWarning>{p.name}</span>
                              </div>
                              <div className={cn("px-1.5 py-0.5 rounded bg-white/5 border border-white/5 min-w-[20px] text-center", isW && "border-primary/30")}><span className={cn("text-xs font-black italic tabular-nums leading-none", isW ? "text-primary" : "text-white/40")} suppressHydrationWarning>{m.isCompleted ? s : '-'}</span></div>
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

  const chartConfig = { points: { label: "Tren", color: "hsl(var(--primary))" } } satisfies ChartConfig;

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
        await updateDoc(matchRef, {
            matchDate: Timestamp.fromDate(newDate)
        });
        toast({ title: "Jadwal Diperbarui", description: "Waktu pertandingan telah berhasil disinkronisasi." });
    } catch (error: any) {
        const permissionError = new FirestorePermissionError({
            path: matchRef.path,
            operation: 'update',
            requestResourceData: { matchDate: Timestamp.fromDate(newDate) }
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdatingSchedule(false);
    }
  };

  const rankedTable = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return [];
    const sortFn = (a: any, b: any) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.playerName.localeCompare(b.playerName);
    if (season?.type === 'Hybrid') {
      const gA = [...leagueTable].filter(p => p.group === 'A').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gB = [...leagueTable].filter(p => p.group === 'B').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      return [...gA, ...gB];
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
    const entry = rankedTable.find(e => e.playerId === playerId);
    const team = entry?.teamId ? teamsById[entry.teamId] : (playersById[playerId]?.teamId ? teamsById[playersById[playerId].teamId] : null);
    const masterInfo = masterPlayersRanked.find(p => p.id === playerId);
    const stats = playerMatches.reduce((acc, m) => {
      acc.played++; const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
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
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = isP1 ? s2 : s1;
      if (pR > oR) return 'W';
      if (pR < oR) return 'L';
      return 'D';
    });
    let cum = 0; const chartData = [{ match: 0, points: 0 }, ...playerMatches.map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = isP1 ? s2 : s1;
      cum += (pR > oR ? 1 : (pR < oR ? -1 : 0)); return { match: i + 1, points: cum };
    })];
    
    let pST = "Balance"; 
    let pSType: 'attacking' | 'defensive' | 'balanced' = 'balanced'; 
    let pSD = t('play_style_balanced_desc');
    
    if (stats.played > 0) {
        const avgGF = stats.gf / stats.played; const avgGA = stats.ga / stats.played;
        if (avgGF > 1.6) { pST = "Attacking"; pSType = 'attacking'; pSD = t('play_style_attacking_desc'); }
        else if (avgGA < 1.2 && stats.played >= 3) { pST = "Defense & Counter"; pSType = 'defensive'; pSD = t('play_style_defensive_desc'); }
    }
    
    let q = "Stabil"; let qC = "text-white/60"; const rWC = form.filter(f => f === 'W').length;
    if (rWC === 5) { q = "Tak terkalahkan"; qC = "text-green-400"; } else if (rWC >= 3) { q = "Performa bagus"; qC = "text-green-400"; } else if (form.filter(f => f === 'L').length >= 3) { q = "Performa menurun"; qC = "text-red-400"; }
    return { stats, winRate, form, chartData, playStyleText: pST, playStyleType: pSType, playStyleDescription: pSD, quote: q, quoteColor: qC, team, entry, masterInfo, isDefendingChampion: playerId === defendingChampionId };
  };

  const projections = useMemo(() => {
    if (!rankedTable || rankedTable.length === 0) return null;
    const sR = (data: any[]) => [...data].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    const gA = sR(rankedTable.filter(p => p.group === 'A')); const gB = sR(rankedTable.filter(p => p.group === 'B'));
    const proj: Record<string, any> = {};
    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3] }; proj['playoff-m2'] = { p1: gB[1], p2: gA[2] };
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3] }; proj['playoff-m4'] = { p1: gA[1], p2: gB[2] };
    }
    if (gA.length >= 6 && gB.length >= 6) {
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser UB-QF 1', playerId: 'TBD-L1' } };
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser UB-QF 2', playerId: 'TBD-L2' } };
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser UB-QF 3', playerId: 'TBD-L3' } };
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser UB-QF 4', playerId: 'TBD-L4' } };
    }
    return proj;
  }, [rankedTable]);

  const bracketData = useMemo(() => {
    const d: Record<string, any> = {};
    matches.forEach(m => {
      if (m.bracketId) {
        const e1 = rankedTable.find(e => e.playerId === m.player1Id); const e2 = rankedTable.find(e => e.playerId === m.player2Id);
        const t1 = e1 ? teamsById[e1.teamId] : (playersById[m.player1Id]?.teamId ? teamsById[playersById[m.player1Id].teamId] : null);
        const t2 = e2 ? teamsById[e2.teamId] : (playersById[m.player2Id]?.teamId ? teamsById[playersById[m.player2Id].teamId] : null);
        const s1 = m.player1Wins ?? m.player1Score ?? 0; const s2 = m.player2Wins ?? m.player2Score ?? 0;
        d[m.bracketId] = { ...m, p1: e1 ? { name: e1.playerName, playerId: e1.playerId } : (playersById[m.player1Id] || { name: m.player1Id, playerId: m.player1Id }), p2: e2 ? { name: e2.playerName, playerId: e2.playerId } : (playersById[m.player2Id] || { name: m.player2Id, playerId: m.player2Id }), t1, t2, s1, s2, isW1: m.isCompleted && s1 > s2, isW2: m.isCompleted && s2 > s1 };
      }
    });
    return d;
  }, [matches, playersById, teamsById, rankedTable]);

  const analysis1 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player1Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t]);
  const analysis2 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player2Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t]);
  
  const sCD = useMemo(() => {
    const dD = [-5, 5]; if (!analysis1 && !analysis2) return dD;
    const aP = [...(analysis1?.chartData.map(d=>d.points) || []), ...(analysis2?.chartData.map(d=>d.points) || [])];
    if (aP.length === 0) return dD; const mV = Math.max(...aP.map(Math.abs), 5); return [-mV, mV];
  }, [analysis1, analysis2]);

  const editHour = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[0];
  const editMin = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[1];

  return (
    <div className="w-full relative">
        <div className="absolute top-0 left-0 pointer-events-none opacity-[0.03] flex flex-col items-start pt-4 pl-10"><span className="text-[4rem] sm:text-[6rem] font-black italic leading-none pr-4">BM LEAGUE</span><span className="text-[1.5rem] sm:text-[2rem] font-black italic -mt-4 tracking-[0.8em] pr-4">EIGHTY EIGHT</span></div>
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
                            <div className="flex items-center gap-3"><div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.8)]" /><div className="flex flex-col"><h3 className="text-lg sm:text-xl font-black tracking-widest text-primary uppercase italic pr-4">UPPER BRACKET</h3><span className="text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">Double Life Active</span></div></div>
                            <div className="flex items-center gap-4 sm:gap-8 pl-2 sm:pl-4">
                                <div className="flex flex-col gap-8 relative">
                                  <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-primary opacity-20"/></div>
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-primary opacity-20"/></div>
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <MatchCard bid="playoff-m9" label="UB SEMI 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m10" label="UB SEMI 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                                <div className="flex flex-col justify-center opacity-20"><ChevronRight className="w-4 h-4 text-primary"/></div>
                                <div className="flex flex-col justify-center"><MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative bg-yellow-500/[0.02] border-2 border-yellow-500/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 backdrop-blur-sm transition-all duration-700">
                        <div className="space-y-6 relative h-full flex flex-col justify-center">
                            <div className="flex items-center gap-3"><div className="h-6 w-1 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)]" /><div className="flex flex-col"><h3 className="text-lg sm:text-xl font-black tracking-widest text-amber-500 uppercase italic pr-4">LOWER BRACKET</h3><span className="text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">Sudden Death Protocol</span></div></div>
                            <div className="flex items-center gap-4 pl-2 sm:pl-4">
                                <div className="flex flex-col gap-8">
                                  <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <MatchCard bid="playoff-m11" label="LB R2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m12" label="LB R2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                  <div className="h-[96px] flex items-center justify-center"><ChevronRight className="w-3 h-3 text-amber-500 opacity-20"/></div>
                                </div>
                                <div className="flex flex-col gap-28 py-12">
                                  <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                                <div className="flex flex-col justify-center opacity-20"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                <div className="flex flex-col justify-center gap-8">
                                  <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                  <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* GRAND FINAL SECTION */}
                <div className="basis-[35%] shrink-0 flex flex-col items-center justify-center gap-10 sm:gap-16 border-l-4 border-primary/20 bg-gradient-to-b from-primary/[0.05] via-background to-primary/[0.05] px-6 sm:px-16 rounded-r-[3rem] sm:rounded-r-[4rem] relative group/final overflow-hidden shadow-[inset_0_0_100px_rgba(204,253,1,0.05)]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.08] rounded-full blur-[120px] -translate-y-1/2 animate-pulse-soft" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/[0.08] rounded-full blur-[120px] translate-y-1/2 animate-pulse-soft" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                    </div>
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary/40 rounded-tr-2xl pointer-events-none" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary/40 rounded-br-2xl pointer-events-none" />
                    <div className="flex flex-col items-center gap-8 sm:gap-12 relative z-10">
                        <div className="relative group/trophy cursor-default">
                            <div className="absolute -inset-16 bg-yellow-400/10 rounded-full blur-3xl opacity-40 animate-pulse" />
                            <div className="absolute -inset-1 w-[300px] h-[300px] border-4 border-dashed border-yellow-400/20 rounded-full animate-spin-slow pointer-events-none" />
                            <div className="relative p-12 sm:p-20 bg-gradient-to-br from-yellow-400/20 to-amber-600/5 rounded-full border-4 sm:border-8 border-yellow-400/60 shadow-[0_0_80px_rgba(250,204,21,0.3)] backdrop-blur-sm transition-transform duration-700 group-hover/trophy:scale-110">
                                <svg 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="1" 
                                  className="text-yellow-400 w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] drop-shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-in zoom-in duration-1000 animate-float"
                                >
                                  <circle cx="12" cy="12" r="11.5" strokeWidth="0.2" strokeOpacity="0.1" />
                                  <circle cx="12" cy="12" r="10.2" strokeWidth="1.2" />
                                  <circle cx="12" cy="12" r="8.5" strokeWidth="0.4" strokeOpacity="0.3" />
                                  
                                  <path d="M12 2v20M2 12h20" strokeWidth="0.1" strokeOpacity="0.2" />
                                  <path d="M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" strokeWidth="0.1" strokeOpacity="0.1" />

                                  <path d="M12 2.5l3.5 6h-7z" fill="currentColor" fillOpacity="0.3" strokeWidth="1.2" />
                                  
                                  <circle cx="18.5" cy="12" r="2.5" strokeWidth="1.8" />
                                  
                                  <path d="M9.5 16.5l5 5M14.5 16.5l-5 5" strokeWidth="1.8" />
                                  
                                  <rect x="3" y="9.5" width="5" height="5" strokeWidth="1.8" />
                                  
                                  <circle cx="12" cy="12" r="5" strokeWidth="0.3" strokeDasharray="1 1" strokeOpacity="0.4" />
                                </svg>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-yellow-400 px-3 py-0.5 rounded text-[8px] font-black text-black uppercase tracking-widest">APEX UNIT</div>
                            </div>
                        </div>
                        <div className="text-center space-y-2 sm:space-y-4">
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
                                <h3 className="text-5xl sm:text-7xl font-black tracking-tighter text-white uppercase italic pr-4 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] leading-none">Grand Final</h3>
                                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[10px] font-black text-primary tracking-[0.1em] uppercase opacity-90 italic">Sang Penyandang Gelar KING, Raja dari segala Raja</p>
                                <div className="flex gap-1.5 mt-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                    <div className="w-2 h-2 bg-primary/40 rounded-full" />
                                    <div className="w-2 h-2 bg-primary/20 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="scale-[1.5] sm:scale-[2.2] transform transition-all duration-1000 py-20 sm:py-32 relative z-10 hover:scale-[1.6] sm:hover:scale-[2.3]">
                        <div className="absolute -inset-10 bg-primary/10 rounded-3xl blur-3xl opacity-0 group-hover/final:opacity-40 transition-opacity" />
                        <MatchCard bid="playoff-m18" label="THE ULTIMATE BATTLE" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} />
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full flex justify-between px-2 pointer-events-none opacity-40">
                            <div className="flex flex-col items-start"><span className="text-[6px] font-black text-white/40 uppercase">Match Stakes</span><span className="text-[8px] font-bold text-primary italic uppercase">Absolute Glory</span></div>
                            <div className="flex flex-col items-end"><span className="text-[6px] font-black text-white/40 uppercase">System Integrity</span><span className="text-[8px] font-bold text-primary italic uppercase">100.0%</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-4xl border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-xl rounded-[2rem] shadow-[0_0_150px_rgba(204,253,1,0.2)]">
                <ScrollArea className="max-h-[90vh]">
                    <div className="p-4 sm:p-10 space-y-6 sm:space-y-10 relative">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
                        <DialogHeader className="border-b border-white/10 pb-6 relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-4 text-primary">
                                    <div className="p-3 bg-primary/10 rounded-2xl ring-2 ring-primary/20 shadow-lg"><BarChart3 className="w-8 h-8" /></div>
                                    <div><DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic leading-none pr-4">HUD Analisis Pertandingan</DialogTitle>
                                    <div className="flex items-center gap-2 mt-2"><Badge className="bg-primary/20 text-primary border-primary/30 font-black tracking-widest text-[8px] uppercase">{selectedMatch?.round || 'Playoff'}</Badge><span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Tactical HUD System v4.0.1</span></div></div>
                                </div>
                                <div className="flex gap-4 items-center bg-white/10 px-4 py-2 rounded-xl border border-white/10 self-center sm:self-auto">
                                    {analysis1?.entry && <div className="flex flex-col items-center"><span className="text-[7px] font-black text-primary/60 uppercase mb-1">Grup {analysis1.entry.group || 'A'}</span><span className="text-sm font-black text-primary italic" suppressHydrationWarning>{analysis1.entry.points} PTS</span></div>}
                                    <div className="w-px h-6 bg-white/10" />
                                    {analysis2?.entry && <div className="flex flex-col items-center"><span className="text-[7px] font-black text-white/60 uppercase mb-1">Grup {analysis2.entry.group || 'B'}</span><span className="text-sm font-black text-white italic" suppressHydrationWarning>{analysis2.entry.points} PTS</span></div>}
                                </div>
                            </div>
                        </DialogHeader>

                        {!selectedMatch?.isProjection && (
                            <div className="relative z-10 space-y-6 animate-in slide-in-from-top-4 duration-700">
                                <div className="flex items-center justify-center gap-4 text-primary">
                                    <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="w-5 h-5" />
                                        <h4 className="text-sm font-black tracking-widest uppercase italic pr-4">Informasi Jadwal Laga</h4>
                                    </div>
                                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                                </div>

                                <div className="max-w-2xl mx-auto bg-black/60 border-y-4 border-primary/40 p-8 rounded-none relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 left-0 w-2 h-2 bg-primary" />
                                    <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary" />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic flex items-center gap-2">
                                                <CalendarIcon className="w-3 h-3" /> Tanggal Pertandingan
                                            </Label>
                                            <div className="w-full max-w-[320px]">
                                                <Popover>
                                                    <PopoverTrigger asChild disabled={!isAdmin}>
                                                        <Button variant="outline" className={cn(
                                                            "w-full h-14 bg-white/5 border-2 border-white/10 font-black text-sm sm:text-base uppercase rounded-none tracking-tighter transition-all px-4 text-center",
                                                            isAdmin ? "hover:border-primary/50 cursor-pointer" : "cursor-default opacity-100 border-primary/20"
                                                        )}>
                                                            {editDate ? format(editDate, "eeee, d MMM yyyy", { locale: localeId }) : "TBD"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    {isAdmin && (
                                                        <PopoverContent className="w-auto p-0 bg-background border-primary/30" align="center">
                                                            <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="rounded-none" />
                                                        </PopoverContent>
                                                    )}
                                                </Popover>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic flex items-center gap-2">
                                                <Clock className="w-3 h-3" /> Waktu Kick-Off (24H)
                                            </Label>
                                            <div className="flex items-center justify-center gap-3">
                                                <Select value={editHour} onValueChange={(val) => setEditTime(`${val}:${editMin}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className={cn(
                                                        "h-14 bg-white/5 border-2 border-white/10 focus:border-primary/50 font-black text-xl tabular-nums w-32 px-4 rounded-none overflow-visible text-center [&>span]:text-center [&>span]:flex-1 not-italic",
                                                        !isAdmin && "border-primary/20 opacity-100"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#0A192F] border-primary/30">
                                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                                                            <SelectItem key={v} value={v} className="font-black">{v}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="text-primary font-black text-2xl">:</span>
                                                <Select value={editMin} onValueChange={(val) => setEditTime(`${editHour}:${val}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className={cn(
                                                        "h-14 bg-white/5 border-2 border-white/10 focus:border-primary/50 font-black text-xl tabular-nums w-32 px-4 rounded-none overflow-visible text-center [&>span]:text-center [&>span]:flex-1 not-italic",
                                                        !isAdmin && "border-primary/20 opacity-100"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#0A192F] border-primary/30">
                                                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                                                            <SelectItem key={v} value={v} className="font-black">{v}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="mt-10 flex flex-col items-center gap-4">
                                            <Button 
                                                onClick={handleSaveManualSchedule} 
                                                disabled={isUpdatingSchedule}
                                                className="h-14 px-12 font-black uppercase italic tracking-[0.2em] gap-3 shadow-[0_0_30px_rgba(204,253,1,0.2)] rounded-none"
                                            >
                                                {isUpdatingSchedule ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                SIMPAN KONFIGURASI JADWAL
                                            </Button>
                                            
                                            {selectedMatch?.isCompleted && onRevertMatch && (
                                                <Button 
                                                    variant="outline" 
                                                    className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-black uppercase italic tracking-widest text-[9px] h-10 px-6 rounded-none transition-all gap-2"
                                                    onClick={() => {
                                                        onRevertMatch(selectedMatch);
                                                        setSelectedMatch(null);
                                                    }}
                                                >
                                                    <Undo2 className="w-3.5 h-3.5" />
                                                    RESET VALIDASI SKOR
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_1fr] items-center relative z-10">
                            <div className="flex flex-col items-center text-center gap-4 group w-full">
                                {analysis1 ? (
                                    <>
                                        <div className="relative">
                                            <div className={cn("absolute -inset-4 rounded-full blur-2xl opacity-20", analysis1.playStyleType === 'attacking' ? "bg-red-500" : analysis1.playStyleType === 'defensive' ? "bg-blue-500" : "bg-primary")} />
                                            {selectedMatch?.isCompleted && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[120px] font-black italic text-white/[0.05] pointer-events-none -z-0 select-none">
                                                    {selectedMatch.s1}
                                                </span>
                                            )}
                                            {analysis1.entry?.group && (
                                                <div className="absolute -top-1 -left-1 z-20">
                                                    <Badge className="bg-primary text-black border-2 border-background font-black text-[9px] px-1.5 h-6 italic shadow-lg uppercase">GRUP {analysis1.entry.group}</Badge>
                                                </div>
                                            )}
                                            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                                                <AvatarImage src={analysis1.team?.logoUrl} /><AvatarFallback><User className="w-12 h-12 text-white/10"/></AvatarFallback>
                                            </Avatar>
                                            {analysis1.isDefendingChampion && (
                                                <div className="absolute -top-1 -right-1 z-20">
                                                    <Badge className="bg-amber-500 text-white border-2 border-background p-1 rounded-lg shadow-lg"><Award className="w-3 h-3"/></Badge>
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-background border-2 border-primary text-primary font-black text-sm z-20 rotate-12 shadow-xl" suppressHydrationWarning>{analysis1.entry?.rank || '?'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black uppercase italic text-white pr-4" suppressHydrationWarning>{selectedMatch?.p1?.name}</h3>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest" suppressHydrationWarning>{analysis1.team?.name || 'Independent'}</span>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Badge className={cn("text-xs font-black uppercase tracking-tighter px-5 py-2 border-2 cursor-help shadow-lg animate-in fade-in zoom-in duration-500", 
                                                            analysis1.playStyleType === 'attacking' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                                            analysis1.playStyleType === 'defensive' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                                                            "bg-primary/20 text-primary border-primary/30")}>
                                                            {analysis1.playStyleText}
                                                        </Badge>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-64 text-center bg-background/95 border-primary/30 backdrop-blur-xl"><p className="text-[10px] font-bold leading-relaxed text-white">{analysis1.playStyleDescription}</p></PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 opacity-10"><div className="h-24 w-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-12 h-12 text-white/20" /></div><h3 className="text-lg font-black uppercase italic pr-4">SLOT TERSEDIA</h3></div>
                                )}
                            </div>

                            <div className="flex items-center justify-center py-8 sm:py-0 h-full relative">
                                <div className="bg-primary border-4 border-background rounded-xl w-14 h-14 flex items-center justify-center shadow-2xl z-10 rotate-45">
                                    <span className="text-black font-black text-xl italic -rotate-45 pr-0.5">VS</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 group w-full">
                                {analysis2 ? (
                                    <>
                                        <div className="relative">
                                            <div className={cn("absolute -inset-4 rounded-full blur-2xl opacity-20", analysis2.playStyleType === 'attacking' ? "bg-red-500" : analysis2.playStyleType === 'defensive' ? "bg-blue-500" : "bg-white")} />
                                            {selectedMatch?.isCompleted && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[120px] font-black italic text-white/[0.05] pointer-events-none -z-0 select-none">
                                                    {selectedMatch.s2}
                                                </span>
                                            )}
                                            {analysis2.entry?.group && (
                                                <div className="absolute -top-1 -left-1 z-20">
                                                    <Badge className="bg-primary text-black border-2 border-background font-black text-[9px] px-1.5 h-6 italic shadow-lg uppercase">GRUP {analysis2.entry.group}</Badge>
                                                </div>
                                            )}
                                            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                                                <AvatarImage src={analysis2.team?.logoUrl} /><AvatarFallback><User className="w-12 h-12 text-white/10"/></AvatarFallback>
                                            </Avatar>
                                            {analysis2.isDefendingChampion && (
                                                <div className="absolute -top-1 -right-1 z-20">
                                                    <Badge className="bg-amber-500 text-white border-2 border-background p-1 rounded-lg shadow-lg"><Award className="w-3 h-3"/></Badge>
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-background border-2 border-primary text-primary font-black text-sm z-20 rotate-12 shadow-xl" suppressHydrationWarning>{analysis2.entry?.rank || '?'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black uppercase italic text-white pr-4" suppressHydrationWarning>{selectedMatch?.p2?.name}</h3>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest" suppressHydrationWarning>{analysis2.team?.name || 'Independent'}</span>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Badge className={cn("text-xs font-black uppercase tracking-tighter px-5 py-2 border-2 cursor-help shadow-lg animate-in fade-in zoom-in duration-500", 
                                                            analysis2.playStyleType === 'attacking' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                                            analysis2.playStyleType === 'defensive' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                                                            "bg-primary/20 text-primary border-primary/30")}>
                                                            {analysis2.playStyleText}
                                                        </Badge>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-64 text-center bg-background/95 border-primary/30 backdrop-blur-xl"><p className="text-[10px] font-bold leading-relaxed text-white">{analysis2.playStyleDescription}</p></PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 opacity-10"><div className="h-24 w-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-12 h-12 text-white/20" /></div><h3 className="text-lg font-black uppercase italic pr-4">SLOT TERSEDIA</h3></div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center justify-center gap-4 text-primary">
                                <div className="h-0.5 flex-1 bg-gradient-to-l from-primary/40 to-transparent rounded-full mr-4" />
                                <div className="flex items-center gap-2">
                                    <Binary className="w-5 h-5" />
                                    <h4 className="text-lg font-black tracking-widest uppercase italic pr-4">Statistik Momentum</h4>
                                </div>
                                <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent rounded-full ml-4" />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[analysis1, analysis2].map((an, i) => (
                                    <div key={i} className="flex-1 w-full space-y-4">
                                        {an && an.stats.played > 0 ? (
                                            <Card className="bg-white/[0.03] border border-white/5 rounded-[1.5rem] overflow-hidden group hover:border-primary/30 transition-all h-full">
                                                <CardHeader className="p-4 bg-primary/5 border-b border-white/10">
                                                    <div className="flex flex-col items-center gap-2 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <h3 className="text-[10px] font-black tracking-widest text-primary/60 uppercase italic pr-4">Statistik: {i === 0 ? selectedMatch?.p1?.name : selectedMatch?.p2?.name}</h3>
                                                            <Badge className="bg-primary/10 border-primary/30 text-primary font-black uppercase italic text-[8px]" suppressHydrationWarning>OVR: {an.winRate.toFixed(0)}%</Badge>
                                                        </div>
                                                        <p className={cn("text-[9px] font-black italic uppercase", an.quoteColor)}>Level: "{an.quote}"</p>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-5 space-y-6">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-2 text-center">
                                                            <p className="text-[7px] font-black text-primary/60 uppercase tracking-widest">Intel Musim</p>
                                                            <div className="grid gap-2">
                                                                <IntelCard icon={Percent} label="OVR Musim" value={`${an.winRate.toFixed(0)}%`} variant="primary" />
                                                                <IntelCard icon={Trophy} label="Peringkat Grup" value={`#${an.entry?.rank || '?'}`} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 text-center">
                                                            <p className="text-[7px] font-black text-white/60 uppercase tracking-widest">Intel Karir</p>
                                                            <div className="grid gap-2">
                                                                <IntelCard icon={Flame} label="OVR Master" value={an.masterInfo?.ovrRating.toFixed(0) || '0'} variant="gold" />
                                                                <IntelCard icon={Star} label="Peringkat Global" value={`#${an.masterInfo?.masterRank || '?'}`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isMounted && <ChartContainer config={chartConfig} className="h-24 w-full opacity-80">
                                                        <LineChart data={an.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="match" hide />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} domain={sCD} />
                                                            <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 6 }} />
                                                        </LineChart>
                                                    </ChartContainer>}
                                                    <div className="flex justify-center gap-1.5">{an.form.map((f, idx) => (<div key={idx} className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 shadow-sm", f === 'W' ? "bg-green-500/20 text-green-400 border-green-500/30" : (f === 'L' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"))}>{f === 'W' ? 'M' : f === 'L' ? 'K' : 'S'}</div>))}</div>
                                                </CardContent>
                                            </Card>
                                        ) : <div className="h-full flex items-center justify-center opacity-10 p-10 border-2 border-dashed border-white/10 rounded-[1.5rem]"><Loader2 className="w-8 h-8 animate-spin" /></div>}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center mt-6">
                              <p className="text-[8px] text-white/60 font-black tracking-[0.3em] uppercase mb-1">Technical Analysis Disclaimer</p>
                              <p className="text-[10px] font-bold text-primary/80 italic leading-tight">Data dikalkulasi berdasarkan akumulasi performa seluruh kompetisi musim ini. Grafik yang meningkat menunjukkan konsistensi kemenangan yang tinggi.</p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}
