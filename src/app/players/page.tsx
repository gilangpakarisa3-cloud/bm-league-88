
'use client';

import { useState } from 'react';
import { PlayerList } from '@/components/player-list';
import { PlayerForm } from '@/components/player-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle } from 'lucide-react';
import type { Player, WithId } from '@/lib/types';

export default function PlayersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<WithId<Player> | null>(null);
  
  const handleEdit = (player: WithId<Player>) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };
  
  const handleAdd = () => {
    setEditingPlayer(null);
    setDialogOpen(true);
  }

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPlayer(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            Players
            </h1>
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Player
            </Button>
        </div>
        <PlayerList onEdit={handleEdit} />

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingPlayer ? 'Edit Player' : 'Add New Player'}</DialogTitle>
                <DialogDescription>
                {editingPlayer ? `Update the details for ${editingPlayer.name}.` : 'Enter the details for the new player.'}
                </DialogDescription>
            </DialogHeader>
            <PlayerForm player={editingPlayer} onSave={handleDialogClose} />
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
