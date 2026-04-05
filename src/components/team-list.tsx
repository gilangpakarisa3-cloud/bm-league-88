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
import { Pencil, Trash2, Shield, LayoutGrid, Award, Scan, Zap, Binary } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


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
    return [...teams].sort((a, b) => (a.tier || 3) - (b.tier || 3) || a.name.localeCompare(b.name));
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-8">
            {sortedTeams.map((team: WithId<Team>) => {
                const logoUrl = team.logoUrl || `https://picsum.photos/seed/team-${team.id}/128/128`;
                const tierColor = 
                    team.tier === 1 ? "bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]" :
                    team.tier === 2 ? "bg-primary text-black shadow-[0_0_20px_rgba(204,253,1,0.4)]" :
                    "bg-white/10 text-white/60";

                return (
                    <div key={team.id} className="group relative">
                        {/* Dynamic Ambient Glow */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-40 transition duration-700" />
                        
                        <Card className="relative flex flex-col h-full bg-black/40 backdrop-blur-3xl border-2 border-white/5 group-hover:border-primary/40 transition-all duration-500 overflow-hidden rounded-[2rem] shadow-2xl">
                            
                            {/* HUD Pattern Overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                            <div className="absolute top-4 right-4 z-20">
                                <Badge className={cn(
                                    "font-black text-[8px] uppercase tracking-widest h-6 px-3 italic border-none -skew-x-[12deg] border-r-4 border-black/20 shadow-lg", 
                                    tierColor
                                )}>
                                    <span className="skew-x-[12deg]">T{team.tier || 3}</span>
                                </Badge>
                            </div>

                            {/* Large Ghost Text Background */}
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black text-white/[0.02] uppercase tracking-tighter italic whitespace-nowrap pointer-events-none group-hover:text-primary/[0.04] transition-colors pr-10 select-none">
                                {team.name}
                            </span>

                            <CardContent className="flex flex-col flex-grow items-center justify-center p-6 sm:p-10 relative z-10">
                                <div className="relative mb-6 sm:mb-8">
                                    <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                                    
                                    {/* Scan Line Detail */}
                                    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-20 opacity-0 group-hover:opacity-20">
                                        <div className="w-full h-1 bg-primary blur-[1px] animate-scanning" />
                                    </div>

                                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white/10 shadow-2xl group-hover:border-primary transition-all duration-700 group-hover:scale-110 relative z-10">
                                        <AvatarImage src={logoUrl} alt={`${team.name} logo`} className="object-cover" />
                                        <AvatarFallback className="bg-black/60"><Shield className="h-14 w-14 text-white/5" /></AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="absolute -bottom-2 -right-2 bg-primary text-black p-2 rounded-xl shadow-2xl z-20 rotate-12 group-hover:rotate-0 transition-transform duration-500 border-4 border-[#0A192F]">
                                        <Zap className="w-4 h-4 fill-black" />
                                    </div>
                                </div>
                                
                                <div className="space-y-1 text-center relative z-10">
                                    <p className="font-black text-xl sm:text-2xl text-center text-white tracking-tighter uppercase italic group-hover:text-primary transition-colors duration-500 pr-4 leading-none">
                                        {team.name}
                                    </p>
                                    <div className="flex items-center justify-center gap-2 opacity-40">
                                        <Binary className="w-3 h-3" />
                                        <span className="text-[8px] font-black tracking-[0.3em] uppercase">Tactical Unit Locked</span>
                                    </div>
                                </div>
                            </CardContent>

                            {isAdmin && (
                                <CardFooter className="flex justify-center gap-2 p-4 border-t border-white/5 bg-black/40 backdrop-blur-md mt-auto relative z-20">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => onEdit(team)}
                                        className="flex-1 font-black text-[9px] uppercase tracking-widest h-10 border border-white/5 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-2" />
                                        {t('edit_team_title')}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => confirmDelete(team)}
                                        className="h-10 w-10 p-0 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5 rounded-xl"
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
            <AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl rounded-[2rem]">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                    {t('delete_team_confirm_desc', { teamName: deletingTeam?.name })}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12 rounded-xl italic">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[10px] uppercase h-12 rounded-xl italic"
                >
                    {t('delete')}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
