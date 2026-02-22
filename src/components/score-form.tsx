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
import { CalendarIcon, User, Clock, Swords, Save, Shield, Plus, Minus, Zap, Activity } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { CoopScoreChecklist } from "./coop-score-checklist";
import { Badge } from "./ui/badge";

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

  // Best of 3 applies to Co-Op mode OR any Playoff round in Hybrid mode
  const isBestOfThree = seasonType === 'Co-Op' || (match.round && match.round !== 'Group');

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

  const p1Value = isBestOfThree ? (form.watch('player1Wins') as number) : (form.watch('player1Score') as number);
  const p2Value = isBestOfThree ? (form.watch('player2Wins') as number) : (form.watch('player2Score') as number);

  const incrementScore = (field: 'player1Score' | 'player2Score') => {
    const current = form.getValues(field) as number;
    form.setValue(field, current + 1, { shouldValidate: true });
  }

  const decrementScore = (field: 'player1Score' | 'player2Score') => {
    const current = form.getValues(field) as number;
    if (current > 0) {
      form.setValue(field, current - 1, { shouldValidate: true });
    }
  }

  const ScoreControl = ({ fieldName, value }: { fieldName: 'player1Score' | 'player2Score', value: number }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 rounded-full border-2 border-primary/30 bg-black/20 hover:bg-primary/20 hover:border-primary transition-all shadow-lg"
          onClick={() => decrementScore(fieldName)}
        >
          <Minus className="h-5 w-5 text-primary" />
        </Button>
        
        <div className="relative group/score overflow-hidden bg-black/40 border-2 border-primary/20 rounded-xl w-24 h-20 flex items-center justify-center shadow-inner">
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 -z-0 translate-y-2">
            <span className="text-6xl font-black text-white italic">{value}</span>
          </span>
          <span className="text-4xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.6)] relative z-10 tabular-nums">
            {value}
          </span>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 rounded-full border-2 border-primary/30 bg-black/20 hover:bg-primary/20 hover:border-primary transition-all shadow-lg"
          onClick={() => incrementScore(fieldName)}
        >
          <Plus className="h-5 w-5 text-primary" />
        </Button>
      </div>
      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">Score Unit</p>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        
        <div className="relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center">
                <div className="relative group/vs">
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-50 animate-pulse" />
                    <div className="bg-[#0A192F] border-2 border-primary rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.4)] ring-4 ring-[#0A192F]">
                        <span className="text-primary font-black text-xl tracking-tighter italic pr-0.5">VS</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Player 1 HUD */}
              <div className="bg-gradient-to-br from-primary/[0.05] to-transparent border-2 border-primary/10 rounded-2xl p-5 flex flex-col items-center gap-4 text-center relative overflow-hidden transition-all hover:border-primary/30 group">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-2xl pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="h-16 w-16 border-2 border-primary shadow-2xl relative z-10 scale-100 group-hover:scale-105 transition-transform duration-500">
                        <AvatarImage src={player1Info.team?.logoUrl} className="object-cover" />
                        <AvatarFallback className="bg-black/40"><Shield className="h-8 w-8 text-white/10" /></AvatarFallback>
                    </Avatar>
                </div>

                <div className="space-y-1 relative z-10">
                  <h3 className="text-base font-black tracking-tight text-white uppercase italic truncate max-w-[160px] pr-2">{player1Info.name}</h3>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black tracking-widest text-[8px] uppercase px-2 h-5 italic">
                    {player1Info.team?.name || 'Independent'}
                  </Badge>
                </div>
                
                <div className="w-full relative z-10">
                    {isBestOfThree ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="bg-black/40 border-2 border-primary/20 rounded-xl w-24 h-20 flex items-center justify-center shadow-inner">
                                <span className="text-5xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.6)] tabular-nums">{p1Value}</span>
                            </div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic mt-1">Wins</p>
                        </div>
                    ) : (
                        <ScoreControl fieldName="player1Score" value={p1Value} />
                    )}
                </div>
              </div>

              {/* Player 2 HUD */}
              <div className="bg-gradient-to-bl from-primary/[0.05] to-transparent border-2 border-primary/10 rounded-2xl p-5 flex flex-col items-center gap-4 text-center relative overflow-hidden transition-all hover:border-primary/30 group">
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/20 rounded-tr-2xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="h-16 w-16 border-2 border-primary shadow-2xl relative z-10 scale-100 group-hover:scale-105 transition-transform duration-500">
                        <AvatarImage src={player2Info.team?.logoUrl} className="object-cover" />
                        <AvatarFallback className="bg-black/40"><Shield className="h-8 w-8 text-white/10" /></AvatarFallback>
                    </Avatar>
                </div>

                <div className="space-y-1 relative z-10">
                  <h3 className="text-base font-black tracking-tight text-white uppercase italic truncate max-w-[160px] pr-2">{player2Info.name}</h3>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black tracking-widest text-[8px] uppercase px-2 h-5 italic">
                    {player2Info.team?.name || 'Independent'}
                  </Badge>
                </div>

                <div className="w-full relative z-10">
                    {isBestOfThree ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="bg-black/40 border-2 border-primary/20 rounded-xl w-24 h-20 flex items-center justify-center shadow-inner">
                                <span className="text-5xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.6)] tabular-nums">{p2Value}</span>
                            </div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic mt-1">Wins</p>
                        </div>
                    ) : (
                        <ScoreControl fieldName="player2Score" value={p2Value} />
                    )}
                </div>
              </div>
            </div>
        </div>

        {isBestOfThree && (
           <div className="bg-black/40 p-5 rounded-2xl border-2 border-primary/20 shadow-2xl relative overflow-hidden group/bo3">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-2xl group-hover/bo3:bg-primary/10 transition-all" />
             <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary fill-primary" />
                    <span className="font-black text-[10px] uppercase tracking-[0.2em] text-white/60">Tactical Game Log</span>
                </div>
                <Badge className="bg-primary text-black font-black px-3 h-5 text-[9px] tracking-tighter uppercase italic">Best of 3</Badge>
             </div>
             <CoopScoreChecklist
                player1Name={player1Info.name}
                player2Name={player2Info.name}
                winners={gameWinners}
                onWinnerChange={handleWinnerChange}
             />
           </div>
        )}

        {/* Detailed Briefing Card */}
        <div className="bg-white/[0.02] p-5 rounded-2xl border-2 border-white/5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                    <Activity className="w-3 h-3" />
                </div>
                <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] italic">Match Authentication Detail</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[9px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarIcon className="w-2.5 h-2.5" /> Scheduled Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-black h-11 border-white/10 bg-black/40 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-[10px] uppercase italic",
                                !field.value && "text-white/20"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "eeee, d MMM yyyy")
                              ) : (
                                <span>Input Date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#0A192F] border-primary/30" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value as Date}
                            onSelect={field.onChange}
                            initialFocus
                            className="rounded-xl"
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
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[9px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5" /> Kick-Off Time
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                          className="h-11 font-black border-white/10 bg-black/40 rounded-lg focus:border-primary/50 text-base tabular-nums italic"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <div className="pt-2 relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="w-full h-14 text-lg font-black tracking-tighter gap-3 shadow-2xl shadow-primary/20 rounded-xl uppercase italic group/btn overflow-hidden"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 animate-pulse fill-black" />
                    Syncing...
                </div>
              ) : (
                <>
                  <Save className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                  Finalize Match Stats
                </>
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
