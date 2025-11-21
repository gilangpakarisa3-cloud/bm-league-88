
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueEntry, Season, WithId } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeagueTableProps {
  tableData: WithId<LeagueEntry>[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
}

export function LeagueTable({ tableData, isLoading = false, onRemovePlayer, seasonStatus }: LeagueTableProps) {
  if (isLoading) {
    return <LeagueTableSkeleton />;
  }
  
  if (tableData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">No players registered for this season.</h2>
        <p className="text-sm text-muted-foreground mt-2">Use the "Register Players" button to add participants.</p>
      </div>
    );
  }
  
  const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer;
  const totalPlayers = tableData.length;

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead className="min-w-[200px]">Player</TableHead>
              <TableHead className="text-center">Played</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
              <TableHead className="hidden md:table-cell text-center">GF</TableHead>
              <TableHead className="hidden md:table-cell text-center">GA</TableHead>
              <TableHead className="text-center">GD</TableHead>
              <TableHead className="text-center font-bold">Pts</TableHead>
              {canRemovePlayer && <TableHead className="text-right">Actions</TableHead>}
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
                    isFirst ? "text-yellow-400 text-xl" : "text-muted-foreground"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className={cn("font-medium", isFirst ? "text-lg" : "text-sm sm:text-base")}>{entry.playerName}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{entry.teamName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{entry.played}</TableCell>
                  <TableCell className="text-center text-green-400">{entry.win}</TableCell>
                  <TableCell className="text-center text-yellow-400">{entry.draw}</TableCell>
                  <TableCell className="text-center text-red-400">{entry.loss}</TableCell>
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
                        title={`Remove ${entry.playerName}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Remove Player</span>
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
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead className="min-w-[200px]">Player</TableHead>
              <TableHead className="text-center">Played</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
              <TableHead className="hidden md:table-cell text-center">GF</TableHead>
              <TableHead className="hidden md:table-cell text-center">GA</TableHead>
              <TableHead className="text-center">GD</TableHead>
              <TableHead className="text-center font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <div>
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
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
