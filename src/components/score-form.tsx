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

const coopBo3FormSchema = z.object({
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

const coopFootballFormSchema = z.object({
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
        return p1TotalValid && p2TotalValid;
    }
    return true;
}, {
    message: "Validasi Gagal: Total gol individu harus sama dengan total skor tim.",
    path: ["player1Score"],
});

const singleBo3FormSchema = z.object({
  player1Wins: z.coerce.number().min(0).max(2),
  player2Wins: z.coerce.number().min(0).max(2),
  player1Score: z.coerce.number().min(0).default(0),
  player2Score: z.coerce.number().min(0).default(0),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
  status: z.enum(['Scheduled', 'Live', 'Completed', 'Postponed']),
}).refine(data => {
    if (data.status === 'Completed') {
        const winsValid = (data.player1Wins === 2 && (data.player2Wins === 0 || data.player2Wins === 1)) ||
                           (data.player2Wins === 2 && (data.player1Wins === 0 || data.player1Wins === 1));
        return winsValid;
    }
    return true;
}, {
    message: "Validasi Gagal: Salah satu pemain harus mencapai 2 kemenangan game (2-0 atau 2-1).",
    path: ["player1Wins"],
});

const singleFormSchema = z.object({
  player1Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  player2Score: z.coerce.number().min(0, { message: "Skor minimal 0" }),
  time: z.string().min(1, { message: "Waktu wajib diisi" }),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
  status: z.enum(['Scheduled', 'Live', 'Completed', 'Postponed']),
});

type ScoreFormValues = any;

import type { TISeasonTheme } from "@/lib/season-theme";

interface ScoreFormProps {
  match: WithId<Match>;
  onSave: (data: ScoreFormValues) => Promise<void>;
  seasonType?: Season['type'];
  player1Info: { name: string; team?: WithId<Team> | null; p1Name?: string; p2Name?: string };
  player2Info: { name: string; team?: WithId<Team> | null; p1Name?: string; p2Name?: string };
  theme?: TISeasonTheme;
}

const ScoreControl = memo(({ 
  value, 
  onIncrement, 
  onDecrement, 
  label = "Score Unit", 
  disabled, 
  size = "default", 
  readOnly = false,
  theme
}: { 
  value: number, 
  onIncrement: () => void, 
  onDecrement: () => void, 
  label?: string, 
  disabled?: boolean, 
  size?: "default" | "sm", 
  readOnly?: boolean,
  theme?: TISeasonTheme
}) => {
  const primaryHex = theme?.primaryHex || "#CCFD01";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          className={cn(
            "rounded-full border border-white/15 bg-white/5 transition-all duration-300 active:scale-90 text-white/80 shrink-0",
            size === "sm" ? "h-9 w-9" : "h-12 w-12",
            (disabled || readOnly) && "opacity-20 pointer-events-none"
          )}
          onClick={onDecrement}
          disabled={disabled || readOnly}
        >
          <Minus className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5", "transition-colors")} />
        </Button>
        
        <div 
          className={cn(
            "relative overflow-hidden bg-gradient-to-b from-black/90 to-black/95 border rounded-2xl flex items-center justify-center transition-all group/box",
            size === "sm" ? "w-20 h-12" : "w-28 h-20",
            disabled && "opacity-50 grayscale",
            readOnly && "border-white/10 shadow-none bg-black/60"
          )}
          style={!readOnly ? {
            borderColor: `${primaryHex}66`,
            boxShadow: `inset 0 0 15px ${primaryHex}14, 0 0 25px ${primaryHex}26`
          } : undefined}
        >
          {/* Subtle HUD scanning line */}
          {!readOnly && (
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div 
                    className="w-full h-1 blur-[1px] animate-scanning" 
                    style={{ backgroundColor: primaryHex }}
                  />
              </div>
          )}
          <span 
            className={cn(
              "font-black italic relative z-10 tabular-nums font-headline",
              size === "sm" ? "text-2xl" : "text-5xl",
              readOnly && "text-white/60 drop-shadow-none"
            )}
            style={!readOnly ? {
              color: primaryHex,
              filter: `drop-shadow(0 0 15px ${primaryHex}B3)`
            } : undefined}
          >
            {value}
          </span>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          className={cn(
            "rounded-full border border-white/15 bg-white/5 transition-all duration-300 active:scale-90 text-white/80 shrink-0",
            size === "sm" ? "h-9 w-9" : "h-12 w-12",
            (disabled || readOnly) && "opacity-20 pointer-events-none"
          )}
          onClick={onIncrement}
          disabled={disabled || readOnly}
        >
          <Plus className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5", "transition-colors")} />
        </Button>
      </div>
      <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] italic text-center max-w-[140px] mt-1">{label}</p>
    </div>
  );
});
ScoreControl.displayName = "ScoreControl";

