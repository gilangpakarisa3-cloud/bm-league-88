'use client';

import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, getDocs } from "firebase/firestore";
import type { SeasonRecord, WithId, Season, Match, LeagueEntry } from "@/lib/types";
import { getSeasonTheme } from "@/lib/season-theme";
import { useTranslation } from "@/hooks/use-translation";
import { SeasonRecordCard } from "@/components/season-record-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Trophy,
  Unlock,
  Award,
  LayoutGrid,
  KeyRound,
  Crown,
  Sparkles,
  Flame,
  Medal,
  Scan,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Users,
  RefreshCw
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSharedPassword } from "@/context/password-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HallOfFamePage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();

  // Admin state management
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'div-1' | 'div-2'>('div-1');
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  // Delete confirmation state
  const [deletingRecord, setDeletingRecord] = useState<WithId<SeasonRecord> | null>(null);

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc')) : null),
    [firestore]
  );

  const { data: seasonRecords, isLoading } = useCollection<SeasonRecord>(hallOfFameCollection);

  // Load seasons to resolve themeKey for legacy or freshly completed records
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'leagues/main-league/seasons') : null),
    [firestore]
  );
  const { data: seasons } = useCollection<Season>(seasonsCollection);

  const seasonsMap = useMemo(() => {
    const map = new Map<string, WithId<Season>>();
    if (seasons) {
      seasons.forEach(s => map.set(s.id, s));
    }
    return map;
  }, [seasons]);

  // Auto-heal missing themeKey in hallOfFame documents from their original seasons
  useEffect(() => {
    if (!firestore || !seasonRecords || seasonsMap.size === 0) return;
    seasonRecords.forEach(rec => {
      if (!rec.themeKey && rec.seasonId) {
        const matched = seasonsMap.get(rec.seasonId);
        if (matched?.themeKey) {
          updateDocumentNonBlocking(doc(firestore, 'hallOfFame', rec.id), { themeKey: matched.themeKey });
        }
      }
    });
  }, [firestore, seasonRecords, seasonsMap]);

  // Compute Dynasty Leaders (Champions ranked by title count)
  const dynastyLeaders = useMemo(() => {
    if (!seasonRecords || seasonRecords.length === 0) return [];

    const countMap: Record<string, { name: string; photoUrl?: string; teamName: string; count: number; seasons: string[] }> = {};

    seasonRecords.forEach(rec => {
      const key = rec.winnerPlayerId || rec.winnerPlayerName;
      if (!countMap[key]) {
        countMap[key] = {
          name: rec.winnerPlayerName,
          photoUrl: rec.winnerPhotoUrl,
          teamName: rec.winnerTeamName,
          count: 0,
          seasons: []
        };
      }
      countMap[key].count += 1;
      countMap[key].seasons.push(rec.seasonName);
    });

    return Object.values(countMap).sort((a, b) => b.count - a.count);
  }, [seasonRecords]);

  // Aggregate Championship Statistics
  const championshipStats = useMemo(() => {
    if (!seasonRecords || seasonRecords.length === 0) {
      return { totalSeasons: 0, totalFinalsGoals: 0, highestPoints: 0, topChampion: null };
    }

    const totalSeasons = seasonRecords.length;
    const totalFinalsGoals = seasonRecords.reduce((sum, r) => sum + (r.winnerStats.goalsFor || 0), 0);
    const highestPoints = Math.max(...seasonRecords.map(r => r.winnerStats.points || 0));
    const topChampion = dynastyLeaders[0] || null;

    return { totalSeasons, totalFinalsGoals, highestPoints, topChampion };
  }, [seasonRecords, dynastyLeaders]);

  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPasswordPromptOpen(false);
      toast({ title: t('admin_mode_unlocked_title') });
    } else {
      toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordInput('');
  };

  const handleDelete = () => {
    if (!firestore || !deletingRecord) return;
    const recordRef = doc(firestore, 'hallOfFame', deletingRecord.id);
    deleteDocumentNonBlocking(recordRef);
    toast({
      title: t('record_deleted_title', { defaultValue: 'Catatan Dihapus' }),
      description: t('record_deleted_desc', {
        defaultValue: `Catatan untuk '${deletingRecord.seasonName}' telah dihapus dari Daftar Juara.`,
        seasonName: deletingRecord.seasonName
      }),
    });
    setDeletingRecord(null);
  };

  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const handleResyncRecord = async (record: WithId<SeasonRecord>) => {
    if (!firestore || !record.seasonId) return;
    setResyncingId(record.id);

    try {
      const seasonMatchesRef = collection(firestore, `leagues/main-league/seasons/${record.seasonId}/matches`);
      const matchedSeason = seasonsMap.get(record.seasonId);
      const isSeasonCoop = matchedSeason?.type === 'Co-Op' || matchedSeason?.type === 'Co-Op Hybrid';

      const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
      const seasonTableRef = collection(firestore, `leagues/main-league/seasons/${record.seasonId}/${tblName}`);

      const [matchesSnap, tableSnap] = await Promise.all([
        getDocs(seasonMatchesRef),
        getDocs(seasonTableRef)
      ]);

      if (matchesSnap.empty && tableSnap.empty) {
        toast({
          variant: 'destructive',
          title: 'Data Tidak Ditemukan',
          description: `Pertandingan untuk musim '${record.seasonName}' tidak ditemukan di arsip.`
        });
        setResyncingId(null);
        return;
      }

      const rawMatches: Match[] = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const rawTable: LeagueEntry[] = tableSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const isMultiDiv = !!matchedSeason?.hasDivisions && !matchedSeason?.isDiv2Merged;
      const div1Table = isMultiDiv ? rawTable.filter(e => e.division !== 'div-2') : rawTable;
      const div2Table = isMultiDiv ? rawTable.filter(e => e.division === 'div-2') : [];

      // Determine Winner
      let winner = div1Table.find(p => (p.playerId || p.id) === record.winnerPlayerId) || div1Table[0] || rawTable[0];
      const isHybrid = matchedSeason?.type === 'Hybrid' || matchedSeason?.type === 'Co-Op Hybrid' || matchedSeason?.type === 'Single Hybrid';

      if (isHybrid) {
        const finalMatch = rawMatches.find(m => (m.round === 'Grand-Final' || m.bracketId === 'playoff-final' || m.bracketId === 'playoff-m18') && m.isCompleted && m.division !== 'div-2');
        if (finalMatch) {
          const isBo3 = matchedSeason?.type === 'Co-Op' || matchedSeason?.type === 'Co-Op Hybrid' || (finalMatch.round && finalMatch.round !== 'Group');
          const s1 = isBo3 ? (finalMatch.player1Wins ?? 0) : (finalMatch.player1Score ?? 0);
          const s2 = isBo3 ? (finalMatch.player2Wins ?? 0) : (finalMatch.player2Score ?? 0);
          const wId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
          const wEntry = rawTable.find(p => (p.playerId || p.id) === wId);
          if (wEntry) winner = wEntry;
        }
      }

      const wIdToFilter = isSeasonCoop ? (winner?.id || record.winnerPlayerId) : (winner?.playerId || winner?.id || record.winnerPlayerId);
      const playerMatches = rawMatches.filter(m => m.isCompleted && (m.player1Id === wIdToFilter || m.player2Id === wIdToFilter));

      let totP = 0, totW = 0, totD = 0, totL = 0, totGF = 0, totGA = 0;
      playerMatches.forEach(m => {
        totP++;
        const isP1 = m.player1Id === wIdToFilter;
        const isBo3 = m.round && m.round !== 'Group';
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const pRes = isP1 ? s1 : s2;
        const oRes = isP1 ? s2 : s1;
        if (pRes > oRes) totW++; else if (pRes < oRes) totL++; else totD++;
        if (m.player1Score !== null && m.player2Score !== null) {
          totGF += isP1 ? m.player1Score : m.player2Score;
          totGA += isP1 ? m.player2Score : m.player1Score;
        }
      });

      // Overall cumulative stats across participants (Liga + Playoff)
      const playerCumulativeStats: Record<string, { playerName: string; goalsFor: number; goalsAgainst: number; wins: number; matchesCount: number }> = {};
      rawTable.forEach(p => {
        const pId = isSeasonCoop ? p.id : (p.playerId || p.id);
        playerCumulativeStats[pId] = {
          playerName: p.playerName || p.teamName || 'Unknown',
          goalsFor: 0,
          goalsAgainst: 0,
          wins: 0,
          matchesCount: 0
        };
      });

      const completedMatches = rawMatches.filter(m => m.isCompleted);
      completedMatches.forEach(m => {
        const p1Id = m.player1Id;
        const p2Id = m.player2Id;
        const isBo3 = m.round && m.round !== 'Group';
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const gf1 = m.player1Score ?? 0;
        const gf2 = m.player2Score ?? 0;

        if (p1Id && playerCumulativeStats[p1Id]) {
          playerCumulativeStats[p1Id].matchesCount += 1;
          playerCumulativeStats[p1Id].goalsFor += gf1;
          playerCumulativeStats[p1Id].goalsAgainst += gf2;
          if (s1 > s2) playerCumulativeStats[p1Id].wins += 1;
        }
        if (p2Id && playerCumulativeStats[p2Id]) {
          playerCumulativeStats[p2Id].matchesCount += 1;
          playerCumulativeStats[p2Id].goalsFor += gf2;
          playerCumulativeStats[p2Id].goalsAgainst += gf1;
          if (s2 > s1) playerCumulativeStats[p2Id].wins += 1;
        }
      });

      const activeOverallPlayers = Object.values(playerCumulativeStats).filter(p => p.matchesCount > 0);
      let bAtt = record.funStats?.bestAttacker || null;
      let wDef = record.funStats?.worstDefender || null;
      let mWinP = record.funStats?.mostWins || null;

      if (activeOverallPlayers.length > 0) {
        if (!isSeasonCoop) {
          const maxGF = Math.max(...activeOverallPlayers.map(p => p.goalsFor));
          const bestAttacker = activeOverallPlayers.find(p => p.goalsFor === maxGF && maxGF > 0);
          if (bestAttacker) bAtt = { playerName: bestAttacker.playerName, value: bestAttacker.goalsFor };

          const maxGA = Math.max(...activeOverallPlayers.map(p => p.goalsAgainst));
          const worstDefender = activeOverallPlayers.find(p => p.goalsAgainst === maxGA && maxGA > 0);
          if (worstDefender) wDef = { playerName: worstDefender.playerName, value: worstDefender.goalsAgainst };
        }
        const maxW = Math.max(...activeOverallPlayers.map(p => p.wins));
        const mostWins = activeOverallPlayers.find(p => p.wins === maxW && maxW > 0);
        if (mostWins) mWinP = { playerName: mostWins.playerName, value: mostWins.wins };
      }

      // Divisi 2 recalculation if available
      let division2Record = record.division2Record;
      if (isMultiDiv && div2Table.length > 0) {
        let d2Winner = div2Table[0];
        let d2RunnerUpName = div2Table[1]?.playerName || 'Runner-Up';
        let d2RunnerUpTeam = div2Table[1]?.teamName || '';

        const d2FinalMatch = rawMatches.find(m => (m.round === 'Grand-Final' || m.bracketId === 'playoff-final' || m.bracketId === 'playoff-m18') && m.isCompleted && m.division === 'div-2');
        if (d2FinalMatch) {
          const s1 = d2FinalMatch.player1Wins ?? d2FinalMatch.player1Score ?? 0;
          const s2 = d2FinalMatch.player2Wins ?? d2FinalMatch.player2Score ?? 0;
          const wId = s1 > s2 ? d2FinalMatch.player1Id : d2FinalMatch.player2Id;
          const ruId = s1 > s2 ? d2FinalMatch.player2Id : d2FinalMatch.player1Id;
          const wEntry = div2Table.find(p => (p.playerId || p.id) === wId);
          const ruEntry = div2Table.find(p => (p.playerId || p.id) === ruId);
          if (wEntry) d2Winner = wEntry;
          if (ruEntry) {
            d2RunnerUpName = ruEntry.playerName;
            d2RunnerUpTeam = ruEntry.teamName;
          }
        }

        const d2WIdToFilter = d2Winner.playerId || d2Winner.id;
        const d2Matches = rawMatches.filter(m => m.isCompleted && m.division === 'div-2' && (m.player1Id === d2WIdToFilter || m.player2Id === d2WIdToFilter));
        let d2TotW = 0, d2TotD = 0, d2TotL = 0, d2TotGF = 0, d2TotGA = 0;
        d2Matches.forEach(m => {
          const isP1 = m.player1Id === d2WIdToFilter;
          const isBo3 = m.round && m.round !== 'Group';
          const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
          const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
          const pRes = isP1 ? s1 : s2; const oRes = isP1 ? s2 : s1;
          if (pRes > oRes) d2TotW++; else if (pRes < oRes) d2TotL++; else d2TotD++;
          if (m.player1Score !== null && m.player2Score !== null) {
            d2TotGF += isP1 ? m.player1Score : m.player2Score;
            d2TotGA += isP1 ? m.player2Score : m.player1Score;
          }
        });

        const d2UseMatches = d2Matches.length > 0;
        division2Record = {
          winnerPlayerId: d2Winner.playerId || d2Winner.id,
          winnerPlayerName: d2Winner.playerName,
          winnerTeamName: d2Winner.teamName,
          winnerPhotoUrl: (d2Winner as any).logoUrl || (d2Winner as any).team?.logoUrl,
          divisionName: matchedSeason?.division2Name || 'Divisi 2',
          runnerUpPlayerName: d2RunnerUpName,
          runnerUpTeamName: d2RunnerUpTeam,
          points: d2Winner.points,
          goalsFor: d2UseMatches ? d2TotGF : d2Winner.goalsFor,
          goalsAgainst: d2UseMatches ? d2TotGA : d2Winner.goalsAgainst,
          win: d2UseMatches ? d2TotW : d2Winner.win,
          loss: d2UseMatches ? d2TotL : d2Winner.loss,
          draw: d2UseMatches ? d2TotD : (d2Winner.draw || 0),
          totalMatches: d2UseMatches ? d2Matches.length : (d2Winner.played || (d2Winner.win + d2Winner.loss)),
        };
      }

      const updatedPayload: Partial<SeasonRecord> = {
        winnerStats: {
          points: winner?.points ?? record.winnerStats.points,
          leaguePoints: winner?.points ?? record.winnerStats.points,
          totalMatches: totP > 0 ? totP : record.winnerStats.totalMatches || (totW + totD + totL),
          win: totP > 0 ? totW : record.winnerStats.win,
          draw: totP > 0 ? totD : record.winnerStats.draw,
          loss: totP > 0 ? totL : record.winnerStats.loss,
          goalsFor: totP > 0 ? totGF : record.winnerStats.goalsFor,
          goalsAgainst: totP > 0 ? totGA : record.winnerStats.goalsAgainst,
          goalDifference: totP > 0 ? (totGF - totGA) : record.winnerStats.goalDifference
        },
        funStats: {
          bestAttacker: bAtt,
          worstDefender: wDef,
          mostWins: mWinP
        },
        ...(division2Record ? { division2Record } : {})
      };

      updateDocumentNonBlocking(doc(firestore, 'hallOfFame', record.id), updatedPayload);

      toast({
        title: 'Rekap Berhasil Disinkronkan!',
        description: `Statistik keseluruhan (Liga + Playoff) untuk '${record.seasonName}' telah diperbarui.`
      });
    } catch (err: any) {
      console.error("Resync failed:", err);
      toast({
        variant: 'destructive',
        title: 'Gagal Sinkronisasi',
        description: err.message || 'Terjadi kesalahan saat menyinkronkan data.'
      });
    } finally {
      setResyncingId(null);
    }
  };

  if (isLoading || !isPasswordLoaded) {
    return (
      <div className="max-w-[94rem] mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-44 w-full rounded-[2.5rem] bg-white/5 border border-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[520px] rounded-[2.5rem] bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[94rem] mx-auto px-2 sm:px-6 py-8 relative">
      {/* Background Decorative Atmosphere Lasers */}
      <div className="absolute top-0 right-10 -z-10 w-[550px] h-[550px] bg-yellow-400/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Championship Sanctuary Hero Header */}
        <div className="relative group/header overflow-hidden bg-black/70 backdrop-blur-3xl border border-yellow-400/30 rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.85)] p-6 sm:p-10 aero-card">
          {/* Golden edge laser */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-600 rounded-l-[2.5rem] shadow-[0_0_35px_rgba(250,204,21,0.9)]" />

          <div className="absolute inset-0 cyber-grid-overlay opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-400/15 rounded-2xl text-yellow-400 border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                  <Crown className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-yellow-400 italic">
                    HALL OF CHAMPIONS // TROPHY SANCTUARY ARCHIVE
                  </span>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                </div>
              </div>

              <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                {t('hall_of_fame_title')}{' '}
                <span className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.5)]">
                  SANCTUARY
                </span>
              </h1>

              <p className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-[0.2em] max-w-xl leading-relaxed">
                {t('hall_of_fame_desc', { defaultValue: "Arsip keabadian para juara liga amatir Engineering EightyEight. Catatan kejayaan, performa puncak, dan gelar kehormatan sepanjang masa." })}
              </p>
            </div>

            {/* Admin Action Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)}
                variant="outline"
                disabled={!isPasswordLoaded}
                className={cn(
                  "h-12 sm:h-14 px-7 font-black tracking-widest text-xs uppercase rounded-full transition-all duration-500 relative overflow-hidden group/admin border",
                  isAdmin
                    ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.4)]"
                    : "bg-white/5 text-white/50 border-white/10 hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
                )}
              >
                <div className="relative z-10 flex items-center">
                  {isAdmin ? <Unlock className="mr-2 w-4 h-4" /> : <Lock className="mr-2 w-4 h-4" />}
                  {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Division Selector Pill Tabs (Tier 1 vs Tier 2) */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('div-1')}
              className={cn(
                "h-11 px-5 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center gap-2 transition-all border cursor-pointer",
                activeTab === 'div-1'
                  ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.45)]"
                  : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/5"
              )}
            >
              <Crown className="w-4 h-4" />
              <span>SUPREME CHAMPIONS (DIVISI 1)</span>
              <Badge className={cn("text-[9px] px-1.5 py-0 rounded-full font-mono", activeTab === 'div-1' ? "bg-black text-yellow-400" : "bg-white/10 text-white/60")}>
                {seasonRecords?.length || 0}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('div-2')}
              className={cn(
                "h-11 px-5 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center gap-2 transition-all border cursor-pointer",
                activeTab === 'div-2'
                  ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.45)]"
                  : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/5"
              )}
            >
              <Award className="w-4 h-4" />
              <span>PROMOTION HONORS (DIVISI 2)</span>
              <Badge className={cn("text-[9px] px-1.5 py-0 rounded-full font-mono", activeTab === 'div-2' ? "bg-black text-cyan-400" : "bg-white/10 text-white/60")}>
                {seasonRecords?.filter(r => r.division2Record).length || 0}
              </Badge>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 text-[9px] font-mono text-white/40 uppercase tracking-widest hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>{activeTab === 'div-1' ? 'KASTA TERTINGGI // TITLE OF KINGS' : 'KASTA KEDUA // TIKET PROMOSI KE DIVISI 1'}</span>
          </div>
        </div>

        {activeTab === 'div-1' ? (
          <>
            {/* Championship Telemetry Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-yellow-400 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                  <span>SEASONS_CONCLUDED</span>
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black italic text-yellow-400 tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                    {championshipStats.totalSeasons}
                  </span>
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">EDITIONS</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full w-full shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-amber-500 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                  <span>DYNASTY_LEADER</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2 truncate">
                  <span className="text-2xl sm:text-3xl font-black italic text-white tracking-tight truncate leading-none">
                    {championshipStats.topChampion?.name || 'BELUM ADA'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase text-amber-400 font-mono">
                  <span>{championshipStats.topChampion ? `${championshipStats.topChampion.count}X CHAMPION` : 'ACTIVE'}</span>
                  <span>DYNASTY</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-primary transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                  <span>CHAMPION_GOALS</span>
                  <Flame className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
                    {championshipStats.totalFinalsGoals}
                  </span>
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">GOALS</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-full shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-emerald-500 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                  <span>PEAK_AGGREGATE</span>
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
                    {championshipStats.highestPoints}
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">PTS MAX</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
              </div>
            </div>

            {/* Dynasty Champions Podium Ribbon */}
            {dynastyLeaders.length > 0 && (
              <div className="p-5 rounded-3xl border border-white/10 bg-black/50 backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">
                      ALL-TIME DYNASTY LEADERBOARD (KASTA TERTINGGI)
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono font-black text-white/40 uppercase tracking-widest">
                    TIER 1 PREMIER // VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynastyLeaders.map((leader, idx) => (
                    <div
                      key={leader.name}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-white/5 hover:border-yellow-400/40 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                          idx === 0 ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]" :
                            idx === 1 ? "bg-slate-300 text-black" :
                              idx === 2 ? "bg-amber-600 text-white" :
                                "bg-white/10 text-white/60"
                        )}>
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-black text-sm uppercase italic tracking-tight text-white group-hover:text-yellow-400 transition-colors truncate">
                            {leader.name}
                          </span>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                            {leader.teamName}
                          </span>
                        </div>
                      </div>

                      <Badge className="bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 text-[10px] font-black uppercase tracking-widest font-mono shrink-0">
                        🏆 {leader.count}x JUARA
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Season Records Grid Divisi 1 */}
            {seasonRecords && seasonRecords.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <LayoutGrid className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
                    CHRONOLOGICAL SUPREME CHAMPIONS
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {seasonRecords.map(record => {
                    const matchedSeason = seasonsMap.get(record.seasonId);
                    const resolvedThemeKey = record.themeKey || matchedSeason?.themeKey;
                    const recordWithTheme = resolvedThemeKey ? { ...record, themeKey: resolvedThemeKey } : record;
                    return (
                      <SeasonRecordCard
                        key={record.id}
                        record={recordWithTheme}
                        isAdmin={isAdmin}
                        onDelete={() => setDeletingRecord(record)}
                        onResync={() => handleResyncRecord(record)}
                        isResyncing={resyncingId === record.id}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-16 text-center backdrop-blur-xl">
                <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl font-black text-white/60 uppercase tracking-widest">
                  {t('hall_of_fame_empty_title')}
                </h2>
                <p className="text-xs font-bold text-white/40 mt-2 uppercase tracking-wide max-w-md mx-auto leading-relaxed">
                  {t('hall_of_fame_empty_desc')}
                </p>
              </div>
            )}
          </>
        ) : (
          /* TAB 2: PROMOTION HONORS (DIVISI 2) */
          <div className="space-y-8">
            {/* Promotion Telemetry / Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-[#04121C]/95 via-[#062030]/90 to-black/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
              {/* Cyan Neon Ambient Accents */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.9)]" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-400/15 rounded-xl text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.35)]">
                      <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-[0.35em] text-cyan-300">
                        TIER 2 PROMOTION CORRIDOR // THE ASCENSION
                      </span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                  </div>
                  <h2 className="font-headline text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase flex items-center gap-3">
                    PROMOTION HONORS
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                      HALL
                    </span>
                  </h2>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-[0.15em] max-w-xl">
                    Galeri kehormatan skuad kasta kedua yang berhasil merebut tiket promosi emas menuju kasta tertinggi Divisi 1.
                  </p>
                </div>

                {/* Telemetry quick counters */}
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="p-3.5 px-5 rounded-2xl bg-black/60 border border-cyan-400/30 backdrop-blur-xl text-center">
                    <span className="block text-[8px] font-mono font-black text-white/40 uppercase tracking-widest">
                      PROMOTED SQUADS
                    </span>
                    <span className="text-2xl sm:text-3xl font-black italic text-cyan-300 font-mono">
                      {(seasonRecords?.filter(r => r.division2Record).length || 0) * 2}
                    </span>
                  </div>
                  <div className="p-3.5 px-5 rounded-2xl bg-black/60 border border-emerald-400/30 backdrop-blur-xl text-center">
                    <span className="block text-[8px] font-mono font-black text-white/40 uppercase tracking-widest">
                      SEASONS
                    </span>
                    <span className="text-2xl sm:text-3xl font-black italic text-emerald-400 font-mono">
                      {seasonRecords?.filter(r => r.division2Record).length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {seasonRecords?.filter(r => r.division2Record).length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {seasonRecords
                  .filter(r => r.division2Record)
                  .map(record => {
                    const d2 = record.division2Record!;
                    const totalMatches = (d2.win || 0) + (d2.loss || 0);
                    const winRate = totalMatches > 0 ? Math.round(((d2.win || 0) / totalMatches) * 100) : 100;
                    const matchedSeason = seasonsMap.get(record.seasonId);
                    const resolvedThemeKey = record.themeKey || matchedSeason?.themeKey;
                    const d2Theme = getSeasonTheme({ name: record.seasonName, themeKey: resolvedThemeKey } as any);

                    return (
                      <div
                        key={record.id}
                        className="group relative rounded-[2.5rem] p-[1.5px] transition-all duration-700 shadow-[0_25px_70px_rgba(0,0,0,0.9)] hover:-translate-y-1.5"
                        style={{
                          background: `linear-gradient(to bottom, ${d2Theme.primaryHex}99, ${d2Theme.primaryHex}33, ${d2Theme.secondaryHex || d2Theme.primaryHex}66)`,
                        }}
                      >
                        {/* Outer Glow Halo */}
                        <div
                          className="absolute -inset-1 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle, ${d2Theme.primaryHex}4D 0%, ${d2Theme.secondaryHex || d2Theme.primaryHex}26 60%, transparent 100%)`
                          }}
                        />

                        {/* Card Body */}
                        <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-[2.4rem] bg-gradient-to-b from-[#05131E]/98 via-[#040D15]/98 to-black/98 p-6 sm:p-8 backdrop-blur-3xl">
                          {/* Top Laser HUD Accent */}
                          <div
                            className="absolute top-0 left-8 right-8 h-[2px]"
                            style={{
                              background: `linear-gradient(to right, transparent, ${d2Theme.primaryHex}, transparent)`,
                              boxShadow: `0 0 15px ${d2Theme.primaryHex}`
                            }}
                          />

                          {/* Futuristic Corner Tech Accents */}
                          <div
                            className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg pointer-events-none"
                            style={{ borderColor: `${d2Theme.primaryHex}99` }}
                          />
                          <div
                            className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg pointer-events-none"
                            style={{ borderColor: `${d2Theme.primaryHex}99` }}
                          />
                          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/60 rounded-bl-lg pointer-events-none" />
                          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/60 rounded-br-lg pointer-events-none" />

                          {/* Watermark Holographic Background */}
                          <div className="absolute -right-4 -bottom-6 pointer-events-none select-none opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <span
                              className="font-headline text-[9rem] font-black italic leading-none"
                              style={{ color: d2Theme.primaryHex }}
                            >
                              DIV2
                            </span>
                          </div>

                          {/* Card Header: Season Tag & Promotion Badge */}
                          <div className="relative z-10 flex items-center justify-between pb-5 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="px-3 py-1 rounded-full font-mono font-black text-[10px] uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${d2Theme.primaryHex}26`,
                                  borderColor: `${d2Theme.primaryHex}66`,
                                  borderWidth: '1px',
                                  color: d2Theme.primaryHex,
                                  boxShadow: `0 0 12px ${d2Theme.primaryHex}40`
                                }}
                              >
                                {record.seasonName}
                              </div>
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest hidden sm:inline">
                                // ARCHIVE
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={resyncingId === record.id}
                                  className="h-8 w-8 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/10 rounded-lg transition-all"
                                  onClick={() => handleResyncRecord(record)}
                                  title="Sinkronkan Ulang Statistik Keseluruhan (Liga + Playoff)"
                                >
                                  <RefreshCw className={cn("w-3.5 h-3.5", resyncingId === record.id && "animate-spin text-cyan-400")} />
                                </Button>
                              )}
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span className="text-[9px] font-black font-mono text-emerald-300 uppercase tracking-widest">
                                  PROMOTED TO DIVISI 1
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Main Section: Champion (Pemenang Utama) */}
                          <div className="relative z-10 py-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4" style={{ color: d2Theme.primaryHex }} />
                                <span
                                  className="text-[9px] font-mono font-black uppercase tracking-[0.3em]"
                                  style={{ color: d2Theme.primaryHex }}
                                >
                                  {d2.divisionName || 'DIVISI 2'} CHAMPION & PROMOTED
                                </span>
                              </div>
                              <Badge className="bg-yellow-400/10 text-yellow-300 border-yellow-400/30 text-[9px] font-mono font-black uppercase">
                                🥇 CHAMPION
                              </Badge>
                            </div>

                            {/* Champion Card Pod */}
                            <div
                              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 group/champ transition-all"
                              style={{
                                background: `linear-gradient(to right, ${d2Theme.primaryHex}15, ${d2Theme.secondaryHex || d2Theme.primaryHex}0A, rgba(0,0,0,0.6))`,
                                border: `1px solid ${d2Theme.primaryHex}4D`
                              }}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="relative shrink-0">
                                  <div
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1 flex items-center justify-center group-hover/champ:scale-105 transition-transform"
                                    style={{
                                      backgroundColor: `${d2Theme.primaryHex}1A`,
                                      border: `2px solid ${d2Theme.primaryHex}99`,
                                      boxShadow: `0 0 20px ${d2Theme.primaryHex}59`
                                    }}
                                  >
                                    <div
                                      className="w-full h-full rounded-xl flex items-center justify-center"
                                      style={{
                                        background: `linear-gradient(to bottom right, ${d2Theme.primaryHex}4D, black)`
                                      }}
                                    >
                                      <Crown className="w-7 h-7" style={{ color: d2Theme.primaryHex, filter: `drop-shadow(0 0 10px ${d2Theme.primaryHex}CC)` }} />
                                    </div>
                                  </div>
                                  <div
                                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-black flex items-center justify-center font-black text-[9px]"
                                    style={{
                                      backgroundColor: d2Theme.primaryHex,
                                      boxShadow: `0 0 8px ${d2Theme.primaryHex}`
                                    }}
                                  >
                                    #1
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <h3 className="font-headline text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight truncate drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                    {d2.winnerPlayerName}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: d2Theme.primaryHex }} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70 truncate">
                                      {d2.winnerTeamName || 'Tanpa Tim'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="hidden sm:flex flex-col items-end shrink-0 pl-2">
                                <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: `${d2Theme.primaryHex}99` }}>
                                  RATE
                                </span>
                                <span className="text-lg font-black italic font-mono" style={{ color: d2Theme.primaryHex }}>
                                  {winRate}%
                                </span>
                              </div>
                            </div>

                            {/* Runner Up Pod (Promoted Seat 2) */}
                            {d2.runnerUpPlayerName && (
                              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-black/60 border border-emerald-400/30 p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:border-emerald-400 transition-all">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                                      <Medal className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-black flex items-center justify-center font-black text-[8px]">
                                      #2
                                    </div>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-mono font-black uppercase tracking-[0.2em] text-emerald-400">
                                        RUNNER-UP (PROMOTED TICKET)
                                      </span>
                                    </div>
                                    <h4 className="font-headline text-lg sm:text-xl font-black text-white uppercase italic tracking-tight truncate">
                                      {d2.runnerUpPlayerName}
                                    </h4>
                                    {d2.runnerUpTeamName && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block truncate">
                                        {d2.runnerUpTeamName}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 bg-emerald-400/10 font-mono text-[9px] font-black shrink-0 uppercase tracking-wider">
                                  🥈 PASS TIER 1
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Futuristic Telemetry Metrics HUD */}
                          <div className="relative z-10 pt-4 border-t border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-[8px] font-mono font-black uppercase text-white/40 tracking-widest px-1">
                              <span>PERFORMANCE TELEMETRY HUD</span>
                              <span style={{ color: d2Theme.primaryHex }}>REKAP LENGKAP // LIGA + PLAYOFF</span>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {/* Points */}
                              <div
                                className="p-3 rounded-2xl bg-black/60 flex flex-col items-center justify-center text-center transition-colors"
                                style={{ border: `1px solid ${d2Theme.primaryHex}33` }}
                              >
                                <Target className="w-3.5 h-3.5 mb-1" style={{ color: d2Theme.primaryHex }} />
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-wider">
                                  LGE PTS
                                </span>
                                <span className="text-base sm:text-lg font-black italic font-mono" style={{ color: d2Theme.primaryHex }}>
                                  {d2.points}
                                </span>
                              </div>

                              {/* W - L */}
                              <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary mb-1" />
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-wider">
                                  {d2.draw && d2.draw > 0 ? 'W - D - L' : 'W - L'}
                                </span>
                                <span className="text-base sm:text-lg font-black italic text-white font-mono">
                                  {d2.win}{d2.draw && d2.draw > 0 ? `-${d2.draw}` : ''} - {d2.loss}
                                </span>
                              </div>

                              {/* Goals For */}
                              <div className="p-3 rounded-2xl bg-black/60 border border-emerald-400/20 flex flex-col items-center justify-center text-center group-hover:border-emerald-400/40 transition-colors">
                                <Flame className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-wider">
                                  TOTAL GOL
                                </span>
                                <span className="text-base sm:text-lg font-black italic text-emerald-400 font-mono">
                                  {d2.goalsFor}
                                </span>
                              </div>

                              {/* Goal Conceded */}
                              <div className="p-3 rounded-2xl bg-black/60 border border-rose-500/20 flex flex-col items-center justify-center text-center">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mb-1" />
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-wider">
                                  CONC
                                </span>
                                <span className="text-base sm:text-lg font-black italic text-rose-400 font-mono">
                                  {d2.goalsAgainst ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-3xl border border-dashed border-cyan-400/30 bg-black/40 p-16 text-center backdrop-blur-xl">
                <Award className="w-16 h-16 text-cyan-400/30 mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl font-black text-white/70 uppercase tracking-widest">
                  BELUM ADA REKAM PROMOSI DIVISI 2
                </h2>
                <p className="text-xs font-bold text-white/40 mt-2 uppercase tracking-wide max-w-md mx-auto leading-relaxed">
                  Pemenang babak playoff Divisi 2 akan otomatis diabadikan pada plakat promosi ultra futuristik ini saat musim diselesaikan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Admin Password Prompt Dialog */}
        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border border-yellow-400/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(250,204,21,0.25)] p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-4 text-yellow-400 mb-1">
                <div className="p-3 bg-yellow-400/10 rounded-2xl border border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  <KeyRound className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase italic leading-none text-white">
                    {t('admin_auth')}
                  </DialogTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400/70 mt-1">
                    Status: Championship_Lock
                  </p>
                </div>
              </div>
              <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px] text-left border-l-2 border-yellow-400/40 pl-3.5">
                {t('admin_auth_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="hall-password-input" className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400/70 ml-1 italic">
                  ENCRYPTED_KEY_TRANSMISSION
                </Label>
                <div className="relative group/input">
                  <Input
                    id="hall-password-input"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="h-14 bg-black/70 border-white/10 rounded-2xl focus:border-yellow-400/60 text-xl font-black tracking-[0.25em] text-yellow-400 px-5"
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handlePasswordCheck}
              className="w-full h-14 font-black tracking-[0.25em] text-sm uppercase italic rounded-2xl shadow-xl shadow-yellow-400/25 text-black bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
              <Scan className="w-4 h-4" />
              {t('unlock')}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={!!deletingRecord} onOpenChange={(isOpen) => !isOpen && setDeletingRecord(null)}>
          <AlertDialogContent className="border border-rose-500/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.25)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase italic text-rose-500">
                {t('are_you_sure')}
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px]">
                {t('delete_record_confirm_desc', {
                  defaultValue: `Apakah Anda yakin ingin menghapus catatan kejuaraan '${deletingRecord?.seasonName || ''}'? Aksi ini tidak dapat dibatalkan.`,
                  seasonName: deletingRecord?.seasonName || ''
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-6">
              <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12 rounded-xl border border-white/10 bg-white/5">
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-500 text-white hover:bg-rose-600 font-black tracking-widest text-[10px] uppercase h-12 rounded-xl shadow-lg shadow-rose-500/25"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
