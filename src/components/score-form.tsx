
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
import type { Match, Player, Team, WithId } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CalendarIcon, User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  time: z.string().regex(timeRegex, { message: "Invalid time format. Use HH:MM." }),
  date: z.date({ required_error: "A date is required."}),
}).refine(data => {
    return (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
}, {
    message: "Invalid best-of-3 result. One player must have 2 wins.",
    path: ["player1Wins"],
});


type ScoreFormValues = z.infer<typeof formSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => void;
  players: WithId<Player>[];
  teams: WithId<Team>[];
}

export function ScoreForm({ match, onSave, players, teams }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);

  const team1 = useMemo(() => teams.find(t => t.id === player1?.teamId), [teams, player1]);
  const team2 = useMemo(() => teams.find(t => t.id === player2?.teamId), [teams, player2]);
  
  const getInitialValues = (match: WithId<Match>) => {
    const isNewScore = !match.isCompleted;
    // Use match date if it exists, otherwise it will be set in useEffect
    const dateToUse = isNewScore ? undefined : match.matchDate.toDate(); 
    const timeToUse = dateToUse ? format(dateToUse, 'HH:mm') : '00:00';

    return {
      player1Wins: match.player1Wins ?? 0,
      player2Wins: match.player2Wins ?? 0,
      time: timeToUse,
      date: dateToUse,
    }
  }

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchema),
    // Set initial values without new Date() to avoid hydration mismatch
    defaultValues: getInitialValues(match),
  });

  useEffect(() => {
    // Only run on the client after hydration
    // If it's a new match and date is not set, set it to now()
    if (!match.isCompleted && !form.getValues('date')) {
      const now = new Date();
      form.setValue('date', now);
      form.setValue('time', format(now, 'HH:mm'));
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
        <div className="grid grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="player1Wins"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={team1?.logoUrl} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    {player1?.name}
                </FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wins" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="player2Wins"
            render={({ field }) => (
              <FormItem>
                 <FormLabel className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={team2?.logoUrl} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    {player2?.name}
                </FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wins" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                </Select>
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
