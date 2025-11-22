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
import { useTranslation } from '@/hooks/use-translation';


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
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">{t('team_name')}</TableHead>
              <TableHead className="text-right pr-4">{t('actions')}</TableHead>
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
        <h2 className="text-xl font-medium text-muted-foreground">{t('no_teams_found_title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {t('no_teams_found_desc')}
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
                <TableHead className="min-w-[200px]">{t('team_name')}</TableHead>
                {isAdmin && <TableHead className="text-right pr-4">{t('actions')}</TableHead>}
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
                                <span className="sr-only">{t('edit_team_title')}</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => confirmDelete(team)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">{t('delete_team')}</span>
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
