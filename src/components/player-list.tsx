
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { players } from "@/lib/data";
import Image from "next/image";

export function PlayerList() {
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Player</TableHead>
              <TableHead>Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  <div className="font-medium text-sm sm:text-base">{player.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={player.team.logoUrl}
                      alt={`${player.team.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-border"
                      data-ai-hint="team logo"
                    />
                    <div className="text-sm sm:text-base text-muted-foreground">{player.team.name}</div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
