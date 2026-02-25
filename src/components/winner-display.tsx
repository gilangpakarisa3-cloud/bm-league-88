'use client';

import { Trophy, User, Zap, Award, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type WinnerDisplayProps = {
    title: string;
    subtitle: string;
    winnerName: string;
    teamName: string;
    imageUrl?: string | null;
    imageHint: string;
    stats: { label: string; value: string | number }[];
}

export function WinnerDisplay({ title, subtitle, winnerName, teamName, imageUrl, stats }: WinnerDisplayProps) {
    const { t } = useTranslation();
    
    return (
        <div className="container mx-auto px-2 sm:px-4 py-8 sm:py-16 flex flex-col items-center text-center gap-8 sm:gap-16 relative">
            {/* Floating Back Button */}
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 animate-in fade-in slide-in-from-left-4 duration-700">
                <Button asChild variant="outline" size="sm" className="bg-[#0A192F]/90 border-white/10 hover:border-primary/50 font-black uppercase italic text-[9px] sm:text-[10px] h-10 sm:h-12 px-4 sm:px-6 rounded-xl transition-all">
                    <Link href="/league" className="flex items-center">
                        <ChevronLeft className="mr-2 h-4 w-4" /> 
                        {t('back_to_league', { defaultValue: 'Kembali ke Liga'})}
                    </Link>
                </Button>
            </div>

            {/* Immersive Background Ghost Text - Simplified for performance */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02] select-none flex flex-col items-start pt-10 pl-4 sm:pl-10 overflow-hidden">
                <span className="text-[6rem] sm:text-[12rem] font-black italic pr-10">THE</span>
                <span className="text-[6rem] sm:text-[12rem] font-black italic -mt-4 sm:-mt-10 text-primary pr-10">CHAMPION</span>
            </div>

            {/* Title Section with Victory Protocol */}
            <div className="space-y-4 sm:space-y-6 relative z-10 animate-in fade-in slide-in-from-top-8 duration-1000">
                <div className="inline-flex items-center gap-2 sm:gap-3 bg-primary/10 border-2 border-primary/30 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-[0_0_30px_rgba(204,253,1,0.1)]">
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-primary animate-bounce" />
                    <span className="text-[8px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-primary italic pr-1">Victory Protocol Activated</span>
                </div>
                <h1 className="font-headline text-4xl sm:text-8xl font-black tracking-tighter text-white uppercase italic pr-2 sm:pr-12 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    {title}
                </h1>
                {subtitle && <p className="text-sm sm:text-2xl font-bold text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] italic pr-4">{subtitle}</p>}
            </div>
            
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 sm:gap-12 items-center relative z-10">
                {/* Winner Profile HUD Module - Removed Backdrop Blur for performance */}
                <div className="relative group animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
                    <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] sm:rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    
                    <div className="relative bg-[#0A192F]/95 border-4 border-primary/30 p-8 sm:p-20 rounded-[2rem] sm:rounded-[4rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* HUD Decorative Corners */}
                        <div className="absolute top-0 left-0 w-16 h-16 sm:w-24 sm:h-24 border-t-8 border-l-8 border-primary rounded-tl-[2rem] sm:rounded-tl-[4rem] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-24 sm:h-24 border-b-8 border-r-8 border-primary rounded-br-[2rem] sm:rounded-br-[4rem] pointer-events-none" />
                        
                        <div className="flex flex-col items-center gap-6 sm:gap-10">
                            <div className="relative">
                                <div className="absolute -inset-10 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                                <Avatar className="w-40 h-40 sm:w-72 sm:h-72 border-8 border-primary shadow-[0_0_40px_rgba(204,253,1,0.2)] relative z-10 transition-transform duration-700 group-hover:scale-105 will-change-transform">
                                    <AvatarImage src={imageUrl ?? undefined} className="object-cover" />
                                    <AvatarFallback className="bg-black/40"><User className="w-24 h-24 sm:w-40 sm:h-40 text-white/5" /></AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 bg-primary text-black p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xl z-20 rotate-12 group-hover:rotate-0 transition-transform duration-500 border-4 border-[#0A192F]">
                                    <Award className="w-8 h-8 sm:w-12 sm:h-12" />
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-4 text-center">
                                <h2 className="text-3xl sm:text-7xl font-black text-white tracking-tighter uppercase italic pr-4 sm:pr-12 group-hover:text-primary transition-colors duration-500">
                                    {winnerName}
                                </h2>
                                <div className="flex items-center justify-center gap-3 sm:gap-4">
                                    <div className="h-0.5 w-8 sm:w-16 bg-primary/30" />
                                    <p className="text-base sm:text-3xl font-black text-primary/60 uppercase tracking-widest italic pr-4">{teamName}</p>
                                    <div className="h-0.5 w-8 sm:w-16 bg-primary/30" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tactical Stats Vertical Grid */}
                <div className="flex flex-col gap-3 sm:gap-5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/40 italic">Champion Metadata</span>
                    </div>
                    
                    {stats.map((stat, index) => (
                        <div key={index} className="group/stat relative overflow-hidden bg-black/60 border-2 border-white/5 hover:border-primary/40 p-5 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-500 hover:translate-x-2 shadow-xl">
                            <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 bg-primary/10 group-hover/stat:bg-primary transition-colors duration-500" />
                            <div className="flex justify-between items-center relative z-10">
                                <span className="text-[9px] sm:text-[11px] font-black text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em]">{stat.label}</span>
                                <span className="text-3xl sm:text-5xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.3)] tabular-nums" suppressHydrationWarning>
                                    {stat.value}
                                </span>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 p-6 sm:p-8 bg-primary text-black rounded-2xl sm:rounded-3xl shadow-[0_15px_40px_rgba(204,253,1,0.1)] relative overflow-hidden group/btn cursor-default">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 -mr-24 -mt-24 rounded-full blur-3xl group-hover/btn:scale-150 transition-transform duration-1000" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="text-left">
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-60 mb-1">Status Kompetisi</p>
                                <p className="text-base sm:text-xl font-black uppercase italic leading-none pr-4">HISTORI TERVERIFIKASI</p>
                            </div>
                            <ShieldCheck className="w-8 h-8 sm:w-12 sm:h-12 opacity-40" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
