
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { leagueTable } from "@/lib/data";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export function LeagueTable() {
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
            {leagueTable.map((entry) => (
              <TableRow key={entry.rank}>
                <TableCell className="text-center font-bold text-lg text-muted-foreground">{entry.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={entry.player.team.logoUrl}
                      alt={`${entry.player.team.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-border"
                      data-ai-hint="team logo"
                    />
                    <div>
                      <div className="font-medium text-sm sm:text-base">{entry.player.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{entry.player.team.name}</div>
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
                <TableCell className="text-center font-bold text-lg text-primary">{entry.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
