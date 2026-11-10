'use client';

import { useMemo } from 'react';
import type {
  Season,
  LeagueEntry,
  CoOpLeagueEntry,
  WithId,
  Team,
  Player,
  PlayerWithTeam,
} from '@/lib/types';
import { resolveLogo } from '@/lib/logo-utils';
import { sortAndRankStandings } from '@/lib/tournament/tie-breaker';

export type EnrichedStandingsEntry = WithId<LeagueEntry> & {
  player?: WithId<Player>;
  team?: WithId<Team>;
  logoUrl?: string;
  [key: string]: any;
};

export interface UseLeagueStandingsParams {
  singleLeagueTable?: WithId<LeagueEntry>[] | null;
  coopLeagueTable?: WithId<CoOpLeagueEntry>[] | null;
  activeSeason: WithId<Season> | null;
  playersById: Record<string, PlayerWithTeam>;
  teamsById: Record<string, WithId<Team>>;
  isSeasonCoop: boolean;
  isHybrid: boolean;
}

export function useLeagueStandings({
  singleLeagueTable,
  coopLeagueTable,
  activeSeason,
  playersById,
  teamsById,
  isSeasonCoop,
  isHybrid,
}: UseLeagueStandingsParams) {
  const sortedTable = useMemo<EnrichedStandingsEntry[]>(() => {
    const tableData = !isSeasonCoop ? singleLeagueTable : coopLeagueTable;
    if (!tableData) return [];

    let enrichedTable: EnrichedStandingsEntry[];

    if (isSeasonCoop && coopLeagueTable) {
      enrichedTable = coopLeagueTable.map((entry) => {
        const teamId = entry.player1TeamId;
        const team = teamsById[teamId];
        const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.teamName);

        return {
          ...(entry as any),
          playerName: entry.teamName,
          teamId,
          teamName: team ? team.name : entry.player1TeamName,
          playerId: entry.id,
          team,
          logoUrl,
        };
      });
    } else if (singleLeagueTable) {
      enrichedTable = singleLeagueTable.map((entry) => {
        const player = playersById[entry.playerId];
        const teamId = entry.teamId || player?.teamId || '';
        const team = teamsById[teamId];
        const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.playerName);

        return {
          ...entry,
          player,
          team,
          logoUrl,
        };
      });
    } else {
      enrichedTable = [];
    }

    const isNotStarted = activeSeason?.status === 'Not Started';
    return sortAndRankStandings(enrichedTable, isNotStarted) as EnrichedStandingsEntry[];
  }, [singleLeagueTable, coopLeagueTable, activeSeason, playersById, teamsById, isSeasonCoop]);

  const { groupA, groupB } = useMemo(() => {
    if (
      !isHybrid ||
      activeSeason?.type === 'Single Hybrid' ||
      activeSeason?.type === 'Co-Op Hybrid'
    ) {
      return { groupA: [], groupB: [] };
    }

    const a = sortAndRankStandings(
      sortedTable.filter((p) => p.group === 'A')
    ) as EnrichedStandingsEntry[];

    const b = sortAndRankStandings(
      sortedTable.filter((p) => p.group === 'B')
    ) as EnrichedStandingsEntry[];

    return { groupA: a, groupB: b };
  }, [sortedTable, isHybrid, activeSeason]);

  return {
    sortedTable,
    groupA,
    groupB,
  };
}

