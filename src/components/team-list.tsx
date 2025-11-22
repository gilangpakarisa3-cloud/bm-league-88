'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import type { Team, WithId } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';


interface TeamListProps {
  onEdit: (team: WithId<Team>) => void;
  isAdmin: boolean;
  withAdminCheck: (action: () => void) => void;
}


export function TeamList({ onEdit, isAdmin, withAdminCheck }: TeamListProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [deletingTeam, setDeletingTeam] = useState<WithId<Team> | null>(null);

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading } = useCollection<Team>(teamsCollection);
  
  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);
  
  const handleDelete = () => {
    if (!firestore || !deletingTeam) return;
    const teamRef = doc(firestore, 'teams', deletingTeam.id);
    deleteDocumentNonBlocking(teamRef);
    toast({
        title: 'Team Deleted',
        description: `${deletingTeam.name} has been removed.`,
    });
    setDeletingTeam(null);
  };
  
  const confirmDelete = (team: WithId<Team>) => {
    withAdminCheck(() => {
        setDeletingTeam(team)
    });
  }


  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Team Name</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell className="text-right pr-4 flex justify-end gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (!sortedTeams || sortedTeams.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">No teams found.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Get started by adding a new team.
        </p>
      </div>
    );
  }

  return (
    <>
        <div className="w-full overflow-hidden rounded-lg border bg-card">
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px]">Team Name</TableHead>
                {isAdmin && <TableHead className="text-right pr-4">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedTeams.map((team: WithId<Team>) => (
                <TableRow key={team.id}>
                    <TableCell>
                    <div className="font-medium text-sm sm:text-base">{team.name}</div>
                    </TableCell>
                    {isAdmin && (
                        <TableCell className="text-right pr-4">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(team)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit Team</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => confirmDelete(team)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Delete Team</span>
                            </Button>
                        </TableCell>
                    )}
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
        </div>

        <AlertDialog open={!!deletingTeam} onOpenChange={(isOpen) => !isOpen && setDeletingTeam(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the team
                    <span className="font-bold"> {deletingTeam?.name}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
