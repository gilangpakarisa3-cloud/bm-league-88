import type { Player, SeasonRecord, MMRTierId, WithId } from './types';

export const CALIBRATION_MIN_MATCHES = 20;
export const TITLE_BONUS_MMR = 100;

export const BASE_MMR_BY_TIER: Record<MMRTierId, number> = {
  LEGEND: 1200,
  TOP_PLAYER: 1000,
  REGULER: 800,
  AMATEUR: 600,
};

export interface PlayerTierStyle {
  id: MMRTierId;
  title: string;
  badgeTitle: string;
  color: string;
  borderColor: string;
  bgPill: string;
  bgBadge: string;
  accentGlow: string;
  hudBar: string;
}

export const TIER_STYLES: Record<MMRTierId, PlayerTierStyle> = {
  LEGEND: {
    id: 'LEGEND',
    title: 'Legend',
    badgeTitle: 'TOP 1 - 4 GLOBAL',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400/40 hover:border-yellow-400',
    bgPill: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
    bgBadge: 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]',
    accentGlow: 'from-yellow-400/20 via-amber-500/10 to-transparent',
    hudBar: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]',
  },
  TOP_PLAYER: {
    id: 'TOP_PLAYER',
    title: 'Top Player',
    badgeTitle: 'RANK 5 - 8 GLOBAL',
    color: 'text-primary',
    borderColor: 'border-primary/40 hover:border-primary',
    bgPill: 'bg-primary/10 text-primary border-primary/30',
    bgBadge: 'bg-primary text-black shadow-[0_0_20px_rgba(204,253,1,0.5)]',
    accentGlow: 'from-primary/20 via-primary/5 to-transparent',
    hudBar: 'bg-primary shadow-[0_0_15px_rgba(204,253,1,0.8)]',
  },
  REGULER: {
    id: 'REGULER',
    title: 'Reguler',
    badgeTitle: 'RANK 9 - 12 GLOBAL',
    color: 'text-accent',
    borderColor: 'border-accent/40 hover:border-accent',
    bgPill: 'bg-accent/10 text-accent border-accent/30',
    bgBadge: 'bg-accent text-black shadow-[0_0_20px_rgba(100,255,218,0.5)]',
    accentGlow: 'from-accent/20 via-accent/5 to-transparent',
    hudBar: 'bg-accent shadow-[0_0_15px_rgba(100,255,218,0.8)]',
  },
  AMATEUR: {
    id: 'AMATEUR',
    title: 'Amateur',
    badgeTitle: 'RANK 13+ GLOBAL',
    color: 'text-pink-400',
    borderColor: 'border-pink-400/40 hover:border-pink-400',
    bgPill: 'bg-pink-400/10 text-pink-400 border-pink-400/30',
    bgBadge: 'bg-pink-400 text-black shadow-[0_0_20px_rgba(244,114,182,0.5)]',
    accentGlow: 'from-pink-400/20 via-pink-500/5 to-transparent',
    hudBar: 'bg-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.8)]',
  },
};

/**
 * Hitung legacy OVR (efisiensi poin karir historis 0 - 100)
 */
export function calculateLegacyOvr(player: { overallPlayed?: number; overallWin?: number; overallDraw?: number }): number {
  const played = player.overallPlayed || 0;
  if (played < CALIBRATION_MIN_MATCHES) return 0;
  const poss = played * 3;
  const actualPoints = ((player.overallWin || 0) * 3) + ((player.overallDraw || 0) * 1);
  return poss > 0 ? (actualPoints / poss) * 100 : 0;
}

/**
 * Tentukan Tier pemain berdasarkan peringkat (Rank) global atau nilai MMR jika rank belum diketahui
 */
export function getTierFromMmr(mmr: number, played?: number, rank?: number | null, division?: string): MMRTierId {
  // Jika rank tersedia (Sistem Slot Kompetitif)
  if (typeof rank === 'number' && rank > 0) {
    if (rank <= 4) return 'LEGEND';       // 4 Besar MMR Teratas
    if (rank <= 8) return 'TOP_PLAYER';   // Rank 5 - 8
    if (rank <= 12) return 'REGULER';     // Rank 9 - 12
    return 'AMATEUR';                     // Rank 13+
  }

  // Fallback jika rank belum dihitung / standalone
  return 'AMATEUR';
}

/**
 * Hitung Modal Awal MMR untuk inisialisasi / baseline
 */
export function calculateInitialMmr(params: {
  tierId?: MMRTierId;
  division?: string;
  titlesCount?: number;
  played?: number;
}): number {
  const titles = params.titlesCount || 0;
  const bonus = titles * TITLE_BONUS_MMR;

  if (params.tierId) {
    return BASE_MMR_BY_TIER[params.tierId] + bonus;
  }

  // Fallback berdasarkan divisi jika tier belum ada
  if (params.division === 'div-1') {
    return 1000 + bonus;
  }
  if (params.division === 'div-2') {
    return 750 + bonus;
  }

  return 800 + bonus;
}

/**
 * Hitung Perubahan MMR (Delta) untuk pertandingan 1v1 berdasarkan bobot MMR
 * @param mmr1 MMR Pemain 1
 * @param mmr2 MMR Pemain 2
 * @param result Hasil dari sudut pandang Pemain 1 ('W' | 'L' | 'D')
 */
