'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team, Season, CoOpLeagueEntry } from '@/lib/types';
import { User, Shield, Percent, Trophy, Award, TrendingUp, TrendingDown, Minus, Zap, Activity, Scan, Binary, Star, Flame } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { getSeasonTheme } from '@/lib/season-theme';
import { enrichPlayersWithMmrData, calculateMmrDelta, getTierFromMmr, TIER_STYLES } from '@/lib/mmr';

import { StatChip } from './player-performance/stat-chip';
import { IntelCard } from './player-performance/intel-card';
import { HistoryTab, UpcomingTab } from './player-performance/match-history-tabs';

const TrendTab = dynamic(
  () => import('./player-performance/trend-tab').then((mod) => mod.TrendTab),
  { ssr: false }
);

export { StatChip } from './player-performance/stat-chip';
export { IntelCard } from './player-performance/intel-card';
export { HistoryTab, UpcomingTab } from './player-performance/match-history-tabs';

interface PlayerPerformanceDialogProps {
  player: WithId<LeagueEntry> | null;
  matches: WithId<Match>[];
  allPlayers: WithId<Player>[];
  allTeams: WithId<Team>[];
  totalPlayersInSeason: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defendingChampionId?: string;
  isAdmin: boolean;
  activeSeason: WithId<Season> | null;
  coopLeagueTable: WithId<CoOpLeagueEntry>[];
  singleLeagueTable: WithId<LeagueEntry>[];
}

