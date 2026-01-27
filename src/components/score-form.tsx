
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
import { CoopScoreChecklist } from "./coop-score-checklist";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  time: z.string().regex(timeRegex, { message: "Invalid time format. Use HH:MM." }),
  date: z.date({ required_error: "A date is required."}),
}).refine(data => {
    // A score is valid if one player has 2 wins and the other has 0 or 1.
    return (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
}, {
    message: "Invalid best-of-3 result. One team must have 2 wins.",
    path: ["player1Wins"],
});


type ScoreFormValues = z.infer<typeof formSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => void;
  seasonType?: 'Single' | 'Co-Op';
  player1Info: { name: string; team?: WithId<Team> | null };
  player2Info: { name: string; team?: WithId<Team> | null };
}

export function ScoreForm({ match, onSave, seasonType, player1Info, player2Info }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const player1 = player1Info;
  const player2 = player2Info;

  const team1 = player1.team;
  const team2 = player2.team;
  
  const getInitialValues = (match: WithId<Match>) => {
    const isNewScore = !match.isCompleted;
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
    defaultValues: getInitialValues(match),
  });

  useEffect(() => {
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
      if (form.formState.isSubmitting) {
        setIsSaving(false);
      }
    }
  };

  const handleScoreChangeFromChecklist = (score: {player1Wins: number, player2Wins: number}) => {
    form.setValue('player1Wins', score.player1Wins, { shouldValidate: true });
    form.setValue('player2Wins', score.player2Wins, { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {seasonType === 'Co-Op' ? (
           <CoopScoreChecklist
              player1Name={player1.name}
              player2Name={player2.name}
              initialScore={{ player1Wins: form.getValues('player1Wins'), player2Wins: form.getValues('player2Wins')}}
              onScoreChange={handleScoreChangeFromChecklist}
           />
        ) : (
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
        )}
         <FormField
            control={form.control}
            name="player1Wins"
            render={() => (
                <FormItem>
                    <FormMessage />
                </FormItem>
            )}
        />
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
