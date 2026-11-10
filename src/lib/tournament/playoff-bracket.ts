import type { MatchRound, MatchStatus } from '@/lib/types';

export interface PlayoffMatchBlueprint {
  seasonId: string;
  player1Id: string;
  player2Id: string;
  player1Score: null;
  player2Score: null;
  player1Wins: null;
  player2Wins: null;
  isCompleted: false;
  status: MatchStatus;
  matchDateMillis: number;
  round: MatchRound;
  bracketId: string;
  division?: 'div-1' | 'div-2';
}

export interface PlayoffGenerationResult {
  matches: PlayoffMatchBlueprint[];
  title?: string;
  description?: string;
  error?: string;
}

export interface PlayoffParticipant {
  id: string;
  playerId?: string;
  playerName?: string;
  division?: 'div-1' | 'div-2';
  [key: string]: any;
}

export function create8KnockoutMatches({
  seasonId,
  tableData,
  divTag,
  baseTimestamp = Date.now(),
  startOffset = 1,
}: {
  seasonId: string;
  tableData: PlayoffParticipant[];
  divTag?: 'div-1' | 'div-2';
  baseTimestamp?: number;
  startOffset?: number;
}): { matches: PlayoffMatchBlueprint[]; nextOffset: number } {
  let timeOffset = startOffset;
  const matches: PlayoffMatchBlueprint[] = [];

  const qfPairings = [
    { p1: tableData[0], p2: tableData[7], bid: 'playoff-m1' },
    { p1: tableData[3], p2: tableData[4], bid: 'playoff-m2' },
    { p1: tableData[1], p2: tableData[6], bid: 'playoff-m3' },
    { p1: tableData[2], p2: tableData[5], bid: 'playoff-m4' },
  ];

  qfPairings.forEach((p) => {
    matches.push({
      seasonId,
      player1Id: p.p1.playerId || p.p1.id,
      player2Id: p.p2.playerId || p.p2.id,
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + timeOffset++ * 1000,
      round: 'Quarterfinal',
      bracketId: p.bid,
      ...(divTag ? { division: divTag } : {}),
    });
  });

  const placeholders: { round: MatchRound; bid: string }[] = [
    { round: 'Semifinal', bid: 'playoff-sf1' },
    { round: 'Semifinal', bid: 'playoff-sf2' },
    { round: 'Grand-Final', bid: 'playoff-final' },
  ];

  placeholders.forEach((p) => {
    matches.push({
      seasonId,
      player1Id: 'TBD',
      player2Id: 'TBD',
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + timeOffset++ * 1000,
      round: p.round,
      bracketId: p.bid,
      ...(divTag ? { division: divTag } : {}),
    });
  });

  return { matches, nextOffset: timeOffset };
}

