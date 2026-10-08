'use client';

import { useMemo } from "react";
import type { LeagueEntry, Player, Team, WithId, Season } from "@/lib/types";
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
  Trophy
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { StatCard, StatCardSkeleton } from "./stats/stat-card";

export { StatCard, StatCardSkeleton } from "./stats/stat-card";
export type { StatVariant, VariantConfig } from "./stats/stat-card";

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
          Match Analytics Radar Initialized
        </h3>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest font-mono max-w-sm leading-relaxed">
          Awaiting match results to generate live performance statistics and leaderboard records.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
      {stats.mostWins.length > 0 && (
        <StatCard 
          title={t('fun_stats_most_wins')}
          subtitle="MOST WINS // WIN RECORD"
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
          subtitle="GOAL DIFFERENCE // GD LEADER"
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
          subtitle="BEST DEFENCE // MIN CONCEDED"
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
          subtitle="TOP ATTACK // GOAL MACHINE"
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
          subtitle="DRAW RECORD // MOST TIED MATCHES"
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
          subtitle="LEAKY DEFENCE // MOST GOALS CONCEDED"
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