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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  tier: z.coerce.number().min(1).max(5),
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
    tier: z.coerce.number().min(1).max(5),
  });

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(formSchemaTranslated),
    defaultValues: {
      name: team?.name || '',
      tier: team?.tier || 3,
    },
  });

  const onSubmit = (data: TeamFormValues) => {
    if (!firestore) return;
    
    const logoId = `team-logo-${data.name.toLowerCase().replace(/\s+/g, '-')}`;
    const logoUrl = `https://picsum.photos/seed/${logoId}/128/128`;
    
    const teamData: Team = {
        name: data.name,
        logoUrl: team?.logoUrl || logoUrl,
        tier: data.tier,
    }

    if (team) {
      const teamRef = doc(firestore, 'teams', team.id);
      updateDocumentNonBlocking(teamRef, teamData);
      toast({
        title: t('team_updated_title'),
        description: t('team_updated_desc', { teamName: data.name }),
      });
    } else {
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
              <FormLabel>{t('team_name')}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Real Madrid" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Tier (Power Level)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                <FormControl>
                  <SelectTrigger className="bg-black/40 border-white/10 font-black italic uppercase">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#0A192F] border-primary/30">
                  <SelectItem value="1" className="font-black">TIER 1 (ELITE)</SelectItem>
                  <SelectItem value="2" className="font-black">TIER 2 (TOP)</SelectItem>
                  <SelectItem value="3" className="font-black">TIER 3 (COMPETITIVE)</SelectItem>
                  <SelectItem value="4" className="font-black">TIER 4 (MID)</SelectItem>
                  <SelectItem value="5" className="font-black">TIER 5 (AMATEUR)</SelectItem>
                </SelectContent>
              </Select>
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
