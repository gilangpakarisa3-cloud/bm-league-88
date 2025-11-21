
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
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead className="min-w-[250px]">Player</TableHead>
              <TableHead className="text-center">Played</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
              <TableHead className="text-center">GF</TableHead>
              <TableHead className="text-center">GA</TableHead>
              <TableHead className="text-center">GD</TableHead>
              <TableHead className="text-center font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leagueTable.map((entry) => (
              <TableRow key={entry.rank}>
                <TableCell className="text-center font-bold text-lg text-muted-foreground">{entry.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Image
                      src={entry.player.team.logoUrl}
                      alt={`${entry.player.team.name} logo`}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-border"
                      data-ai-hint="team logo"
                    />
                    <div>
                      <div className="font-medium">{entry.player.name}</div>
                      <div className="text-sm text-muted-foreground">{entry.player.team.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">{entry.played}</TableCell>
                <TableCell className="text-center text-green-400">{entry.win}</TableCell>
                <TableCell className="text-center text-yellow-400">{entry.draw}</TableCell>
                <TableCell className="text-center text-red-400">{entry.loss}</TableCell>
                <TableCell className="text-center">{entry.goalsFor}</TableCell>
                <TableCell className="text-center">{entry.goalsAgainst}</TableCell>
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
