
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
import { CalendarIcon, User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  score1: z.coerce.number().min(0, "Score must be positive."),
  score2: z.coerce.number().min(0, "Score must be positive."),
  time: z.string().regex(timeRegex, { message: "Invalid time format. Use HH:MM." }),
  date: z.date({ required_error: "A date is required."}),
});

type ScoreFormValues = z.infer<typeof formSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => void;
  players: WithId<Player>[];
}

export function ScoreForm({ match, onSave, players }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);
  
  const formSchemaTranslated = z.object({
    score1: z.coerce.number().min(0, t('score_positive_error')),
    score2: z.coerce.number().min(0, t('score_positive_error')),
    time: z.string().regex(timeRegex, { message: "Invalid time format. Use HH:MM." }),
    date: z.date({ required_error: "A date is required."}),
  });

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchemaTranslated),
  });

  useEffect(() => {
    if (match) {
      const matchDate = match.matchDate.toDate();
      form.reset({
        score1: match.player1Score ?? 0,
        score2: match.player2Score ?? 0,
        time: format(matchDate, 'HH:mm'),
        date: matchDate,
      });
    }
  }, [match, form]);


  const handleSave = async (data: ScoreFormValues) => {
    setIsSaving(true);
    try {
      await onSave(data);
    } finally {
      // It's possible the component unmounts upon successful save,
      // so check if it's still mounted before setting state.
      if (form.formState.isSubmitting) {
        setIsSaving(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
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
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Match Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Time (HH:MM)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('save') + "..." : t('save_score')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
