
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
import { Trash2, User, ShieldCheck, Trophy, Award, LayoutGrid } from "lucide-react";
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
}


const SingleTable = ({ tableData, isLoading, onRemovePlayer, onSelectPlayer, seasonStatus, seasonType, isAdmin, defendingChampionId, isCoop = false, totalPlayers }: SingleTableProps) => {
    const { t } = useTranslation();
    const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;

    return (
         <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-primary/20">
              <TableHead className="w-2 p-0"></TableHead>
              <TableHead className="w-16 text-center font-black text-primary uppercase text-[10px] tracking-widest">{t('rank')}</TableHead>
              <TableHead className="text-left font-black text-primary uppercase text-[10px] tracking-widest min-w-[200px]">{t('player')}</TableHead>
              <TableHead className="text-center font-black text-primary w-20 uppercase text-[10px] tracking-widest">{t('played_short')}</TableHead>
              <TableHead className="text-center font-black text-green-400 w-20 uppercase text-[10px] tracking-widest">{t('w_short')}</TableHead>
              {!isCoop && <TableHead className="text-center font-black text-yellow-400 w-20 uppercase text-[10px] tracking-widest">{t('d_short')}</TableHead>}
              <TableHead className="text-center font-black text-red-400 w-20 uppercase text-[10px] tracking-widest">{t('l_short')}</TableHead>
              {!isCoop && (
                <>
                    <TableHead className="hidden md:table-cell text-center font-black text-primary w-20 uppercase text-[10px] tracking-widest">{t('gf_short')}</TableHead>
                    <TableHead className="hidden md:table-cell text-center font-black text-primary w-20 uppercase text-[10px] tracking-widest">{t('ga_short')}</TableHead>
                    <TableHead className="hidden md:table-cell text-center font-black text-primary w-20 uppercase text-[10px] tracking-widest">{t('gd_short')}</TableHead>
                </>
              )}
              <TableHead className="text-center font-black text-primary w-24 uppercase text-[10px] tracking-widest">{t('pts_short')}</TableHead>
              {canRemovePlayer && <TableHead className="hidden sm:table-cell text-right font-black text-accent w-16 uppercase text-[10px] tracking-widest">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const currentType = seasonType || 'Single';
              
              const isFirst = entry.rank === 1 && currentType === 'Single';
              const isQualificationZone =
                  (currentType === 'Hybrid' && entry.rank >= 1 && entry.rank <= 4) ||
                  (currentType === 'Single' && entry.rank > 1 && entry.rank <= 4);
              
              const isRelegationZone = currentType === 'Single' && (entry.rank >= totalPlayers - 2 && totalPlayers > 3);
              
              const isUnbeaten = entry.played > 0 && entry.loss === 0;
              const isDefendingChampion = entry.playerId === defendingChampionId;

              return (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    "transition-colors h-16 border-b-white/5",
                    isFirst ? "bg-yellow-500/10 hover:bg-yellow-500/20" :
                    isQualificationZone ? "bg-green-500/10 hover:bg-green-500/20" :
                    isRelegationZone ? "bg-red-500/10 hover:bg-red-500/20" : "hover:bg-white/[0.03]"
                  )}
                >
                  <TableCell className={cn("p-0 w-1", 
                    isFirst ? 'bg-yellow-400' :
                    isQualificationZone ? 'bg-green-500' :
                    isRelegationZone ? 'bg-destructive' : 'bg-transparent'
                  )}>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-black text-lg px-1",
                    isFirst ? "text-yellow-400 text-xl" : 
                    isQualificationZone ? "text-green-400" :
                    isRelegationZone ? "text-destructive" : "text-foreground"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell className="relative overflow-visible py-2">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group hover:bg-primary/5 p-1.5 -m-1.5 rounded-lg transition-all duration-300 relative z-10"
                      onClick={() => onSelectPlayer(entry)}
                    >
                       <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border-2 transition-transform duration-500 group-hover:scale-110 group-hover:border-primary shadow-md">
                            <AvatarImage src={entry.team?.logoUrl} alt={entry.playerName} />
                            <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                          </Avatar>
                          {isFirst && (
                             <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-lg border border-background">
                                <Trophy className="w-3 h-3 text-black" />
                             </div>
                          )}
                       </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                           <span className={cn("font-black uppercase tracking-tight group-hover:text-primary transition-colors truncate", isFirst ? "text-base" : "text-sm")}>{entry.playerName}</span>
                            {isUnbeaten && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 px-1 py-0 h-4">
                                                <ShieldCheck className="w-2.5 h-2.5"/>
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Tak Terkalahkan</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                             {isDefendingChampion && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 px-1 py-0 h-4">
                                                <Award className="w-2.5 h-2.5"/>
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Juara Bertahan</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            <span className="truncate uppercase font-black tracking-widest">{entry.team?.name}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center p-1 text-sm font-bold">{entry.played}</TableCell>
                  <TableCell className="text-center p-1 text-sm font-bold text-green-400">{entry.win}</TableCell>
                  {!isCoop && <TableCell className="text-center p-1 text-sm font-bold text-yellow-400">{entry.draw}</TableCell>}
                  <TableCell className="text-center p-1 text-sm font-bold text-red-400">{entry.loss}</TableCell>
                  {!isCoop && (
                    <>
                        <TableCell className="hidden md:table-cell text-center p-1 text-sm font-bold opacity-70">{entry.goalsFor}</TableCell>
                        <TableCell className="hidden md:table-cell text-center p-1 text-sm font-bold opacity-70">{entry.goalsAgainst}</TableCell>
                        <TableCell className="hidden md:table-cell text-center p-1 text-sm font-bold opacity-70">{entry.goalDifference}</TableCell>
                    </>
                  )}
                  <TableCell className={cn("text-center font-black text-xl p-1", isFirst ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]" : "text-primary")}>
                    {entry.points}
                  </TableCell>
                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10"
                        onClick={() => onRemovePlayer?.(entry)}
                        title={`${t('remove')} ${entry.playerName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
      <div className="w-full overflow-hidden rounded-lg border-2 border-primary bg-card p-8 text-center shadow-lg shadow-primary/20">
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_players_registered_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const isHybrid = seasonType === 'Hybrid';

  return (
    <div className="w-full overflow-hidden rounded-lg border-2 border-primary/30 bg-card shadow-xl">
        {isHybrid ? (
             <Tabs defaultValue="group_a">
                <TabsList className="grid w-full grid-cols-3 rounded-b-none rounded-t-lg bg-background/50 h-12 p-1">
                    <TabsTrigger value="group_a" className="rounded-tl-md font-black uppercase tracking-tighter data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Grup A ({groupA.length})</TabsTrigger>
                    <TabsTrigger value="group_b" className="font-black uppercase tracking-tighter data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Grup B ({groupB.length})</TabsTrigger>
                    <TabsTrigger value="playoff" className="rounded-tr-md flex items-center gap-2 font-black uppercase tracking-tighter data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <LayoutGrid className="h-4 w-4" /> Playoff
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
             />
        )}
    </div>
  );
}

function LeagueTableSkeleton({ isCoop }: { isCoop: boolean}) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-hidden rounded-lg border-2 border-primary bg-card shadow-lg shadow-primary/20">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-4 p-0"></TableHead>
              <TableHead className="w-16 text-center">{t('rank')}</TableHead>
              <TableHead>{t('player')}</TableHead>
              <TableHead className="text-center">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('w_short')}</TableHead>
              {!isCoop && <TableHead className="hidden sm:table-cell text-center">{t('d_short')}</TableHead>}
              <TableHead className="hidden sm:table-cell text-center">{t('l_short')}</TableHead>
              {!isCoop && (
                <>
                  <TableHead className="hidden md:table-cell text-center">{t('gf_short')}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">{t('ga_short')}</TableHead>
                  <TableHead className="hidden md:table-cell text-center">{t('gd_short')}</TableHead>
                </>
              )}
              <TableHead className="text-center font-bold">{t('pts')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="w-4 p-0"></TableCell>
                <TableCell><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                {!isCoop && <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>}
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                {!isCoop && (
                    <>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    </>
                )}
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
