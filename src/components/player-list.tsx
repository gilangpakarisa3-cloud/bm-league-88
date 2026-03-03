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
import type { Player, Team, WithId, SeasonRecord } from '@/lib/types';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { User, Pencil, Trash2, Shield, Swords, Trophy, Target, Zap, Activity, Users, Scan, Star, Medal } from 'lucide-react';
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

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hallOfFame') : null),
    [firestore]
  );
  const { data: hallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  
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
          <Card key={i} className="h-[400px] border-white/5 bg-white/5 animate-pulse rounded-2xl">
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
                const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
                const hasWins = wonSeasons.length > 0;
                
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
                                        "font-black text-2xl tracking-tighter uppercase italic transition-colors pr-4",
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
                                    
                                    <div className="grid grid-cols-3 gap-3 relative">
                                        {/* Background Glow Connector */}
                                        <div className="absolute inset-0 bg-primary/5 blur-2xl -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        {[
                                            { label: 'WIN', value: player.overallWin, color: 'text-primary', borderColor: 'border-primary/30', bgColor: 'bg-primary/5' },
                                            { label: 'DRAW', value: player.overallDraw, color: 'text-yellow-400', borderColor: 'border-yellow-400/30', bgColor: 'bg-yellow-400/5' },
                                            { label: 'LOSS', value: player.overallLoss, color: 'text-red-500', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/5' }
                                        ].map((stat, i) => (
                                            <div key={i} className={cn(
                                                "relative group/stat overflow-hidden border-2 rounded-xl p-3 transition-all duration-500",
                                                stat.borderColor,
                                                stat.bgColor,
                                                "hover:scale-105"
                                            )}>
                                                {/* HUD Corner Accent */}
                                                <div className={cn("absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 opacity-40", stat.borderColor.replace('/30', ''))} />
                                                
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <span className={cn("text-[7px] font-black tracking-[0.2em] mb-1.5 opacity-60", stat.color)}>
                                                        {stat.label}
                                                    </span>
                                                    <span className="text-2xl font-black italic tabular-nums leading-none text-white drop-shadow-md">
                                                        {stat.value || 0}
                                                    </span>
                                                </div>
                                                
                                                {/* Animated Bottom Bar */}
                                                <div className={cn(
                                                    "absolute bottom-0 left-0 h-0.5 w-full transform translate-y-full transition-transform duration-500 group-hover/stat:translate-y-0",
                                                    stat.color.replace('text-', 'bg-')
                                                )} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Championship Legacy Module */}
                                    <div className={cn(
                                        "rounded-xl p-3.5 space-y-3 relative overflow-hidden group/legacy shadow-inner border transition-all duration-500",
                                        hasWins 
                                            ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]" 
                                            : "bg-white/5 border-white/10"
                                    )}>
                                        {/* Animated HUD scanning line for the legacy block */}
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(234,179,8,0.05)_50%,transparent_100%)] bg-[length:200%_100%] animate-marquee pointer-events-none opacity-0 group-hover/legacy:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Medal className={cn("w-2.5 h-2.5", hasWins ? "text-yellow-500" : "text-white/40")} />
                                                    <span className={cn("text-[7px] font-black uppercase tracking-[0.2em]", hasWins ? "text-yellow-500/80" : "text-white/40")}>
                                                        Championship Legacy
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase italic tracking-tight pr-4">League Titles Won</span>
                                            </div>
                                            {hasWins && (
                                                <div className="bg-yellow-500/20 p-1 rounded-lg border border-yellow-500/30">
                                                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="relative pt-1 min-h-[40px] flex flex-wrap gap-1.5">
                                            {hasWins ? (
                                                wonSeasons.map((record, idx) => (
                                                    <Badge 
                                                        key={record.seasonId} 
                                                        variant="outline" 
                                                        className="bg-yellow-500/10 border-yellow-500/40 text-yellow-500 text-[8px] font-black uppercase tracking-tighter italic animate-in fade-in zoom-in duration-500"
                                                        style={{ animationDelay: `${idx * 100}ms` }}
                                                    >
                                                        {record.seasonName}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <div className="w-full flex flex-col items-center justify-center py-2 opacity-20 group-hover/legacy:opacity-40 transition-opacity">
                                                    <Star className="w-4 h-4 mb-1" />
                                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] italic">Awaiting First Title</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-[6px] font-black text-white/20 uppercase tracking-[0.2em] relative z-10 border-t border-white/5 pt-2">
                                            <div className="flex items-center gap-1">
                                                <div className={cn("w-1 h-1 rounded-full", hasWins ? "bg-yellow-500/40" : "bg-white/10")} />
                                                <span>{player.name} legacy log</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>Verified system</span>
                                                <div className="w-1 h-1 bg-primary/40 rounded-full animate-pulse" />
                                            </div>
                                        </div>
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
