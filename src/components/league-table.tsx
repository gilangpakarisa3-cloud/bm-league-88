import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueEntry, Season, WithId, Player, Team, Match } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Trash2, User, ShieldCheck, Trophy, Award, LayoutGrid, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useMemo } from "react";
import { TournamentBracket } from "./tournament-bracket";

interface LeagueTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
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
}

interface SingleTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>, rank: number })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  seasonType?: Season['type'];
  isAdmin: boolean;
  defendingChampionId?: string;
  isCoop?: boolean;
  totalPlayers: number;
  matches: WithId<Match>[];
}

const SingleTable = ({ 
    tableData, 
    isLoading, 
    onRemovePlayer, 
    onSelectPlayer, 
    seasonStatus, 
    seasonType, 
    isAdmin, 
    defendingChampionId, 
    isCoop = false, 
    totalPlayers,
    matches
}: SingleTableProps) => {
    const { t } = useTranslation();
    const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;

    const getPlayerForm = (playerId: string) => {
        return matches
            .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
            .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
            .slice(0, 5)
            .reverse()
            .map(m => {
                const isP1 = m.player1Id === playerId;
                const s1 = isCoop || (m.round && m.round !== 'Group') ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
                const s2 = isCoop || (m.round && m.round !== 'Group') ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
                const pRes = isP1 ? s1 : s2;
                const oRes = isP1 ? s2 : s1;
                if (pRes > oRes) return 'W';
                if (pRes < oRes) return 'L';
                return 'D';
            });
    };

    return (
         <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-primary/30 border-t-0 h-14">
              <TableHead className="w-2 p-0"></TableHead>
              <TableHead className="w-16 text-center font-black text-primary uppercase text-[10px] tracking-[0.2em]">{t('rank')}</TableHead>
              <TableHead className="text-left font-black text-primary text-[10px] tracking-[0.2em] min-w-[220px] uppercase">{t('player')}</TableHead>
              <TableHead className="text-center font-black text-primary w-16 text-[10px] tracking-[0.2em] uppercase">{t('played_short')}</TableHead>
              <TableHead className="text-center font-black text-green-400 w-16 text-[10px] tracking-[0.2em] uppercase">{t('w_short')}</TableHead>
              {!isCoop && <TableHead className="text-center font-black text-yellow-400 w-16 text-[10px] tracking-[0.2em] uppercase">{t('d_short')}</TableHead>}
              <TableHead className="text-center font-black text-red-400 w-16 text-[10px] tracking-[0.2em] uppercase">{t('l_short')}</TableHead>
              {!isCoop && (
                <>
                    <TableHead className="hidden lg:table-cell text-center font-black text-white/40 w-16 text-[10px] tracking-[0.2em] uppercase">{t('gf_short')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-center font-black text-white/40 w-16 text-[10px] tracking-[0.2em] uppercase">{t('ga_short')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-center font-black text-primary/60 w-16 text-[10px] tracking-[0.2em] uppercase">{t('gd_short')}</TableHead>
                </>
              )}
              <TableHead className="hidden xl:table-cell text-center font-black text-white/40 w-32 text-[10px] tracking-[0.2em] uppercase">Form</TableHead>
              <TableHead className="text-center font-black text-primary w-24 text-[10px] tracking-[0.2em] uppercase">{t('pts_short')}</TableHead>
              {canRemovePlayer && <TableHead className="hidden sm:table-cell text-right font-black text-accent w-16 text-[10px] tracking-[0.2em] uppercase">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const currentType = seasonType || 'Single';
              const playerForm = getPlayerForm(entry.playerId || entry.id);
              
              const isFirst = entry.rank === 1 && currentType === 'Single';
              const isQualificationZone =
                  (currentType === 'Hybrid' && entry.rank >= 1 && entry.rank <= 4) ||
                  (currentType === 'Single' && entry.rank > 1 && entry.rank <= 4);
              
              const isLowerBracketZone = 
                  currentType === 'Hybrid' && 
                  totalPlayers >= 6 && 
                  (entry.rank === 5 || entry.rank === 6);

              const isRelegationZone = 
                  (currentType === 'Single' && totalPlayers > 3 && entry.rank >= totalPlayers - 2) ||
                  (currentType === 'Hybrid' && totalPlayers > 6 && entry.rank > 6);
              
              const isUnbeaten = entry.played > 0 && entry.loss === 0;
              const isDefendingChampion = entry.playerId === defendingChampionId;

              return (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    "transition-all h-20 border-b-white/5 relative group/row",
                    isFirst ? "bg-yellow-500/[0.07] hover:bg-yellow-500/[0.12]" :
                    isQualificationZone ? "bg-green-500/[0.05] hover:bg-green-500/[0.1]" :
                    isLowerBracketZone ? "bg-amber-500/[0.05] hover:bg-amber-500/[0.1]" :
                    isRelegationZone ? "bg-red-500/[0.05] hover:bg-red-500/[0.1]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <TableCell className={cn("p-0 w-1.5", 
                    isFirst ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
                    isQualificationZone ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                    isLowerBracketZone ? 'bg-amber-500' :
                    isRelegationZone ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-transparent'
                  )}>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-black text-xl px-1 italic",
                    isFirst ? "text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : 
                    isQualificationZone ? "text-green-400" :
                    isLowerBracketZone ? "text-amber-500" :
                    isRelegationZone ? "text-red-500" : "text-white/40"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell className="relative overflow-visible py-3">
                    <div 
                      className="flex items-center gap-4 cursor-pointer group hover:translate-x-1 transition-transform duration-300"
                      onClick={() => onSelectPlayer(entry)}
                    >
                       <div className="relative shrink-0">
                          <div className={cn(
                              "absolute -inset-1 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity",
                              isFirst ? "bg-yellow-400/30" : "bg-primary/20"
                          )} />
                          <Avatar className={cn(
                              "h-12 w-12 border-2 transition-all duration-500 shadow-xl relative z-10",
                              isFirst ? "border-yellow-400 scale-110" : "border-white/10 group-hover:border-primary"
                          )}>
                            <AvatarImage src={entry.team?.logoUrl} alt={entry.playerName} className="object-cover" />
                            <AvatarFallback><User className="w-6 h-6 text-white/20"/></AvatarFallback>
                          </Avatar>
                          {isFirst && (
                             <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-lg border-2 border-background z-20 animate-bounce">
                                <Trophy className="w-3.5 h-3.5 text-black" />
                             </div>
                          )}
                       </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <span className={cn(
                               "font-black tracking-tight transition-colors truncate uppercase italic", 
                               isFirst ? "text-lg text-yellow-400" : "text-base text-white group-hover:text-primary"
                            )}>
                                {entry.playerName}
                            </span>
                            {isUnbeaten && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 px-1.5 py-0 h-5 font-black text-[8px] uppercase">
                                                <ShieldCheck className="w-2.5 h-2.5 mr-1"/> UNBEATEN
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Tak Terkalahkan</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                             {isDefendingChampion && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 px-1.5 py-0 h-5 font-black text-[8px] uppercase">
                                                <Award className="w-2.5 h-2.5 mr-1"/> CHAMP
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Juara Bertahan</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                            <span className="truncate">{entry.team?.name}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center p-1 text-sm font-black text-white/80">{entry.played}</TableCell>
                  <TableCell className="text-center p-1 text-sm font-black text-green-400">{entry.win}</TableCell>
                  {!isCoop && <TableCell className="text-center p-1 text-sm font-black text-yellow-400">{entry.draw}</TableCell>}
                  <TableCell className="text-center p-1 text-sm font-black text-red-400">{entry.loss}</TableCell>
                  {!isCoop && (
                    <>
                        <TableCell className="hidden lg:table-cell text-center p-1 text-sm font-bold text-white/30">{entry.goalsFor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-center p-1 text-sm font-bold text-white/30">{entry.goalsAgainst}</TableCell>
                        <TableCell className={cn("hidden lg:table-cell text-center p-1 text-sm font-black", entry.goalDifference > 0 ? "text-primary/60" : (entry.goalDifference < 0 ? "text-red-400/60" : "text-white/20"))}>
                            {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                        </TableCell>
                    </>
                  )}
                  <TableCell className="hidden xl:table-cell text-center p-1">
                      <div className="flex justify-center gap-1">
                          {playerForm.length > 0 ? playerForm.map((res, i) => (
                              <div key={i} className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border",
                                  res === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50" : 
                                  res === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : 
                                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              )}>{res}</div>
                          )) : <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">No Matches</span>}
                      </div>
                  </TableCell>
                  <TableCell className={cn(
                      "text-center font-black text-2xl p-1 italic", 
                      isFirst ? "text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-110" : "text-primary"
                    )}>
                    {entry.points}
                  </TableCell>
                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-white/5"
                        onClick={() => onRemovePlayer?.(entry)}
                        title={`${t('remove')} ${entry.playerName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('remove_player')}</span>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
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
    activeSeason = null
}: LeagueTableProps) {
  const { t } = useTranslation();
  
  const { groupA, groupB } = useMemo(() => {
    if (seasonType !== 'Hybrid') return { groupA: [], groupB: [] };
    
    const sortAndRank = (data: typeof tableData) => 
        data.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.playerName.localeCompare(b.playerName);
        }).map((entry, index) => ({...entry, rank: index + 1}));

    const a = sortAndRank(tableData.filter(p => p.group === 'A'));
    const b = sortAndRank(tableData.filter(p => p.group === 'B'));
    
    return { groupA: a, groupB: b };
  }, [tableData, seasonType]);


  if (isLoading) {
    return <LeagueTableSkeleton isCoop={seasonType === 'Co-Op'} />;
  }
  
  if (tableData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-card/40 p-16 text-center backdrop-blur-md">
        <LayoutGrid className="w-16 h-16 text-primary/10 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-muted-foreground uppercase tracking-widest">{t('no_players_registered_title')}</h2>
        <p className="text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const isHybrid = seasonType === 'Hybrid';

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-white/5 bg-card/60 backdrop-blur-xl shadow-2xl">
        {isHybrid ? (
             <Tabs defaultValue="group_a" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-none bg-black/40 h-14 p-1 border-b border-white/5">
                    <TabsTrigger value="group_a" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500">Grup A ({groupA.length})</TabsTrigger>
                    <TabsTrigger value="group_b" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500">Grup B ({groupB.length})</TabsTrigger>
                    <TabsTrigger value="playoff" className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500">
                        <Swords className="h-3.5 w-3.5" /> Playoff
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="group_a" className="mt-0">
                     <SingleTable 
                        tableData={groupA} 
                        totalPlayers={groupA.length}
                        onSelectPlayer={onSelectPlayer}
                        seasonType={seasonType}
                        isLoading={isLoading}
                        onRemovePlayer={onRemovePlayer}
                        seasonStatus={seasonStatus}
                        isAdmin={isAdmin}
                        defendingChampionId={defendingChampionId}
                        matches={matches}
                     />
                </TabsContent>
                <TabsContent value="group_b" className="mt-0">
                     <SingleTable 
                        tableData={groupB} 
                        totalPlayers={groupB.length}
                        onSelectPlayer={onSelectPlayer}
                        seasonType={seasonType}
                        isLoading={isLoading}
                        onRemovePlayer={onRemovePlayer}
                        seasonStatus={seasonStatus}
                        isAdmin={isAdmin}
                        defendingChampionId={defendingChampionId}
                        matches={matches}
                     />
                </TabsContent>
                <TabsContent value="playoff" className="mt-0">
                    <TournamentBracket 
                        matches={matches} 
                        playersById={playersById} 
                        teamsById={teamsById}
                        leagueTable={tableData}
                        season={activeSeason}
                        isAdmin={isAdmin}
                    />
                </TabsContent>
            </Tabs>
        ) : (
            <SingleTable 
                tableData={tableData}
                isCoop={seasonType === 'Co-Op'}
                totalPlayers={tableData.length}
                onSelectPlayer={onSelectPlayer}
                seasonType={seasonType}
                isLoading={isLoading}
                onRemovePlayer={onRemovePlayer}
                seasonStatus={seasonStatus}
                isAdmin={isAdmin}
                defendingChampionId={defendingChampionId}
                matches={matches}
             />
        )}
    </div>
  );
}

function LeagueTableSkeleton({ isCoop }: { isCoop: boolean}) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-white/5 bg-card/40 animate-pulse">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent h-14">
              <TableHead className="w-2 p-0"></TableHead>
              <TableHead className="w-16 text-center">{t('rank')}</TableHead>
              <TableHead>{t('player')}</TableHead>
              <TableHead className="text-center">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('w_short')}</TableHead>
              {!isCoop && <TableHead className="hidden sm:table-cell text-center">{t('d_short')}</TableHead>}
              <TableHead className="hidden sm:table-cell text-center">{t('l_short')}</TableHead>
              <TableHead className="text-center font-bold">{t('pts')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(8)].map((_, i) => (
              <TableRow key={i} className="h-20">
                <TableCell className="w-2 p-0"></TableCell>
                <TableCell><Skeleton className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                <TableCell>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                {!isCoop && <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>}
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-12 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