export function ScoreForm({ match, onSave, seasonType, player1Info, player2Info, theme }: ScoreFormProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const primaryHex = theme?.primaryHex || "#CCFD01";
  const glowRgba = theme?.glowRgba || "rgba(204, 253, 1, 0.8)";

  const isCoopHybridGroup = (seasonType === 'Co-Op Hybrid' || seasonType === 'Co-Op') && (!match.round || match.round === 'Group');
  const isBestOfThree = Boolean(match.round && match.round !== 'Group');
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

  const formSchema = isBestOfThree ? (isCoopSession ? coopBo3FormSchema : singleBo3FormSchema) : (isCoopSession ? coopFootballFormSchema : singleFormSchema);

  const getInitialValues = (match: WithId<Match>) => {
    const isNewScore = !match.isCompleted;
    const dateToUse = isNewScore ? new Date() : match.matchDate.toDate(); 
    const timeToUse = format(dateToUse, 'HH:mm');

    const common = {
        player1Score: match.player1Score ?? 0,
        player2Score: match.player2Score ?? 0,
        time: timeToUse,
        date: dateToUse,
        status: match.status || 'Scheduled',
    };

    if (isCoopSession) {
        return {
            ...common,
            player1Wins: match.player1Wins ?? 0,
            player2Wins: match.player2Wins ?? 0,
            player1p1Goals: match.player1p1Goals ?? 0,
            player1p2Goals: match.player1p2Goals ?? 0,
            player2p1Goals: match.player2p1Goals ?? 0,
            player2p2Goals: match.player2p2Goals ?? 0,
        };
    }
    if (isBestOfThree) {
        return {
            ...common,
            player1Wins: match.player1Wins ?? 0,
            player2Wins: match.player2Wins ?? 0,
        };
    }
    return common;
  };

  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(match),
  });

  useEffect(() => {
    if (isCoopSession) {
      const p1p1 = form.watch('player1p1Goals') || 0;
      const p1p2 = form.watch('player1p2Goals') || 0;
      const p2p1 = form.watch('player2p1Goals') || 0;
      const p2p2 = form.watch('player2p2Goals') || 0;
      
      form.setValue('player1Score', p1p1 + p1p2, { shouldValidate: true });
      form.setValue('player2Score', p2p1 + p2p2, { shouldValidate: true });
    }
  }, [
    form.watch('player1p1Goals'), 
    form.watch('player1p2Goals'), 
    form.watch('player2p1Goals'), 
    form.watch('player2p2Goals'), 
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
        if (p1_G12 === 2 || p2_G12 === 2) nextWinners[2] = null;
        const p1Total = nextWinners.filter(w => w === 'player1').length;
        const p2Total = nextWinners.filter(w => w === 'player2').length;
        form.setValue('player1Wins', p1Total, { shouldDirty: true, shouldValidate: true });
        form.setValue('player2Wins', p2Total, { shouldDirty: true, shouldValidate: true });
        return nextWinners;
    });
  }, [form, isSaving]);

  const p1Wins = isBestOfThree ? (form.watch('player1Wins') || 0) : 0;
  const p2Wins = isBestOfThree ? (form.watch('player2Wins') || 0) : 0;
  const p1Score = form.watch('player1Score') || 0;
  const p2Score = form.watch('player2Score') || 0;
  const matchStatus = form.watch('status');

  const incrementValue = (field: any) => {
    if (isSaving) return;
    const current = form.getValues(field) || 0;
    form.setValue(field, current + 1, { shouldValidate: true });
  }

  const decrementValue = (field: any) => {
    if (isSaving) return;
    const current = form.getValues(field) || 0;
    if (current > 0) form.setValue(field, current - 1, { shouldValidate: true });
  }

  const errors = form.formState.errors;
  const hasErrors = Object.keys(errors).length > 0;
  
  const p1p1Goals = isCoopSession ? (form.watch('player1p1Goals') || 0) : 0;
  const p1p2Goals = isCoopSession ? (form.watch('player1p2Goals') || 0) : 0;
  const p2p1Goals = isCoopSession ? (form.watch('player2p1Goals') || 0) : 0;
  const p2p2Goals = isCoopSession ? (form.watch('player2p2Goals') || 0) : 0;

  const p1SumMatch = !isCoopSession || (p1p1Goals + p1p2Goals === p1Score);
  const p2SumMatch = !isCoopSession || (p2p1Goals + p2p2Goals === p2Score);
  const isBo3Valid = !isBestOfThree || (p1Wins === 2 || p2Wins === 2);

  const isCompletedValidationFail = matchStatus === 'Completed' && (!p1SumMatch || !p2SumMatch || !isBo3Valid);

  const editHour = (form.watch('time') || "00:00").split(':')[0];
  const editMin = (form.watch('time') || "00:00").split(':')[1];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6 transition-all duration-500", isSaving && "opacity-60 grayscale-[0.5]")}>
        
        {/* Match Status Protocol Box */}
        <div 
            className="bg-black/60 border rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 relative overflow-hidden backdrop-blur-xl shadow-lg"
            style={{
                borderColor: `${primaryHex}33`,
                background: `linear-gradient(to right, ${primaryHex}0F, rgba(0,0,0,0.8), ${primaryHex}0A)`
            }}
        >
            <div className="flex items-center gap-2.5">
                <Radio className={cn("w-4 h-4", matchStatus === 'Live' ? "text-red-500 animate-pulse" : "")} style={matchStatus !== 'Live' ? { color: primaryHex } : undefined} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] italic" style={{ color: primaryHex }}>
                    MATCH STATUS PROTOCOL
                </span>
            </div>
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger 
                            className="h-12 bg-black/60 border-white/15 rounded-xl font-black italic uppercase tracking-widest focus:border-white/40 shadow-inner"
                            style={{ color: primaryHex }}
                        >
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/95 border-white/20 rounded-xl backdrop-blur-2xl">
                            <SelectItem value="Scheduled" className="font-black text-white/70 italic">SCHEDULED</SelectItem>
                            <SelectItem value="Live" className="font-black text-red-500 italic">LIVE DASHBOARD</SelectItem>
                            <SelectItem value="Completed" className="font-black italic" style={{ color: primaryHex }}>FINALIZED (COMPLETED)</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
        </div>

        {/* Players Card Plates */}
        <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Player 1 Pod */}
              <div 
                  className={cn(
                      "bg-gradient-to-b from-white/[0.04] via-black/70 to-black/90 border rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-5 text-center relative overflow-hidden transition-all duration-500 shadow-xl aero-card",
                      isSaving && "border-white/5 opacity-50"
                  )}
                  style={(isBestOfThree ? p1Wins >= 2 : p1Score > p2Score) ? {
                      borderColor: `${primaryHex}80`,
                      boxShadow: `0 0 30px ${primaryHex}26`
                  } : {
                      borderColor: 'rgba(255,255,255,0.1)'
                  }}
              >
                <div className="space-y-1.5 relative z-10 w-full flex flex-col items-center">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase italic truncate max-w-[200px] drop-shadow">{player1Info.name}</h3>
                  <Badge 
                    variant="outline" 
                    className="font-black tracking-widest text-[9px] uppercase px-3 py-0.5 rounded-full italic shadow-sm border"
                    style={{
                        backgroundColor: `${primaryHex}14`,
                        borderColor: `${primaryHex}40`,
                        color: primaryHex
                    }}
                  >
                    {player1Info.team?.name || 'Independent'}
                  </Badge>
                </div>
                
                <div className="w-full relative z-10 space-y-6">
                    {isBestOfThree && (
                        <div className="flex flex-col items-center gap-1.5">
                            <div 
                                className="bg-black/60 border rounded-2xl w-24 h-16 flex items-center justify-center shadow-inner transition-colors"
                                style={p1Wins >= 2 ? {
                                    borderColor: `${primaryHex}80`,
                                    boxShadow: `0 0 20px ${primaryHex}33`
                                } : { borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <span 
                                    className={cn("text-3xl font-black italic tabular-nums font-headline", p1Wins < 2 && "text-white/40")}
                                    style={p1Wins >= 2 ? { color: primaryHex } : undefined}
                                >
                                    {p1Wins}
                                </span>
                            </div>
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.25em] italic">Series Wins</p>
                        </div>
                    )}
                    
                    <ScoreControl 
                        value={p1Score} 
                        onIncrement={() => incrementValue('player1Score')} 
                        onDecrement={() => decrementValue('player1Score')} 
                        label={isCoopSession ? "Total (Auto-Sum)" : "Total Goals"}
                        disabled={isSaving}
                        readOnly={isCoopSession}
                        theme={theme}
                    />

                    {isCoopSession && (
                        <div className="pt-4 space-y-4 border-t border-white/10 w-full">
                            <div className="flex flex-col items-center gap-1 opacity-70">
                                <Activity className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50">Individual Allocation</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <ScoreControl size="sm" value={p1p1Goals} onIncrement={() => incrementValue('player1p1Goals')} onDecrement={() => decrementValue('player1p1Goals')} label={`Gol ${player1Info.p1Name || 'P1'}`} disabled={isSaving} theme={theme} />
                                <ScoreControl size="sm" value={p1p2Goals} onIncrement={() => incrementValue('player1p2Goals')} onDecrement={() => decrementValue('player1p2Goals')} label={`Gol ${player1Info.p2Name || 'P2'}`} disabled={isSaving} theme={theme} />
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {/* Player 2 Pod */}
              <div 
                  className={cn(
                      "bg-gradient-to-b from-white/[0.04] via-black/70 to-black/90 border rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-5 text-center relative overflow-hidden transition-all duration-500 shadow-xl aero-card",
                      isSaving && "border-white/5 opacity-50"
                  )}
                  style={(isBestOfThree ? p2Wins >= 2 : p2Score > p1Score) ? {
                      borderColor: `${primaryHex}80`,
                      boxShadow: `0 0 30px ${primaryHex}26`
                  } : {
                      borderColor: 'rgba(255,255,255,0.1)'
                  }}
              >
                <div className="space-y-1.5 relative z-10 w-full flex flex-col items-center">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase italic truncate max-w-[200px] drop-shadow">{player2Info.name}</h3>
                  <Badge 
                    variant="outline" 
                    className="font-black tracking-widest text-[9px] uppercase px-3 py-0.5 rounded-full italic shadow-sm border"
                    style={{
                        backgroundColor: `${primaryHex}14`,
                        borderColor: `${primaryHex}40`,
                        color: primaryHex
                    }}
                  >
                    {player2Info.team?.name || 'Independent'}
                  </Badge>
                </div>

                <div className="w-full relative z-10 space-y-6">
                    {isBestOfThree && (
                        <div className="flex flex-col items-center gap-1.5">
                            <div 
                                className="bg-black/60 border rounded-2xl w-24 h-16 flex items-center justify-center shadow-inner transition-colors"
                                style={p2Wins >= 2 ? {
                                    borderColor: `${primaryHex}80`,
                                    boxShadow: `0 0 20px ${primaryHex}33`
                                } : { borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <span 
                                    className={cn("text-3xl font-black italic tabular-nums font-headline", p2Wins < 2 && "text-white/40")}
                                    style={p2Wins >= 2 ? { color: primaryHex } : undefined}
                                >
                                    {p2Wins}
                                </span>
                            </div>
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.25em] italic">Series Wins</p>
                        </div>
                    )}
                    
                    <ScoreControl 
                        value={p2Score} 
                        onIncrement={() => incrementValue('player2Score')} 
                        onDecrement={() => decrementValue('player2Score')} 
                        label={isCoopSession ? "Total (Auto-Sum)" : "Total Goals"}
                        disabled={isSaving}
                        readOnly={isCoopSession}
                        theme={theme}
                    />

                    {isCoopSession && (
                        <div className="pt-4 space-y-4 border-t border-white/10 w-full">
                            <div className="flex flex-col items-center gap-1 opacity-70">
                                <Activity className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50">Individual Allocation</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <ScoreControl size="sm" value={p2p1Goals} onIncrement={() => incrementValue('player2p1Goals')} onDecrement={() => decrementValue('player2p1Goals')} label={`Gol ${player2Info.p1Name || 'P1'}`} disabled={isSaving} theme={theme} />
                                <ScoreControl size="sm" value={p2p2Goals} onIncrement={() => incrementValue('player2p2Goals')} onDecrement={() => decrementValue('player2p2Goals')} label={`Gol ${player2Info.p2Name || 'P2'}`} disabled={isSaving} theme={theme} />
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>
        </div>

        {isBestOfThree && (
          <div 
            className={cn("bg-black/60 p-5 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-xl", isSaving && "opacity-20 pointer-events-none")}
            style={{ borderColor: `${primaryHex}33` }}
          >
            <CoopScoreChecklist player1Name={player1Info.name} player2Name={player2Info.name} winners={gameWinners} onWinnerChange={handleWinnerChange} theme={theme} />
          </div>
        )}

        {(hasErrors || isCompletedValidationFail) && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Protocol Violation Detected</p>
                    <ul className="list-disc pl-4 space-y-1">
                        {isBestOfThree && !isBo3Valid && matchStatus === 'Completed' && <li className="text-[11px] font-bold text-white/80 leading-tight">Salah satu tim harus mencapai 2 kemenangan.</li>}
                        {isCoopSession && !p1SumMatch && matchStatus === 'Completed' && <li className="text-[11px] font-bold text-white/80 leading-tight">Total gol individu Tim Home tidak cocok ({p1p1Goals} + {p1p2Goals} ≠ {p1Score}).</li>}
                        {isCoopSession && !p2SumMatch && matchStatus === 'Completed' && <li className="text-[11px] font-bold text-white/80 leading-tight">Total gol individu Tim Away tidak cocok ({p2p1Goals} + {p2p2Goals} ≠ {p2Score}).</li>}
                    </ul>
                </div>
            </div>
        )}

        {/* Date & Time Picker */}
        <div className={cn("bg-white/[0.02] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 backdrop-blur-sm", isSaving && "opacity-20 pointer-events-none")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel 
                        className="text-[9px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5"
                        style={{ color: primaryHex }}
                      >
                        <CalendarIcon className="w-3 h-3" /> Scheduled Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild disabled={isSaving}>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-black h-12 border-white/10 bg-black/60 rounded-xl text-[11px] uppercase text-center hover:border-white/30", !field.value && "text-white/30")}>
                              {field.value ? format(field.value as Date, "eeee, d MMM yyyy", { locale: localeId }) : <span>Input Date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black/95 border-white/20 rounded-2xl backdrop-blur-2xl" align="start">
                          <Calendar mode="single" selected={field.value as Date} onSelect={field.onChange} initialFocus className="rounded-2xl" />
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
                      <FormLabel 
                        className="text-[9px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5"
                        style={{ color: primaryHex }}
                      >
                        <Clock className="w-3 h-3" /> Kick-Off Time (24H)
                      </FormLabel>
                      <div className="flex items-center justify-center gap-2">
                        <Select value={editHour} onValueChange={(val) => field.onChange(`${val}:${editMin}`)} disabled={isSaving}>
                            <SelectTrigger className="h-12 font-black border-white/10 bg-black/60 rounded-xl text-base tabular-nums w-full text-center hover:border-white/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/95 border-white/20 rounded-xl backdrop-blur-2xl">
                                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black">{v}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <span className="font-black text-xl" style={{ color: primaryHex }}>:</span>
                        <Select value={editMin} onValueChange={(val) => field.onChange(`${editHour}:${val}`)} disabled={isSaving}>
                            <SelectTrigger className="h-12 font-black border-white/10 bg-black/60 rounded-xl text-base tabular-nums w-full text-center hover:border-white/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/95 border-white/20 rounded-xl backdrop-blur-2xl">
                                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v} className="font-black">{v}</SelectItem>))}
                            </SelectContent>
                        </Select>
                      </div>
                    </FormItem>
                  )}
                />
            </div>
        </div>

        {/* Submit Action Button */}
        <div className="pt-3 relative">
            <Button 
                type="submit" 
                disabled={isSaving} 
                className={cn(
                    "w-full h-14 text-sm sm:text-base font-black tracking-[0.2em] gap-3 rounded-full uppercase italic transition-all duration-300 relative overflow-hidden text-black hover:scale-[1.01] active:scale-[0.99]", 
                    isSaving && "opacity-60 cursor-wait"
                )}
                style={{
                    backgroundColor: primaryHex,
                    color: theme?.themeKey === 'crimson' ? '#ffffff' : '#000000',
                    boxShadow: `0 0 35px ${glowRgba}`
                }}
            >
              {isSaving ? (
                <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Synchronizing...</div>
              ) : (
                <><Save className="w-5 h-5" /> {matchStatus === 'Live' ? "Sync Live Stats" : "Finalize Match Stats"}</>
              )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
