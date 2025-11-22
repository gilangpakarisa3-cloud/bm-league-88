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
import { Pencil, Trash2, User } from 'lucide-react';
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
import type { Player, Team, WithId } from '@/lib/types';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface PlayerListProps {
  onEdit: (player: WithId<Player>) => void;
  isAdmin: boolean;
  withAdminCheck: (action: () => void) => void;
}

export function PlayerList({ onEdit, isAdmin, withAdminCheck }: PlayerListProps) {
  const { toast } = useToast();
  const [deletingPlayer, setDeletingPlayer] = useState<WithId<Player> | null>(null);
  const firestore = useFirestore();

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: players, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);
  
  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const teamsById = useMemo(() => {
    if (!teams) return {};
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [teams]);


  const handleDelete = () => {
    if (!firestore || !deletingPlayer) return;
    const playerRef = doc(firestore, 'players', deletingPlayer.id);
    deleteDocumentNonBlocking(playerRef);
    toast({
        title: 'Player Deleted',
        description: `${deletingPlayer.name} has been removed. Note: This does not remove them from any active seasons.`,
    });
    setDeletingPlayer(null);
  };
  
  const confirmDelete = (player: WithId<Player>) => {
    withAdminCheck(() => {
        setDeletingPlayer(player)
    });
  }

  const isLoading = isLoadingPlayers || isLoadingTeams;

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
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
  
  if (!sortedPlayers || sortedPlayers.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">No players found.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Get started by adding a new player.
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
                <TableHead className="min-w-[200px]">Player</TableHead>
                <TableHead>Team</TableHead>
                {isAdmin && <TableHead className="text-right pr-4">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => {
                const team = teamsById[player.teamId];
                return (
                    <TableRow key={player.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={player.photoUrl} alt={player.name} />
                                <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                            <div className="font-medium text-sm sm:text-base">{player.name}</div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={team?.logoUrl} alt={team?.name} />
                            <AvatarFallback>{team?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm sm:text-base text-muted-foreground">{team?.name}</div>
                        </div>
                    </TableCell>
                    {isAdmin && (
                        <TableCell className="text-right pr-4">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(player)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Player</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => confirmDelete(player)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Delete Player</span>
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

      <AlertDialog open={!!deletingPlayer} onOpenChange={(isOpen) => !isOpen && setDeletingPlayer(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the player
                <span className="font-bold"> {deletingPlayer?.name}</span> and remove them from the master player list. It will not remove them from any seasons they are already registered in.
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
