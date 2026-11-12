'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season, Match } from "@/lib/types";
import { Card } from "./ui/card";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Handshake, 
  Flame, 
  Target, 
  Zap, 
  Radio, 
  Gauge, 
  Trophy,
  Activity
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { StatCard, StatCardSkeleton } from "./stats/stat-card";

export { StatCard, StatCardSkeleton } from "./stats/stat-card";
export type { StatVariant, VariantConfig } from "./stats/stat-card";

interface LeagueStatsProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>; team?: WithId<Team> })[];
  matches?: WithId<Match>[];
  isLoading?: boolean;
  seasonType?: Season['type'];
  isSeasonCoop?: boolean;
}

export function LeagueStats({ tableData, matches, isLoading, seasonType, isSeasonCoop }: LeagueStatsProps) {
  const { t } = useTranslation();

  const { stats, hasCompletedPlayoffs } = useMemo(() => {
    if (!tableData || tableData.length === 0) {
      return {
        stats: {
          mostWins: [],
          unbeaten: [],
          bestAttacker: [],
          bestDefense: [],
          bestGD: [],
          worstDefender: [],
          kingOfDraws: [],
          championshipContenders: [],
        },
        hasCompletedPlayoffs: false,
      };
    }

    const isCoop = isSeasonCoop || seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';

    // Pertandingan playoff yang telah selesai (babak selain 'Group')
    const completedPlayoffMatches = (matches || []).filter(
      m => m.isCompleted && m.round && m.round !== 'Group'
    );
    const hasPlayoffs = completedPlayoffMatches.length > 0;

    // Hitung statistik kumulatif menyeluruh (Fase Grup / Liga + Babak Playoff) untuk setiap peserta
    const cumulativeTable = tableData.map(entry => {
      const pId = isCoop ? entry.id : (entry.playerId || entry.id);

      const pPlayoffMatches = completedPlayoffMatches.filter(
        m => m.player1Id === pId || m.player2Id === pId
      );

      let playoffPlayed = 0;
      let playoffWin = 0;
      let playoffDraw = 0;
      let playoffLoss = 0;
      let playoffGoalsFor = 0;
      let playoffGoalsAgainst = 0;

      pPlayoffMatches.forEach(m => {
        const isP1 = m.player1Id === pId;
        const isBo3 = m.round && m.round !== 'Group';

        let s1 = 0;
        let s2 = 0;
        if (
          isBo3 &&
          ((m.player1Wins !== null && m.player1Wins !== undefined) ||
            (m.player2Wins !== null && m.player2Wins !== undefined))
        ) {
          s1 = m.player1Wins ?? 0;
          s2 = m.player2Wins ?? 0;
        } else {
          s1 = m.player1Score ?? 0;
          s2 = m.player2Score ?? 0;
        }

        const myScore = isP1 ? s1 : s2;
        const oppScore = isP1 ? s2 : s1;

        playoffPlayed++;
        if (myScore > oppScore) playoffWin++;
        else if (myScore < oppScore) playoffLoss++;
        else playoffDraw++;

        const myGf = isP1 ? (m.player1Score ?? 0) : (m.player2Score ?? 0);
        const myGa = isP1 ? (m.player2Score ?? 0) : (m.player1Score ?? 0);
        playoffGoalsFor += myGf;
        playoffGoalsAgainst += myGa;
      });

      const totalPlayed = (entry.played || 0) + playoffPlayed;
      const totalWin = (entry.win || 0) + playoffWin;
      const totalDraw = (entry.draw || 0) + playoffDraw;
      const totalLoss = (entry.loss || 0) + playoffLoss;
      const totalGoalsFor = (entry.goalsFor || 0) + playoffGoalsFor;
      const totalGoalsAgainst = (entry.goalsAgainst || 0) + playoffGoalsAgainst;
      const totalGoalDifference = totalGoalsFor - totalGoalsAgainst;

      return {
        ...entry,
        played: totalPlayed,
        win: totalWin,
        draw: totalDraw,
        loss: totalLoss,
        goalsFor: totalGoalsFor,
        goalsAgainst: totalGoalsAgainst,
        goalDifference: totalGoalDifference,
        playoffMatchesCount: playoffPlayed,
      };
    });

    const playersWhoPlayed = cumulativeTable.filter(p => p.played > 0);
    if (playersWhoPlayed.length === 0) {
      return {
        stats: { mostWins: [], unbeaten: [], bestAttacker: [], bestDefense: [], bestGD: [], worstDefender: [], kingOfDraws: [], championshipContenders: [] },
        hasCompletedPlayoffs: hasPlayoffs,
      };
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

    return {
      stats: { mostWins, unbeaten, bestAttacker, bestDefense, bestGD, worstDefender, kingOfDraws, championshipContenders },
      hasCompletedPlayoffs: hasPlayoffs,
    };
  }, [tableData, matches, seasonType, isSeasonCoop]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
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
        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white/90 font-headline">
          Match Analytics Radar Initialized
        </h3>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest font-mono max-w-sm leading-relaxed">
          Awaiting match results to generate live performance statistics and leaderboard records.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {hasCompletedPlayoffs && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit text-[10px] font-black uppercase tracking-wider shadow-sm">
          <Activity className="w-3.5 h-3.5 animate-pulse text-primary shrink-0" />
          <span>Statistik Akumulatif: Fase Liga + Babak Playoff Aktif</span>
        </div>
      )}

      {/* OPSI 1: BENTO SPOTLIGHT - 2 HERO CARDS DI ATAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.mostWins.length > 0 && (
          <StatCard 
            title={t('fun_stats_most_wins')}
            subtitle={hasCompletedPlayoffs ? "LEAGUE + PLAYOFF" : "WIN RECORD"}
            icon={Trophy}
            players={stats.mostWins}
            valueKey="win"
            valueSuffix="W"
            variant="volt"
            ghostText="VICTORY"
            isHero={true}
          />
        )}

        {seasonType !== 'Co-Op' && stats.bestAttacker.length > 0 && (
          <StatCard 
            title={t('fun_stats_best_attacker')}
            subtitle={hasCompletedPlayoffs ? "LEAGUE + PLAYOFF" : "GOAL MACHINE"}
            icon={Target}
            players={stats.bestAttacker}
            valueKey="goalsFor"
            valueSuffix="GLS"
            variant="amber"
            ghostText="APEX"
            isHero={true}
          />
        )}
      </div>

      {/* OPSI 1: BENTO SPOTLIGHT - 4 COMPACT TILES DI BAWAH */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {seasonType !== 'Co-Op' && stats.bestGD.length > 0 && (
          <StatCard 
            title={t('fun_stats_best_gd')}
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
            icon={ShieldCheck}
            players={stats.bestDefense}
            valueKey="goalsAgainst"
            valueSuffix="GA"
            variant="cyan"
            ghostText="WALL"
          />
        )}

        {seasonType !== 'Co-Op' && stats.kingOfDraws.length > 0 && (
          <StatCard 
            title={t('fun_stats_king_of_draws')}
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
            icon={ShieldAlert}
            players={stats.worstDefender}
            valueKey="goalsAgainst"
            valueSuffix="GA"
            variant="destructive"
            ghostText="BREACH"
          />
        )}
      </div>

      {/* ADDITIONAL ACCLAIMS (JIKA ADA JUARA TAK TERKALAHKAN / PENGEJAR GELAR) */}
      {(showUnbeaten || (seasonType === 'Single' && stats.championshipContenders.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {showUnbeaten && (
            <StatCard 
              title={t('fun_stats_unbeaten')}
              subtitle={hasCompletedPlayoffs ? "IMMORTAL RUN // LEAGUE + PLAYOFF" : "IMMORTAL_RUN // ZERO LOSS"}
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
      )}
    </div>
  );
}