export function generatePlayoffBracket({
  seasonId,
  seasonType,
  hasDivisions,
  isDiv2Merged,
  division1Name = 'Divisi 1',
  division2Name = 'Divisi 2',
  division2HasPlayoff,
  sortedTable,
  groupA = [],
  groupB = [],
  existingKnockoutMatches = [],
  baseTimestamp = Date.now(),
}: {
  seasonId: string;
  seasonType?: string;
  hasDivisions?: boolean;
  isDiv2Merged?: boolean;
  division1Name?: string;
  division2Name?: string;
  division2HasPlayoff?: boolean;
  sortedTable: PlayoffParticipant[];
  groupA?: PlayoffParticipant[];
  groupB?: PlayoffParticipant[];
  existingKnockoutMatches?: { round?: string; division?: string }[];
  baseTimestamp?: number;
}): PlayoffGenerationResult {
  const hasDivs = Boolean(hasDivisions && !isDiv2Merged);

  // ============================================================
  // MULTI-DIVISION PLAYOFF GENERATION
  // ============================================================
  if (hasDivs) {
    const div1Data = sortedTable.filter((e) => e.division !== 'div-2');
    const div2Data = sortedTable.filter((e) => e.division === 'div-2');

    const hasDiv1PlayoffAlready = existingKnockoutMatches.some(
      (m) => !m.division || m.division === 'div-1'
    );
    const hasDiv2PlayoffAlready = existingKnockoutMatches.some((m) => m.division === 'div-2');

    const allMatches: PlayoffMatchBlueprint[] = [];
    let currentOffset = 1;
    let createdAny = false;

    if (!hasDiv1PlayoffAlready) {
      if (div1Data.length < 8) {
        return {
          matches: [],
          error: `Peserta ${division1Name} Kurang. Format Playoff 8 Besar memerlukan minimal 8 peserta (${div1Data.length} terdaftar).`,
        };
      }
      const res1 = create8KnockoutMatches({
        seasonId,
        tableData: div1Data,
        divTag: 'div-1',
        baseTimestamp,
        startOffset: currentOffset,
      });
      allMatches.push(...res1.matches);
      currentOffset = res1.nextOffset;
      createdAny = true;
    }

    if (division2HasPlayoff && !hasDiv2PlayoffAlready) {
      if (div2Data.length < 8) {
        return {
          matches: [],
          error: `Peserta ${division2Name} Kurang. Format Playoff 8 Besar memerlukan minimal 8 peserta (${div2Data.length} terdaftar).`,
        };
      }
      const res2 = create8KnockoutMatches({
        seasonId,
        tableData: div2Data,
        divTag: 'div-2',
        baseTimestamp,
        startOffset: currentOffset,
      });
      allMatches.push(...res2.matches);
      currentOffset = res2.nextOffset;
      createdAny = true;
    }

    if (!createdAny) {
      return {
        matches: [],
        error: 'Jadwal playoff untuk seluruh divisi sudah dibuat.',
      };
    }

    return {
      matches: allMatches,
      title: 'Bagan Playoff Berhasil Dibuat!',
      description: `Bagan playoff untuk ${division1Name}${division2HasPlayoff ? ` dan ${division2Name}` : ''} telah dibuat.`,
    };
  }

  // ============================================================
  // SINGLE DIVISION: Already has playoffs check
  // ============================================================
  if (existingKnockoutMatches.length > 0) {
    return {
      matches: [],
      error: 'Jadwal playoff sudah ada.',
    };
  }

  // Single Hybrid format
  if (seasonType === 'Single Hybrid') {
    if (sortedTable.length < 8) {
      return {
        matches: [],
        error: `Format Playoff 8 Besar memerlukan minimal 8 peserta (${sortedTable.length} terdaftar).`,
      };
    }
    const res = create8KnockoutMatches({
      seasonId,
      tableData: sortedTable,
      baseTimestamp,
    });
    return {
      matches: res.matches,
      title: 'Playoff 8 Besar Dibuat!',
      description: '8 peringkat teratas klasemen telah masuk ke bagan Knockout Single Elimination (Best of 3).',
    };
  }

  // Co-Op Hybrid format
  if (seasonType === 'Co-Op Hybrid') {
    if (sortedTable.length < 4) {
      return {
        matches: [],
        error: 'Harus ada minimal 4 tim untuk memulai playoff.',
      };
    }

    const matches: PlayoffMatchBlueprint[] = [];
    matches.push({
      seasonId,
      player1Id: sortedTable[0].id,
      player2Id: sortedTable[3].id,
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + 1000,
      round: 'UB-Semi',
      bracketId: 'playoff-m9',
    });
    matches.push({
      seasonId,
      player1Id: sortedTable[1].id,
      player2Id: sortedTable[2].id,
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + 2000,
      round: 'UB-Semi',
      bracketId: 'playoff-m10',
    });

    if (sortedTable.length >= 6) {
      matches.push({
        seasonId,
        player1Id: sortedTable[4].id,
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + 3000,
        round: 'LB-Round 3',
        bracketId: 'playoff-m13',
      });
      matches.push({
        seasonId,
        player1Id: sortedTable[5].id,
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + 4000,
        round: 'LB-Round 3',
        bracketId: 'playoff-m14',
      });
    } else {
      matches.push({
        seasonId,
        player1Id: 'TBD',
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + 3000,
        round: 'LB-Round 3',
        bracketId: 'playoff-m13',
      });
      matches.push({
        seasonId,
        player1Id: 'TBD',
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + 4000,
        round: 'LB-Round 3',
        bracketId: 'playoff-m14',
      });
    }

    const placeholders: { round: MatchRound; bid: string }[] = [
      { round: 'UB-Final', bid: 'playoff-m15' },
      { round: 'LB-Semifinal', bid: 'playoff-m16' },
      { round: 'LB-Final', bid: 'playoff-m17' },
      { round: 'Grand-Final', bid: 'playoff-m18' },
    ];

    placeholders.forEach((p, i) => {
      matches.push({
        seasonId,
        player1Id: 'TBD',
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + (i + 5) * 1000,
        round: p.round,
        bracketId: p.bid,
      });
    });

    return {
      matches,
      title: 'Playoff Co-Op Dibuat!',
      description: 'Bagan Double Elimination (6 Tim) telah berhasil dibuat.',
    };
  }

  // Hybrid (2 Groups: A & B)
  if (groupA.length < 4 || groupB.length < 4) {
    return {
      matches: [],
      error: 'Masing-masing grup harus memiliki setidaknya 4 tim untuk memulai playoff.',
    };
  }

  // If either group has < 6 teams: 8 Besar Knockout Silang Single Elimination
  if (groupA.length < 6 || groupB.length < 6) {
    const qfPairings = [
      { p1: groupA[0], p2: groupB[3], bid: 'playoff-m1' }, // A1 vs B4
      { p1: groupB[1], p2: groupA[2], bid: 'playoff-m2' }, // B2 vs A3
      { p1: groupB[0], p2: groupA[3], bid: 'playoff-m3' }, // B1 vs A4
      { p1: groupA[1], p2: groupB[2], bid: 'playoff-m4' }, // A2 vs B3
    ];

    const matches: PlayoffMatchBlueprint[] = [];
    qfPairings.forEach((p, i) => {
      matches.push({
        seasonId,
        player1Id: p.p1.playerId || p.p1.id,
        player2Id: p.p2.playerId || p.p2.id,
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + (i + 1) * 1000,
        round: 'Quarterfinal',
        bracketId: p.bid,
      });
    });

    const placeholders: { round: MatchRound; bid: string }[] = [
      { round: 'Semifinal', bid: 'playoff-sf1' },
      { round: 'Semifinal', bid: 'playoff-sf2' },
      { round: 'Grand-Final', bid: 'playoff-final' },
    ];

    placeholders.forEach((p, i) => {
      matches.push({
        seasonId,
        player1Id: 'TBD',
        player2Id: 'TBD',
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDateMillis: baseTimestamp + (i + 5) * 1000,
        round: p.round,
        bracketId: p.bid,
      });
    });

    return {
      matches,
      title: 'Playoff 8 Besar (Top 4 Silang) Dibuat!',
      description: 'Bagan Knockout Single Elimination (8 Besar) telah berhasil dibuat dari peringkat 1 s/d 4 masing-masing grup.',
    };
  }

  // Format Asli 12 Tim (Double Elimination jika masing-masing grup >= 6 tim)
  const matches: PlayoffMatchBlueprint[] = [];
  const ubQuarterPairings = [
    { p1: groupA[0], p2: groupB[3], bid: 'playoff-m1' },
    { p1: groupB[1], p2: groupA[2], bid: 'playoff-m2' },
    { p1: groupB[0], p2: groupA[3], bid: 'playoff-m3' },
    { p1: groupA[1], p2: groupB[2], bid: 'playoff-m4' },
  ];
  ubQuarterPairings.forEach((p, i) => {
    matches.push({
      seasonId,
      player1Id: p.p1.playerId || p.p1.id,
      player2Id: p.p2.playerId || p.p2.id,
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + (i + 1) * 1000,
      round: 'UB-Quarter',
      bracketId: p.bid,
    });
  });

  const lbRound1Starters = [
    { p1: groupA[4], bid: 'playoff-m5' },
    { p1: groupB[4], bid: 'playoff-m6' },
    { p1: groupA[5], bid: 'playoff-m7' },
    { p1: groupB[5], bid: 'playoff-m8' },
  ];
  lbRound1Starters.forEach((p, i) => {
    matches.push({
      seasonId,
      player1Id: p.p1.playerId || p.p1.id,
      player2Id: 'TBD',
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + (i + 5) * 1000,
      round: 'LB-Round 1',
      bracketId: p.bid,
    });
  });

  const placeholders: { round: MatchRound; bid: string }[] = [
    { round: 'UB-Semi', bid: 'playoff-m9' },
    { round: 'UB-Semi', bid: 'playoff-m10' },
    { round: 'LB-Round 2', bid: 'playoff-m11' },
    { round: 'LB-Round 2', bid: 'playoff-m12' },
    { round: 'LB-Round 3', bid: 'playoff-m13' },
    { round: 'LB-Round 3', bid: 'playoff-m14' },
    { round: 'UB-Final', bid: 'playoff-m15' },
    { round: 'LB-Semifinal', bid: 'playoff-m16' },
    { round: 'LB-Final', bid: 'playoff-m17' },
    { round: 'Grand-Final', bid: 'playoff-m18' },
  ];

  placeholders.forEach((p, i) => {
    matches.push({
      seasonId,
      player1Id: 'TBD',
      player2Id: 'TBD',
      player1Score: null,
      player2Score: null,
      player1Wins: null,
      player2Wins: null,
      isCompleted: false,
      status: 'Scheduled',
      matchDateMillis: baseTimestamp + (i + 10) * 1000,
      round: p.round,
      bracketId: p.bid,
    });
  });

  return {
    matches,
    title: 'Double Elimination Playoff Dibuat!',
    description: 'Jadwal UB-Quarter dan LB-Round 1 telah berhasil dibuat.',
  };
}

