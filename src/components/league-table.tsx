
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueEntry, Season, WithId, Player, Team } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Trash2, User, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface LeagueTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  isAdmin: boolean;
}

export function LeagueTable({ tableData, isLoading = false, onRemovePlayer, onSelectPlayer, seasonStatus, isAdmin }: LeagueTableProps) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return <LeagueTableSkeleton />;
  }
  
  if (tableData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border-2 border-primary bg-card p-8 text-center shadow-lg shadow-primary/20">
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_players_registered_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;
  const totalPlayers = tableData.length;

  return (
    <div className="w-full overflow-hidden rounded-lg border-2 border-primary bg-card shadow-lg shadow-primary/20">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-4 p-0"></TableHead>
              <TableHead className="w-12 text-center font-bold text-primary sm:hidden">#</TableHead>
              <TableHead className="w-12 text-center font-bold text-primary hidden sm:table-cell">{t('rank')}</TableHead>
              <TableHead className="text-left font-bold text-primary">{t('player')}</TableHead>
              <TableHead className="text-center font-bold text-primary sm:hidden">{t('played')}</TableHead>
              <TableHead className="text-center font-bold text-primary hidden sm:table-cell">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-green-400">{t('w')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-yellow-400">{t('d')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-red-400">{t('l')}</TableHead>
              <TableHead className="hidden lg:table-cell text-center font-bold text-primary">{t('gf')}</TableHead>
              <TableHead className="hidden lg:table-cell text-center font-bold text-primary">{t('ga')}</TableHead>
              <TableHead className="hidden md:table-cell text-center font-bold text-primary">{t('gd')}</TableHead>
              <TableHead className="text-center font-bold text-primary sm:hidden">{t('pts')}</TableHead>
              <TableHead className="text-center font-bold text-primary hidden sm:table-cell">{t('pts')}</TableHead>
              {canRemovePlayer && <TableHead className="hidden sm:table-cell text-right font-bold text-accent">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const isFirst = entry.rank === 1;
              const isUCLZone = entry.rank >= 2 && entry.rank <= 4;
              const isLastThree = entry.rank >= totalPlayers - 2 && totalPlayers > 3;
              const isUnbeaten = entry.played > 0 && entry.loss === 0;

              return (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    isFirst && "bg-yellow-500/10 hover:bg-yellow-500/20 text-base",
                    isUCLZone && "bg-green-500/10 hover:bg-green-500/20",
                    isLastThree && "bg-red-500/10 hover:bg-red-500/20"
                  )}
                >
                  <TableCell className={cn("p-0 w-1", 
                    isFirst ? 'bg-yellow-400' :
                    isUCLZone ? 'bg-green-500' :
                    isLastThree ? 'bg-destructive' : 'bg-transparent'
                  )}>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-bold text-lg",
                    isFirst ? "text-yellow-400 text-xl" : "text-foreground"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => onSelectPlayer(entry)}
                    >
                       <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.player?.photoUrl} alt={entry.playerName} />
                        <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className={cn("font-bold group-hover:text-primary transition-colors", isFirst ? "text-lg" : "text-sm sm:text-base")}>{entry.playerName}</span>
                            {isFirst && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 px-1.5 py-0.5">
                                                <Trophy className="w-3 h-3"/>
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Peringkat Pertama</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {isUnbeaten && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 px-1.5 py-0.5">
                                                <ShieldCheck className="w-3 h-3"/>
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Tak Terkalahkan</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Avatar className="h-4 w-4">
                                <AvatarImage src={entry.team?.logoUrl} alt={entry.team?.name} />
                                <AvatarFallback>{entry.team?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {entry.team?.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{entry.played}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center text-green-400">{entry.win}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center text-yellow-400">{entry.draw}</TableCell>
                  <TableCell className="hidden sm:table-cell text-center text-red-400">{entry.loss}</TableCell>
                  <TableCell className="hidden lg:table-cell text-center">{entry.goalsFor}</TableCell>
                  <TableCell className="hidden lg:table-cell text-center">{entry.goalsAgainst}</TableCell>
                  <TableCell className="hidden md:table-cell text-center font-medium">
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </TableCell>
                  <TableCell className={cn("text-center font-bold text-lg", isFirst ? "text-yellow-300" : "text-primary")}>
                    {entry.points}
                  </TableCell>
                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePlayer?.(entry)}
                        title={`${t('remove')} ${entry.playerName}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}

function LeagueTableSkeleton() {
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
              <TableHead className="hidden sm:table-cell text-center">{t('w')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('d')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('l')}</TableHead>
              <TableHead className="hidden lg:table-cell text-center">{t('gf')}</TableHead>
              <TableHead className="hidden lg:table-cell text-center">{t('ga')}</TableHead>
              <TableHead className="hidden md:table-cell text-center">{t('gd')}</TableHead>
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
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
