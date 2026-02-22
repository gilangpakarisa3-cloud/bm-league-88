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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { User, Pencil, Trash2, Shield, Swords, Trophy, Target, Zap, Activity, Users } from 'lucide-react';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

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
  
  // Calculate OVR and Ranks among all players
  const playersWithRanks = useMemo(() => {
    if (!players) return [];
    
    // 1. Calculate OVR for all
    const withOvr = players.map(p => {
        const possiblePoints = (p.overallPlayed || 0) * 3;
        const actualPoints = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
        const ovrRating = possiblePoints > 0 ? (actualPoints / possiblePoints) * 100 : 0;
        return { ...p, ovrRating };
    });

    // 2. Sort by OVR to determine rank
    const sortedByOvr = [...withOvr].sort((a, b) => b.ovrRating - a.ovrRating || b.overallPlayed - a.overallPlayed);
    
    // 3. Map to final display objects with ovrRank
    return sortedByOvr.map((p, index) => ({
        ...p,
        ovrRank: index + 1
    }));
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return [...playersWithRanks].sort((a, b) => a.ovrRank - b.ovrRank);
  }, [playersWithRanks]);

  const tiers = useMemo(() => {
    if (sortedPlayers.length === 0) return [];
    return [
      { 
        title: 'Legend', 
        players: sortedPlayers.slice(0, 4), 
        color: 'text-yellow-400', 
        bgShadow: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]',
        cardBorder: 'group-hover:border-yellow-400/30'
      },
      { 
        title: 'Top Player', 
        players: sortedPlayers.slice(4, 8), 
        color: 'text-primary', 
        bgShadow: 'bg-primary shadow-[0_0_15px_rgba(204,253,1,0.4)]',
        cardBorder: 'group-hover:border-primary/30'
      },
      { 
        title: 'Reguler', 
        players: sortedPlayers.slice(8, 12), 
        color: 'text-accent', 
        bgShadow: 'bg-accent shadow-[0_0_15px_rgba(100,255,218,0.4)]',
        cardBorder: 'group-hover:border-accent/30'
      },
      { 
        title: 'Amateur', 
        players: sortedPlayers.slice(12), 
        color: 'text-pink-500', 
        bgShadow: 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.4)]',
        cardBorder: 'group-hover:border-pink-500/30'
      },
    ].filter(t => t.players.length > 0);
  }, [sortedPlayers]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="h-[400px] border-white/5 bg-white/5 animate-pulse">
            <CardHeader className="items-center pt-10">
              <Skeleton className="h-28 w-28 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <div className="grid grid-cols-3 gap-2 mt-10">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (playersWithRanks.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-card/40 p-16 text-center backdrop-blur-md">
        <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
        <h2 className="text-xl font-black text-muted-foreground uppercase tracking-widest">{t('no_players_found_title')}</h2>
        <p className="text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter">
          {t('no_players_found_desc')}
        </p>
      </div>
    );
  }


  return (
    <>
      <div className="space-y-24">
        {tiers.map((tier) => (
          <div key={tier.title} className="flex flex-col md:flex-row gap-6 md:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Modular HUD Sidebar Label Section */}
            <div className={cn(
                "flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 md:w-32 relative group/sidebar",
                tier.title === 'Top Player' ? "md:pt-4" : "md:pt-8"
            )}>
                {/* HUD Signal Segments */}
                <div className="flex md:flex-col gap-1.5 h-1.5 w-full md:h-fit md:w-1.5 order-1 md:order-none">
                    {[...Array(5)].map((_, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "rounded-full transition-all duration-1000",
                                i < 3 ? tier.bgShadow : "bg-white/5",
                                i === 0 ? "flex-[3] md:h-20" : "flex-1 md:h-4"
                            )} 
                        />
                    ))}
                </div>

                <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-6 md:rotate-180 md:[writing-mode:vertical-lr] relative z-10">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse hidden md:block", tier.bgShadow)} />
                        <h2 className={cn("text-3xl md:text-6xl font-black uppercase italic tracking-tighter whitespace-nowrap leading-none", tier.color)}>
                            {tier.title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 opacity-30 mt-1 md:mt-0">
                        <span className="text-white text-[8px] md:text-[11px] tracking-[0.4em] font-black uppercase whitespace-nowrap">
                            Scouting • Level
                        </span>
                        <Target className="w-3 h-3 text-white" />
                    </div>
                </div>

                {/* HUD Geometric Details */}
                <div className="hidden md:flex flex-col gap-1 mt-auto items-end opacity-10">
                    <div className="w-8 h-0.5 bg-white" />
                    <div className="w-4 h-0.5 bg-white" />
                    <div className="w-12 h-0.5 bg-white" />
                </div>
            </div>

            {/* Players Grid Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 flex-1">
                {tier.players.map((player) => {
                const team = player.teamId ? teamsById[player.teamId] : null;
                
                return (
                    <div key={player.id} className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-accent rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
                        
                        <Card className={cn(
                            "relative flex flex-col h-full bg-card/60 backdrop-blur-xl border-2 border-white/5 transition-all duration-500 overflow-hidden rounded-2xl",
                            tier.cardBorder
                        )}>
                            <div className="relative pt-10 pb-6 flex flex-col items-center overflow-hidden">
                                <span className="absolute top-4 left-4 text-6xl font-black text-white/[0.03] uppercase tracking-tighter whitespace-nowrap pointer-events-none group-hover:text-white/[0.05] transition-colors pr-4">
                                    {player.name}
                                </span>
                                
                                <div className="relative z-10">
                                    <Avatar className={cn(
                                        "h-28 w-28 border-4 border-white/5 transition-all duration-500 shadow-2xl scale-100 group-hover:scale-105",
                                        tier.cardBorder.replace('group-hover:', '')
                                    )}>
                                        <AvatarImage src={team?.logoUrl} alt={player.name} />
                                        <AvatarFallback className="bg-white/5"><User className="h-14 w-14 text-white/20" /></AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground h-14 w-14 rounded-xl flex flex-col items-center justify-center border-4 border-background shadow-2xl rotate-12 group-hover:rotate-0 transition-all duration-500">
                                        <span className="text-sm font-black leading-none">#{player.ovrRank}</span>
                                        <span className="text-[8px] font-black leading-none uppercase opacity-60 mt-1 mb-0.5">OVR</span>
                                        <span className="text-base font-black leading-none italic">{player.ovrRating.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="flex-grow space-y-6 px-6 relative z-10">
                                <div className="text-center space-y-1">
                                    <h3 className={cn(
                                        "font-black text-2xl tracking-tighter uppercase italic transition-colors pr-2",
                                        tier.color.includes('white') ? "text-white group-hover:text-primary" : `text-white group-hover:${tier.color}`
                                    )}>
                                        {player.name}
                                    </h3>
                                    <div className="flex items-center justify-center gap-2">
                                        {team ? (
                                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest gap-1.5 py-1">
                                                <Shield className="w-3 h-3 text-primary" />
                                                {team.name}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-1">
                                                Free Agent
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-white/5 pb-2">
                                        <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Career Overview</span>
                                        <span>{player.overallPlayed || 0} Matches</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 group-hover:border-primary/10 transition-colors">
                                            <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Win</p>
                                            <p className="text-lg font-black text-white">{player.overallWin || 0}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 group-hover:border-primary/10 transition-colors">
                                            <p className="text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1">Draw</p>
                                            <p className="text-lg font-black text-white">{player.overallDraw || 0}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 group-hover:border-primary/10 transition-colors">
                                            <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Loss</p>
                                            <p className="text-lg font-black text-white">{player.overallLoss || 0}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                                            <span className="text-white/40 italic">Aggressive Momentum</span>
                                            <span className="text-primary">{player.overallGoalsFor || 0} Goals Scored</span>
                                        </div>
                                        <Progress value={((player.overallGoalsFor || 0) / ((player.overallGoalsFor || 0) + (player.overallGoalsAgainst || 0) || 1)) * 100} className="h-1 bg-white/5" />
                                    </div>
                                </div>
                            </CardContent>

                            {isAdmin && (
                                <CardFooter className="grid grid-cols-2 gap-2 p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => onEdit(player)}
                                        className="font-black text-[10px] uppercase tracking-widest h-10 border border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                    >
                                        <Pencil className="w-3 h-3 mr-2" />
                                        {t('edit_player_title')}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => confirmDelete(player)}
                                        className="font-black text-[10px] uppercase tracking-widest h-10 border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                    >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        {t('delete')}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                );
                })}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deletingPlayer} onOpenChange={(isOpen) => !isOpen && setDeletingPlayer(null)}>
        <AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl">
            <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                {t('delete_player_confirm_desc', { playerName: deletingPlayer?.name })}
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
