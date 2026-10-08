'use client';

import { useMemo, useState } from 'react';
import type { LeagueEntry, Season, WithId, Player, Team, Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, LayoutGrid, Swords, Activity, Share2, Info, Zap, Scan, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { resolveLogo } from "@/lib/logo-utils";
import { TournamentBracket } from "./tournament-bracket";
import { getSeasonTheme } from "@/lib/season-theme";
import { StandingsShareDialog } from "./standings-share-dialog";
import { KnockoutShareDialog } from "./knockout-share-dialog";
import { SingleTable } from "./league/single-table";
import { TopScorerTable } from "./league/top-scorer-table";
import { LeagueTableSkeleton } from "./league/league-table-skeleton";
import { PlayoffQualificationLegend } from "./league/playoff-qualification-legend";

export { LeagueTableSkeleton } from "./league/league-table-skeleton";
export { SingleTable } from "./league/single-table";
export { TopScorerTable } from "./league/top-scorer-table";
export { PlayoffQualificationLegend } from "./league/playoff-qualification-legend";

interface LeagueTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>, logoUrl?: string })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  seasonType?: Season['type'];
  isAdmin: boolean;
  defendingChampionId?: string;
  matches?: WithId<Match>[];
  playersById?: Record<string, WithId<Player>>;
  teamsById?: Record<string, WithId<Team>>;
  activeSeason?: WithId<Season> | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRevertMatch?: (match: WithId<Match>) => void;
  onToggleDivision?: (entry: WithId<LeagueEntry>) => void;
  selectedDivision?: 'div-1' | 'div-2';
  onDivisionChange?: (division: 'div-1' | 'div-2') => void;
}

