
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
import type { Player, Team, WithId, League, LeagueEntry, Cup } from '@/lib/types';
import { useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import React from 'react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Player name must be at least 2 characters.',
  }),
  teamId: z.string({ required_error: 'Please select a team.' }),
  photoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
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
  const { data: leagues } = useCollection<League>(leaguesCollection);

  const cupsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'cups') : null),
    [firestore]
  );
  const { data: cups } = useCollection<Cup>(cupsCollection);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: player?.name || '',
      teamId: player?.teamId || '',
      photoUrl: player?.photoUrl || '',
    },
  });
  
  React.useEffect(() => {
    if (player) {
      form.reset({
        name: player.name,
        teamId: player.teamId,
        photoUrl: player.photoUrl || '',
      });
    } else {
      form.reset({
        name: '',
        teamId: '',
        photoUrl: '',
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
            title: "Error",
            description: "Selected team not found.",
        });
        return;
    }
    
    const playerData: Omit<Player, 'id'> = {
        name: data.name,
        teamId: data.teamId,
        teamName: selectedTeam.name,
        photoUrl: data.photoUrl,
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
                            photoUrl: playerData.photoUrl
                        });
                    });
                }
            }
        }
        
        // 3. Find and update all cup participant entries for this player
        if (cups) {
          for (const cp of cups) {
              const seasonsRef = collection(firestore, `cups/${cp.id}/seasons`);
              const seasonsSnap = await getDocs(seasonsRef);
              for (const seasonDoc of seasonsSnap.docs) {
                  const participantsRef = doc(firestore, `cups/${cp.id}/seasons/${seasonDoc.id}/cupParticipants`, player.id);
                  // Since we store a copy of the player object, we update it directly.
                  // The doc ref is based on player.id so we dont need a query.
                  batch.update(participantsRef, playerData);
              }
          }
        }

        await batch.commit();
        toast({
          title: `Player updated!`,
          description: `${data.name}'s details have been synchronized across all competitions.`,
        });

      } catch (error) {
        console.error("Failed to update player and their entries: ", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not sync player updates to league/cup tables.",
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
                  emptyPlaceholder={isLoadingTeams ? "Loading teams..." : "No teams available."}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/player.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoadingTeams || isLoadingPlayers}>
            {player ? 'Save Changes' : 'Create Player'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
    