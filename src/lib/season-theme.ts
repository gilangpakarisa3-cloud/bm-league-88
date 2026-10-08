import type { Season, WithId } from '@/lib/types';

export type TIThemeKey = 'emerald' | 'crimson' | 'gold' | 'azure' | 'amethyst' | 'cerulean';

export interface TISeasonTheme {
  seasonNumber: number;
  tiTitle: string;
  editionName: string;
  themeKey: TIThemeKey;
  
  // Palette Hex & Glow
  primaryHex: string;
  secondaryHex: string;
  glowRgba: string;
  
  // Text & Typography
  primaryText: string;
  secondaryText: string;
  accentText: string;
  primaryBorder: string;
  primaryBg: string;
  glowShadow: string;
  tagBorder: string;
  badgeClass: string;
  
  // Table Klasemen Tokens
  tableCardBorder: string;
  tableCardGlow: string;
  tableTopTracer: string;
  topTracer: string;
  tableLeaderBg: string;
  tableLeaderGradient: string;
  tableLeaderGlow: string;
  tableLeaderBadge: string;
  tableLaserBeam: string;
  pointsBadge: string;
  pointsBadgeLeader: string;
  tabsActiveBg: string;
  tabsActiveTopSkor: string;
  tabsActivePlayoff: string;
  
  // Bracket & Grand Final Tokens
  laserConduit: string;
  podiumBg: string;
  concentricHalo: string;
  trophyShield: string;
  trophyColor: string;
  gfTitleGradient: string;
  connectorColor: 'primary' | 'amber' | 'cyan' | 'rose' | 'purple';
  secondaryConnectorColor: 'primary' | 'amber' | 'cyan' | 'rose' | 'purple';
  lowerConnectorColor: 'primary' | 'amber' | 'cyan' | 'rose' | 'purple';
  
  // Telemetry & Headers
  sysTag: string;
  seasonBadge: string;
  pedestalText: string;
  gfTitle: string;
  gfSubtitle: string;
  seriesBadge: string;
  trophyCrownText: string;
  upperTitle: string;
  upperSubtitle: string;
  lowerTitle: string;
  lowerSubtitle: string;
  knockoutArenaTitle: string;
  knockoutArenaSubtitle: string;

  // Ultra Sport & Futuristic Header Tokens
  titleGradient: string;
  cockpitFin: string;
  cockpitCardBorder: string;
  progressBar: string;
  searchIconBg: string;
}

export interface ThemeOption {
  key: TIThemeKey;
  name: string;
  subtitle: string;
  colorName: string;
  primaryHex: string;
  secondaryHex: string;
  badgeClass: string;
  previewGradient: string;
}

export const AVAILABLE_SEASON_THEMES: ThemeOption[] = [
  {
    key: 'emerald',
    name: 'Jade Emerald',
    subtitle: 'The International Jade Nephrite',
    colorName: 'Hijau Neon / Emerald',
    primaryHex: '#10B981',
    secondaryHex: '#CCFD01',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    previewGradient: 'from-emerald-400 via-teal-400 to-lime-300'
  },
  {
    key: 'crimson',
    name: 'Crimson Ruby',
    subtitle: 'The International Red Bloodstone',
    colorName: 'Merah Bara / Crimson',
    primaryHex: '#EF4444',
    secondaryHex: '#F59E0B',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    previewGradient: 'from-rose-500 via-red-500 to-amber-400'
  },
  {
    key: 'gold',
    name: 'Golden Aegis',
    subtitle: 'The International 24K Sunfire',
    colorName: 'Emas Mewah / Gold',
    primaryHex: '#F59E0B',
    secondaryHex: '#FBBF24',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    previewGradient: 'from-yellow-300 via-amber-400 to-yellow-500'
  },
  {
    key: 'cerulean',
    name: 'Sunken Cerulean',
    subtitle: 'The International Sunken Reef (Co-Op)',
    colorName: 'Cyan Biru Laut / Cerulean',
    primaryHex: '#06B6D4',
    secondaryHex: '#22D3EE',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    previewGradient: 'from-cyan-400 via-teal-400 to-emerald-400'
  },
  {
    key: 'azure',
    name: 'Arcane Azure',
    subtitle: 'The International Cobalt Frost',
    colorName: 'Biru Langit / Sky Azure',
    primaryHex: '#38BDF8',
    secondaryHex: '#2563EB',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
    previewGradient: 'from-sky-400 via-blue-500 to-indigo-500'
  },
  {
    key: 'amethyst',
    name: 'Royal Amethyst',
    subtitle: 'The International Cosmic Violet',
    colorName: 'Ungu Mistis / Amethyst',
    primaryHex: '#A855F7',
    secondaryHex: '#C084FC',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    previewGradient: 'from-fuchsia-400 via-purple-500 to-indigo-500'
  }
];

