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
import type { Match, Season, Team, WithId, MatchStatus } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CalendarIcon, Clock, Save, Shield, Plus, Minus, Zap, Activity, AlertTriangle, CheckCircle2, Loader2, Radio, Swords, User } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useState, useCallback, memo, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { CoopScoreChecklist } from "./coop-score-checklist";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const coopFormSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  player1Score: z.coerce.number().min(0).default(0),
  player2Score: z.coerce.number().min(0).default(0),
  player1p1Goals: z.coerce.number().min(0).default(0),
  player1p2Goals: z.coerce.number().min(0).default(0),
  player2p1Goals: z.coerce.number().min(0).default(0),
  player2p2Goals: z.coerce.number().min(0).default(0),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
  status: z.enum(['Scheduled', 'Live', 'Completed', 'Postponed']),
}).refine(data => {
    if (data.status === 'Completed') {
        const p1TotalValid = data.player1p1Goals + data.player1p2Goals === data.player1Score;
        const p2TotalValid = data.player2p1Goals + data.player2p2Goals === data.player2Score;
        const winsValid = (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
                           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
        return p1TotalValid && p2TotalValid && winsValid;
    }
    return true;
}, {
    message: "Validasi Gagal: Total gol individu harus sama dengan total gol tim, dan skor BO3 harus valid (2-0/2-1).",
    path: ["player1Wins"],
});

const singleFormSchema = z.object({
  player1Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  player2Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
  status: z.enum(['Scheduled', 'Live', 'Completed', 'Postponed']),
});

type ScoreFormValues = z.infer<typeof coopFormSchema> | z.infer<typeof singleFormSchema>;

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => Promise<void>;
  seasonType?: Season['type'];
  player1Info: { name: string; team?: WithId<Team> | null; p1Name?: string; p2Name?: string };
  player2Info: { name: string; team?: WithId<Team> | null; p1Name?: string; p2Name?: string };
}

const ScoreControl = memo(({ value, onIncrement, onDecrement, label = "Score Unit", disabled, size = "default", readOnly = false }: { value: number, onIncrement: () => void, onDecrement: () => void, label?: string, disabled?: boolean, size?: "default" | "sm", readOnly?: boolean }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex items-center gap-2">
      <Button 
        type="button" 
        variant="outline" 
        size="icon" 
        className={cn(
          "rounded-full border-2 border-primary/30 bg-black/20 hover:bg-primary/20 hover:border-primary transition-all shadow-lg",
          size === "sm" ? "h-8 w-8" : "h-10 w-10",
          (disabled || readOnly) && "opacity-20 pointer-events-none"
        )}
        onClick={onDecrement}
        disabled={disabled || readOnly}
      >
        <Minus className={cn(size === "sm" ? "h-3 w-3" : "h-5 w-5", "text-primary")} />
      </Button>
      
      <div className={cn(
        "relative overflow-hidden bg-black/40 border-2 border-primary/20 rounded-xl flex items-center justify-center shadow-inner transition-all",
        size === "sm" ? "w-16 h-12" : "w-24 h-20",
        disabled && "opacity-50 grayscale",
        readOnly && "border-white/10"
      )}>
        <span className={cn(
            "font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.6)] relative z-10 tabular-nums",
            size === "sm" ? "text-xl" : "text-4xl",
            readOnly && "text-white/60"
        )}>
          {value}
        </span>
      </div>

      <Button 
        type="button" 
        variant="outline" 
        size="icon" 
        className={cn(
          "rounded-full border-2 border-primary/30 bg-black/20 hover:bg-primary/20 hover:border-primary transition-all shadow-lg",
          size === "sm" ? "h-8 w-8" : "h-10 w-10",
          (disabled || readOnly) && "opacity-20 pointer-events-none"
        )}
        onClick={onIncrement}
        disabled={disabled || readOnly}
      >
        <Plus className={cn(size === "sm" ? "h-3 w-3" : "h-5 w-5", "text-primary")} />
      </Button>
    </div>
    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic text-center max-w-[120px]">{label}</p>
  </div>
));
ScoreControl.displayName = "ScoreControl";

