
"use client";

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
import { Button } from "./ui/button";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { PlayerForm } from "./player-form";
import type { Player } from "@/lib/types";
import { useState } from "react";

export function PlayerList() {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  return (
    <>
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px]">Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
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
                      <div className="text-sm sm:text-base text-muted-foreground">{player.team.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Button variant="ghost" size="icon" onClick={() => setEditingPlayer(player)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Player</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(isOpen) => !isOpen && setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update the details for {editingPlayer?.name}.
            </DialogDescription>
          </DialogHeader>
          <PlayerForm player={editingPlayer} onSave={() => setEditingPlayer(null)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
