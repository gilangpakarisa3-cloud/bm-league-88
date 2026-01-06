'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from './ui/combobox';
import type { Player, Team, WithId, League, LeagueEntry } from '@/lib/types';
import { useCollection, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import React, { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Player name must be at least 2 characters.',
  }),
  teamId: z.string().optional(),
});

type PlayerFormValues = z.infer<typeof formSchema>;

interface PlayerFormProps {
  player?: WithId<Player> | null;
  onSave?: () => void;
}

export function PlayerForm({ player, onSave }: PlayerFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { t, t_dynamic } = useTranslation();

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: players, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);
  
  const leaguesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'leagues') : null),
    [firestore]
  );
  const { data: leagues } = useCollection<League>(leaguesCollection);
  
  // --- ONE-TIME DATA MIGRATION SCRIPT ---
  useEffect(() => {
    async function pairTeams() {
        if (!firestore || !players || !teams) return;

        const playerTeamMap: Record<string, string> = {
            'riki': 'manutd',
            'firman': 'inter',
            'alan': 'acmilan',
            'sulton': 'juventus',
            'zulfriansah': 'liverpool',
            'ridwan': 'realmadrid',
            'hery': 'arsenal',
            'bagas': 'chelsea',
            'dapid': 'mancity',
            'ade-urip': 'barcelona',
        };
        
        // Check if migration has already run to avoid re-running
        const migrationDocRef = doc(firestore, 'appConfig', 'migrations');
        const migrationDoc = await getDocs(query(collection(firestore, 'appConfig'), where('name', '==', 'playerTeamPairing20240906')));

        if (!migrationDoc.empty) {
            console.log("Team pairing migration has already run. Skipping.");
            return;
        }

        console.log("Running one-time team pairing migration...");
        
        const batch = writeBatch(firestore);

        for (const p of players) {
            const desiredTeamId = playerTeamMap[p.id];
            if (desiredTeamId) {
                const team = teams.find(t => t.id === desiredTeamId);
                if (team) {
                    const playerRef = doc(firestore, 'players', p.id);
                    batch.update(playerRef, {
                        teamId: team.id,
                        teamName: team.name,
                        // teamLogoUrl: team.logoUrl // player data doesn't have this
                    });
                     // Also update all league entries
                    if (leagues) {
                        for (const lg of leagues) {
                            const seasonsRef = collection(firestore, `leagues/${lg.id}/seasons`);
                            const seasonsSnap = await getDocs(seasonsRef);
                            for (const seasonDoc of seasonsSnap.docs) {
                                const leagueTableRef = collection(seasonsRef, seasonDoc.id, 'leagueTable');
                                const q = query(leagueTableRef, where('playerId', '==', p.id));
                                const leagueEntriesSnap = await getDocs(q);
                                leagueEntriesSnap.forEach(entryDoc => {
                                    const entryRef = doc(leagueTableRef, entryDoc.id);
                                    batch.update(entryRef, {
                                        teamName: team.name,
                                        teamId: team.id,
                                    });
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // Mark migration as complete
        const newMigrationRef = doc(firestore, 'appConfig', 'playerTeamPairing20240906');
        batch.set(newMigrationRef, { name: 'playerTeamPairing20240906', completedAt: new Date() });
        
        try {
            await batch.commit();
            toast({
                title: "Player Teams Re-paired!",
                description: "Teams have been successfully updated for Season 1 players.",
            });
        } catch (error) {
            console.error("Team pairing migration failed:", error);
            toast({
                variant: 'destructive',
                title: "Migration Failed",
                description: "Could not update player teams.",
            });
        }
    }
    
    // Check if data is loaded before running
    if (!isLoadingPlayers && !isLoadingTeams && players && teams && leagues) {
        pairTeams();
    }

  }, [firestore, players, teams, leagues, isLoadingPlayers, isLoadingTeams, toast]);


  const formSchemaTranslated = z.object({
    name: z.string().min(2, {
      message: t('player_name_min_char'),
    }),
    teamId: z.string().optional(),
  });
  
  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(formSchemaTranslated),
    defaultValues: {
      name: player?.name || '',
      teamId: player?.teamId || '',
    },
  });
  
  React.useEffect(() => {
    if (player) {
      form.reset({
        name: player.name,
        teamId: player.teamId,
      });
    } else {
      form.reset({
        name: '',
        teamId: '',
      });
    }
  }, [player, form]);

  const teamOptions = React.useMemo(() => {
    if (!teams || !players) return [];

    const assignedTeamIds = new Set(
      players
        .filter(p => p.id !== player?.id)
        .map(p => p.teamId)
    );

    const availableTeams = teams
      .filter(team => !assignedTeamIds.has(team.id))
      .map(team => ({
        value: team.id,
        label: team.name,
      }));
      
    return [{ value: '', label: 'Tanpa Tim' }, ...availableTeams];
  }, [teams, players, player]);


  const onSubmit = async (data: PlayerFormValues) => {
    if (!firestore) return;
    
    const selectedTeam = teams?.find(t => t.id === data.teamId);
    
    const playerData: Omit<Player, 'id'> = {
        name: data.name,
        teamId: selectedTeam?.id || '',
        teamName: selectedTeam?.name || '',
        overallPlayed: player?.overallPlayed ?? 0,
        overallWin: player?.overallWin ?? 0,
        overallDraw: player?.overallDraw ?? 0,
        overallLoss: player?.overallLoss ?? 0,
        overallGoalsFor: player?.overallGoalsFor ?? 0,
        overallGoalsAgainst: player?.overallGoalsAgainst ?? 0,
    };

    if (player) {
      const batch = writeBatch(firestore);
      
      const playerRef = doc(firestore, 'players', player.id);
      batch.update(playerRef, playerData);

      try {
        if (leagues) {
            for (const lg of leagues) {
                const seasonsRef = collection(firestore, `leagues/${lg.id}/seasons`);
                const seasonsSnap = await getDocs(seasonsRef);
                for (const seasonDoc of seasonsSnap.docs) {
                    const leagueTableRef = collection(seasonsRef, seasonDoc.id, 'leagueTable');
                    const q = query(leagueTableRef, where('playerId', '==', player.id));
                    const leagueEntriesSnap = await getDocs(q);
                    
                    leagueEntriesSnap.forEach(entryDoc => {
                        const entryRef = doc(leagueTableRef, entryDoc.id);
                        batch.update(entryRef, { 
                            playerName: playerData.name,
                            teamName: playerData.teamName,
                            teamId: playerData.teamId,
                        });
                    });
                }
            }
        }

        await batch.commit();
        toast({
          title: t('player_updated_title'),
          description: t('player_updated_desc', { playerName: data.name }),
        });

      } catch (error) {
        console.error("Failed to update player and their entries: ", error);
        toast({
          variant: "destructive",
          title: t('update_failed_title'),
          description: t('player_sync_error'),
        });
      }


    } else {
      const playerId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!playerId) {
        toast({
          variant: "destructive",
          title: t('invalid_name_title'),
          description: t('invalid_name_desc'),
        });
        return;
      }
      
      const playerRef = doc(firestore, 'players', playerId);
      setDocumentNonBlocking(playerRef, playerData, { merge: false });

      toast({
        title: t('player_added_title'),
        description: t('player_added_desc', { playerName: data.name }),
      });
    }

    onSave?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('player_name')}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Andi 'The Ace'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('team')}</FormLabel>
              <FormControl>
                <Combobox
                  options={teamOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('select_a_team')}
                  searchPlaceholder={t('search_team')}
                  emptyPlaceholder={isLoadingTeams ? t('loading_teams') : t('no_teams_available')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoadingTeams || isLoadingPlayers}>
            {player ? t('save_changes') : t('create_player')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
