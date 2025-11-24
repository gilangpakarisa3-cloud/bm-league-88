'use client';

import { useState, useMemo } from 'react';
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
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { User, Pencil, Trash2 } from 'lucide-react';

interface PlayerListProps {
  onEdit: (player: WithId<Player>) => void;
  isAdmin: boolean;
  withAdminCheck: (action: () => void) => void;
}

export function PlayerList({ onEdit, isAdmin, withAdminCheck }: PlayerListProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
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
        title: t('player_deleted_title'),
        description: t('player_deleted_list_desc', { playerName: deletingPlayer.name }),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="text-center">
              <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </CardContent>
            <CardFooter className="flex justify-center gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!sortedPlayers || sortedPlayers.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_players_found_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {t('no_players_found_desc')}
        </p>
      </div>
    );
  }


  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedPlayers.map((player) => {
          const team = teamsById[player.teamId];
          return (
            <Card key={player.id} className="flex flex-col text-center">
              <CardHeader className="items-center pt-6">
                  <Avatar className="h-24 w-24">
                      <AvatarImage src={player.photoUrl} alt={player.name} />
                      <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                  </Avatar>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="font-bold text-lg text-primary">{player.name}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={team?.logoUrl} alt={team?.name} />
                    <AvatarFallback>{team?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{team?.name}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-2 p-4">
                <Button variant="outline" size="sm" onClick={() => onEdit(player)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('edit_player_title')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => confirmDelete(player)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('delete')}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deletingPlayer} onOpenChange={(isOpen) => !isOpen && setDeletingPlayer(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('delete_player_confirm_desc', { playerName: deletingPlayer?.name })}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                {t('delete')}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