export function getSeasonTheme(season: WithId<Season> | null | undefined): TISeasonTheme {
  const name = season?.name || 'BM LEAGUE 88';
  const type = season?.type || 'Single';
  const explicitThemeKey = season?.themeKey && season.themeKey !== 'auto' ? season.themeKey : null;
  const lowerName = name.toLowerCase();

  // Extract season number if available (e.g. "Season 5", "SEASON 4", "s3")
  const numMatch = lowerName.match(/season\s*(\d+)/i) || lowerName.match(/s(\d+)/i);
  const seasonNum = numMatch ? parseInt(numMatch[1], 10) : 5;

  const isS5 = explicitThemeKey === 'emerald' || (!explicitThemeKey && (lowerName.includes('season 5') || lowerName.includes('up skill') || seasonNum === 5));
  const isS4 = explicitThemeKey === 'crimson' || (!explicitThemeKey && (lowerName.includes('season 4') || lowerName.includes('penebusan dosa') || lowerName.includes('fokusgame3') || seasonNum === 4));
  const isS3 = explicitThemeKey === 'gold' || (!explicitThemeKey && (lowerName.includes('season 3') || lowerName.includes('para raja') || lowerName.includes('king') || seasonNum === 3));
  const isS2 = explicitThemeKey === 'azure' || (!explicitThemeKey && (lowerName.includes('season 2') || seasonNum === 2));
  const isS1 = !explicitThemeKey && (lowerName.includes('season 1') || seasonNum === 1);
  const isCoop = explicitThemeKey === 'cerulean' || (!explicitThemeKey && (type === 'Co-Op' || type === 'Co-Op Hybrid' || lowerName.includes('co-op') || lowerName.includes('2v2')));
  const isAmethyst = explicitThemeKey === 'amethyst' || (!explicitThemeKey && (seasonNum === 6 || lowerName.includes('amethyst') || lowerName.includes('violet') || lowerName.includes('purple')));
  const isSingleHybrid = type === 'Single Hybrid';

  // Explicit priority routing if themeKey is provided
  if (explicitThemeKey) {
    if (explicitThemeKey === 'crimson') {
      // route to crimson block
    }
  }

  // 1. CRIMSON RUBY / MAGMA FLAME (The International TI1 / TI6 / TI11 - Red Bloodstone Edition)
  if (explicitThemeKey === 'crimson' || (!explicitThemeKey && (isS4 || (!isS5 && !isS3 && !isS2 && !isCoop && !isAmethyst && isS1)))) {
    return {
      seasonNumber: seasonNum,
      tiTitle: 'THE INTERNATIONAL • CRIMSON RUBY',
      editionName: 'CRIMSON RUBY AEGIS',
      themeKey: 'crimson',
      primaryHex: '#EF4444',
      secondaryHex: '#F59E0B',
      glowRgba: 'rgba(239, 68, 68, 0.9)',

      primaryText: 'text-rose-400',
      secondaryText: 'text-amber-400',
      accentText: 'text-red-300',
      primaryBorder: 'border-rose-500/50',
      primaryBg: 'bg-rose-500/15',
      glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(244,63,94,0.25)]',
      tagBorder: 'border-rose-500/40 text-rose-300',
      badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300',

      tableCardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(244,63,94,0.12)]',
      tableTopTracer: 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_25px_rgba(244,63,94,0.9)]',
      topTracer: 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_rgba(244,63,94,0.9)]',
      tableLeaderBg: 'bg-rose-500/[0.14] hover:bg-rose-500/[0.22] shadow-[inset_0_0_30px_rgba(244,63,94,0.2)] border-l-4 border-rose-500',
      tableLeaderGradient: 'bg-gradient-to-br from-amber-300 via-rose-500 to-red-600 text-white font-black shadow-[0_0_25px_rgba(239,68,68,1)] border-2 border-white',
      tableLeaderGlow: 'bg-rose-500/40',
      tableLeaderBadge: 'bg-rose-500 text-white font-black shadow-[0_0_10px_rgba(244,63,94,0.9)]',
      tableLaserBeam: 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,1)]',
      pointsBadge: 'text-rose-300 bg-rose-950/50 border-2 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      pointsBadgeLeader: 'text-white bg-gradient-to-r from-amber-400 via-rose-500 to-red-600 shadow-[0_0_25px_rgba(244,63,94,1)] border-2 border-white font-black',
      tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:via-rose-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/60 data-[state=active]:shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:via-rose-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/60 data-[state=active]:shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:via-red-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/60 data-[state=active]:shadow-[0_0_12px_rgba(239,68,68,0.6)]',

      laserConduit: 'bg-gradient-to-b from-rose-500 via-amber-500 to-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.9)]',
      podiumBg: 'bg-gradient-to-b from-[#140608] via-[#090507] to-[#160803]',
      concentricHalo: 'from-rose-500/35 via-amber-500/20 to-orange-500/20',
      trophyShield: 'from-rose-500/35 via-[#0A0507]/95 to-amber-600/30 border-rose-500',
      trophyColor: 'text-rose-300 drop-shadow-[0_0_15px_rgba(244,63,94,1)]',
      gfTitleGradient: 'from-white via-rose-200 to-rose-500 drop-shadow-[0_2px_15px_rgba(244,63,94,0.6)]',
      connectorColor: 'rose',
      secondaryConnectorColor: 'amber',
      lowerConnectorColor: 'rose',

      sysTag: isS4 ? 'SYS//S4_PENEBUSAN_DOSA' : `SYS//TI_S${seasonNum}_CRIMSON`,
      seasonBadge: isS4 ? 'SEASON 4 • LIGA PENEBUSAN DOSA' : `${name} • CRIMSON EDITION`,
      pedestalText: isS4 ? 'SEASON 4 • REDEMPTION APEX CUP' : `${name.toUpperCase()} • CRIMSON AEGIS`,
      gfTitle: isS4 ? 'SEASON 4 GRAND FINAL' : `${name.toUpperCase()} GRAND FINAL`,
      gfSubtitle: isS4 ? 'PERTEMPURAN TERAKHIR // PENEBUSAN DOSA #FOKUSGAME3' : 'THE CRUCIBLE OF CHAMPIONS // WINNER TAKES ALL',
      seriesBadge: isS4 ? 'SEASON 4 • PENEBUSAN DOSA • BO3' : 'CRIMSON DUEL • BEST OF 3',
      trophyCrownText: isS4 ? 'REDEMPTION' : 'CRIMSON AEGIS',
      upperTitle: 'UPPER BRACKET // PENETRASI PUNCAK',
      upperSubtitle: 'DOUBLE LIFE PROTOCOL • SEEDING ADVANTAGE • #FOKUSGAME3',
      lowerTitle: 'LOWER BRACKET // ARENA PENEBUSAN DOSA',
      lowerSubtitle: 'SUDDEN DEATH PROTOCOL • KALAH = GUGUR • PENEBUSAN TERAKHIR',
      knockoutArenaTitle: 'FASE KNOCKOUT • CRIMSON ARENA',
      knockoutArenaSubtitle: 'CRIMSON BATTLE PROTOCOL • BEST OF 3 • KALAH = GUGUR',

      titleGradient: 'from-rose-400 via-red-500 to-amber-400',
      cockpitFin: 'from-rose-500 via-amber-500 to-transparent shadow-[0_0_25px_rgba(244,63,94,0.9)]',
      cockpitCardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      progressBar: 'from-rose-500 via-red-500 to-amber-400 shadow-[0_0_15px_rgba(244,63,94,0.9)]',
      searchIconBg: 'bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.8)]'
    };
  }

  // 2. GOLDEN AEGIS / SUNFIRE TOPAZ (The International TI5 / TI10 - 24K Gold Edition)
  if (isS3) {
    return {
      seasonNumber: seasonNum,
      tiTitle: 'THE INTERNATIONAL • GOLDEN AEGIS',
      editionName: 'GOLDEN AEGIS OF CHAMPIONS',
      themeKey: 'gold',
      primaryHex: '#F59E0B',
      secondaryHex: '#FBBF24',
      glowRgba: 'rgba(245, 158, 11, 0.9)',

      primaryText: 'text-amber-300',
      secondaryText: 'text-yellow-400',
      accentText: 'text-amber-200',
      primaryBorder: 'border-amber-400/50',
      primaryBg: 'bg-amber-400/15',
      glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(251,191,36,0.25)]',
      tagBorder: 'border-amber-400/40 text-amber-300',
      badgeClass: 'bg-amber-400/15 border-amber-400/40 text-amber-300',

      tableCardBorder: 'border-amber-400/30 hover:border-amber-400/60',
      tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(251,191,36,0.12)]',
      tableTopTracer: 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_25px_rgba(245,158,11,0.9)]',
      topTracer: 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_rgba(251,191,36,0.9)]',
      tableLeaderBg: 'bg-amber-400/[0.14] hover:bg-amber-400/[0.22] shadow-[inset_0_0_30px_rgba(245,158,11,0.2)] border-l-4 border-amber-400',
      tableLeaderGradient: 'bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-500 text-black font-black shadow-[0_0_25px_rgba(245,158,11,1)] border-2 border-white',
      tableLeaderGlow: 'bg-amber-400/40',
      tableLeaderBadge: 'bg-amber-400 text-black font-black shadow-[0_0_10px_rgba(245,158,11,0.9)]',
      tableLaserBeam: 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)]',
      pointsBadge: 'text-amber-300 bg-amber-950/50 border-2 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      pointsBadgeLeader: 'text-black bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 shadow-[0_0_25px_rgba(245,158,11,1)] border-2 border-white font-black',
      tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-200 data-[state=active]:via-amber-400 data-[state=active]:to-yellow-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(245,158,11,0.5)]',
      tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-300 data-[state=active]:via-orange-400 data-[state=active]:to-yellow-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(251,191,36,0.5)]',
      tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:via-yellow-300 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(245,158,11,0.5)]',

      laserConduit: 'bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.9)]',
      podiumBg: 'bg-gradient-to-b from-[#140F03] via-[#090804] to-[#1A1202]',
      concentricHalo: 'from-amber-400/35 via-yellow-500/25 to-amber-600/20',
      trophyShield: 'from-amber-400/35 via-[#0A0904]/95 to-amber-600/30 border-amber-400',
      trophyColor: 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,1)]',
      gfTitleGradient: 'from-white via-amber-200 to-amber-500 drop-shadow-[0_2px_15px_rgba(251,191,36,0.6)]',
      connectorColor: 'amber',
      secondaryConnectorColor: 'amber',
      lowerConnectorColor: 'amber',

      sysTag: 'SYS//S3_LIGA_PARA_RAJA',
      seasonBadge: 'SEASON 3 • LIGA PARA RAJA',
      pedestalText: 'SEASON 3 • MAHKOTA PARA RAJA',
      gfTitle: 'TAHTA PARA RAJA FINAL',
      gfSubtitle: 'PEREBUTAN MAHKOTA TERTINGGI // LIGA PARA RAJA',
      seriesBadge: 'PENENTUAN SANG RAJA • BO3',
      trophyCrownText: 'KING OF KINGS',
      upperTitle: 'UPPER BRACKET // SINGGASANA JUARA',
      upperSubtitle: 'TAHTA PEMENANG • KEUNGGULAN SEED PARA RAJA',
      lowerTitle: 'LOWER BRACKET // TANTANGAN PARA RAJA',
      lowerSubtitle: 'PERTARUNGAN HIDUP MATI • KALAH = LENGSER DARI TAHTA',
      knockoutArenaTitle: 'FASE KNOCKOUT • LIGA PARA RAJA',
      knockoutArenaSubtitle: 'SEASON 3 BATTLE PROTOCOL • BEST OF 3 • KALAH = GUGUR',

      titleGradient: 'from-yellow-200 via-amber-400 to-orange-400',
      cockpitFin: 'from-amber-400 via-yellow-300 to-transparent shadow-[0_0_25px_rgba(245,158,11,0.9)]',
      cockpitCardBorder: 'border-amber-400/30 hover:border-amber-400/60',
      progressBar: 'from-yellow-300 via-amber-400 to-orange-400 shadow-[0_0_15px_rgba(245,158,11,0.9)]',
      searchIconBg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.8)]'
    };
  }

  // 3. AQUATIC CERULEAN / SUNKEN REEF (The International TI7 - 2v2 Duo / Co-Op Edition)
  if (isCoop) {
    return {
      seasonNumber: seasonNum,
      tiTitle: 'THE INTERNATIONAL • SUNKEN REEF',
      editionName: 'SUNKEN REEF DUO AEGIS',
      themeKey: 'cerulean',
      primaryHex: '#06B6D4',
      secondaryHex: '#22D3EE',
      glowRgba: 'rgba(6, 182, 212, 0.9)',

      primaryText: 'text-cyan-300',
      secondaryText: 'text-teal-400',
      accentText: 'text-cyan-200',
      primaryBorder: 'border-cyan-400/50',
      primaryBg: 'bg-cyan-500/15',
      glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(6,182,212,0.25)]',
      tagBorder: 'border-cyan-400/40 text-cyan-300',
      badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',

      tableCardBorder: 'border-cyan-400/30 hover:border-cyan-400/60',
      tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(6,182,212,0.12)]',
      tableTopTracer: 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_rgba(6,182,212,0.9)]',
      topTracer: 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.9)]',
      tableLeaderBg: 'bg-cyan-400/[0.14] hover:bg-cyan-400/[0.22] shadow-[inset_0_0_30px_rgba(6,182,212,0.2)] border-l-4 border-cyan-400',
      tableLeaderGradient: 'bg-gradient-to-br from-teal-200 via-cyan-400 to-emerald-400 text-black font-black shadow-[0_0_25px_rgba(6,182,212,1)] border-2 border-white',
      tableLeaderGlow: 'bg-cyan-400/40',
      tableLeaderBadge: 'bg-cyan-400 text-black font-black shadow-[0_0_10px_rgba(6,182,212,0.9)]',
      tableLaserBeam: 'bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,1)]',
      pointsBadge: 'text-cyan-300 bg-cyan-950/50 border-2 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
      pointsBadgeLeader: 'text-black bg-gradient-to-r from-teal-200 via-cyan-400 to-emerald-400 shadow-[0_0_25px_rgba(6,182,212,1)] border-2 border-white font-black',
      tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-200 data-[state=active]:via-cyan-400 data-[state=active]:to-emerald-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]',
      tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-300 data-[state=active]:via-cyan-400 data-[state=active]:to-emerald-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]',
      tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:via-teal-400 data-[state=active]:to-primary data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]',

      laserConduit: 'bg-gradient-to-b from-cyan-400 via-primary to-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.9)]',
      podiumBg: 'bg-gradient-to-b from-[#031317] via-[#04090E] to-[#021014]',
      concentricHalo: 'from-cyan-400/35 via-teal-400/20 to-primary/20',
      trophyShield: 'from-cyan-400/35 via-[#03090C]/95 to-cyan-600/30 border-cyan-400',
      trophyColor: 'text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,1)]',
      gfTitleGradient: 'from-white via-cyan-200 to-cyan-500 drop-shadow-[0_2px_15px_rgba(6,182,212,0.6)]',
      connectorColor: 'cyan',
      secondaryConnectorColor: 'primary',
      lowerConnectorColor: 'cyan',

      sysTag: 'SYS//COOP_DUO_SYNC',
      seasonBadge: `${name} • 2v2 CO-OP DUO`,
      pedestalText: `${name.toUpperCase()} • DUAL CO-OP CUP`,
      gfTitle: 'CO-OP DUO GRAND FINAL',
      gfSubtitle: 'THE PINNACLE OF 2v2 CO-OP GLORY // DUAL MASTERS',
      seriesBadge: '2v2 CO-OP DUO • BO3',
      trophyCrownText: 'CO-OP APEX',
      upperTitle: 'UPPER BRACKET // DUO SQUAD ARENA',
      upperSubtitle: 'DUAL LIFE PROTOCOL (2 NYAWA) • 2v2 CO-OP DUO BATTLE',
      lowerTitle: 'LOWER BRACKET // REBOOT DOCK',
      lowerSubtitle: 'SUDDEN DEATH ELIMINATION • KALAH = GUGUR',
      knockoutArenaTitle: 'FASE KNOCKOUT • 2v2 CO-OP DUO',
      knockoutArenaSubtitle: 'CO-OP DUO ELIMINATION • BEST OF 3 • KALAH = GUGUR',

      titleGradient: 'from-cyan-300 via-teal-300 to-emerald-400',
      cockpitFin: 'from-cyan-400 via-teal-300 to-transparent shadow-[0_0_25px_rgba(6,182,212,0.9)]',
      cockpitCardBorder: 'border-cyan-400/30 hover:border-cyan-400/60',
      progressBar: 'from-cyan-400 via-teal-300 to-emerald-400 shadow-[0_0_15px_rgba(6,182,212,0.9)]',
      searchIconBg: 'bg-gradient-to-br from-cyan-400 to-teal-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.8)]'
    };
  }

  // 4. ARCANE AZURE / COBALT FROST (The International TI2 / TI12 - Blue Lapis Edition)
  if (isS2) {
    return {
      seasonNumber: seasonNum,
      tiTitle: 'THE INTERNATIONAL • ARCANE AZURE',
      editionName: 'ARCANE AZURE AEGIS',
      themeKey: 'azure',
      primaryHex: '#38BDF8',
      secondaryHex: '#2563EB',
      glowRgba: 'rgba(56, 189, 248, 0.9)',

      primaryText: 'text-sky-300',
      secondaryText: 'text-blue-400',
      accentText: 'text-sky-200',
      primaryBorder: 'border-sky-500/50',
      primaryBg: 'bg-sky-500/15',
      glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(56,189,248,0.25)]',
      tagBorder: 'border-sky-400/40 text-sky-300',
      badgeClass: 'bg-sky-500/15 border-sky-500/40 text-sky-300',

      tableCardBorder: 'border-sky-500/30 hover:border-sky-500/60',
      tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(56,189,248,0.12)]',
      tableTopTracer: 'bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_25px_rgba(56,189,248,0.9)]',
      topTracer: 'bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.9)]',
      tableLeaderBg: 'bg-sky-500/[0.14] hover:bg-sky-500/[0.22] shadow-[inset_0_0_30px_rgba(56,189,248,0.2)] border-l-4 border-sky-400',
      tableLeaderGradient: 'bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-500 text-black font-black shadow-[0_0_25px_rgba(56,189,248,1)] border-2 border-white',
      tableLeaderGlow: 'bg-sky-400/40',
      tableLeaderBadge: 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.9)]',
      tableLaserBeam: 'bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,1)]',
      pointsBadge: 'text-sky-300 bg-sky-950/50 border-2 border-sky-500/60 shadow-[0_0_12px_rgba(56,189,248,0.3)]',
      pointsBadgeLeader: 'text-black bg-gradient-to-r from-cyan-200 via-sky-400 to-blue-500 shadow-[0_0_25px_rgba(56,189,248,1)] border-2 border-white font-black',
      tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-200 data-[state=active]:via-sky-400 data-[state=active]:to-blue-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(56,189,248,0.5)]',
      tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-300 data-[state=active]:via-sky-400 data-[state=active]:to-blue-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(56,189,248,0.5)]',
      tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-400 data-[state=active]:via-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(56,189,248,0.5)]',

      laserConduit: 'bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(56,189,248,0.9)]',
      podiumBg: 'bg-gradient-to-b from-[#040C18] via-[#02070E] to-[#05111E]',
      concentricHalo: 'from-sky-400/35 via-blue-500/20 to-indigo-500/20',
      trophyShield: 'from-sky-400/35 via-[#030914]/95 to-blue-600/30 border-sky-400',
      trophyColor: 'text-sky-300 drop-shadow-[0_0_15px_rgba(56,189,248,1)]',
      gfTitleGradient: 'from-white via-sky-200 to-blue-500 drop-shadow-[0_2px_15px_rgba(56,189,248,0.6)]',
      connectorColor: 'cyan',
      secondaryConnectorColor: 'primary',
      lowerConnectorColor: 'cyan',

      sysTag: 'SYS//S2_ARCANE_AZURE',
      seasonBadge: `${name} • ARCANE AZURE`,
      pedestalText: `${name.toUpperCase()} • AZURE AEGIS`,
      gfTitle: `${name.toUpperCase()} GRAND FINAL`,
      gfSubtitle: 'THE PINNACLE OF GLORY // WINNER TAKES ALL',
      seriesBadge: 'AZURE CHAMPIONSHIP • BO3',
      trophyCrownText: 'AZURE AEGIS',
      upperTitle: 'UPPER BRACKET // GLACIAL PATH',
      upperSubtitle: 'Double Life Protocol • Seeding Advantage',
      lowerTitle: 'LOWER BRACKET // FROZEN REDEMPTION',
      lowerSubtitle: 'Sudden Death Elimination • Kalah = Gugur',
      knockoutArenaTitle: 'FASE KNOCKOUT • AZURE ARENA',
      knockoutArenaSubtitle: 'AZURE BATTLE PROTOCOL • BEST OF 3 • KALAH = GUGUR',

      titleGradient: 'from-sky-300 via-blue-400 to-indigo-400',
      cockpitFin: 'from-sky-400 via-blue-400 to-transparent shadow-[0_0_25px_rgba(56,189,248,0.9)]',
      cockpitCardBorder: 'border-sky-500/30 hover:border-sky-500/60',
      progressBar: 'from-sky-400 via-blue-500 to-indigo-400 shadow-[0_0_15px_rgba(56,189,248,0.9)]',
      searchIconBg: 'bg-gradient-to-br from-sky-400 to-blue-600 text-black shadow-[0_0_25px_rgba(56,189,248,0.8)]'
    };
  }

  // 5. ROYAL AMETHYST / COSMIC VIOLET (The International TI4 / TI9 / TI12 / TI13 - Violet Edition)
  if (explicitThemeKey === 'amethyst' || (!explicitThemeKey && isAmethyst)) {
    return {
      seasonNumber: seasonNum,
      tiTitle: 'THE INTERNATIONAL • ROYAL AMETHYST',
      editionName: 'ROYAL AMETHYST AEGIS',
      themeKey: 'amethyst',
      primaryHex: '#A855F7',
      secondaryHex: '#C084FC',
      glowRgba: 'rgba(168, 85, 247, 0.9)',

      primaryText: 'text-purple-300',
      secondaryText: 'text-fuchsia-400',
      accentText: 'text-purple-200',
      primaryBorder: 'border-purple-500/50',
      primaryBg: 'bg-purple-500/15',
      glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(168,85,247,0.25)]',
      tagBorder: 'border-purple-400/40 text-purple-300',
      badgeClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300',

      tableCardBorder: 'border-purple-500/30 hover:border-purple-500/60',
      tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(168,85,247,0.12)]',
      tableTopTracer: 'bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_25px_rgba(168,85,247,0.9)]',
      topTracer: 'bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.9)]',
      tableLeaderBg: 'bg-purple-500/[0.14] hover:bg-purple-500/[0.22] shadow-[inset_0_0_30px_rgba(168,85,247,0.2)] border-l-4 border-purple-400',
      tableLeaderGradient: 'bg-gradient-to-br from-fuchsia-200 via-purple-400 to-indigo-500 text-black font-black shadow-[0_0_25px_rgba(168,85,247,1)] border-2 border-white',
      tableLeaderGlow: 'bg-purple-400/40',
      tableLeaderBadge: 'bg-purple-400 text-black font-black shadow-[0_0_10px_rgba(168,85,247,0.9)]',
      tableLaserBeam: 'bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,1)]',
      pointsBadge: 'text-purple-300 bg-purple-950/50 border-2 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
      pointsBadgeLeader: 'text-black bg-gradient-to-r from-fuchsia-200 via-purple-400 to-indigo-500 shadow-[0_0_25px_rgba(168,85,247,1)] border-2 border-white font-black',
      tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-200 data-[state=active]:via-purple-400 data-[state=active]:to-indigo-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(168,85,247,0.5)]',
      tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-300 data-[state=active]:via-purple-400 data-[state=active]:to-pink-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(168,85,247,0.5)]',
      tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:via-fuchsia-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(168,85,247,0.5)]',

      laserConduit: 'bg-gradient-to-b from-purple-500 via-fuchsia-500 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.9)]',
      podiumBg: 'bg-gradient-to-b from-[#12051E] via-[#09030F] to-[#160624]',
      concentricHalo: 'from-purple-500/35 via-fuchsia-500/20 to-indigo-500/20',
      trophyShield: 'from-purple-500/35 via-[#0A0314]/95 to-purple-600/30 border-purple-400',
      trophyColor: 'text-purple-300 drop-shadow-[0_0_15px_rgba(168,85,247,1)]',
      gfTitleGradient: 'from-white via-purple-200 to-fuchsia-500 drop-shadow-[0_2px_15px_rgba(168,85,247,0.6)]',
      connectorColor: 'purple',
      secondaryConnectorColor: 'amber',
      lowerConnectorColor: 'purple',

      sysTag: `SYS//TI_S${seasonNum}_AMETHYST`,
      seasonBadge: `${name} • ROYAL AMETHYST`,
      pedestalText: `${name.toUpperCase()} • AMETHYST AEGIS`,
      gfTitle: `${name.toUpperCase()} GRAND FINAL`,
      gfSubtitle: 'CELESTIAL ASCENSION // WINNER TAKES ALL',
      seriesBadge: 'AMETHYST DUEL • BO3',
      trophyCrownText: 'AMETHYST AEGIS',
      upperTitle: 'UPPER BRACKET // CELESTIAL THRONE',
      upperSubtitle: 'Double Life Protocol • Seeding Advantage',
      lowerTitle: 'LOWER BRACKET // NETHER SANCTUARY',
      lowerSubtitle: 'Sudden Death Elimination • Kalah = Gugur',
      knockoutArenaTitle: 'FASE KNOCKOUT • AMETHYST ARENA',
      knockoutArenaSubtitle: 'CELESTIAL BATTLE PROTOCOL • BEST OF 3 • KALAH = GUGUR',

      titleGradient: 'from-fuchsia-300 via-purple-400 to-pink-400',
      cockpitFin: 'from-purple-500 via-fuchsia-400 to-transparent shadow-[0_0_25px_rgba(168,85,247,0.9)]',
      cockpitCardBorder: 'border-purple-500/30 hover:border-purple-500/60',
      progressBar: 'from-purple-400 via-fuchsia-400 to-pink-400 shadow-[0_0_15px_rgba(168,85,247,0.9)]',
      searchIconBg: 'bg-gradient-to-br from-purple-400 via-fuchsia-500 to-indigo-600 text-white shadow-[0_0_25px_rgba(168,85,247,0.8)]'
    };
  }

  // 6. DEFAULT / SEASON 5: EMERALD JADE (The International TI3 / TI8 - Jade Nephrite Edition)
  return {
    seasonNumber: seasonNum,
    tiTitle: 'THE INTERNATIONAL • EMERALD JADE',
    editionName: 'JADE AEGIS OF CHAMPIONS',
    themeKey: 'emerald',
    primaryHex: '#10B981',
    secondaryHex: '#CCFD01',
    glowRgba: 'rgba(16, 185, 129, 0.9)',

    primaryText: 'text-emerald-400',
    secondaryText: 'text-teal-300',
    accentText: 'text-lime-300',
    primaryBorder: 'border-emerald-500/50',
    primaryBg: 'bg-emerald-500/15',
    glowShadow: 'shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.25)]',
    tagBorder: 'border-emerald-400/40 text-emerald-300',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',

    tableCardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
    tableCardGlow: 'shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_45px_rgba(16,185,129,0.12)]',
    tableTopTracer: 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_25px_rgba(16,185,129,0.9)]',
    topTracer: 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.9)]',
    tableLeaderBg: 'bg-emerald-500/[0.14] hover:bg-emerald-500/[0.22] shadow-[inset_0_0_30px_rgba(16,185,129,0.2)] border-l-4 border-emerald-400',
    tableLeaderGradient: 'bg-gradient-to-br from-lime-300 via-emerald-400 to-teal-400 text-black font-black shadow-[0_0_25px_rgba(16,185,129,1)] border-2 border-white',
    tableLeaderGlow: 'bg-emerald-400/40',
    tableLeaderBadge: 'bg-emerald-400 text-black font-black shadow-[0_0_10px_rgba(16,185,129,0.9)]',
    tableLaserBeam: 'bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,1)]',
    pointsBadge: 'text-emerald-300 bg-emerald-950/50 border-2 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    pointsBadgeLeader: 'text-black bg-gradient-to-r from-lime-300 via-emerald-400 to-teal-400 shadow-[0_0_25px_rgba(16,185,129,1)] border-2 border-white font-black',
    tabsActiveBg: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-lime-300 data-[state=active]:via-emerald-400 data-[state=active]:to-teal-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    tabsActiveTopSkor: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-lime-300 data-[state=active]:via-emerald-400 data-[state=active]:to-teal-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    tabsActivePlayoff: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:via-teal-400 data-[state=active]:to-cyan-400 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:border data-[state=active]:border-white/70 data-[state=active]:shadow-[0_0_12px_rgba(16,185,129,0.5)]',

    laserConduit: 'bg-gradient-to-b from-emerald-400 via-teal-300 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.9)]',
    podiumBg: 'bg-gradient-to-b from-[#041610] via-[#020B08] to-[#061C14]',
    concentricHalo: 'from-emerald-400/35 via-teal-400/20 to-lime-400/20',
    trophyShield: 'from-emerald-400/35 via-[#030E0A]/95 to-teal-600/30 border-emerald-400',
    trophyColor: 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,1)]',
    gfTitleGradient: 'from-white via-emerald-200 to-teal-400 drop-shadow-[0_2px_15px_rgba(16,185,129,0.6)]',
    connectorColor: 'cyan',
    secondaryConnectorColor: 'cyan',
    lowerConnectorColor: 'cyan',

    sysTag: isS5 ? 'S5_SOLO_CHAMPIONSHIP' : `TI_S${seasonNum}_EMERALD`,
    seasonBadge: isS5 ? 'SEASON 5 • JADE EMERALD KNOCKOUT' : `${name} • JADE EDITION`,
    pedestalText: isS5 ? 'SEASON 5 • JADE AEGIS CUP' : `${name.toUpperCase()} • JADE AEGIS`,
    gfTitle: isS5 ? 'SEASON 5 GRAND FINAL' : (isSingleHybrid ? 'SOLO GRAND FINAL' : 'GRAND FINAL'),
    gfSubtitle: isS5 ? 'THE PINNACLE OF 1v1 SOLO MASTERY // PLEASE UP SKILL' : 'THE PINNACLE OF GLORY // WINNER TAKES ALL',
    seriesBadge: isS5 ? 'SEASON 5 • JADE EDITION • BO3' : 'BEST OF 3 SERIES • THE FINAL DUEL',
    trophyCrownText: isS5 ? 'JADE AEGIS' : 'APEX GLORY',
    upperTitle: 'UPPER BRACKET // EMERALD PATH',
    upperSubtitle: 'Double Life Protocol • Seeding Advantage',
    lowerTitle: 'LOWER BRACKET // VERDANT REDEMPTION',
    lowerSubtitle: 'Sudden Death Elimination • Kalah = Gugur',
    knockoutArenaTitle: 'FASE KNOCKOUT • 8 BESAR',
    knockoutArenaSubtitle: isS5 ? 'SEASON 5 UP-SKILL BATTLE // 8-BESAR SINGLE ELIMINATION // BO3' : 'BEST OF 3 SERIES (BO3) • KALAH = GUGUR • ROAD TO APEX GLORY',

    titleGradient: 'from-lime-300 via-emerald-400 to-teal-300',
    cockpitFin: 'from-emerald-400 via-teal-300 to-transparent shadow-[0_0_25px_rgba(16,185,129,0.9)]',
    cockpitCardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
    progressBar: 'from-lime-300 via-emerald-400 to-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.9)]',
    searchIconBg: 'bg-gradient-to-br from-lime-300 via-emerald-400 to-teal-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.8)]'
  };
}
