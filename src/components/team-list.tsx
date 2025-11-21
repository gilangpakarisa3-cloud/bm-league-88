
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { teams } from "@/lib/data";

export function TeamList() {
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Team Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="font-medium text-sm sm:text-base">{team.name}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
