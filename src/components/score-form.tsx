
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
import type { Match, Season, Team, WithId } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CalendarIcon, User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { CoopScoreChecklist } from "./coop-score-checklist";

// Updated regex to be more flexible with seconds or different browser input behaviors
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

// Zod schema for Co-Op (Best of 3) matches
const coopFormSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  time: z.string().min(1, { message: "Time is required" }),
  date: z.date({ required_error: "A date is required."}),
}).refine(data => {
    return (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
}, {
    message: "Skor Best of 3 tidak valid. Salah satu tim harus menang 2 game.",
    path: ["player1Wins"],
});

// Zod schema for Single (standard score) matches
const singleFormSchema = z.object({
  player1Score: z.coerce.number().min(0, { message: "Score must be positive." }),
  player2Score: z.coerce.number().min(0, { message: "Score must be positive." }),
  time: z.string().min(1, { message: "Time is required" }),
  date: z.date({ required_error: "A date is required."}),
});

type ScoreFormValues = z.infer<typeof coopFormSchema> | z.infer<typeof singleFormSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => void;
  seasonType?: Season['type'];
  hybridGroupMeetings?: number;
  player1Info: { name: string; team?: WithId<Team> | null };
  player2Info: { name: string; team?: WithId<Team> | null };
}

export function ScoreForm({ match, onSave, seasonType, hybridGroupMeetings, player1Info, player2Info }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  // Determine if this match is Best of 3 based on season and round
  const isBestOfThree = seasonType === 'Co-Op' || 
    (seasonType === 'Hybrid' && (
        match.round === 'Final' || 
        (hybridGroupMeetings === 2 && (match.round === 'Quarter-Final' || match.round === 'Semi-Final'))
    ));

  // Lifted state for game-by-game winners to prevent "flipping" on re-mounts
  const [gameWinners, setGameWinners] = useState<(string | null)[]>(() => {
    const winners: (string | null)[] = [null, null, null];
    if (isBestOfThree && match.isCompleted) {
        let p1w = match.player1Wins ?? 0;
        let p2w = match.player2Wins ?? 0;
        for (let i = 0; i < 3; i++) {
            if (p1w > 0) { winners[i] = 'player1'; p1w--; }
            else if (p2w > 0) { winners[i] = 'player2'; p2w--; }
        }
    }
    return winners;
  });

  const formSchema = isBestOfThree ? coopFormSchema : singleFormSchema;

  const getInitialValues = (match: WithId<Match>) => {
    const isNewScore = !match.isCompleted;
    const dateToUse = isNewScore ? undefined : match.matchDate.toDate(); 
    const timeToUse = dateToUse ? format(dateToUse, 'HH:mm') : '00:00';

    if (isBestOfThree) {
        return {
            player1Wins: match.player1Wins ?? 0,
            player2Wins: match.player2Wins ?? 0,
            time: timeToUse,
            date: dateToUse,
        }
    }
    return {
      player1Score: match.player1Score ?? 0,
      player2Score: match.player2Score ?? 0,
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

  const handleWinnerChange = (index: number, winner: string) => {
    const nextWinners = [...gameWinners];
    // Toggle logic: if clicking the already selected winner, clear it
    nextWinners[index] = nextWinners[index] === winner ? null : winner;

    // Best of 3 rule: if 2-0, Game 3 is automatically cleared
    const p1_G12 = nextWinners.slice(0, 2).filter(w => w === 'player1').length;
    const p2_G12 = nextWinners.slice(0, 2).filter(w => w === 'player2').length;
    if (p1_G12 === 2 || p2_G12 === 2) {
        nextWinners[2] = null;
    }

    setGameWinners(nextWinners);

    // Sync counts to form
    const p1Total = nextWinners.filter(w => w === 'player1').length;
    const p2Total = nextWinners.filter(w => w === 'player2').length;
    
    form.setValue('player1Wins', p1Total, { shouldValidate: true });
    form.setValue('player2Wins', p2Total, { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {isBestOfThree ? (
           <CoopScoreChecklist
              player1Name={player1Info.name}
              player2Name={player2Info.name}
              winners={gameWinners}
              onWinnerChange={handleWinnerChange}
           />
        ) : (
          <div className="grid grid-cols-2 gap-4 items-end">
            <FormField
              control={form.control}
              name="player1Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                          <AvatarImage src={player1Info.team?.logoUrl} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      {player1Info.name}
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
              name="player2Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                          <AvatarImage src={player2Info.team?.logoUrl} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      {player2Info.name}
                  </FormLabel>
                   <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
         <FormField
            control={form.control}
            name={isBestOfThree ? "player1Wins" : "player1Score"}
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
                        selected={field.value as Date}
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
