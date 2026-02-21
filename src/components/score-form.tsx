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
import { CalendarIcon, User, Clock, Swords, Save, Shield } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { CoopScoreChecklist } from "./coop-score-checklist";
import { Badge } from "./ui/badge";

// Zod schema for Co-Op (Best of 3) matches
const coopFormSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
}).refine(data => {
    return (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
}, {
    message: "Skor Best of 3 tidak valid. Salah satu tim harus menang 2 game.",
    path: ["player1Wins"],
});

// Zod schema for Single (standard score) matches
const singleFormSchema = z.object({
  player1Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  player2Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
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

  const isBestOfThree = seasonType === 'Co-Op' || 
    (seasonType === 'Hybrid' && (
        match.round === 'Final' || 
        (hybridGroupMeetings === 2 && (match.round === 'Quarter-Final' || match.round === 'Semi-Final'))
    ));

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
    nextWinners[index] = nextWinners[index] === winner ? null : winner;
    const p1_G12 = nextWinners.slice(0, 2).filter(w => w === 'player1').length;
    const p2_G12 = nextWinners.slice(0, 2).filter(w => w === 'player2').length;
    if (p1_G12 === 2 || p2_G12 === 2) {
        nextWinners[2] = null;
    }
    setGameWinners(nextWinners);
    const p1Total = nextWinners.filter(w => w === 'player1').length;
    const p2Total = nextWinners.filter(w => w === 'player2').length;
    form.setValue('player1Wins', p1Total, { shouldValidate: true });
    form.setValue('player2Wins', p2Total, { shouldValidate: true });
  }

  const p1Value = isBestOfThree ? form.watch('player1Wins') : form.watch('player1Score');
  const p2Value = isBestOfThree ? form.watch('player2Wins') : form.watch('player2Score');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
        
        <div className="relative">
            {/* VS Background Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center">
                <div className="bg-background border-4 border-primary rounded-full w-16 h-16 flex items-center justify-center shadow-[0_0_30px_rgba(204,253,1,0.4)] ring-8 ring-background">
                    <span className="text-primary font-black italic text-2xl tracking-tighter pr-0.5">VS</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Player 1 Section */}
              <div className="bg-card border-2 border-primary/10 rounded-2xl p-6 flex flex-col items-center gap-4 text-center relative overflow-hidden">
                {/* Watermark Score Left */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0 opacity-20 -translate-x-20">
                    <span className="text-9xl font-black text-white italic">{p1Value ?? 0}</span>
                </div>

                <div className="relative z-10">
                    <Avatar className="h-20 w-20 border-4 border-primary shadow-lg shadow-primary/20">
                        <AvatarImage src={player1Info.team?.logoUrl} />
                        <AvatarFallback><Shield className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                </div>
                <div className="space-y-1 relative z-10">
                  <p className="text-sm font-black tracking-tight truncate max-w-[160px]">{player1Info.name}</p>
                  <p className="text-[10px] text-primary font-bold tracking-widest">{player1Info.team?.name || 'Tanpa Tim'}</p>
                </div>
                
                <div className="w-full relative z-10">
                    {isBestOfThree ? (
                        <div className="h-24 flex items-center justify-center">
                            <span className="text-7xl font-black text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.5)]">{p1Value}</span>
                        </div>
                    ) : (
                        <FormField
                            control={form.control}
                            name="player1Score"
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Input 
                                    type="number" 
                                    {...field} 
                                    className="h-24 text-7xl font-black text-center bg-background border-primary/30 focus:border-primary focus:ring-primary/20 p-0"
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
              </div>

              {/* Player 2 Section */}
              <div className="bg-card border-2 border-primary/10 rounded-2xl p-6 flex flex-col items-center gap-4 text-center relative overflow-hidden">
                {/* Watermark Score Right */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0 opacity-20 translate-x-20">
                    <span className="text-9xl font-black text-white italic">{p2Value ?? 0}</span>
                </div>

                <div className="relative z-10">
                    <Avatar className="h-20 w-20 border-4 border-primary shadow-lg shadow-primary/20">
                        <AvatarImage src={player2Info.team?.logoUrl} />
                        <AvatarFallback><Shield className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                </div>
                <div className="space-y-1 relative z-10">
                  <p className="text-sm font-black tracking-tight truncate max-w-[160px]">{player2Info.name}</p>
                  <p className="text-[10px] text-primary font-bold tracking-widest">{player2Info.team?.name || 'Tanpa Tim'}</p>
                </div>

                <div className="w-full relative z-10">
                    {isBestOfThree ? (
                        <div className="h-24 flex items-center justify-center">
                            <span className="text-7xl font-black text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.5)]">{p2Value}</span>
                        </div>
                    ) : (
                        <FormField
                            control={form.control}
                            name="player2Score"
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Input 
                                    type="number" 
                                    {...field} 
                                    className="h-24 text-7xl font-black text-center bg-background border-primary/30 focus:border-primary focus:ring-primary/20 p-0"
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
              </div>
            </div>
        </div>

        {isBestOfThree && (
           <div className="bg-muted/20 p-6 rounded-2xl border border-primary/20 shadow-inner">
             <div className="mb-4 text-center">
                <Badge className="bg-primary text-primary-foreground font-black px-4 py-1 italic tracking-tighter">Format Best of 3</Badge>
             </div>
             <CoopScoreChecklist
                player1Name={player1Info.name}
                player2Name={player2Info.name}
                winners={gameWinners}
                onWinnerChange={handleWinnerChange}
             />
           </div>
        )}

        <div className="bg-muted/30 p-6 rounded-2xl border border-dashed border-primary/20 space-y-4">
            <h4 className="text-[10px] font-black text-primary tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> Informasi Kick-Off
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-muted-foreground">Hari & Tanggal</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-bold h-11 border-primary/20 bg-background",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {field.value ? (
                                format(field.value, "eeee, d MMM yyyy")
                              ) : (
                                <span>Pilih Tanggal</span>
                              )}
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
                      <FormLabel className="text-[10px] font-bold text-muted-foreground">Waktu Pertandingan</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                          className="h-11 font-bold border-primary/20 bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <div className="pt-2">
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="w-full h-14 text-lg font-black tracking-tighter gap-3 shadow-[0_10px_20px_rgba(204,253,1,0.2)]"
            >
              {isSaving ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Simpan Skor Akhir
                </>
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
