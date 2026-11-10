import type { Season, LeagueEntry, CoOpLeagueEntry, WithId, MatchRound } from '@/lib/types';

export interface GeneratedFixture {
  seasonId: string;
  player1Id: string;
  player2Id: string;
  player1Score: null;
  player2Score: null;
  player1Wins: null;
  player2Wins: null;
  isCompleted: false;
  status: 'Scheduled';
  matchDateMillis: number;
  round?: MatchRound;
  division?: 'div-1' | 'div-2';
}

export interface FixtureGenerationResult {
  fixtures: GeneratedFixture[];
  isDiv2Merged?: boolean;
  mergedEntryIds?: string[];
  notice?: {
    type: 'div2_merged' | 'div2_active' | 'standard';
    div1Count?: number;
    div2Count?: number;
  };
}

export interface GenerateFixturesParams {
  seasonId: string;
  season: Season;
  singleLeagueTable?: WithId<LeagueEntry>[];
  coopLeagueTable?: WithId<CoOpLeagueEntry>[];
  isSeasonCoop: boolean;
  baseTimestamp?: number;
}

export function generateFixtures({
  seasonId,
  season,
  singleLeagueTable = [],
  coopLeagueTable = [],
  isSeasonCoop,
  baseTimestamp = Date.now(),
}: GenerateFixturesParams): FixtureGenerationResult {
  const tableToUse = !isSeasonCoop ? singleLeagueTable : coopLeagueTable;
  const seasonType = season.type || 'Single';
  const isHybridMode = seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid' || seasonType === 'Single Hybrid';
  const fixtures: GeneratedFixture[] = [];
  let matchCounter = 0;

  const nextMatchTime = () => baseTimestamp + (matchCounter++) * 1000;

  // ============================================================
  // MULTI-DIVISION SYSTEM (DIVISI 1 & DIVISI 2)
  // ============================================================
  if (season.hasDivisions && !isSeasonCoop && singleLeagueTable.length > 0) {
    const div2Pool = singleLeagueTable.filter((e) => e.division === 'div-2');
    const div1Pool = singleLeagueTable.filter((e) => e.division !== 'div-2');

    // SPECIAL RULE:
    // If Divisi 2 has <= 2 players, auto-merge to Divisi 1
    if (div2Pool.length > 0 && div2Pool.length <= 2) {
      const mergedPool = singleLeagueTable;
      const meetings =
        seasonType === 'Single'
          ? 2
          : seasonType === 'Single Hybrid' || seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid'
          ? season.hybridGroupMeetings || 1
          : 1;

      for (let i = 0; i < mergedPool.length; i++) {
        for (let j = i + 1; j < mergedPool.length; j++) {
          const id1 = mergedPool[i].playerId;
          const id2 = mergedPool[j].playerId;
          for (let k = 0; k < meetings; k++) {
            let p1Id = k === 0 ? id1 : id2;
            let p2Id = k === 0 ? id2 : id1;
            if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
            fixtures.push({
              seasonId,
              player1Id: p1Id,
              player2Id: p2Id,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
              division: 'div-1',
            });
          }
        }
      }

      return {
        fixtures,
        isDiv2Merged: true,
        mergedEntryIds: div2Pool.map((e) => e.id),
        notice: {
          type: 'div2_merged',
          div2Count: div2Pool.length,
        },
      };
    } else if (div2Pool.length >= 3) {
      // SEPARATE COMPETITIONS: Div 1 and Div 2 both have full competition!

      // Division 1 Fixtures
      if (seasonType === 'Hybrid') {
        const gA = div1Pool.filter((p) => p.group === 'A');
        const gB = div1Pool.filter((p) => p.group === 'B');
        const meetings = season.hybridGroupMeetings || 1;

        const generateHybridDiv1GroupMatches = (group: WithId<LeagueEntry>[]) => {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const p1Id = group[i].playerId;
              const p2Id = group[j].playerId;
              for (let k = 0; k < meetings; k++) {
                let subP1 = k === 0 ? p1Id : p2Id;
                let subP2 = k === 0 ? p2Id : p1Id;
                if (meetings === 1 && Math.random() > 0.5) [subP1, subP2] = [subP2, subP1];
                fixtures.push({
                  seasonId,
                  player1Id: subP1,
                  player2Id: subP2,
                  player1Score: null,
                  player2Score: null,
                  player1Wins: null,
                  player2Wins: null,
                  isCompleted: false,
                  status: 'Scheduled',
                  matchDateMillis: nextMatchTime(),
                  round: 'Group',
                  division: 'div-1',
                });
              }
            }
          }
        };

        generateHybridDiv1GroupMatches(gA);
        generateHybridDiv1GroupMatches(gB);
      } else {
        const div1Meetings =
          seasonType === 'Single'
            ? 2
            : seasonType === 'Single Hybrid'
            ? season.hybridGroupMeetings || 1
            : 1;

        for (let i = 0; i < div1Pool.length; i++) {
          for (let j = i + 1; j < div1Pool.length; j++) {
            const id1 = div1Pool[i].playerId;
            const id2 = div1Pool[j].playerId;
            for (let k = 0; k < div1Meetings; k++) {
              let p1Id = k === 0 ? id1 : id2;
              let p2Id = k === 0 ? id2 : id1;
              if (div1Meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
              fixtures.push({
                seasonId,
                player1Id: p1Id,
                player2Id: p2Id,
                player1Score: null,
                player2Score: null,
                player1Wins: null,
                player2Wins: null,
                isCompleted: false,
                status: 'Scheduled',
                matchDateMillis: nextMatchTime(),
                round: 'Group',
                division: 'div-1',
              });
            }
          }
        }
      }

      // Division 2 Fixtures:
      // If without playoff: 2x (Home & Away)
      // If with playoff: 1x (Single Round-Robin)
      const div2Meetings = season.division2HasPlayoff ? 1 : 2;
      for (let i = 0; i < div2Pool.length; i++) {
        for (let j = i + 1; j < div2Pool.length; j++) {
          const id1 = div2Pool[i].playerId;
          const id2 = div2Pool[j].playerId;
          for (let k = 0; k < div2Meetings; k++) {
            let p1Id = k === 0 ? id1 : id2;
            let p2Id = k === 0 ? id2 : id1;
            if (div2Meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
            fixtures.push({
              seasonId,
              player1Id: p1Id,
              player2Id: p2Id,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
              division: 'div-2',
            });
          }
        }
      }

      return {
        fixtures,
        isDiv2Merged: false,
        notice: {
          type: 'div2_active',
          div1Count: div1Pool.length,
          div2Count: div2Pool.length,
        },
      };
    } else {
      // div2Pool is 0: all players are in Div 1
      const meetings =
        seasonType === 'Single'
          ? 2
          : seasonType === 'Single Hybrid' || seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid'
          ? season.hybridGroupMeetings || 1
          : 1;

      for (let i = 0; i < div1Pool.length; i++) {
        for (let j = i + 1; j < div1Pool.length; j++) {
          const id1 = div1Pool[i].playerId;
          const id2 = div1Pool[j].playerId;
          for (let k = 0; k < meetings; k++) {
            let p1Id = k === 0 ? id1 : id2;
            let p2Id = k === 0 ? id2 : id1;
            if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
            fixtures.push({
              seasonId,
              player1Id: p1Id,
              player2Id: p2Id,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
              division: 'div-1',
            });
          }
        }
      }

      return {
        fixtures,
        isDiv2Merged: false,
        notice: {
          type: 'standard',
          div1Count: div1Pool.length,
        },
      };
    }
  }

  // ============================================================
  // SINGLE HYBRID FORMAT
  // ============================================================
  if (seasonType === 'Single Hybrid') {
    const meetings = season.hybridGroupMeetings || 1;
    for (let i = 0; i < tableToUse.length; i++) {
      for (let j = i + 1; j < tableToUse.length; j++) {
        const id1 = (tableToUse[i] as WithId<LeagueEntry>).playerId;
        const id2 = (tableToUse[j] as WithId<LeagueEntry>).playerId;
        for (let k = 0; k < meetings; k++) {
          let p1Id = k === 0 ? id1 : id2;
          let p2Id = k === 0 ? id2 : id1;
          if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
          fixtures.push({
            seasonId,
            player1Id: p1Id,
            player2Id: p2Id,
            player1Score: null,
            player2Score: null,
            player1Wins: null,
            player2Wins: null,
            isCompleted: false,
            status: 'Scheduled',
            matchDateMillis: nextMatchTime(),
            round: 'Group',
          });
        }
      }
    }
    return { fixtures, notice: { type: 'standard' } };
  }

  // ============================================================
  // CO-OP HYBRID FORMAT
  // ============================================================
  if (seasonType === 'Co-Op Hybrid') {
    const group = tableToUse;
    const meetings = season.hybridGroupMeetings || 1;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const id1 = group[i].id;
        const id2 = group[j].id;
        for (let k = 0; k < meetings; k++) {
          let p1Id = k === 0 ? id1 : id2;
          let p2Id = k === 0 ? id2 : id1;
          if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
          fixtures.push({
            seasonId,
            player1Id: p1Id,
            player2Id: p2Id,
            player1Score: null,
            player2Score: null,
            player1Wins: null,
            player2Wins: null,
            isCompleted: false,
            status: 'Scheduled',
            matchDateMillis: nextMatchTime(),
            round: 'Group',
          });
        }
      }
    }
    return { fixtures, notice: { type: 'standard' } };
  }

  // ============================================================
  // HYBRID (GROUP A & B) FORMAT
  // ============================================================
  if (seasonType === 'Hybrid') {
    const gA = tableToUse.filter((p) => p.group === 'A');
    const gB = tableToUse.filter((p) => p.group === 'B');
    const meetings = season.hybridGroupMeetings || 1;

    const generateGroupMatches = (group: any[]) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const p1Id = isSeasonCoop ? group[i].id : (group[i] as WithId<LeagueEntry>).playerId;
          const p2Id = isSeasonCoop ? group[j].id : (group[j] as WithId<LeagueEntry>).playerId;
          if (meetings === 2) {
            fixtures.push({
              seasonId,
              player1Id: p1Id,
              player2Id: p2Id,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
            });
            fixtures.push({
              seasonId,
              player1Id: p2Id,
              player2Id: p1Id,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
            });
          } else {
            let subP1 = p1Id;
            let subP2 = p2Id;
            if (Math.random() > 0.5) [subP1, subP2] = [subP2, subP1];
            fixtures.push({
              seasonId,
              player1Id: subP1,
              player2Id: subP2,
              player1Score: null,
              player2Score: null,
              player1Wins: null,
              player2Wins: null,
              isCompleted: false,
              status: 'Scheduled',
              matchDateMillis: nextMatchTime(),
              round: 'Group',
            });
          }
        }
      }
    };

    generateGroupMatches(gA);
    generateGroupMatches(gB);
    return { fixtures, notice: { type: 'standard' } };
  }

  // ============================================================
  // DEFAULT / SINGLE / CO-OP (STANDARD ROUND ROBIN)
  // ============================================================
  const meetings = isSeasonCoop ? 1 : seasonType === 'Single' ? 2 : 1;
  for (let i = 0; i < tableToUse.length; i++) {
    for (let j = i + 1; j < tableToUse.length; j++) {
      const id1 = isSeasonCoop ? tableToUse[i].id : (tableToUse[i] as WithId<LeagueEntry>).playerId;
      const id2 = isSeasonCoop ? tableToUse[j].id : (tableToUse[j] as WithId<LeagueEntry>).playerId;
      for (let k = 0; k < meetings; k++) {
        let p1Id = k === 0 ? id1 : id2;
        let p2Id = k === 0 ? id2 : id1;
        if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
        fixtures.push({
          seasonId,
          player1Id: p1Id,
          player2Id: p2Id,
          player1Score: null,
          player2Score: null,
          player1Wins: null,
          player2Wins: null,
          isCompleted: false,
          status: 'Scheduled',
          matchDateMillis: nextMatchTime(),
          round: isHybridMode ? 'Group' : undefined,
        });
      }
    }
  }

  return { fixtures, notice: { type: 'standard' } };
}

