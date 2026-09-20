'use client';

import type { SeasonRecord, WithId } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Trophy, 
  User, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  Star, 
  ShieldCheck, 
  Target, 
  Trash2, 
  Binary, 
  Shield, 
  Medal, 
  Scan, 
  CheckCircle2, 
  Crown,
  Flame,
  Award,
  Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguage } from "@/context/language-context";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const StatItem = ({ 
  icon: Icon, 
  label, 
  value, 
  valueClassName, 
  tooltip, 
  variant = "default" 
}: { 
  icon: React.ElementType, 
  label: string, 
  value: string, 
  valueClassName?: string, 
  tooltip: string,
  variant?: "default" | "primary" | "destructive" | "gold"
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex flex-col items-center text-center gap-1 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group/item cursor-default",
          variant === "gold" ? "bg-yellow-400/[0.08] border-yellow-400/30 hover:border-yellow-400 hover:scale-105" :
          variant === "primary" ? "bg-primary/[0.08] border-primary/30 hover:border-primary hover:scale-105" : 
          variant === "destructive" ? "bg-rose-500/[0.08] border-rose-500/30 hover:border-rose-500 hover:scale-105" :
          "bg-white/[0.03] border-white/10 hover:border-white/30 hover:scale-105"
        )}>
          <div className="flex flex-col items-center gap-1 relative z-10 w-full">
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              variant === "gold" ? "bg-yellow-400/20 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]" :
              variant === "primary" ? "bg-primary/20 text-primary shadow-[0_0_12px_rgba(204,253,1,0.3)]" : 
              variant === "destructive" ? "bg-rose-500/20 text-rose-400" : 
              "bg-white/10 text-white/50"
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40">{label}</span>
          </div>
          <span className={cn("font-black text-xs tracking-tight uppercase italic truncate mt-0.5 relative z-10 w-full px-1", valueClassName)}>
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-[#0A192F]/95 border border-yellow-400/40 backdrop-blur-2xl rounded-xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function SeasonRecordCard({ 
  record, 
  isAdmin, 
  onDelete 
}: { 
  record: WithId<SeasonRecord>, 
  isAdmin?: boolean, 
  onDelete?: () => void 
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
  const completedDate = record.completedAt?.toDate ? record.completedAt.toDate() : new Date();
  const formattedDate = new Date(completedDate).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });
  const yearString = new Date(completedDate).getFullYear().toString();

  const totalMatches = (record.winnerStats.win || 0) + (record.winnerStats.draw || 0) + (record.winnerStats.loss || 0);
  const winPercentage = totalMatches > 0 
    ? Math.round(((record.winnerStats.win || 0) / totalMatches) * 100) 
    : 100;

  return (
    <div className="group relative">
      {/* Golden Aura Atmosphere Glow */}
      <div className="absolute -inset-1 bg-gradient-to-b from-yellow-400/30 via-amber-500/10 to-primary/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
      
      <Card className="relative flex flex-col h-full bg-gradient-to-b from-[#0E1B2E]/95 via-[#081220]/95 to-[#040810] backdrop-blur-3xl border border-yellow-400/30 group-hover:border-yellow-400/70 transition-all duration-700 overflow-hidden rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.85)] hover:-translate-y-2">
        
        {/* Top Glowing Championship Laser Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.9)]" />

        {/* Large Decorative Watermark Background */}
        <div className="absolute top-6 left-6 w-full h-full pointer-events-none opacity-[0.03] select-none flex flex-col items-start overflow-hidden">
          <span className="text-[10rem] font-black italic leading-none group-hover:text-yellow-400/15 transition-colors duration-700">CHAMP</span>
        </div>

        {/* Top Gold Corner Accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-yellow-400/40 rounded-tl-[2.5rem] pointer-events-none group-hover:border-yellow-400 transition-colors" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-yellow-400/30 rounded-br-[2.5rem] pointer-events-none group-hover:border-yellow-400 transition-colors" />

        {/* Card Header: Season Title & Verification Badge */}
        <CardHeader className="p-6 sm:p-7 bg-black/40 backdrop-blur-md relative z-10 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              <Badge className="bg-yellow-400/15 border-yellow-400/40 text-yellow-400 text-[9px] font-black uppercase tracking-[0.3em] py-1 px-3 italic rounded-full shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                CHAMPION_CERTIFIED // {yearString}
              </Badge>
            </div>

            {isAdmin && onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                onClick={onDelete}
                title="Hapus Rekor Juara"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase italic drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] group-hover:text-yellow-400 transition-colors">
              {record.seasonName}
            </CardTitle>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-yellow-400/40" />
              <span className="text-[10px] font-black text-yellow-400/70 uppercase tracking-[0.35em] italic font-mono">
                {formattedDate}
              </span>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-yellow-400/40" />
            </div>
          </div>
        </CardHeader>

        {/* Card Content: Champion Avatar & Identity */}
        <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8 flex-grow relative z-10 space-y-6">
          
          {/* Avatar Showcase with Holographic Rings */}
          <div className="relative group/avatar my-2">
            {/* Spinning Holographic Dash Ring */}
            <div className="absolute -inset-3 rounded-full border-2 border-dashed border-yellow-400/40 animate-spin-slow pointer-events-none" />
            
            {/* Pulsing Radial Glow */}
            <div className="absolute -inset-6 bg-yellow-400/20 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />

            <Avatar className="w-36 h-36 border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)] group-hover:scale-105 transition-all duration-700 relative z-10">
              <AvatarImage src={record.winnerPhotoUrl} alt={record.winnerPlayerName} className="object-cover" />
              <AvatarFallback className="bg-black/80 font-black text-yellow-400 text-3xl">
                {record.winnerPlayerName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* 3D-styled Golden Trophy Badge */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 text-black h-13 w-13 p-2 rounded-2xl flex items-center justify-center border-2 border-[#0A192F] shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-transform duration-500 group-hover:scale-115 z-20">
              <Trophy className="w-7 h-7 drop-shadow-md text-black" />
            </div>

            {/* Crown Top Indicator */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/80 border border-yellow-400/50 p-1.5 rounded-full shadow-lg z-20">
              <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          {/* Champion Name & Club Badge */}
          <div className="space-y-2 text-center w-full px-2">
            <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-[0.3em] text-yellow-400/80">
              <Sparkles className="w-3 h-3" />
              <span>GRAND CHAMPION</span>
              <Sparkles className="w-3 h-3" />
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic group-hover:text-yellow-400 transition-colors duration-500 drop-shadow-lg leading-none">
              {record.winnerPlayerName}
            </h3>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-xs font-black uppercase tracking-widest gap-1.5 py-1 px-3 rounded-full">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>{record.winnerTeamName}</span>
              </Badge>
            </div>
          </div>

          {/* Championship HUD Telemetry Matrix */}
          <div className="w-full bg-black/60 rounded-3xl p-5 border border-white/10 relative overflow-hidden shadow-inner group/stats space-y-4">
            {/* Laser Shimmer Bar */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Binary className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] italic">
                  HUD TELEMETRY MATRIX
                </span>
              </div>
              <Badge className="bg-yellow-400 text-black font-black text-[10px] px-3 h-6 italic rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                {record.winnerStats.points} PTS AGGREGATE
              </Badge>
            </div>

            {/* Duel Energy Bars: Victories vs Defeats */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/50 border border-emerald-500/20">
                <span className="text-[8px] font-black text-emerald-400 uppercase italic tracking-widest mb-1">
                  VICTORIES (W)
                </span>
                <span className="text-3xl font-black text-white italic tabular-nums leading-none">
                  {record.winnerStats.win}
                </span>
                <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
              </div>

              <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-black/50 border border-rose-500/20">
                <span className="text-[8px] font-black text-rose-400 uppercase italic tracking-widest mb-1">
                  DEFEATS (L)
                </span>
                <span className="text-3xl font-black text-white italic tabular-nums leading-none">
                  {record.winnerStats.loss}
                </span>
                <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)]" 
                    style={{ width: `${Math.max(10, Math.min(100, (record.winnerStats.loss / Math.max(1, record.winnerStats.win)) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Win Rate & Goal Stats Row */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/5">
              <div className="p-2 bg-white/[0.02] rounded-xl">
                <span className="block text-[7px] font-black uppercase tracking-wider text-white/40">WIN RATE</span>
                <span className="text-sm font-black font-mono text-primary italic">{winPercentage}%</span>
              </div>
              <div className="p-2 bg-white/[0.02] rounded-xl">
                <span className="block text-[7px] font-black uppercase tracking-wider text-white/40">GOALS FOR</span>
                <span className="text-sm font-black font-mono text-white italic">{record.winnerStats.goalsFor || 0}</span>
              </div>
              <div className="p-2 bg-white/[0.02] rounded-xl">
                <span className="block text-[7px] font-black uppercase tracking-wider text-white/40">DIFF</span>
                <span className={cn(
                  "text-sm font-black font-mono italic",
                  (record.winnerStats.goalDifference || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {(record.winnerStats.goalDifference || 0) > 0 ? '+' : ''}{record.winnerStats.goalDifference || 0}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Card Footer: Fun Stats & Championship Seal */}
        <CardFooter className="p-0 bg-black/70 backdrop-blur-3xl relative z-10 border-t border-white/10 overflow-hidden flex flex-col">
          {/* Subheader Banner */}
          <div className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 py-2 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-black animate-pulse" />
              <h4 className="text-[9px] font-black tracking-[0.25em] uppercase italic text-black">
                SEASON ACCOLADES & AWARDS
              </h4>
            </div>
            <Scan className="w-3.5 h-3.5 text-black/60" />
          </div>

          <div className="p-6 w-full space-y-4">
            {/* Accolades Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {record.funStats?.bestAttacker && (
                <StatItem 
                  icon={Target} 
                  label="PENYERANG TERBAIK" 
                  value={record.funStats.bestAttacker.playerName} 
                  valueClassName="text-emerald-400" 
                  tooltip={t('fun_stats_best_attacker_tooltip', { value: record.funStats.bestAttacker.value })} 
                  variant="primary"
                />
              )}
              {record.funStats?.mostWins && (
                <StatItem 
                  icon={Award} 
                  label="RAJA KEMENANGAN" 
                  value={record.funStats.mostWins.playerName} 
                  variant="gold"
                  valueClassName="text-yellow-400"
                  tooltip={t('fun_stats_most_wins_tooltip', { value: record.funStats.mostWins.value })} 
                />
              )}
              {record.funStats?.worstDefender && (
                <StatItem 
                  icon={ShieldAlert} 
                  label="PERTAHANAN TERBURUK" 
                  value={record.funStats.worstDefender.playerName} 
                  variant="destructive" 
                  valueClassName="text-rose-400" 
                  tooltip={t('fun_stats_worst_defense_tooltip', { value: record.funStats.worstDefender.value })} 
                />
              )}
              <StatItem 
                icon={TrendingUp} 
                label="SELISIH GOL" 
                value={`${(record.winnerStats.goalDifference || 0) > 0 ? '+' : ''}${record.winnerStats.goalDifference || 0}`} 
                valueClassName={(record.winnerStats.goalDifference || 0) > 0 ? "text-primary" : "text-rose-400"}
                tooltip={`Total Selisih Gol: ${record.winnerStats.goalDifference || 0}`}
              />
            </div>

            {/* Digital Championship Seal */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 group/verify">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 group-hover/verify:border-emerald-500/60 transition-colors shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase italic tracking-tight text-white/90">
                    Legacy Seal Verified
                  </span>
                  <span className="text-[7px] font-mono font-black text-emerald-400/70 uppercase tracking-[0.2em]">
                    STAMP: {yearString} // ARCHIVE_SECURE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-[8px] font-mono font-black text-white/40 uppercase tracking-[0.2em]">
                  OFFICIAL
                </span>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}