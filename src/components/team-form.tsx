
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
import type { Team, WithId } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Team name must be at least 2 characters.',
  }),
});

type TeamFormValues = z.infer<typeof formSchema>;

interface TeamFormProps {
  team?: WithId<Team> | null;
  onSave?: () => void;
}

export function TeamForm({ team, onSave }: TeamFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || '',
    },
  });

  const onSubmit = (data: TeamFormValues) => {
    if (!firestore) return;
    
    // For now, we'll use a placeholder for the logo.
    // In a real app, you might have an image upload or selection.
    const logoId = `team-logo-${data.name.toLowerCase().replace(/\s+/g, '-')}`;
    const logoUrl = `https://picsum.photos/seed/${logoId}/128/128`;
    
    const teamData: Team = {
        name: data.name,
        logoUrl: team?.logoUrl || logoUrl,
    }

    if (team) {
      // Update existing team
      const teamRef = doc(firestore, 'teams', team.id);
      updateDocumentNonBlocking(teamRef, teamData);
      toast({
        title: `Team updated!`,
        description: `${data.name} has been successfully saved.`,
      });

    } else {
      // Add new team
      const teamsRef = collection(firestore, 'teams');
      addDocumentNonBlocking(teamsRef, teamData);
      toast({
        title: `Team added!`,
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
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The All-Stars" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit">{team ? 'Save Changes' : 'Create Team'}</Button>
        </div>
      </form>
    </Form>
  );
}
