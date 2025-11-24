
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
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useTranslation } from '@/hooks/use-translation';

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
  const { t } = useTranslation();

  const formSchemaTranslated = z.object({
    name: z.string().min(2, {
      message: t('team_name_min_char'),
    }),
  });

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(formSchemaTranslated),
    defaultValues: {
      name: team?.name || '',
    },
  });

  const onSubmit = (data: TeamFormValues) => {
    if (!firestore) return;
    
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
        title: t('team_updated_title'),
        description: t('team_updated_desc', { teamName: data.name }),
      });

    } else {
      // Add new team with a human-readable ID
      const teamId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!teamId) {
        toast({
          variant: "destructive",
          title: t('invalid_name_title'),
          description: t('invalid_name_desc_team'),
        });
        return;
      }

      const teamRef = doc(firestore, 'teams', teamId);
      setDocumentNonBlocking(teamRef, teamData, { merge: false });

      toast({
        title: t('team_added_title'),
        description: t('team_added_desc', { teamName: data.name }),
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
              <FormLabel>{t('team_name')}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The All-Stars" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit">{team ? t('save_changes') : t('create_team')}</Button>
        </div>
      </form>
    </Form>
  );
}
