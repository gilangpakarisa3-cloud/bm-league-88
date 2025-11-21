
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
import type { CupMatch } from "@/lib/types";

const formSchema = z.object({
  score1: z.coerce.number().min(0, "Score must be positive."),
  score2: z.coerce.number().min(0, "Score must be positive."),
});

type ScoreFormValues = z.infer<typeof formSchema>;

interface ScoreFormProps {
  match: CupMatch;
  onSave: (data: ScoreFormValues) => void;
}

export function ScoreForm({ match, onSave }: ScoreFormProps) {
  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      score1: match.score1 ?? 0,
      score2: match.score2 ?? 0,
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
                <FormLabel>{match.team1?.name}</FormLabel>
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
                <FormLabel>{match.team2?.name}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="submit">Save Score</Button>
        </div>
      </form>
    </Form>
  );
}
