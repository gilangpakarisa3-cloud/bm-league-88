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
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import type { Team, WithId } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Pencil, Trash2, Shield } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';


interface TeamListProps {
  onEdit: (team: WithId<Team>) => void;
  isAdmin: boolean;
  withAdminCheck: (action: () => void) => void;
}


export function TeamList({ onEdit, isAdmin, withAdminCheck }: TeamListProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [deletingTeam, setDeletingTeam] = useState<WithId<Team> | null>(null);
  const { t } = useTranslation();

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
        title: t('team_deleted_title'),
        description: t('team_deleted_desc_list', { teamName: deletingTeam.name }),
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
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center justify-center p-4">
               <Skeleton className="h-16 w-16 rounded-full mb-3" />
               <Skeleton className="h-5 w-3/4" />
            </CardContent>
             <CardFooter className="flex justify-center gap-2 p-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!sortedTeams || sortedTeams.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_teams_found_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {t('no_teams_found_desc')}
        </p>
      </div>
    );
  }

  return (
    <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedTeams.map((team: WithId<Team>) => (
                <Card key={team.id} className="flex flex-col text-center">
                    <CardContent className="flex flex-col flex-grow items-center justify-center p-4">
                        <Avatar className="h-16 w-16 mb-3">
                            <AvatarImage src={team.logoUrl} alt={`${team.name} logo`} />
                            <AvatarFallback><Shield /></AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-sm">{team.name}</p>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-2 p-2 border-t mt-auto">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">{t('edit_team_title')}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => confirmDelete(team)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            <span className="sr-only">{t('delete_team')}</span>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>

        <AlertDialog open={!!deletingTeam} onOpenChange={(isOpen) => !isOpen && setDeletingTeam(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('delete_team_confirm_desc', { teamName: deletingTeam?.name })}
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
