
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
import React from 'react';
import { useTranslation } from '@/hooks/use-translation';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Player name must be at least 2 characters.',
  }),
  teamId: z.string({ required_error: 'Please select a team.' }),
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

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: player?.name || '',
      teamId: player?.teamId || '',
    },
  });

  const formSchemaTranslated = z.object({
    name: z.string().min(2, {
      message: t('player_name_min_char'),
    }),
    teamId: z.string({ required_error: t('select_team_error') }),
  });
  form.resolver = zodResolver(formSchemaTranslated);
  
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

    // Get a set of all team IDs that are already assigned to players.
    const assignedTeamIds = new Set(
      players
        // If we are editing a player, we must exclude their *current* team from the "assigned" list,
        // so that their own team remains selectable in the dropdown.
        .filter(p => p.id !== player?.id)
        .map(p => p.teamId)
    );

    return teams
      .filter(team => !assignedTeamIds.has(team.id)) // Filter out teams that are already taken
      .map(team => ({
        value: team.id,
        label: team.name,
      }));
  }, [teams, players, player]);


  const onSubmit = async (data: PlayerFormValues) => {
    if (!firestore) return;
    
    const selectedTeam = teams?.find(t => t.id === data.teamId);
    if (!selectedTeam) {
        toast({
            variant: "destructive",
            title: t('error'),
            description: t('team_not_found_error'),
        });
        return;
    }
    
    const playerData: Omit<Player, 'id'> = {
        name: data.name,
        teamId: data.teamId,
        teamName: selectedTeam.name,
        overallPlayed: player?.overallPlayed ?? 0,
        overallWin: player?.overallWin ?? 0,
        overallDraw: player?.overallDraw ?? 0,
        overallLoss: player?.overallLoss ?? 0,
        overallGoalsFor: player?.overallGoalsFor ?? 0,
        overallGoalsAgainst: player?.overallGoalsAgainst ?? 0,
    };

    if (player) {
      // --- Update Flow ---
      const batch = writeBatch(firestore);
      
      // 1. Update the main player document
      const playerRef = doc(firestore, 'players', player.id);
      batch.update(playerRef, playerData);

      try {
        // 2. Find and update all league entries for this player
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
      // --- Add New Player Flow ---
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

    onSave?.(); // Close the dialog
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
    

    
