
'use client';

import { useState } from 'react';
import { TeamList } from '@/components/team-list';
import { TeamForm } from '@/components/team-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from 'lucide-react';
import type { Team, WithId } from '@/lib/types';

export default function TeamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<WithId<Team> | null>(null);

  const handleEdit = (team: WithId<Team>) => {
    setEditingTeam(team);
    setDialogOpen(true);
  };
  
  const handleAdd = () => {
    setEditingTeam(null);
    setDialogOpen(true);
  }

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTeam(null);
  };


  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            Teams
            </h1>
            <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Team
            </Button>
        </div>
        <TeamList onEdit={handleEdit} />

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                <DialogDescription>
                {editingTeam ? `Update the details for ${editingTeam.name}.` : 'Enter the details for the new team.'}
                </DialogDescription>
            </DialogHeader>
            <TeamForm team={editingTeam} onSave={handleDialogClose} />
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