export function calculateMmrDelta(
  mmr1: number,
  mmr2: number,
  result: 'W' | 'L' | 'D'
): { delta1: number; delta2: number } {
  const diff = mmr1 - mmr2; // Positif berarti Pemain 1 lebih diunggulkan

  if (result === 'W') {
    let delta1 = 25;
    if (diff > 300) {
      delta1 = 10;
    } else if (diff >= 151) {
      delta1 = 15;
    } else if (diff >= 51) {
      delta1 = 20;
    } else if (diff >= -50) {
      delta1 = 25;
    } else if (diff >= -150) {
      delta1 = 30; // Underdog menang
    } else if (diff >= -300) {
      delta1 = 35; // Underdog besar menang
    } else {
      delta1 = 40; // Underdog miracle
    }
    return { delta1, delta2: -delta1 };
  }

  if (result === 'L') {
    // Balik perspektif (Pemain 2 menang terhadap Pemain 1)
    const reversed = calculateMmrDelta(mmr2, mmr1, 'W');
    return { delta1: -reversed.delta1, delta2: -reversed.delta2 };
  }

  // Hasil Seri (Draw)
  let delta1 = 0;
  if (Math.abs(diff) <= 50) {
    delta1 = 0;
  } else if (diff > 300) {
    delta1 = -15; // Unggulan jauh ditahan seri
  } else if (diff >= 151) {
    delta1 = -10;
  } else if (diff >= 51) {
    delta1 = -5;
  } else if (diff < -300) {
    delta1 = 15; // Underdog berhasil menahan seri
  } else if (diff <= -151) {
    delta1 = 10;
  } else if (diff <= -51) {
    delta1 = 5;
  }

  return { delta1, delta2: -delta1 };
}

export type PlayerWithMmr = WithId<Player> & {
  mmrRating: number;
  peakMmrRating: number;
  legacyOvrRating: number;
  isCalibrated: boolean;
  tierId: MMRTierId;
  rank: number | null;
  winRate: number;
  titlesWon: SeasonRecord[];
};

/**
 * Helper untuk memproses dan memperkaya data list pemain dengan MMR, rank, dan legacy stats
 */
export function enrichPlayersWithMmrData(
  players: WithId<Player>[] | null | undefined,
  hallOfFame: SeasonRecord[] | null | undefined
): PlayerWithMmr[] {
  if (!players || players.length === 0) return [];

  // Hitung jumlah gelar per pemain
  const titlesByPlayerId: Record<string, SeasonRecord[]> = {};
  if (hallOfFame) {
    hallOfFame.forEach(record => {
      if (record.winnerPlayerId) {
        if (!titlesByPlayerId[record.winnerPlayerId]) {
          titlesByPlayerId[record.winnerPlayerId] = [];
        }
        titlesByPlayerId[record.winnerPlayerId].push(record);
      }
    });
  }

  // 1. Hitung baseline / MMR untuk setiap pemain
  const mapped = players.map(p => {
    const played = p.overallPlayed || 0;
    const isCalibrated = true; // Tier N/C dihapus: seluruh player aktif masuk kalibrasi
    const winRate = played > 0 ? ((p.overallWin || 0) / played) * 100 : 0;
    const titlesWon = titlesByPlayerId[p.id] || [];
    const titlesCount = p.titlesCount ?? titlesWon.length;

    const legacyOvrRating = p.legacyOvr ?? calculateLegacyOvr(p);

    // Jika belum tersimpan di DB atau sebelumnya N/C / uncalibrated (< 20 match)
    let mmrRating = p.mmr;
    const isLegacyNC = played < CALIBRATION_MIN_MATCHES;

    if (typeof mmrRating !== 'number' || isLegacyNC) {
      // Aturan Khusus:
      // Player N/C di divisi 1 -> 800 MMR (Reguler)
      // Player N/C di divisi 2 (atau default) -> 600 MMR (Amateur)
      if (p.division === 'div-1' || (!p.division && legacyOvrRating >= 45)) {
        mmrRating = 800 + (titlesCount * TITLE_BONUS_MMR);
      } else {
        mmrRating = 600 + (titlesCount * TITLE_BONUS_MMR);
      }
    }

    const peakMmrRating = Math.max(mmrRating, p.peakMmr ?? mmrRating);
    const tierId = getTierFromMmr(mmrRating, played, null, p.division);

    return {
      ...p,
      mmrRating,
      peakMmrRating,
      legacyOvrRating,
      isCalibrated: true,
      tierId,
      winRate,
      titlesWon,
      rank: null as number | null,
    };
  });

  // 2. Seluruh player langsung masuk ranking leaderboard kompetitif (tanpa uncalibrated pool)
  const rankedPlayers = mapped
    .sort((a, b) => b.mmrRating - a.mmrRating || (b.overallPlayed || 0) - (a.overallPlayed || 0) || b.winRate - a.winRate)
    .map((p, idx) => {
      const rank = idx + 1;
      const tierId = getTierFromMmr(p.mmrRating, p.overallPlayed || 0, rank, p.division);
      return {
        ...p,
        rank,
        tierId,
      };
    });

  return rankedPlayers;
}