export function LeagueTable({ 
    tableData, 
    isLoading = false, 
    onRemovePlayer, 
    onSelectPlayer, 
    seasonStatus, 
    seasonType, 
    isAdmin, 
    defendingChampionId,
    matches = [],
    playersById = {},
    teamsById = {},
    activeSeason = null,
    activeTab = "group_a",
    onTabChange,
    onRevertMatch,
    onToggleDivision,
    selectedDivision: propSelectedDivision,
    onDivisionChange,
}: LeagueTableProps) {
  const { t } = useTranslation();
  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
  const [isShareStandingsOpen, setIsShareStandingsOpen] = useState(false);
  const [isShareKnockoutOpen, setIsShareKnockoutOpen] = useState(false);
  
  const [internalDivision, setInternalDivision] = useState<'div-1' | 'div-2'>('div-1');
  const selectedDivision = propSelectedDivision !== undefined ? propSelectedDivision : internalDivision;
  const setSelectedDivision = (div: 'div-1' | 'div-2') => {
    setInternalDivision(div);
    onDivisionChange?.(div);
    if (div === 'div-2') {
      if (activeTab === 'group_a' || activeTab === 'group_b' || activeTab === 'playoff') {
        onTabChange?.('standings');
      }
    } else {
      const isD1Hybrid = activeSeason?.type === 'Hybrid';
      if (isD1Hybrid && activeTab === 'standings') {
        onTabChange?.('group_a');
      }
    }
  };

  const enrichedTableData = useMemo(() => {
    return tableData.map(entry => {
        const pId = entry.playerId || entry.id;
        const player = playersById[pId];
        const teamId = entry.teamId || player?.teamId || '';
        const team = teamsById[teamId];
        const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.playerName);
        return { ...entry, team: team, logoUrl };
    });
  }, [tableData, teamsById, playersById]);

  const hasDivisions = !!activeSeason?.hasDivisions;
  const isMerged = !!activeSeason?.isDiv2Merged;

  const div1Entries = useMemo(() => enrichedTableData.filter(e => e.division !== 'div-2'), [enrichedTableData]);
  const div2Entries = useMemo(() => enrichedTableData.filter(e => e.division === 'div-2'), [enrichedTableData]);

  // Is multi-division actively split? (Has divisions enabled, not merged, and div2 has >= 3 players)
  const isMultiDivisionActive = hasDivisions && !isMerged && div2Entries.length >= 3;

  // The active enriched entries for display
  const currentDisplayData = useMemo(() => {
    if (!isMultiDivisionActive) return enrichedTableData;
    return selectedDivision === 'div-1' ? div1Entries : div2Entries;
  }, [isMultiDivisionActive, selectedDivision, div1Entries, div2Entries, enrichedTableData]);

  // Sort current display entries
  const sortedCurrentData = useMemo(() => {
    const sortFn = (a: any, b: any) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0);
    return [...currentDisplayData].sort(sortFn).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [currentDisplayData]);

  // Active format for the selected division
  const currentFormat = useMemo(() => {
    if (isMultiDivisionActive && selectedDivision === 'div-2') {
      if (activeSeason?.division2HasPlayoff === false) {
        return 'Single';
      }
      return activeSeason?.division2Format || 'Single';
    }
    return seasonType || 'Single';
  }, [isMultiDivisionActive, selectedDivision, activeSeason, seasonType]);

  const matchesForDivision = useMemo(() => {
    if (!isMultiDivisionActive) return matches;
    return matches.filter(m => m.division === selectedDivision || (!m.division && selectedDivision === 'div-1'));
  }, [matches, isMultiDivisionActive, selectedDivision]);

  const isStandardHybrid = currentFormat === 'Hybrid';
  const isCoopHybrid = currentFormat === 'Co-Op Hybrid';
  const isSingleHybrid = currentFormat === 'Single Hybrid';
  const isAnyHybrid = isStandardHybrid || isCoopHybrid || isSingleHybrid;

  const { groupA, groupB } = useMemo(() => {
    if (!isStandardHybrid) return { groupA: [], groupB: [] };
    const sortFn = (a: any, b: any) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0);
    
    // Separate players with assigned group and unassigned players
    const explicitA = currentDisplayData.filter(p => p.group === 'A');
    const explicitB = currentDisplayData.filter(p => p.group === 'B');
    const unassigned = currentDisplayData.filter(p => p.group !== 'A' && p.group !== 'B');

    const fullA = [...explicitA];
    const fullB = [...explicitB];

    // Distribute unassigned players so no player is missing from the group view
    unassigned.forEach(p => {
      if (fullA.length <= fullB.length) {
        fullA.push({ ...p, group: 'A' });
      } else {
        fullB.push({ ...p, group: 'B' });
      }
    });

    const a = fullA.sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    const b = fullB.sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    return { groupA: a, groupB: b };
  }, [currentDisplayData, isStandardHybrid]);

  if (isLoading) return <LeagueTableSkeleton isCoop={seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid'} />;
  if (tableData.length === 0) {
    return (
      <div className={cn("max-w-md sm:max-w-lg mx-auto overflow-hidden rounded-2xl sm:rounded-[2rem] border-2 border-dashed bg-black/60 p-8 sm:p-12 text-center backdrop-blur-2xl relative shadow-2xl transition-all", theme.tableCardBorder)}>
        <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.tableTopTracer)} />
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-4">
          <LayoutGrid className={cn("w-7 h-7", theme.primaryText)} />
        </div>
        <Badge className={cn("mb-2 uppercase text-[7.5px] font-black tracking-widest", theme.badgeClass)}>
          {theme.editionName}
        </Badge>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">{t('no_players_registered_title')}</h2>
        <p className="text-[11px] font-bold text-white/40 mt-1.5 uppercase tracking-normal">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const isSeasonCoop = (seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid') && (!isMultiDivisionActive || selectedDivision === 'div-1');

  return (
    <div className={cn(
        "w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border bg-gradient-to-b from-black/95 via-black/90 to-[#070B14]/95 backdrop-blur-3xl relative aero-card transition-all duration-500",
        theme.tableCardBorder,
        theme.tableCardGlow
    )}>
        {/* Top Accent TI Theme Tracer */}
        <div className={cn("absolute top-0 left-0 right-0 h-[2.5px] z-20 pointer-events-none", theme.tableTopTracer)} />

        {/* Multi-Division Auto-Merge Notification Banner */}
        {hasDivisions && (isMerged || (div2Entries.length > 0 && div2Entries.length <= 2)) && (
          <div className="p-3 sm:p-4 bg-amber-500/[0.08] border-b border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-mono font-bold">
                REGULASI MULTI-DIVISI: Divisi 2 dimerge ke Divisi 1 karena peserta &lt; 3 atlet ({div2Entries.length || 0} atlet). Seluruh peserta bertanding di Divisi 1.
              </span>
            </div>
            <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300 text-[8px] font-mono uppercase tracking-wider shrink-0 hidden sm:inline-flex">
              MERGED TO DIV 1
            </Badge>
          </div>
        )}

        {/* Multi-Division Switcher Pill Dock (Opsi 1) */}
        {isMultiDivisionActive && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-black via-white/[0.02] to-black border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 w-full sm:w-auto gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedDivision('div-1')}
                className={cn(
                  "flex-1 sm:flex-initial h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                  selectedDivision === 'div-1'
                    ? "bg-primary text-black border-primary shadow-[0_0_25px_rgba(204,253,1,0.45)]"
                    : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{activeSeason?.division1Name || 'DIVISI 1'}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                  selectedDivision === 'div-1' ? "bg-black/25 text-black" : "bg-white/10 text-white/50"
                )}>
                  {div1Entries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDivision('div-2')}
                className={cn(
                  "flex-1 sm:flex-initial h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                  selectedDivision === 'div-2'
                    ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.45)]"
                    : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{activeSeason?.division2Name || 'DIVISI 2'}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                  selectedDivision === 'div-2' ? "bg-black/25 text-black" : "bg-white/10 text-white/50"
                )}>
                  {div2Entries.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 uppercase tracking-widest px-2">
              <Zap className="w-3 h-3 text-primary animate-pulse" />
              <span>SISTEM 2 DIVISI // {selectedDivision === 'div-1' ? (activeSeason?.division1Name || 'DIVISI 1') : (activeSeason?.division2Name || 'DIVISI 2')}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {activeTab !== 'playoff' && (
          <PlayoffQualificationLegend 
            seasonType={currentFormat} 
            theme={theme} 
            hasDivisions={hasDivisions && !isMerged}
            isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
            div1Name={activeSeason?.division1Name || 'Divisi 1'}
            div2Name={activeSeason?.division2Name || 'Divisi 2'}
            promotionSpots={activeSeason?.promotionSpots ?? 2}
            relegationSpots={activeSeason?.relegationSpots ?? 2}
            totalPlayers={sortedCurrentData.length}
          />
        )}
        
        {isSeasonCoop ? (
             <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <TabsList className={cn("grid flex-1 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2", isCoopHybrid ? "grid-cols-3" : "grid-cols-2")}>
                      <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                          <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                      </TabsTrigger>
                      <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                          <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                      </TabsTrigger>
                      {isCoopHybrid && (
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}>
                              <span className="flex items-center justify-center gap-2"><Swords className="w-4 h-4" />Playoff</span>
                          </TabsTrigger>
                      )}
                  </TabsList>
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {activeTab === 'playoff' ? (
                      <Button
                        type="button"
                        onClick={() => setIsShareKnockoutOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Bagan</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setIsShareStandingsOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                        style={{
                          backgroundColor: theme.primaryHex,
                          color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                          borderColor: `${theme.primaryHex}60`,
                          boxShadow: `0 0 20px ${theme.glowRgba}`,
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Klasemen</span>
                      </Button>
                    )}
                  </div>
                </div>
                <TabsContent value="standings" className="mt-0">
                  <SingleTable 
                    tableData={sortedCurrentData} 
                    isCoop={true} 
                    totalPlayers={sortedCurrentData.length} 
                    onSelectPlayer={onSelectPlayer} 
                    seasonType={currentFormat} 
                    isLoading={isLoading} 
                    onRemovePlayer={onRemovePlayer} 
                    onToggleDivision={onToggleDivision}
                    seasonStatus={seasonStatus} 
                    isAdmin={isAdmin} 
                    defendingChampionId={defendingChampionId} 
                    matches={matchesForDivision} 
                    theme={theme} 
                    playersById={playersById} 
                    teamsById={teamsById} 
                    hasDivisions={hasDivisions && !isMerged}
                    isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                    division1Name={activeSeason?.division1Name || 'Divisi 1'}
                    division2Name={activeSeason?.division2Name || 'Divisi 2'}
                    promotionSpots={activeSeason?.promotionSpots ?? 2}
                    relegationSpots={activeSeason?.relegationSpots ?? 2}
                  />
                </TabsContent>
                <TabsContent value="topskor" className="mt-0 py-10">
                  <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                </TabsContent>
                {isCoopHybrid && (
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                )}
             </Tabs>
        ) : (
            isSingleHybrid ? (
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <TabsList className="grid flex-1 grid-cols-3 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                          <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                              <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                          </TabsTrigger>
                          <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                              <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                          </TabsTrigger>
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}>
                              <span className="flex items-center justify-center gap-2"><Swords className="w-4 h-4" />Playoff</span>
                          </TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {activeTab === 'playoff' ? (
                          <Button
                            type="button"
                            onClick={() => setIsShareKnockoutOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Bagan</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => setIsShareStandingsOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                            style={{
                              backgroundColor: theme.primaryHex,
                              color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                              borderColor: `${theme.primaryHex}60`,
                              boxShadow: `0 0 20px ${theme.glowRgba}`,
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Klasemen</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <TabsContent value="standings" className="mt-0">
                        <SingleTable 
                          tableData={sortedCurrentData} 
                          isCoop={false} 
                          totalPlayers={sortedCurrentData.length} 
                          onSelectPlayer={onSelectPlayer} 
                          seasonType={currentFormat} 
                          isLoading={isLoading} 
                          onRemovePlayer={onRemovePlayer} 
                          onToggleDivision={onToggleDivision}
                          seasonStatus={seasonStatus} 
                          isAdmin={isAdmin} 
                          defendingChampionId={defendingChampionId} 
                          matches={matchesForDivision} 
                          theme={theme} 
                          playersById={playersById} 
                          teamsById={teamsById} 
                          hasDivisions={hasDivisions && !isMerged}
                          isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                          division1Name={activeSeason?.division1Name || 'Divisi 1'}
                          division2Name={activeSeason?.division2Name || 'Divisi 2'}
                          promotionSpots={activeSeason?.promotionSpots ?? 2}
                          relegationSpots={activeSeason?.relegationSpots ?? 2}
                        />
                    </TabsContent>
                    <TabsContent value="topskor" className="mt-0 py-10">
                        <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                    </TabsContent>
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                </Tabs>
            ) : isStandardHybrid ? (
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <TabsList className="grid flex-1 grid-cols-3 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                          <TabsTrigger value="group_a" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}><span className="flex items-center justify-center gap-2">Grup A</span></TabsTrigger>
                          <TabsTrigger value="group_b" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}><span className="flex items-center justify-center gap-2">Grup B</span></TabsTrigger>
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}><span className="flex items-center justify-center gap-2">Playoff</span></TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {activeTab === 'playoff' ? (
                          <Button
                            type="button"
                            onClick={() => setIsShareKnockoutOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Bagan</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => setIsShareStandingsOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                            style={{
                              backgroundColor: theme.primaryHex,
                              color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                              borderColor: `${theme.primaryHex}60`,
                              boxShadow: `0 0 20px ${theme.glowRgba}`,
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Klasemen</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <TabsContent value="group_a" className="mt-0">
                      <SingleTable 
                        tableData={groupA} 
                        totalPlayers={groupA.length} 
                        onSelectPlayer={onSelectPlayer} 
                        seasonType={currentFormat} 
                        isLoading={isLoading} 
                        onRemovePlayer={onRemovePlayer} 
                        onToggleDivision={onToggleDivision}
                        seasonStatus={seasonStatus} 
                        isAdmin={isAdmin} 
                        defendingChampionId={defendingChampionId} 
                        matches={matchesForDivision} 
                        isCoop={false} 
                        theme={theme} 
                        playersById={playersById} 
                        teamsById={teamsById} 
                        hasDivisions={hasDivisions && !isMerged}
                        isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                        division1Name={activeSeason?.division1Name || 'Divisi 1'}
                        division2Name={activeSeason?.division2Name || 'Divisi 2'}
                        promotionSpots={activeSeason?.promotionSpots ?? 2}
                        relegationSpots={activeSeason?.relegationSpots ?? 2}
                      />
                    </TabsContent>
                    <TabsContent value="group_b" className="mt-0">
                      <SingleTable 
                        tableData={groupB} 
                        totalPlayers={groupB.length} 
                        onSelectPlayer={onSelectPlayer} 
                        seasonType={currentFormat} 
                        isLoading={isLoading} 
                        onRemovePlayer={onRemovePlayer} 
                        onToggleDivision={onToggleDivision}
                        seasonStatus={seasonStatus} 
                        isAdmin={isAdmin} 
                        defendingChampionId={defendingChampionId} 
                        matches={matchesForDivision} 
                        isCoop={false} 
                        theme={theme} 
                        playersById={playersById} 
                        teamsById={teamsById} 
                        hasDivisions={hasDivisions && !isMerged}
                        isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                        division1Name={activeSeason?.division1Name || 'Divisi 1'}
                        division2Name={activeSeason?.division2Name || 'Divisi 2'}
                        promotionSpots={activeSeason?.promotionSpots ?? 2}
                        relegationSpots={activeSeason?.relegationSpots ?? 2}
                      />
                    </TabsContent>
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <Tabs value={activeTab === 'topskor' ? 'topskor' : 'standings'} onValueChange={onTabChange} className="w-full">
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <TabsList className="grid flex-1 grid-cols-2 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                      <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                        <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                      </TabsTrigger>
                      <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                        <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <Button
                        type="button"
                        onClick={() => setIsShareStandingsOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                        style={{
                          backgroundColor: theme.primaryHex,
                          color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                          borderColor: `${theme.primaryHex}60`,
                          boxShadow: `0 0 20px ${theme.glowRgba}`,
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Klasemen</span>
                      </Button>
                    </div>
                  </div>
                  <TabsContent value="standings" className="mt-0">
                    <SingleTable 
                      tableData={sortedCurrentData} 
                      isCoop={false} 
                      totalPlayers={sortedCurrentData.length} 
                      onSelectPlayer={onSelectPlayer} 
                      seasonType={currentFormat} 
                      isLoading={isLoading} 
                      onRemovePlayer={onRemovePlayer} 
                      onToggleDivision={onToggleDivision}
                      seasonStatus={seasonStatus} 
                      isAdmin={isAdmin} 
                      defendingChampionId={defendingChampionId} 
                      matches={matchesForDivision} 
                      theme={theme} 
                      playersById={playersById} 
                      teamsById={teamsById} 
                      hasDivisions={hasDivisions && !isMerged}
                      isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                      division1Name={activeSeason?.division1Name || 'Divisi 1'}
                      division2Name={activeSeason?.division2Name || 'Divisi 2'}
                      promotionSpots={activeSeason?.promotionSpots ?? 2}
                      relegationSpots={activeSeason?.relegationSpots ?? 2}
                    />
                  </TabsContent>
                  <TabsContent value="topskor" className="mt-0 py-10">
                    <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                  </TabsContent>
                </Tabs>
            )
        )}

        <StandingsShareDialog 
          open={isShareStandingsOpen} 
          onOpenChange={setIsShareStandingsOpen} 
          tableData={sortedCurrentData} 
          activeSeason={activeSeason} 
          seasonType={currentFormat}
          divisionTitle={isMultiDivisionActive ? (selectedDivision === 'div-1' ? (activeSeason?.division1Name || 'Divisi 1') : (activeSeason?.division2Name || 'Divisi 2')) : undefined}
        />

        <KnockoutShareDialog
          open={isShareKnockoutOpen}
          onOpenChange={setIsShareKnockoutOpen}
          matches={matchesForDivision}
          playersById={playersById}
          teamsById={teamsById}
          leagueTable={sortedCurrentData}
          season={activeSeason}
        />
    </div>
  );
}