export function ScoreForm({ match, onSave, seasonType, player1Info, player2Info }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const isBestOfThree = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid' || (match.round && match.round !== 'Group');
  const isCoopSession = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';

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
    const dateToUse = isNewScore ? new Date() : match.matchDate.toDate(); 
    const timeToUse = format(dateToUse, 'HH:mm');

    if (isBestOfThree) {
        return {
            player1Wins: match.player1Wins ?? 0,
            player2Wins: match.player2Wins ?? 0,
            player1Score: match.player1Score ?? 0,
            player2Score: match.player2Score ?? 0,
            player1p1Goals: match.player1p1Goals ?? 0,
            player1p2Goals: match.player1p2Goals ?? 0,
            player2p1Goals: match.player2p1Goals ?? 0,
            player2p2Goals: match.player2p2Goals ?? 0,
            time: timeToUse,
            date: dateToUse,
            status: match.status || 'Scheduled',
        }
    }
    return {
      player1Score: match.player1Score ?? 0,
      player2Score: match.player2Score ?? 0,
      time: timeToUse,
      date: dateToUse,
      status: match.status || 'Scheduled',
    }
  }

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(match),
  });

  // Sync Total Goals in Co-Op mode
  useEffect(() => {
    if (isCoopSession) {
      const p1p1 = form.watch('player1p1Goals' as any) || 0;
      const p1p2 = form.watch('player1p2Goals' as any) || 0;
      const p2p1 = form.watch('player2p1Goals' as any) || 0;
      const p2p2 = form.watch('player2p2Goals' as any) || 0;
      
      form.setValue('player1Score' as any, p1p1 + p1p2, { shouldValidate: true });
      form.setValue('player2Score' as any, p2p1 + p2p2, { shouldValidate: true });
    }
  }, [
    form.watch('player1p1Goals' as any), 
    form.watch('player1p2Goals' as any), 
    form.watch('player2p1Goals' as any), 
    form.watch('player2p2Goals' as any), 
    isCoopSession, 
    form
  ]);

  const handleSubmit = async (data: ScoreFormValues) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(data);
    } catch (err) {
      console.error("Submission failed:", err);
      setIsSaving(false);
    }
  };

  const handleWinnerChange = useCallback((index: number, winner: string) => {
    if (isSaving) return;
    setGameWinners(prev => {
        const nextWinners = [...prev];
        nextWinners[index] = nextWinners[index] === winner ? null : winner;
        
        const p1_G12 = nextWinners.slice(0, 2).filter(w => w === 'player1').length;
        const p2_G12 = nextWinners.slice(0, 2).filter(w => w === 'player2').length;
        
        if (p1_G12 === 2 || p2_G12 === 2) {
            nextWinners[2] = null;
        }
        
        const p1Total = nextWinners.filter(w => w === 'player1').length;
        const p2Total = nextWinners.filter(w => w === 'player2').length;
        
        form.setValue('player1Wins' as any, p1Total, { shouldDirty: true, shouldValidate: true });
        form.setValue('player2Wins' as any, p2Total, { shouldDirty: true, shouldValidate: true });
        
        return nextWinners;
    });
  }, [form, isSaving]);

  const p1Wins = isBestOfThree ? (form.watch('player1Wins' as any) || 0) : 0;
  const p2Wins = isBestOfThree ? (form.watch('player2Wins' as any) || 0) : 0;
  const p1Score = form.watch('player1Score' as any) || 0;
  const p2Score = form.watch('player2Score' as any) || 0;
  const matchStatus = form.watch('status');

  const incrementValue = (field: any) => {
    if (isSaving) return;
    const current = form.getValues(field) || 0;
    form.setValue(field, current + 1, { shouldValidate: true });
  }

  const decrementValue = (field: any) => {
    if (isSaving) return;
    const current = form.getValues(field) || 0;
    if (current > 0) {
      form.setValue(field, current - 1, { shouldValidate: true });
    }
  }

  const errors = form.formState.errors;
  const hasErrors = Object.keys(errors).length > 0;
  
  const p1p1Goals = isBestOfThree ? (form.watch('player1p1Goals' as any) || 0) : 0;
  const p1p2Goals = isBestOfThree ? (form.watch('player1p2Goals' as any) || 0) : 0;
  const p2p1Goals = isBestOfThree ? (form.watch('player2p1Goals' as any) || 0) : 0;
  const p2p2Goals = isBestOfThree ? (form.watch('player2p2Goals' as any) || 0) : 0;

  const p1SumMatch = isBestOfThree && (p1p1Goals + p1p2Goals === p1Score);
  const p2SumMatch = isBestOfThree && (p2p1Goals + p2p2Goals === p2Score);
  const isBo3Valid = isBestOfThree && (p1Wins === 2 || p2Wins === 2);

  const isCompletedValidationFail = matchStatus === 'Completed' && isBestOfThree && (!p1SumMatch || !p2SumMatch || !isBo3Valid);

  const gameIdx = isBestOfThree ? (p1Wins + p2Wins + 1) : 1;

  const editHour = (form.watch('time') || "00:00").split(':')[0];
  const editMin = (form.watch('time') || "00:00").split(':')[1];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6 transition-all duration-500", isSaving && "opacity-60 grayscale-[0.5]")}>
        
        <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-1">
                <Radio className={cn("w-4 h-4", matchStatus === 'Live' ? "text-red-500 animate-pulse" : "text-primary/60")} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic">MATCH STATUS PROTOCOL</span>
            </div>
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-12 bg-black/40 border-primary/30 font-black italic uppercase tracking-widest text-primary focus:border-primary">
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A192F] border-primary/30">
                            <SelectItem value="Scheduled" className="font-black text-white/60 italic">SCHEDULED</SelectItem>
                            <SelectItem value="Live" className="font-black text-red-500 italic">LIVE DASHBOARD</SelectItem>
                            <SelectItem value="Completed" className="font-black text-primary italic">FINALIZED (COMPLETED)</SelectItem>
                            <SelectItem value="Postponed" className="font-black text-amber-500 italic">POSTPONED</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {matchStatus === 'Live' && (
                <div className="flex flex-col items-center gap-2 mt-1">
                    <div className="flex items-center gap-2 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest italic">Broadcasting to LiveScore Dashboard</p>
                    </div>
                </div>
            )}
        </div>

        <div className="relative">
            <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center pointer-events-none">
                <div className="bg-[#0A192F] border-2 border-primary rounded-full w-14 h-14 flex items-center justify-center shadow-xl ring-4 ring-[#0A192F]">
                    <span className="text-primary font-black text-xl tracking-tighter italic pr-0.5">VS</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Home Team */}
              <div className={cn(
                  "bg-gradient-to-br from-primary/[0.05] to-transparent border-2 rounded-2xl p-5 flex flex-col items-center gap-4 text-center relative overflow-hidden transition-all",
                  isBestOfThree ? (p1Wins >= 2 ? "border-primary shadow-lg" : "border-primary/10") : (p1Score > p2Score ? "border-primary shadow-lg" : "border-primary/10"),
                  isSaving && "border-white/5"
              )}>
                <div className="relative z-10">
                    <Avatar className={cn(
                        "h-16 w-16 border-2 shadow-xl relative z-10 transition-transform duration-500",
                        (isBestOfThree ? p1Wins >= 2 : p1Score > p2Score) ? "border-primary scale-110" : "border-white/10"
                    )}>
                        <AvatarImage src={player1Info.team?.logoUrl} className="object-cover" />
                        <AvatarFallback><Shield className="h-8 w-8 text-white/10" /></AvatarFallback>
                    </Avatar>
                </div>

                <div className="space-y-1 relative z-10">
                  <h3 className="text-base font-black tracking-tight text-white uppercase italic truncate max-w-[160px] pr-2">{player1Info.name}</h3>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black tracking-widest text-[8px] uppercase px-2 h-5 italic">
                    {player1Info.team?.name || 'Independent'}
                  </Badge>
                </div>
                
                <div className="w-full relative z-10 space-y-6">
                    {isBestOfThree && (
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "bg-black/40 border-2 rounded-xl w-20 h-16 flex items-center justify-center shadow-inner transition-colors",
                                p1Wins >= 2 ? "border-primary" : "border-primary/20"
                            )}>
                                <span className={cn("text-3xl font-black italic tabular-nums", p1Wins >= 2 ? "text-primary" : "text-white/40")}>{p1Wins}</span>
                            </div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">Series Wins</p>
                        </div>
                    )}
                    
                    <ScoreControl 
                        value={p1Score} 
                        onIncrement={() => incrementValue('player1Score')} 
                        onDecrement={() => decrementValue('player1Score')} 
                        label={isCoopSession ? "Total (Auto-Sum)" : "Total Goals"}
                        disabled={isSaving}
                        readOnly={isCoopSession}
                    />

                    {isBestOfThree && isCoopSession && (
                        <div className="pt-4 space-y-4 border-t border-white/5">
                            <div className="flex flex-col items-center gap-1 opacity-60">
                                <Activity className="w-3 h-3 text-primary" />
                                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/40">Individual Allocation</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <ScoreControl 
                                    size="sm"
                                    value={p1p1Goals} 
                                    onIncrement={() => incrementValue('player1p1Goals')} 
                                    onDecrement={() => decrementValue('player1p1Goals')} 
                                    label={`Gol ${player1Info.p1Name || 'P1'}`}
                                    disabled={isSaving}
                                />
                                <ScoreControl 
                                    size="sm"
                                    value={p1p2Goals} 
                                    onIncrement={() => incrementValue('player1p2Goals')} 
                                    onDecrement={() => decrementValue('player1p2Goals')} 
                                    label={`Gol ${player1Info.p2Name || 'P2'}`}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {/* Away Team */}
              <div className={cn(
                  "bg-gradient-to-bl from-primary/[0.05] to-transparent border-2 rounded-2xl p-5 flex flex-col items-center gap-4 text-center relative overflow-hidden transition-all",
                  isBestOfThree ? (p2Wins >= 2 ? "border-primary shadow-lg" : "border-primary/10") : (p2Score > p1Score ? "border-primary shadow-lg" : "border-primary/10"),
                  isSaving && "border-white/5"
              )}>
                <div className="relative z-10">
                    <Avatar className={cn(
                        "h-16 w-16 border-2 shadow-xl relative z-10 transition-transform duration-500",
                        (isBestOfThree ? p2Wins >= 2 : p2Score > p1Score) ? "border-primary scale-110" : "border-white/10"
                    )}>
                        <AvatarImage src={player2Info.team?.logoUrl} className="object-cover" />
                        <AvatarFallback><Shield className="h-8 w-8 text-white/10" /></AvatarFallback>
                    </Avatar>
                </div>

                <div className="space-y-1 relative z-10">
                  <h3 className="text-base font-black tracking-tight text-white uppercase italic truncate max-w-[160px] pr-2">{player2Info.name}</h3>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black tracking-widest text-[8px] uppercase px-2 h-5 italic">
                    {player2Info.team?.name || 'Independent'}
                  </Badge>
                </div>

                <div className="w-full relative z-10 space-y-6">
                    {isBestOfThree && (
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "bg-black/40 border-2 rounded-xl w-20 h-16 flex items-center justify-center shadow-inner transition-colors",
                                p2Wins >= 2 ? "border-primary" : "border-primary/20"
                            )}>
                                <span className={cn("text-3xl font-black italic tabular-nums", p2Wins >= 2 ? "text-primary" : "text-white/40")}>{p2Wins}</span>
                            </div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">Series Wins</p>
                        </div>
                    )}
                    
                    <ScoreControl 
                        value={p2Score} 
                        onIncrement={() => incrementValue('player2Score')} 
                        onDecrement={() => decrementValue('player2Score')} 
                        label={isCoopSession ? "Total (Auto-Sum)" : "Total Goals"}
                        disabled={isSaving}
                        readOnly={isCoopSession}
                    />

                    {isBestOfThree && isCoopSession && (
                        <div className="pt-4 space-y-4 border-t border-white/5">
                            <div className="flex flex-col items-center gap-1 opacity-60">
                                <Activity className="w-3 h-3 text-primary" />
                                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/40">Individual Allocation</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <ScoreControl 
                                    size="sm"
                                    value={p2p1Goals} 
                                    onIncrement={() => incrementValue('player2p1Goals')} 
                                    onDecrement={() => decrementValue('player2p1Goals')} 
                                    label={`Gol ${player2Info.p1Name || 'P1'}`}
                                    disabled={isSaving}
                                />
                                <ScoreControl 
                                    size="sm"
                                    value={p2p2Goals} 
                                    onIncrement={() => incrementValue('player2p2Goals')} 
                                    onDecrement={() => decrementValue('player2p2Goals')} 
                                    label={`Gol ${player2Info.p2Name || 'P2'}`}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>
        </div>

        {isBestOfThree && (
          <div className={cn("bg-black/40 p-5 rounded-2xl border-2 border-primary/20 shadow-xl relative overflow-hidden", isSaving && "opacity-20 pointer-events-none")}>
            <div className="mb-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                   <Zap className="w-4 h-4 text-primary fill-primary" />
                   <span className="font-black text-[10px] uppercase tracking-[0.2em] text-white/60">Tactical Game Log (BO3)</span>
               </div>
            </div>
            <CoopScoreChecklist
               player1Name={player1Info.name}
               player2Name={player2Info.name}
               winners={gameWinners}
               onWinnerChange={handleWinnerChange}
            />
          </div>
        )}

        {(hasErrors || isCompletedValidationFail) && (
            <div className="bg-red-500/10 border-2 border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Protocol Violation Detected</p>
                    <ul className="list-disc pl-4 space-y-1">
                        {isBestOfThree && !isBo3Valid && matchStatus === 'Completed' && (
                            <li className="text-[11px] font-bold text-white/80 leading-tight">Salah satu tim harus mencapai 2 kemenangan.</li>
                        )}
                        {isBestOfThree && isCoopSession && !p1SumMatch && matchStatus === 'Completed' && (
                            <li className="text-[11px] font-bold text-white/80 leading-tight">Total gol individu Tim Home tidak cocok dengan skor tim ({p1p1Goals} + {p1p2Goals} ≠ {p1Score}).</li>
                        )}
                        {isBestOfThree && isCoopSession && !p2SumMatch && matchStatus === 'Completed' && (
                            <li className="text-[11px] font-bold text-white/80 leading-tight">Total gol individu Tim Away tidak cocok dengan skor tim ({p2p1Goals} + {p2p2Goals} ≠ {p2Score}).</li>
                        )}
                        {Object.values(errors).map((error: any, i) => (
                            <li key={i} className="text-[11px] font-bold text-white/80 leading-tight">{error.message}</li>
                        ))}
                    </ul>
                </div>
            </div>
        )}

        <div className={cn("bg-white/[0.02] p-5 rounded-2xl border-2 border-white/5 space-y-4", isSaving && "opacity-20 pointer-events-none")}>
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
                        <PopoverTrigger asChild disabled={isSaving}>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-black h-12 border-white/10 bg-black/40 rounded-lg text-[10px] uppercase text-center", !field.value && "text-white/20")}>
                              {field.value ? format(field.value as Date, "eeee, d MMM yyyy", { locale: localeId }) : <span>Input Date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#0A192F] border-primary/30" align="start">
                          <Calendar mode="single" selected={field.value as Date} onSelect={field.onChange} initialFocus className="rounded-xl" />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[9px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5" /> Kick-Off Time (24H)
                      </FormLabel>
                      <div className="flex items-center justify-center gap-2">
                        <Select value={editHour} onValueChange={(val) => field.onChange(`${val}:${editMin}`)} disabled={isSaving}>
                            <SelectTrigger className="h-12 font-black border-white/10 bg-black/40 rounded-lg text-base tabular-nums w-full text-center">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A192F] border-primary/30">
                                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black">{v}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <span className="text-primary font-black text-xl">:</span>
                        <Select value={editMin} onValueChange={(val) => field.onChange(`${editHour}:${val}`)} disabled={isSaving}>
                            <SelectTrigger className="h-12 font-black border-white/10 bg-black/40 rounded-lg text-base tabular-nums w-full text-center">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A192F] border-primary/30">
                                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black">{v}</SelectItem>))}
                            </SelectContent>
                        </Select>
                      </div>
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <div className="pt-2 relative">
            <Button 
              type="submit" 
              disabled={isSaving} 
              className={cn(
                "w-full h-14 text-lg font-black tracking-tighter gap-3 shadow-xl rounded-xl uppercase italic group/btn overflow-hidden relative z-10 transition-all",
                isSaving ? "bg-primary/20 text-white/20 cursor-wait" : "bg-primary text-black hover:bg-primary/90"
              )}
            >
              {isSaving ? (
                <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Synchronizing...</div>
              ) : (
                <><Save className="w-5 h-5 transition-transform group-hover/btn:scale-110" /> {matchStatus === 'Live' ? "Sync Live Stats" : "Finalize Match Stats"}</>
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
}