export function PlayerPerformanceDialog({
  player,
  matches,
  allPlayers,
  allTeams,
  totalPlayersInSeason,
  open,
  onOpenChange,
  defendingChampionId,
  isAdmin,
  activeSeason,
  coopLeagueTable,
  singleLeagueTable
}: PlayerPerformanceDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('history');
  const [isMounted, setIsMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save scroll position when dialog opens and reset dialog internal scroll to top
  useEffect(() => {
    if (open) {
      if (typeof window !== 'undefined') {
        scrollPositionRef.current = window.scrollY;
      }
      setActiveTab('history');
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [open, player]);

  const playersById = useMemo(() => (allPlayers || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
  const teamsById = useMemo(() => (allTeams || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);

  const masterPlayersRanked = useMemo(() => {
    return enrichPlayersWithMmrData(allPlayers, null);
  }, [allPlayers]);

  const performanceStats = useMemo(() => {
    if (!player || !activeSeason) return null;

    const isCoop = activeSeason.type === 'Co-Op' || activeSeason.type === 'Co-Op Hybrid';
    const playerIdToFilter = isCoop ? player.id : player.playerId;

    const coopTableById = (coopLeagueTable || []).reduce((acc, entry) => { acc[entry.id] = entry; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>);
    const singleTableByPlayerId = (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, WithId<LeagueEntry>>);

    const playerMatches = (matches || []).filter(m => (m.player1Id === playerIdToFilter || m.player2Id === playerIdToFilter));

    let p1Id = null;
    let p2Id = null;
    if (isCoop) {
      const cE = coopTableById[player.id];
      if (cE) { p1Id = cE.player1Id; p2Id = cE.player2Id; }
    } else {
      p1Id = player.playerId;
    }

    const m1 = p1Id ? masterPlayersRanked.find(p => p.id === p1Id) : null;
    const m2 = p2Id ? masterPlayersRanked.find(p => p.id === p2Id) : null;

    // Check calibration status: only show MMR if player has >= 20 official career matches
    const isM1Calibrated = !!m1?.isCalibrated;
    const isM2Calibrated = !!m2?.isCalibrated;
    const isAnyCalibrated = isCoop ? (isM1Calibrated || isM2Calibrated) : isM1Calibrated;

    let displayMmr = 'N/C';
    let displayRank = 'N/C';
    let peakMmrVal = '800';

    if (isCoop) {
      if (isM1Calibrated && isM2Calibrated && m1 && m2) {
        displayMmr = Math.round((m1.mmrRating + m2.mmrRating) / 2).toString();
        displayRank = String(Math.min(m1.rank ?? 999, m2.rank ?? 999));
        peakMmrVal = Math.round((m1.peakMmrRating + m2.peakMmrRating) / 2).toString();
      } else if (isM1Calibrated && m1) {
        displayMmr = String(m1.mmrRating);
        displayRank = String(m1.rank ?? 'N/C');
        peakMmrVal = String(m1.peakMmrRating);
      } else if (isM2Calibrated && m2) {
        displayMmr = String(m2.mmrRating);
        displayRank = String(m2.rank ?? 'N/C');
        peakMmrVal = String(m2.peakMmrRating);
      }
    } else {
      if (isM1Calibrated && m1) {
        displayMmr = String(m1.mmrRating);
        displayRank = String(m1.rank ?? 'N/C');
        peakMmrVal = String(m1.peakMmrRating);
      }
    }

    const masterInfoSummary = {
      mmr: displayMmr,
      peakMmr: peakMmrVal,
      rank: displayRank,
      isCalibrated: true,
      isCoop: isCoop,
      p1Mmr: m1 ? String(m1.mmrRating) : '600',
      p2Mmr: m2 ? String(m2.mmrRating) : '600',
      legacyOvr: m1?.legacyOvrRating ? m1.legacyOvrRating.toFixed(0) : undefined
    };

    const numMmr = Number(masterInfoSummary.mmr) || (m1?.mmrRating ?? 600);
    const careerPlayed = m1?.overallPlayed ?? (player as any).overallPlayed ?? player.played ?? 0;
    const currentRank = masterInfoSummary.rank !== 'N/C' ? Number(masterInfoSummary.rank) : null;
    const tierId = m1?.tierId ?? getTierFromMmr(numMmr, careerPlayed, currentRank);
    const tierStyle = TIER_STYLES[tierId] || TIER_STYLES['AMATEUR'];

    // Hitung pergerakan delta dan saldo MMR kronologis (dari laga tertua ke terbaru)
    const playerCompletedMatches = playerMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => {
        const timeA = a.matchDate?.toMillis ? a.matchDate.toMillis() : 0;
        const timeB = b.matchDate?.toMillis ? b.matchDate.toMillis() : 0;
        return timeA - timeB;
      });

    const playerCurrentMmr = m1?.mmrRating ?? (player as any).mmr ?? 800;

    const matchDeltas = playerCompletedMatches.map(m => {
      const isPlayer1 = m.player1Id === playerIdToFilter;
      const opponentId = isPlayer1 ? m.player2Id : m.player1Id;

      let delta: number | null = null;
      if (isPlayer1 && typeof m.player1MmrDelta === 'number') {
        delta = m.player1MmrDelta;
      } else if (!isPlayer1 && typeof m.player2MmrDelta === 'number') {
        delta = m.player2MmrDelta;
      }

      if (delta === null && !isCoop) {
        const opp = masterPlayersRanked.find(p => p.id === opponentId);
        const oppMmr = opp?.mmrRating ?? 800;
        const isBo3 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group';
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const playerResult = isPlayer1 ? s1 : s2;
        const opponentResult = isPlayer1 ? s2 : s1;

        let res: 'W' | 'L' | 'D' = 'D';
        if (playerResult > opponentResult) res = 'W';
        else if (playerResult < opponentResult) res = 'L';
        delta = calculateMmrDelta(playerCurrentMmr, oppMmr, res).delta1;
      }

      return { matchId: m.id, delta: delta ?? 0 };
    });

    const totalSeasonMmrDelta = matchDeltas.reduce((sum, item) => sum + item.delta, 0);
    let runningMmr = playerCurrentMmr - totalSeasonMmrDelta;

    const mmrTrajectoryByMatchId: Record<string, { delta: number; mmrBefore: number; mmrAfter: number }> = {};
    matchDeltas.forEach(item => {
      const before = runningMmr;
      const after = runningMmr + item.delta;
      runningMmr = after;
      mmrTrajectoryByMatchId[item.matchId] = {
        delta: item.delta,
        mmrBefore: before,
        mmrAfter: after
      };
    });

    const completedMatches = playerMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => {
        const timeA = a.matchDate?.toMillis ? a.matchDate.toMillis() : 0;
        const timeB = b.matchDate?.toMillis ? b.matchDate.toMillis() : 0;
        return timeB - timeA;
      })
      .map(m => {
        const isPlayer1 = m.player1Id === playerIdToFilter;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
        let opponent = null;
        let opponentTeam = null;

        if (isCoop) {
          const opponentEntry = coopTableById[opponentId];
          if (opponentEntry) {
            opponent = { name: opponentEntry.teamName };
            opponentTeam = teamsById[opponentEntry.player1TeamId] || null;
          }
        } else {
          const opponentEntry = singleTableByPlayerId[opponentId];
          if (opponentEntry) {
            opponent = { name: opponentEntry.playerName };
            opponentTeam = teamsById[opponentEntry.teamId];
          } else if (opponentId === 'TBD') {
            opponent = { name: 'TBD' };
          } else {
            const opponentPlayer = playersById[opponentId];
            if (opponentPlayer) {
              opponent = { name: opponentPlayer.name };
              opponentTeam = teamsById[opponentPlayer.teamId];
            }
          }
        }

        const isBo3 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group';
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const playerResult = isPlayer1 ? s1 : s2;
        const opponentResult = isPlayer1 ? s2 : s1;

        let result: 'W' | 'L' | 'D';
        if (playerResult > opponentResult) result = 'W';
        else if (playerResult < opponentResult) result = 'L';
        else result = 'D';

        const mmrInfo = !isCoop ? mmrTrajectoryByMatchId[m.id] : undefined;

        return {
          ...m,
          isPlayer1,
          opponent,
          opponentTeam,
          s1,
          s2,
          result,
          mmrDelta: mmrInfo?.delta,
          mmrBefore: mmrInfo?.mmrBefore,
          mmrAfter: mmrInfo?.mmrAfter
        };
      });

    const upcomingMatches = playerMatches
      .filter(m => !m.isCompleted)
      .sort((a, b) => {
        const timeA = a.matchDate?.toMillis ? a.matchDate.toMillis() : 0;
        const timeB = b.matchDate?.toMillis ? b.matchDate.toMillis() : 0;
        return timeA - timeB;
      })
      .map(m => {
        const isPlayer1 = m.player1Id === playerIdToFilter;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
        let opponent = null;
        let opponentTeam = null;
        if (isCoop) {
          const opponentEntry = coopTableById[opponentId];
          if (opponentEntry) {
            opponent = { name: opponentEntry.teamName };
            opponentTeam = teamsById[opponentEntry.player1TeamId] || null;
          } else if (opponentId === 'TBD') {
            opponent = { name: 'TBD' };
          }
        } else {
          const opponentEntry = singleTableByPlayerId[opponentId];
          if (opponentEntry) {
            opponent = { name: opponentEntry.playerName };
            opponentTeam = teamsById[opponentEntry.teamId];
          } else if (opponentId === 'TBD') {
            opponent = { name: 'TBD' };
          } else {
            const opponentPlayer = playersById[opponentId];
            if (opponentPlayer) {
              opponent = { name: opponentPlayer.name };
              opponentTeam = teamsById[opponentPlayer.teamId];
            }
          }
        }
        return { ...m, isPlayer1, opponent, opponentTeam };
      });

    const stats = completedMatches.reduce((acc, m) => {
      acc.played++;
      if (m.result === 'W') acc.win++;
      else if (m.result === 'L') acc.loss++;
      else acc.draw++;
      if (m.player1Score !== null && m.player2Score !== null) {
        const isP1 = m.player1Id === playerIdToFilter;
        acc.gf += isP1 ? m.player1Score : m.player2Score;
        acc.ga += isP1 ? m.player2Score : m.player1Score;
      }
      return acc;
    }, {
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      gf: 0,
      ga: 0
    });

    const totalMatchesCount = Math.max(playerMatches.length, (player.played || 0) + upcomingMatches.length, 1);
    const seasonProgress = totalMatchesCount > 0 ? (stats.played / totalMatchesCount) * 100 : 0;

    const possiblePoints = stats.played * 3;
    const actualPoints = (stats.win * 3) + (stats.draw * 1);
    const winRate = possiblePoints > 0 ? (actualPoints / possiblePoints) * 100 : 0;

    let trendScore = 0;
    const chartData = [{ match: 0, points: 0 }, ...[...completedMatches].reverse().map((match, index) => {
      if (match.result === 'W') trendScore += 1;
      else if (match.result === 'L') trendScore -= 1;
      return { match: index + 1, points: trendScore };
    })];

    let pST = "Balance";
    let pSType: 'attacking' | 'defensive' | 'balanced' = 'balanced';
    let pSD = t('play_style_balanced_desc');

    if (stats.played > 0) {
      const avgGF = stats.gf / stats.played;
      const avgGA = stats.ga / stats.played;
      if (avgGF > 1.6) {
        pST = "Attacking";
        pSType = 'attacking';
        pSD = t('play_style_attacking_desc');
      } else if (avgGA < 1.2 && stats.played >= 3) {
        pST = "Defense & Counter";
        pSType = 'defensive';
        pSD = t('play_style_defensive_desc');
      }
    }

    const last5Matches = completedMatches.slice(0, 5);
    let performanceStatus = null;
    if (last5Matches.length > 0) {
      const winCount = last5Matches.filter(m => m.result === 'W').length;
      const lossCount = last5Matches.filter(m => m.result === 'L').length;
      if (winCount === 5) performanceStatus = { text: "Performa Sempurna", color: "text-primary" };
      else if (winCount >= 3) performanceStatus = { text: "Momentum Positif", color: "text-green-400" };
      else if (lossCount >= 3) performanceStatus = { text: "Evaluasi Taktikal", color: "text-red-400" };
      else performanceStatus = { text: "Status Stabil", color: "text-white/70" };
    } else {
      performanceStatus = { text: "Siap Bertanding", color: "text-white/60" };
    }

    // Hitung streak aktif (kemenangan beruntun / tak terkalahkan)
    let currentStreakCount = 0;
    let currentStreakType: 'W' | 'unbeaten' | 'L' | 'none' = 'none';
    if (completedMatches.length > 0) {
      const firstRes = completedMatches[0].result;
      if (firstRes === 'W') {
        currentStreakType = 'W';
        for (const m of completedMatches) {
          if (m.result === 'W') currentStreakCount++;
          else break;
        }
      } else if (firstRes === 'D') {
        currentStreakType = 'unbeaten';
        for (const m of completedMatches) {
          if (m.result === 'W' || m.result === 'D') currentStreakCount++;
          else break;
        }
      } else {
        currentStreakType = 'L';
        for (const m of completedMatches) {
          if (m.result === 'L') currentStreakCount++;
          else break;
        }
      }
    }

    // Hitung clean sheets (kebobolan 0 gol dalam pertandingan resmi musim ini)
    const cleanSheetsCount = completedMatches.filter(m => {
      const oppScore = m.isPlayer1 ? m.s2 : m.s1;
      return oppScore === 0;
    }).length;

    const scoringRate = stats.played > 0 ? (stats.gf / stats.played).toFixed(2) : '0.00';
    const concedeRate = stats.played > 0 ? (stats.ga / stats.played).toFixed(2) : '0.00';

    const groupSize = activeSeason?.type === 'Hybrid'
      ? (player.group === 'A' ? singleLeagueTable.filter(p => p.group === 'A') : singleLeagueTable.filter(p => p.group === 'B')).length
      : totalPlayersInSeason;

    return {
      completedMatches,
      upcomingMatches,
      winRate,
      seasonProgress,
      totalMatchesCount,
      chartData,
      performanceStatus,
      stats,
      currentStreakCount,
      currentStreakType,
      cleanSheetsCount,
      scoringRate,
      concedeRate,
      groupSize,
      playStyleText: pST,
      playStyleType: pSType,
      playStyleDescription: pSD,
      masterInfoSummary,
      seasonNetMmr: totalSeasonMmrDelta,
      tierStyle
    };
  }, [player, matches, playersById, teamsById, totalPlayersInSeason, activeSeason, coopLeagueTable, singleLeagueTable, t, masterPlayersRanked]);

  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
  const primaryHex = theme.primaryHex;
  const secondaryHex = theme.secondaryHex;
  const glowRgba = theme.glowRgba;
  const isCrimson = theme.themeKey === 'crimson';

  if (!player || !performanceStats) return null;

  const playerTeamDetails = teamsById[player.teamId];
  const displayLogo = playerTeamDetails?.logoUrl || (player as any).logoUrl || (player as any).team?.logoUrl;
  const displayTeamName = playerTeamDetails?.name || player.teamName || (player as any).team?.name || 'Independent';

  const {
    completedMatches,
    upcomingMatches,
    winRate,
    seasonProgress,
    totalMatchesCount,
    chartData,
    performanceStatus,
    stats,
    currentStreakCount,
    currentStreakType,
    cleanSheetsCount,
    scoringRate,
    concedeRate,
    groupSize,
    playStyleText,
    playStyleType,
    playStyleDescription,
    masterInfoSummary,
    seasonNetMmr,
    tierStyle
  } = performanceStats;

  const isTopRank = player.rank === 1;
  const isBottomRank = player.rank >= groupSize - 2 && groupSize > 3;
  const isDefendingChampion = (player.playerId || player.id) === defendingChampionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          // Prevent auto-focusing elements inside ScrollArea so dialog opens at scroll position 0
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent Radix from jumping or scrolling the page to bottom upon modal close
          e.preventDefault();
          const targetY = scrollPositionRef.current;
          if (typeof window !== 'undefined' && targetY !== undefined) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: targetY, behavior: 'instant' });
            });
          }
        }}
        className={cn(
          "!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2",
          "w-[95vw] sm:w-[90vw] max-w-3xl",
          "max-h-[90vh] flex flex-col",
          "border border-white/15 p-0 overflow-hidden",
          "bg-black/95 backdrop-blur-3xl rounded-[2.5rem]",
          "z-50",
          "[&>button:last-child]:top-5 [&>button:last-child]:right-5 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white/20 [&>button:last-child]:transition-all [&>button:last-child]:z-50 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:opacity-100"
        )}
        style={{
          boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 45px ${primaryHex}20`
        }}
      >
        <div className="relative flex flex-col h-full max-h-[90vh] overflow-hidden">
          {/* Top Accent Racing Tracer */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] z-30 pointer-events-none"
            style={{
              background: `linear-gradient(to right, transparent, ${primaryHex}, transparent)`,
              boxShadow: `0 0 20px ${glowRgba}`
            }}
          />

          {/* Scrollable Container with explicit Ref to ensure opening at the very top */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-8 scrollbar-thin scrollbar-track-transparent"
            style={{ scrollbarColor: `${primaryHex}40 transparent` }}
          >
            <div className="relative">
              {/* Dossier Header: Cyber Athlete Profile with 4:3 Grid Composition */}
              <DialogHeader className="relative z-10 text-left space-y-3 pb-2">
                {/* Top Row: Roster Intel Tag with safe right-padding for Close button */}
                <div className="flex items-center justify-between pr-12 sm:pr-14">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md"
                    style={{
                      backgroundColor: `${primaryHex}15`,
                      borderColor: `${primaryHex}35`
                    }}
                  >
                    <Scan className="w-3 h-3 animate-pulse" style={{ color: primaryHex }} />
                    <span className="text-[8.5px] font-black uppercase tracking-[0.25em] italic" style={{ color: primaryHex }}>
                      {theme.editionName} • ROSTER INTEL
                    </span>
                  </div>
                </div>

                {/* 4:3 Grid Composition: Left (col-span-4) Athlete Identity, Right (col-span-3) MMR Telemetry Pod */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 sm:gap-5 items-center">

                  {/* Sisi Kiri (4 Bagian / ~57% lebar): Avatar + Nama + Klub + Playstyle */}
                  <div className="md:col-span-4 flex flex-col sm:flex-row items-center sm:items-center gap-3.5 sm:gap-4 min-w-0">
                    {/* Avatar & Interactive Neon Ring */}
                    <div className="relative group shrink-0">
                      <div
                        className="absolute -inset-4 rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-700 animate-pulse"
                        style={{ backgroundColor: `${primaryHex}40` }}
                      />

                      {player.group && (
                        <div className="absolute -top-2 -left-2 z-20">
                          <Badge
                            className="border-2 border-black font-black text-[9px] px-2.5 h-5 rounded-full italic shadow-xl uppercase"
                            style={{
                              backgroundColor: primaryHex,
                              color: isCrimson ? '#ffffff' : '#000000'
                            }}
                          >
                            GRUP {player.group}
                          </Badge>
                        </div>
                      )}

                      <Avatar
                        className="h-20 w-20 sm:h-24 sm:w-24 shadow-2xl relative z-10 group-hover:scale-105 transition-all duration-500 rounded-3xl border-2"
                        style={{
                          borderColor: primaryHex,
                          boxShadow: `0 0 30px ${primaryHex}40`
                        }}
                      >
                        <AvatarImage src={displayLogo} alt={player.playerName} className="object-cover" referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-black/60 font-black text-xs rounded-3xl">
                          <User className="h-10 w-10 text-white/20" />
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={cn(
                          "absolute -bottom-2 -right-2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl border-2 border-black font-headline text-xs sm:text-sm font-black shadow-xl z-20 transition-transform group-hover:scale-110",
                          isTopRank ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)]" :
                            isBottomRank ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]" : ""
                        )}
                        style={(!isTopRank && !isBottomRank) ? {
                          backgroundColor: primaryHex,
                          color: isCrimson ? '#ffffff' : '#000000',
                          boxShadow: `0 0 20px ${glowRgba}`
                        } : undefined}
                        title={`Peringkat #${player.rank}`}
                        suppressHydrationWarning
                      >
                        #{player.rank}
                      </div>

                      {isDefendingChampion && (
                        <div className="absolute -top-3 -right-3 transform rotate-12 z-20 animate-bounce">
                          <Badge className="bg-amber-500 text-black border-2 border-white p-1.5 rounded-xl shadow-2xl" title="Juara Bertahan">
                            <Award className="w-4 h-4" />
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Player Name, Team, and Tactical Style */}
                    <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                      <DialogTitle
                        className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase italic text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] leading-tight font-headline break-words w-full"
                        title={player.playerName}
                        suppressHydrationWarning
                      >
                        {player.playerName}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Profil dan telemetri performa atlet {player.playerName}
                      </DialogDescription>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 font-black text-white/80 uppercase tracking-wider text-[10px] sm:text-[10.5px] bg-white/[0.04] px-3 py-0.5 rounded-full border border-white/10 shadow-inner">
                          <Avatar className="h-3.5 w-3.5 opacity-90 border border-white/10">
                            <AvatarImage src={displayLogo} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback><Shield className="w-2.5 h-2.5" /></AvatarFallback>
                          </Avatar>
                          <span suppressHydrationWarning>{displayTeamName}</span>
                        </div>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge
                              className={cn(
                                "text-[8.5px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border cursor-help shadow-lg transition-all hover:scale-105",
                                playStyleType === 'attacking' ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20" :
                                  playStyleType === 'defensive' ? "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/20" : ""
                              )}
                              style={playStyleType !== 'attacking' && playStyleType !== 'defensive' ? {
                                backgroundColor: `${primaryHex}20`,
                                color: primaryHex,
                                borderColor: `${primaryHex}40`,
                                boxShadow: `0 0 15px ${primaryHex}20`
                              } : undefined}
                            >
                              {playStyleText}
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 text-center bg-black/95 backdrop-blur-2xl rounded-2xl shadow-2xl z-50 border" style={{ borderColor: `${primaryHex}40` }}>
                            <p className="text-[11px] font-bold leading-relaxed text-white text-center">{playStyleDescription}</p>
                          </PopoverContent>
                        </Popover>

                        {isTopRank && (
                          <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full italic">
                            Leader Klasemen
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sisi Kanan (3 Bagian / ~43% lebar): Dual Telemetry Tiles (Opsi 2) */}
                  <div className="md:col-span-3 w-full">
                    <div
                      className="relative overflow-hidden rounded-2xl border bg-black/80 backdrop-blur-2xl p-3 sm:p-3.5 shadow-xl transition-all duration-300 hover:border-white/30 group/mmrhud"
                      style={{
                        borderColor: `${primaryHex}35`,
                        boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 20px ${glowRgba}, inset 0 1px 0 rgba(255,255,255,0.08)`
                      }}
                    >
                      {/* Top Accent Racing Conduit */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 group-hover/mmrhud:h-[3px]"
                        style={{
                          background: `linear-gradient(to right, transparent, ${secondaryHex}, ${primaryHex}, transparent)`
                        }}
                      />

                      {/* Header Telemetry Bar */}
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 animate-pulse" style={{ color: primaryHex }} />
                          <span className="text-[8.5px] font-black uppercase italic tracking-wider text-white/70">
                            MMR TELEMETRY
                          </span>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm shrink-0",
                            tierStyle.id === 'LEGEND' ? "bg-yellow-400 text-black border-yellow-300 font-extrabold shadow-yellow-400/30" :
                              tierStyle.id === 'TOP_PLAYER' ? "bg-primary text-black border-primary/50 font-extrabold shadow-primary/30" :
                                tierStyle.id === 'REGULER' ? "bg-accent/20 text-accent border-accent/40" :
                                  tierStyle.id === 'AMATEUR' ? "bg-pink-500/20 text-pink-300 border-pink-500/40" :
                                    "bg-white/5 text-white/60 border-white/10"
                          )}
                        >
                          {tierStyle.title}
                        </Badge>
                      </div>

                      {/* Dual Tiles Grid: Current MMR & Global Rank */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Tile 1: Current Rating */}
                        <div
                          className="bg-white/[0.03] border rounded-xl p-2.5 flex flex-col justify-between transition-colors hover:bg-white/[0.05]"
                          style={{ borderColor: `${primaryHex}20` }}
                        >
                          <span className="text-[9px] font-mono font-bold uppercase text-white/50 tracking-wider">
                            MMR RATING
                          </span>
                          <div className="my-1 flex items-baseline gap-1">
                            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter tabular-nums font-headline text-white leading-none">
                              {masterInfoSummary.mmr}
                            </span>
                            <span className="text-[8.5px] font-black uppercase italic tracking-wider" style={{ color: primaryHex }}>
                              PTS
                            </span>
                          </div>
                          <div className="text-[9px] font-mono flex items-center gap-1">
                            {seasonNetMmr !== 0 ? (
                              <span className={seasonNetMmr > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {seasonNetMmr > 0 ? `▲ +${seasonNetMmr}` : `▼ ${seasonNetMmr}`}
                              </span>
                            ) : (
                              <span className="text-white/40 font-bold">● 0</span>
                            )}
                            <span className="text-white/40 text-[8px] uppercase">Season</span>
                          </div>
                        </div>

                        {/* Tile 2: Global Standing */}
                        <div
                          className="bg-white/[0.03] border rounded-xl p-2.5 flex flex-col justify-between transition-colors hover:bg-white/[0.05]"
                          style={{ borderColor: `${primaryHex}20` }}
                        >
                          <span className="text-[9px] font-mono font-bold uppercase text-white/50 tracking-wider">
                            GLOBAL STANDING
                          </span>
                          <div className="my-1 flex items-baseline gap-1">
                            <span
                              className="text-2xl sm:text-3xl font-black italic tracking-tighter tabular-nums font-headline leading-none"
                              style={{
                                color: primaryHex,
                                textShadow: `0 0 15px ${glowRgba}`
                              }}
                            >
                              {masterInfoSummary.rank === 'N/C' ? 'N/C' : `#${masterInfoSummary.rank}`}
                            </span>
                            {masterPlayersRanked?.length > 0 && (
                              <span className="text-[9px] font-mono text-white/40 font-normal">
                                /{masterPlayersRanked.length}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-white/40 truncate">
                            Peak: <span className="text-white/80 font-bold">{masterInfoSummary.peakMmr}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </DialogHeader>

              {/* Core Telemetry Display: Season Performance HUD (Opsi 2 Esports Cockpit) */}
              <div className="space-y-6 mt-6 relative z-10">
                <div
                  className="bg-[#07070a]/90 backdrop-blur-3xl border rounded-[2.2rem] overflow-hidden group transition-all duration-500 relative shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
                  style={{
                    borderColor: `${primaryHex}35`,
                    boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 35px ${primaryHex}15`
                  }}
                >
                  {/* Subtle Neon Horizon Lines */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(to right, transparent, ${primaryHex}, transparent)`
                    }}
                  />
                  <div className="absolute -top-24 right-1/4 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-20" style={{ backgroundColor: primaryHex }} />

                  {/* HUD Header Banner */}
                  <div
                    className="px-5 py-4 border-b border-white/10 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3"
                    style={{
                      background: `linear-gradient(to right, ${primaryHex}18, rgba(10,10,15,0.7), transparent)`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-xl border flex items-center justify-center shadow-lg"
                        style={{
                          backgroundColor: `${primaryHex}18`,
                          borderColor: `${primaryHex}40`
                        }}
                      >
                        <Binary className="w-4 h-4 animate-pulse" style={{ color: primaryHex }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-black tracking-[0.25em] uppercase italic text-white font-headline">
                            SEASON PERFORMANCE HUD
                          </h3>
                        </div>
                        <p className="text-[8.5px] font-mono uppercase tracking-[0.2em] text-white/40">
                          {theme.sysTag} // TELEMETRY & MATCH ANALYTICS
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-black/60 border border-white/10 px-4 py-1.5 rounded-full shadow-inner backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: primaryHex }} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">
                        {performanceStatus?.text || 'ACTIVE FORM'}
                      </span>
                      <div className="h-3 w-[1px] bg-white/20" />
                      <span className="text-[9px] font-mono text-white/40">SYS_V2.4</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Left Cockpit: Huge Radial Gauge with Glowing Ring & Inner Telemetry */}
                      <div
                        className="lg:col-span-5 rounded-[1.75rem] p-5 sm:p-6 border flex flex-col items-center justify-between relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-2xl"
                        style={{
                          borderColor: `${primaryHex}30`,
                          boxShadow: `inset 0 0 35px ${primaryHex}10`
                        }}
                      >
                        {/* Radial Cockpit Top Label */}
                        <div className="w-full flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-white/50 mb-1">
                          <span className="flex items-center gap-1.5 font-bold" style={{ color: primaryHex }}>
                            <Scan className="w-3.5 h-3.5 animate-pulse" /> RADIAL COCKPIT
                          </span>
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[8px]">
                            {stats.played}/{totalMatchesCount} MATCHES
                          </span>
                        </div>

                        {/* Large Circular Gauge SVG with Neon Glow */}
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56 my-2 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]" viewBox="0 0 120 120">
                            <defs>
                              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={secondaryHex || primaryHex} />
                                <stop offset="100%" stopColor={primaryHex} />
                              </linearGradient>
                              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>

                            {/* Outer Track (Progress Musim) */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="rgba(255,255,255,0.06)"
                              strokeWidth="5"
                              fill="transparent"
                            />
                            {/* Outer Progress Value */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke={primaryHex}
                              strokeWidth="5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 50}
                              strokeDashoffset={2 * Math.PI * 50 * (1 - Math.min(seasonProgress, 100) / 100)}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                              style={{
                                filter: `drop-shadow(0 0 6px ${glowRgba})`
                              }}
                            />

                            {/* Inner Track (Win Rate) */}
                            <circle
                              cx="60"
                              cy="60"
                              r="38"
                              stroke="rgba(255,255,255,0.04)"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            {/* Inner Win Rate Arc */}
                            <circle
                              cx="60"
                              cy="60"
                              r="38"
                              stroke="url(#gaugeGradient)"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(winRate, 100) / 100)}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                              style={{
                                filter: `drop-shadow(0 0 10px ${glowRgba})`
                              }}
                            />
                          </svg>

                          {/* Center HUD Information */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50 italic">
                              WIN RATE
                            </span>
                            <div className="flex items-baseline justify-center my-0.5">
                              <span
                                className="text-4xl sm:text-5xl font-black italic tracking-tighter font-headline leading-none"
                                style={{
                                  color: '#ffffff',
                                  textShadow: `0 0 25px ${glowRgba}, 0 0 10px ${primaryHex}`
                                }}
                              >
                                {winRate.toFixed(0)}
                              </span>
                              <span className="text-base sm:text-lg font-black italic ml-0.5" style={{ color: primaryHex }}>
                                %
                              </span>
                            </div>
                            <div
                              className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border mt-1"
                              style={{
                                backgroundColor: `${primaryHex}15`,
                                borderColor: `${primaryHex}40`,
                                color: primaryHex
                              }}
                            >
                              OVR MUSIM
                            </div>
                          </div>
                        </div>

                        {/* Bottom Pod Intel Bars */}
                        <div className="w-full pt-3 mt-1 border-t border-white/10 space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-mono uppercase px-1">
                            <span className="text-white/40 tracking-wider">SEASON PROGRESS</span>
                            <span className="font-bold text-white tracking-widest" style={{ color: primaryHex }}>
                              {seasonProgress.toFixed(0)}% COMPLETE
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.min(seasonProgress, 100)}%`,
                                background: `linear-gradient(to right, ${secondaryHex || primaryHex}, ${primaryHex})`,
                                boxShadow: `0 0 10px ${glowRgba}`
                              }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono uppercase px-1 pt-0.5">
                            <span className="text-white/40">GOAL IMPACT</span>
                            <span className="font-bold">
                              <span className="text-emerald-400">{stats.gf} GF</span>
                              <span className="text-white/30 mx-1">/</span>
                              <span className="text-rose-400">{stats.ga} GA</span>
                              <span className="text-white/40 ml-1.5 font-sans text-[8px]">
                                ({stats.gf - stats.ga >= 0 ? `+${stats.gf - stats.ga}` : stats.gf - stats.ga} GD)
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Telemetry Matrix: 6-Metric Stat Tiles + Form + 4 Deep Intel Cards */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                        {/* Match Matrix (P, W, D, L, GD, PTS) */}
                        <div>
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-1.5 italic">
                              <Activity className="w-3.5 h-3.5" style={{ color: primaryHex }} /> MATCH PERFORMANCE MATRIX
                            </span>
                            <span className="text-[8.5px] font-mono text-white/40 uppercase">SEASON STATS</span>
                          </div>

                          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                            {/* P */}
                            <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border bg-white/[0.03] border-white/10 backdrop-blur-md">
                              <span className="text-[8px] font-mono text-white/40">P</span>
                              <span className="text-lg sm:text-xl font-black italic text-white font-headline">{stats.played}</span>
                              <span className="text-[7.5px] font-mono uppercase text-white/40">MAIN</span>
                            </div>
                            {/* W */}
                            <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border bg-emerald-500/[0.08] border-emerald-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                              <span className="text-[8px] font-mono text-emerald-400/70">W</span>
                              <span className="text-lg sm:text-xl font-black italic text-emerald-400 font-headline">{stats.win}</span>
                              <span className="text-[7.5px] font-mono uppercase text-emerald-400/80">MENANG</span>
                            </div>
                            {/* D */}
                            <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border bg-amber-500/[0.08] border-amber-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                              <span className="text-[8px] font-mono text-amber-400/70">D</span>
                              <span className="text-lg sm:text-xl font-black italic text-amber-400 font-headline">{stats.draw}</span>
                              <span className="text-[7.5px] font-mono uppercase text-amber-400/80">SERI</span>
                            </div>
                            {/* L */}
                            <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border bg-rose-500/[0.08] border-rose-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                              <span className="text-[8px] font-mono text-rose-400/70">L</span>
                              <span className="text-lg sm:text-xl font-black italic text-rose-400 font-headline">{stats.loss}</span>
                              <span className="text-[7.5px] font-mono uppercase text-rose-400/80">KALAH</span>
                            </div>
                            {/* GD */}
                            <div className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border bg-white/[0.03] border-white/10 backdrop-blur-md">
                              <span className="text-[8px] font-mono text-white/40">GD</span>
                              <span className={cn(
                                "text-lg sm:text-xl font-black italic font-headline",
                                stats.gf - stats.ga > 0 ? "text-emerald-400" : stats.gf - stats.ga < 0 ? "text-rose-400" : "text-white"
                              )}>
                                {stats.gf - stats.ga > 0 ? `+${stats.gf - stats.ga}` : stats.gf - stats.ga}
                              </span>
                              <span className="text-[7.5px] font-mono uppercase text-white/40">SELISIH</span>
                            </div>
                            {/* PTS */}
                            <div
                              className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border backdrop-blur-md"
                              style={{
                                backgroundColor: `${primaryHex}18`,
                                borderColor: `${primaryHex}60`,
                                boxShadow: `0 0 15px ${primaryHex}25`
                              }}
                            >
                              <span className="text-[8px] font-mono font-bold" style={{ color: primaryHex }}>PTS</span>
                              <span
                                className="text-lg sm:text-xl font-black italic font-headline"
                                style={{
                                  color: isCrimson ? '#ffffff' : primaryHex,
                                  textShadow: `0 0 12px ${glowRgba}`
                                }}
                              >
                                {player.points ?? ((stats.win * 3) + stats.draw)}
                              </span>
                              <span className="text-[7.5px] font-mono uppercase font-bold" style={{ color: primaryHex }}>POIN</span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Momentum & Recent Form Hub (Eliminates Empty Space) */}
                        <div
                          className="p-3.5 sm:p-4 rounded-2xl border bg-gradient-to-r from-white/[0.04] via-black/50 to-white/[0.02] backdrop-blur-xl relative overflow-hidden"
                          style={{
                            borderColor: `${primaryHex}30`,
                            boxShadow: `inset 0 0 25px ${primaryHex}0d`
                          }}
                        >
                          {/* Header Hub with Streak Tag */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <div
                                className="p-1 rounded-md border"
                                style={{
                                  backgroundColor: `${primaryHex}15`,
                                  borderColor: `${primaryHex}35`
                                }}
                              >
                                <Zap className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">
                                MOMENTUM & RECENT FORM
                              </span>
                            </div>

                            {/* Dynamic Streak Badge */}
                            <div className="flex items-center gap-1.5">
                              {currentStreakType === 'W' && currentStreakCount > 0 && (
                                <Badge
                                  className="border font-black uppercase text-[8.5px] px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    borderColor: 'rgba(16, 185, 129, 0.4)',
                                    color: '#34d399',
                                    boxShadow: '0 0 10px rgba(16,185,129,0.2)'
                                  }}
                                >
                                  <span>STREAK: {currentStreakCount} WINS</span>
                                  <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                                </Badge>
                              )}
                              {currentStreakType === 'unbeaten' && currentStreakCount > 1 && (
                                <Badge
                                  className="border font-black uppercase text-[8.5px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-amber-500/15 border-amber-500/40 text-amber-300"
                                >
                                  <span>UNBEATEN {currentStreakCount} MATCHES</span>
                                  <Zap className="w-3 h-3 text-amber-400" />
                                </Badge>
                              )}
                              {currentStreakType === 'L' && currentStreakCount > 1 && (
                                <Badge
                                  className="border font-black uppercase text-[8.5px] px-2 py-0.5 rounded-full bg-rose-500/15 border-rose-500/40 text-rose-300"
                                >
                                  <span>STREAK: {currentStreakCount} LOSSES</span>
                                </Badge>
                              )}
                              {currentStreakCount <= 1 && currentStreakType !== 'unbeaten' && (
                                <Badge
                                  className="border font-black uppercase text-[8.5px] px-2 py-0.5 rounded-full bg-white/5 border-white/10 text-white/60"
                                >
                                  STABILIZED
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Body: Left (Last 5 Squircles + Score) & Right (Form Telemetry Rate) */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            {/* Left Col: Last 5 Match Squircles with score */}
                            <div className="md:col-span-6 flex flex-col justify-center space-y-1.5">
                              <span className="text-[8px] font-mono uppercase tracking-widest text-white/50">
                                LAST 5 MATCHES
                              </span>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                {completedMatches.slice(0, 5).reverse().map((m, idx) => {
                                  const isWin = m.result === 'W';
                                  const isDraw = m.result === 'D';
                                  const myScore = m.isPlayer1 ? m.s1 : m.s2;
                                  const oppScore = m.isPlayer1 ? m.s2 : m.s1;
                                  return (
                                    <div key={m.id || idx} className="flex flex-col items-center gap-1">
                                      <div
                                        className={cn(
                                          "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[10.5px] sm:text-[11px] font-black italic font-headline border shadow-lg transition-transform hover:scale-110",
                                          isWin ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]" :
                                          isDraw ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]" :
                                          "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                                        )}
                                        title={`${m.result === 'W' ? 'Menang' : m.result === 'D' ? 'Seri' : 'Kalah'} vs ${m.opponent?.name || 'Lawan'} (${myScore}-${oppScore})`}
                                      >
                                        {m.result}
                                      </div>
                                      <span className="text-[7.5px] font-mono text-white/50 leading-none">
                                        {myScore}-{oppScore}
                                      </span>
                                    </div>
                                  );
                                })}
                                {completedMatches.length === 0 && (
                                  <span className="text-[9px] font-mono text-white/30 italic">Belum ada rekam pertandingan</span>
                                )}
                              </div>
                            </div>

                            {/* Right Col: Telemetry Pills (Scoring, Defense, Clean Sheets) */}
                            <div className="md:col-span-6 grid grid-cols-3 gap-1.5 pt-1 md:pt-0">
                              {/* Scoring Rate */}
                              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                                <span className="text-[7.5px] font-mono text-white/40 uppercase">SCORING</span>
                                <span className="text-xs sm:text-sm font-black italic font-headline text-emerald-400 mt-0.5">
                                  {scoringRate}
                                </span>
                                <span className="text-[7px] font-mono text-white/30">GF / GAME</span>
                              </div>

                              {/* Concede Rate */}
                              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                                <span className="text-[7.5px] font-mono text-white/40 uppercase">DEFENSE</span>
                                <span className="text-xs sm:text-sm font-black italic font-headline text-rose-400 mt-0.5">
                                  {concedeRate}
                                </span>
                                <span className="text-[7px] font-mono text-white/30">GA / GAME</span>
                              </div>

                              {/* Clean Sheets */}
                              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                                <span className="text-[7.5px] font-mono text-white/40 uppercase">CLEAN S.</span>
                                <span className="text-xs sm:text-sm font-black italic font-headline text-amber-300 mt-0.5">
                                  {cleanSheetsCount}
                                </span>
                                <span className="text-[7px] font-mono text-white/30">CS LOGGED</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4 Intel Telemetry Cards: Rank Musim, Winrate, MMR Rating, Rank Global */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <IntelCard
                            icon={Percent}
                            label="OVR Musim"
                            value={`${winRate.toFixed(0)}%`}
                            variant="primary"
                            primaryHex={primaryHex}
                            glowRgba={glowRgba}
                            tooltip="Efektivitas raihan poin dalam musim aktif ini."
                          />
                          <IntelCard
                            icon={Trophy}
                            label={activeSeason?.type === 'Hybrid' ? `Rank Grup ${player.group || ''}` : "Rank Musim"}
                            value={`#${player.rank}`}
                            variant="primary"
                            primaryHex={primaryHex}
                            glowRgba={glowRgba}
                            tooltip="Posisi saat ini dalam klasemen grup / klasemen musim."
                          />
                          <IntelCard
                            icon={Flame}
                            label={masterInfoSummary.isCoop ? "MMR Avg" : "MMR Rating"}
                            value={masterInfoSummary.mmr}
                            variant="gold"
                            tooltip={masterInfoSummary.isCoop ? `Karir gabungan: P1 (${masterInfoSummary.p1Mmr}) & P2 (${masterInfoSummary.p2Mmr})` : `Rating MMR dinamis resmi (Peak: ${masterInfoSummary.peakMmr}${masterInfoSummary.legacyOvr ? `, Legacy OVR: ${masterInfoSummary.legacyOvr}` : ''})`}
                          />
                          <IntelCard
                            icon={Star}
                            label="Rank Global"
                            value={masterInfoSummary.rank === 'N/C' ? 'N/C' : `#${masterInfoSummary.rank}`}
                            variant="gold"
                            tooltip={masterInfoSummary.isCoop ? "Peringkat karir terbaik di antara kedua pemain." : "Peringkat elit berdasarkan MMR karir global pemain."}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Section: RIWAYAT, SISA LAGA, TREN */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex justify-center mb-5">
                    <TabsList className="grid grid-cols-3 w-full h-11 sm:h-12 bg-black/80 p-1 border border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-full shadow-lg">
                      {['history', 'upcoming', 'trend'].map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className={cn(
                            "h-full rounded-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-[11px] italic transition-all duration-300",
                            theme.tabsActiveBg,
                            "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                          )}
                        >
                          <span>{tab === 'history' ? 'RIWAYAT LAGA' : tab === 'upcoming' ? 'SISA LAGA' : 'TREN GRAFIK'}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* TAB 1: Match History */}
                  <TabsContent value="history" className="mt-0 outline-none animate-in fade-in duration-300">
                    <HistoryTab
                      completedMatches={completedMatches}
                      primaryHex={primaryHex}
                      glowRgba={glowRgba}
                    />
                  </TabsContent>

                  {/* TAB 2: Upcoming Matches */}
                  <TabsContent value="upcoming" className="mt-0 outline-none animate-in fade-in duration-300">
                    <UpcomingTab
                      upcomingMatches={upcomingMatches}
                      primaryHex={primaryHex}
                    />
                  </TabsContent>

                  {/* TAB 3: Momentum Trend Chart */}
                  <TabsContent value="trend" className="mt-0 outline-none animate-in fade-in duration-300">
                    <TrendTab
                      chartData={chartData}
                      isMounted={isMounted}
                      primaryHex={primaryHex}
                      glowRgba={glowRgba}
                      isCrimson={isCrimson}
                    />
                  </TabsContent>
                </Tabs>

                {/* Technical Analysis Disclaimer */}
                <div
                  className="rounded-2xl p-4 sm:p-5 text-center mt-6 relative overflow-hidden group/disclaimer border"
                  style={{
                    backgroundColor: `${primaryHex}0A`,
                    borderColor: `${primaryHex}25`
                  }}
                >
                  <p className="text-[8px] sm:text-[9px] text-white/40 font-black tracking-[0.25em] uppercase mb-1 relative z-10 italic">
                    Technical Analysis & Match Stats Disclaimer
                  </p>
                  <p
                    className="text-[10px] sm:text-[11px] font-bold italic leading-relaxed text-center relative z-10 max-w-xl mx-auto"
                    style={{ color: `${primaryHex}CC` }}
                  >
                    Data dikalkulasi berdasarkan performa agregat pemain dalam seluruh pertandingan liga. Konsistensi kemenangan di atas rata-rata mencerminkan stabilitas taktis yang solid.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
