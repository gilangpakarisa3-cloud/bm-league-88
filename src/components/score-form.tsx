
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Match, Player, WithId } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

const formSchema = z.object({
  score1: z.coerce.number().min(0, "Score must be positive."),
  score2: z.coerce.number().min(0, "Score must be positive."),
});

type ScoreFormValues = z.infer<typeof formSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => void;
  players: WithId<Player>[];
}

export function ScoreForm({ match, onSave, players }: ScoreFormProps) {
  const { t } = useTranslation();

  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);
  
  const formSchemaTranslated = z.object({
    score1: z.coerce.number().min(0, t('score_positive_error')),
    score2: z.coerce.number().min(0, t('score_positive_error')),
  });

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchemaTranslated),
    defaultValues: {
      score1: match.player1Score ?? 0,
      score2: match.player2Score ?? 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="score1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={player1?.photoUrl} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    {player1?.name}
                </FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="score2"
            render={({ field }) => (
              <FormItem>
                 <FormLabel className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={player2?.photoUrl} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    {player2?.name}
                </FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="submit">{t('save_score')}</Button>
        </div>
      </form>
    </Form>
  );
}
