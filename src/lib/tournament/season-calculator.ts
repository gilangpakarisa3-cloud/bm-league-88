import { Timestamp } from 'firebase/firestore';
import type { Season, SeasonRecord, Match, WithId } from '@/lib/types';

export interface StandingsTableEntry {
  id: string;
  playerId?: string;
  playerName: string;
  teamName?: string;
  points: number;
  win: number;
  draw?: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  played?: number;
  division?: 'div-1' | 'div-2';
  logoUrl?: string;
  team?: { logoUrl?: string };
  [key: string]: any;
}

export interface CalculateSeasonCompletionParams {
  activeSeason: WithId<Season>;
  sortedTable: StandingsTableEntry[];
  matches: WithId<Match>[];
  isSeasonCoop: boolean;
  isHybrid: boolean;
}

export function calculateSeasonRecord({
  activeSeason,
  sortedTable,
  matches,
  isSeasonCoop,
  isHybrid,
}: CalculateSeasonCompletionParams): SeasonRecord {
  const isMultiDiv = Boolean(activeSeason.hasDivisions && !activeSeason.isDiv2Merged);
  const div1Table = isMultiDiv ? sortedTable.filter((e) => e.division !== 'div-2') : sortedTable;
  const div2Table = isMultiDiv ? sortedTable.filter((e) => e.division === 'div-2') : [];

  let winner = div1Table[0] || sortedTable[0];
  if (isHybrid) {
    const finalMatch = matches?.find(
      (m) =>
        (m.round === 'Grand-Final' ||
          m.bracketId === 'playoff-final' ||
          m.bracketId === 'playoff-m18') &&
        m.isCompleted &&
        m.division !== 'div-2'
    );
    if (finalMatch) {
      const isBo3 =
        activeSeason.type === 'Co-Op' ||
        activeSeason.type === 'Co-Op Hybrid' ||
        (finalMatch.round && finalMatch.round !== 'Group');
      const s1 = isBo3 ? finalMatch.player1Wins ?? 0 : finalMatch.player1Score ?? 0;
      const s2 = isBo3 ? finalMatch.player2Wins ?? 0 : finalMatch.player2Score ?? 0;
      const wId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
      const wEntry = sortedTable.find((p) => (p.playerId || p.id) === wId);
      if (wEntry) winner = wEntry;
    }
  }

  const wIdToFilter = isSeasonCoop ? winner.id : winner.playerId;
  const playerMatches =
    matches?.filter(
      (m) => m.isCompleted && (m.player1Id === wIdToFilter || m.player2Id === wIdToFilter)
    ) || [];

  let totP = 0;
  let totW = 0;
  let totD = 0;
  let totL = 0;
  let totGF = 0;
  let totGA = 0;

  playerMatches.forEach((m) => {
    totP++;
    const isP1 = m.player1Id === wIdToFilter;
    const isBo3 = m.round && m.round !== 'Group';
    const s1 = isBo3 ? m.player1Wins ?? 0 : m.player1Score ?? 0;
    const s2 = isBo3 ? m.player2Wins ?? 0 : m.player2Score ?? 0;
    const pRes = isP1 ? s1 : s2;
    const oRes = isP1 ? s2 : s1;
    if (pRes > oRes) totW++;
    else if (pRes < oRes) totL++;
    else totD++;

    if (m.player1Score !== null && m.player2Score !== null) {
      totGF += isP1 ? m.player1Score : m.player2Score;
      totGA += isP1 ? m.player2Score : m.player1Score;
    }
  });

  // Cumulative statistics for main division (League + Playoffs)
  const completedPlayoffMatches = (matches || []).filter(
    (m) => m.isCompleted && m.round && m.round !== 'Group'
  );

  const cumulativeDiv1Table = div1Table.map((entry) => {
    const pId = isSeasonCoop ? entry.id : entry.playerId || entry.id;
    const pPlayoffMatches = completedPlayoffMatches.filter(
      (m) => m.player1Id === pId || m.player2Id === pId
    );

    let playoffPlayed = 0;
    let playoffWin = 0;
    let playoffDraw = 0;
    let playoffLoss = 0;
    let playoffGoalsFor = 0;
    let playoffGoalsAgainst = 0;

    pPlayoffMatches.forEach((m) => {
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

      const myGf = isP1 ? m.player1Score ?? 0 : m.player2Score ?? 0;
      const myGa = isP1 ? m.player2Score ?? 0 : m.player1Score ?? 0;
      playoffGoalsFor += myGf;
      playoffGoalsAgainst += myGa;
    });

    return {
      ...entry,
      played: (entry.played || 0) + playoffPlayed,
      win: (entry.win || 0) + playoffWin,
      draw: (entry.draw || 0) + playoffDraw,
      loss: (entry.loss || 0) + playoffLoss,
      goalsFor: (entry.goalsFor || 0) + playoffGoalsFor,
      goalsAgainst: (entry.goalsAgainst || 0) + playoffGoalsAgainst,
    };
  });

  const activeOverallPlayers = cumulativeDiv1Table.filter((p) => (p.played || 0) > 0);
  let bAtt = null;
  let wDef = null;
  let mWinP = null;

  if (activeOverallPlayers.length > 0) {
    if (!isSeasonCoop) {
      const maxGF = Math.max(...activeOverallPlayers.map((p) => p.goalsFor || 0));
      const bestAttacker = activeOverallPlayers.find((p) => (p.goalsFor || 0) === maxGF && maxGF > 0);
      if (bestAttacker) bAtt = { playerName: bestAttacker.playerName, value: bestAttacker.goalsFor };

      const maxGA = Math.max(...activeOverallPlayers.map((p) => p.goalsAgainst || 0));
      const worstDefender = activeOverallPlayers.find((p) => (p.goalsAgainst || 0) === maxGA && maxGA > 0);
      if (worstDefender) wDef = { playerName: worstDefender.playerName, value: worstDefender.goalsAgainst };
    }
    const maxW = Math.max(...activeOverallPlayers.map((p) => p.win || 0));
    const mostWins = activeOverallPlayers.find((p) => (p.win || 0) === maxW && maxW > 0);
    if (mostWins) mWinP = { playerName: mostWins.playerName, value: mostWins.win };
  }

  // Division 2 Record calculation
  let division2Record: SeasonRecord['division2Record'] = null;
  if (isMultiDiv && div2Table.length > 0) {
    let d2Winner = div2Table[0];
    let d2RunnerUpName = div2Table[1]?.playerName || 'Runner-Up';
    let d2RunnerUpTeam = div2Table[1]?.teamName || '';

    const d2FinalMatch = matches?.find(
      (m) =>
        (m.round === 'Grand-Final' ||
          m.bracketId === 'playoff-final' ||
          m.bracketId === 'playoff-m18') &&
        m.isCompleted &&
        m.division === 'div-2'
    );

    if (d2FinalMatch) {
      const s1 = d2FinalMatch.player1Wins ?? d2FinalMatch.player1Score ?? 0;
      const s2 = d2FinalMatch.player2Wins ?? d2FinalMatch.player2Score ?? 0;
      const wId = s1 > s2 ? d2FinalMatch.player1Id : d2FinalMatch.player2Id;
      const ruId = s1 > s2 ? d2FinalMatch.player2Id : d2FinalMatch.player1Id;
      const wEntry = div2Table.find((p) => (p.playerId || p.id) === wId);
      const ruEntry = div2Table.find((p) => (p.playerId || p.id) === ruId);
      if (wEntry) d2Winner = wEntry;
      if (ruEntry) {
        d2RunnerUpName = ruEntry.playerName;
        d2RunnerUpTeam = ruEntry.teamName || '';
      }
    }

    const d2WIdToFilter = d2Winner.playerId || d2Winner.id;
    const d2Matches =
      matches?.filter(
        (m) =>
          m.isCompleted &&
          m.division === 'div-2' &&
          (m.player1Id === d2WIdToFilter || m.player2Id === d2WIdToFilter)
      ) || [];

    let d2TotW = 0;
    let d2TotD = 0;
    let d2TotL = 0;
    let d2TotGF = 0;
    let d2TotGA = 0;

    d2Matches.forEach((m) => {
      const isP1 = m.player1Id === d2WIdToFilter;
      const isBo3 = m.round && m.round !== 'Group';
      const s1 = isBo3 ? m.player1Wins ?? 0 : m.player1Score ?? 0;
      const s2 = isBo3 ? m.player2Wins ?? 0 : m.player2Score ?? 0;
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;
      if (pRes > oRes) d2TotW++;
      else if (pRes < oRes) d2TotL++;
      else d2TotD++;

      if (m.player1Score !== null && m.player2Score !== null) {
        d2TotGF += isP1 ? m.player1Score : m.player2Score;
        d2TotGA += isP1 ? m.player2Score : m.player1Score;
      }
    });

    const d2UseMatches = d2Matches.length > 0;
    division2Record = {
      winnerPlayerId: d2Winner.playerId || d2Winner.id,
      winnerPlayerName: d2Winner.playerName,
      winnerTeamName: d2Winner.teamName || '',
      winnerPhotoUrl: d2Winner.logoUrl || d2Winner.team?.logoUrl,
      divisionName: activeSeason.division2Name || 'Divisi 2',
      runnerUpPlayerName: d2RunnerUpName,
      runnerUpTeamName: d2RunnerUpTeam,
      points: d2Winner.points,
      goalsFor: d2UseMatches ? d2TotGF : d2Winner.goalsFor,
      goalsAgainst: d2UseMatches ? d2TotGA : d2Winner.goalsAgainst,
      win: d2UseMatches ? d2TotW : d2Winner.win,
      loss: d2UseMatches ? d2TotL : d2Winner.loss,
      draw: d2UseMatches ? d2TotD : d2Winner.draw || 0,
      totalMatches: d2UseMatches
        ? d2Matches.length
        : d2Winner.played || d2Winner.win + d2Winner.loss,
    };
  }

  const seasonRec: SeasonRecord = {
    seasonId: activeSeason.id,
    seasonName: activeSeason.name,
    completedAt: Timestamp.now(),
    winnerPlayerId: winner.playerId || winner.id,
    winnerPlayerName: winner.playerName,
    winnerTeamName: winner.teamName || '',
    winnerPhotoUrl: winner.logoUrl || winner.team?.logoUrl,
    themeKey: activeSeason.themeKey,
    winnerStats: {
      points: winner.points,
      leaguePoints: winner.points,
      totalMatches: totP,
      win: totW,
      draw: totD,
      loss: totL,
      goalsFor: totGF,
      goalsAgainst: totGA,
      goalDifference: totGF - totGA,
    },
    funStats: {
      mostWins: mWinP ? { playerName: mWinP.playerName, value: mWinP.value } : null,
      bestAttacker: bAtt,
      worstDefender: wDef,
    },
    division2Record,
  };

  return seasonRec;
}

