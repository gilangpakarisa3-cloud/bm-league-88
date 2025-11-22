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
import { Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";

interface LeagueTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  isAdmin: boolean;
}

export function LeagueTable({ tableData, isLoading = false, onRemovePlayer, seasonStatus, isAdmin }: LeagueTableProps) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return <LeagueTableSkeleton />;
  }
  
  if (tableData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_players_registered_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;
  const totalPlayers = tableData.length;

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center font-bold text-primary">{t('rank')}</TableHead>
              <TableHead className="text-left font-bold text-primary">{t('player')}</TableHead>
              <TableHead className="text-center font-bold text-accent">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-accent">{t('w')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-accent">{t('d')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center font-bold text-accent">{t('l')}</TableHead>
              <TableHead className="hidden md:table-cell text-center font-bold text-accent">{t('gf')}</TableHead>
              <TableHead className="hidden md:table-cell text-center font-bold text-accent">{t('ga')}</TableHead>
              <TableHead className="text-center font-bold text-accent">{t('gd')}</TableHead>
              <TableHead className="text-center font-bold text-primary">{t('pts')}</TableHead>
              {canRemovePlayer && <TableHead className="text-right font-bold text-accent">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const isFirst = entry.rank === 1;
              const isLastThree = entry.rank >= totalPlayers - 2 && totalPlayers > 3;
              return (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    isFirst && "bg-yellow-500/10 hover:bg-yellow-500/20 text-base",
                    isLastThree && "bg-red-500/10 hover:bg-red-500/20"
                  )}
                >
                  <TableCell className={cn(
                    "text-center font-bold text-lg",
                    isFirst ? "text-yellow-400 text-xl" : "text-accent"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.player?.photoUrl} alt={entry.playerName} />
                        <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                      <div>
                        <div className={cn("font-medium", isFirst ? "text-lg" : "text-sm sm:text-base")}>{entry.playerName}</div>
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
                  <TableCell className="hidden md:table-cell text-center">{entry.goalsFor}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{entry.goalsAgainst}</TableCell>
                  <TableCell className="text-center font-medium">
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </TableCell>
                  <TableCell className={cn("text-center font-bold text-lg", isFirst ? "text-yellow-300" : "text-primary")}>
                    {entry.points}
                  </TableCell>
                  {canRemovePlayer && (
                    <TableCell className="text-right">
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
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">{t('rank')}</TableHead>
              <TableHead>{t('player')}</TableHead>
              <TableHead className="text-center">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('w')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('d')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('l')}</TableHead>
              <TableHead className="hidden md:table-cell text-center">{t('gf')}</TableHead>
              <TableHead className="hidden md:table-cell text-center">{t('ga')}</TableHead>
              <TableHead className="text-center">{t('gd')}</TableHead>
              <TableHead className="text-center font-bold">{t('pts')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
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
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
