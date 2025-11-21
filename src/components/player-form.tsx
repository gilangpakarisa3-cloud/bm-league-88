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
import { useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import React from 'react';

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
  const { data: leagues, isLoading: isLoadingLeagues } = useCollection<League>(leaguesCollection);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: player?.name || '',
      teamId: player?.teamId || '',
    },
  });

  const teamOptions = React.useMemo(() => {
    if (!teams || !players) return [];

    const assignedTeamIds = new Set(
        players.filter(p => p.id !== player?.id).map(p => p.teamId)
    );

    return teams
        .filter(team => !assignedTeamIds.has(team.id))
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
            title: "Error",
            description: "Selected team not found.",
        });
        return;
    }
    
    const playerData: Player = {
        name: data.name,
        teamId: data.teamId,
        teamName: selectedTeam.name,
        teamLogoUrl: selectedTeam.logoUrl
    }

    if (player) {
      // --- Update Flow ---
      const batch = writeBatch(firestore);
      
      // 1. Update the player document
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
                            teamName: playerData.teamName 
                        });
                    });
                }
            }
        }
        
        await batch.commit();
        toast({
          title: `Player updated!`,
          description: `${data.name} has been successfully saved everywhere.`,
        });

      } catch (error) {
        console.error("Failed to update player and their league entries: ", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not sync player updates to league tables.",
        });
      }


    } else {
      // --- Add New Player Flow ---
      const playersRef = collection(firestore, 'players');
      addDocumentNonBlocking(playersRef, playerData);
      toast({
        title: `Player added!`,
        description: `${data.name} has been successfully added.`,
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
              <FormLabel>Player Name</FormLabel>
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
              <FormLabel>Team</FormLabel>
              <FormControl>
                <Combobox
                  options={teamOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a team"
                  searchPlaceholder="Search team..."
                  emptyPlaceholder={isLoadingTeams || isLoadingPlayers ? "Loading teams..." : "No available teams found."}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit">{player ? 'Save Changes' : 'Create Player'}</Button>
        </div>
      </form>
    </Form>
  );
}
