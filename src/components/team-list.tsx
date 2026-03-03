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
import { Pencil, Trash2, Shield, LayoutGrid } from 'lucide-react';
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
  
  const confirmDelete = (player: WithId<Team>) => {
    withAdminCheck(() => {
        setDeletingTeam(player)
    });
  }


  if (isLoading) {
    return (
       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="h-48 border-white/5 bg-white/5 animate-pulse rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center p-6">
               <Skeleton className="h-20 w-20 rounded-full mb-4" />
               <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!sortedTeams || sortedTeams.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-card/40 p-16 text-center backdrop-blur-md">
        <Shield className="w-16 h-16 text-white/10 mx-auto mb-4" />
        <h2 className="text-xl font-black text-muted-foreground uppercase tracking-widest">{t('no_teams_found_title')}</h2>
        <p className="text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter">
          {t('no_teams_found_desc')}
        </p>
      </div>
    );
  }

  return (
    <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {sortedTeams.map((team: WithId<Team>) => {
                const logoUrl = team.logoUrl || `https://picsum.photos/seed/team-${team.id}/128/128`;
                return (
                    <div key={team.id} className="group relative">
                        {/* Background Glow Effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                        
                        <Card className="relative flex flex-col h-full bg-card/60 backdrop-blur-xl border-2 border-white/5 group-hover:border-primary/40 transition-all duration-500 overflow-hidden rounded-2xl">
                            {/* Ghost Text Background - Adjusted padding */}
                            <span className="absolute top-4 left-4 text-4xl font-black text-white/[0.02] uppercase tracking-tighter whitespace-nowrap pointer-events-none group-hover:text-primary/[0.03] transition-colors pr-4">
                                {team.name}
                            </span>

                            <CardContent className="flex flex-col flex-grow items-center justify-center p-8 relative z-10">
                                <div className="relative mb-6">
                                    {/* Logo Background Glow */}
                                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <Avatar className="h-24 w-24 border-4 border-white/5 shadow-2xl group-hover:border-primary transition-all duration-500 group-hover:scale-110">
                                        <AvatarImage src={logoUrl} alt={`${team.name} logo`} className="object-cover" />
                                        <AvatarFallback className="bg-white/5"><Shield className="h-12 w-12 text-white/10" /></AvatarFallback>
                                    </Avatar>
                                </div>
                                
                                <p className="font-black text-lg text-center text-white tracking-tight uppercase italic group-hover:text-primary transition-colors duration-300 pr-2">
                                    {team.name}
                                </p>
                            </CardContent>

                            {isAdmin && (
                                <CardFooter className="flex justify-center gap-2 p-3 border-t border-white/5 bg-black/20 backdrop-blur-md mt-auto">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => onEdit(team)}
                                        className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-colors border border-white/5"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        <span className="sr-only">{t('edit_team_title')}</span>
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => confirmDelete(team)}
                                        className="h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-white/5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span className="sr-only">{t('delete_team')}</span>
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                );
            })}
        </div>

        <AlertDialog open={!!deletingTeam} onOpenChange={(isOpen) => !isOpen && setDeletingTeam(null)}>
            <AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                    {t('delete_team_confirm_desc', { teamName: deletingTeam?.name })}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[10px] uppercase h-12"
                >
                    {t('delete')}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
