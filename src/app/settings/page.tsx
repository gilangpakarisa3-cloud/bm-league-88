'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordManager } from '@/components/password-manager';
import { useTranslation } from '@/hooks/use-translation';
import { 
    KeyRound, 
    RefreshCw, 
    Loader2, 
    AlertTriangle, 
    Database, 
    Scan, 
    Binary, 
    Zap, 
    ShieldCheck, 
    Power, 
    Activity,
    Radio,
    Sparkles,
    Lock,
    Unlock,
    Server,
    Cpu
} from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Season, Match, Player, CoOpLeagueEntry, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { CardContent } from '@/components/ui/card';
import { useSharedPassword } from '@/context/password-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';

const LEAGUE_ID = 'main-league';

export default function SettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded, isDeactivated, updateDeactivationStatus } = useSharedPassword();

    const [showPasswordManager, setShowPasswordManager] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const handlePasswordCheck = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordPromptOpen(false);
            setPasswordInput('');
            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }
        } else {
            toast({ variant: 'destructive', title: t('incorrect_password') });
        }
    };

    const handleSyncCareerStats = async () => {
        if (!firestore) return;
        setIsSyncing(true);

        try {
            const playersSnap = await getDocs(collection(firestore, 'players'));
            const currentPlayerMap: Record<string, { id: string, stats: any }> = {};
            
            const normalize = (name: string) => name.toLowerCase().replace(/\s|\./g, '').trim();
            
            const NAME_ALIASES: Record<string, string> = {
                'agusm': 'aguii'
            };

            playersSnap.docs.forEach(d => {
                const data = d.data();
                const nameKey = normalize(data.name);
                currentPlayerMap[nameKey] = {
                    id: d.id,
                    stats: { 
                        overallPlayed: 0, 
                        overallWin: 0, 
                        overallDraw: 0, 
                        overallLoss: 0, 
                        overallGoalsFor: 0, 
                        overallGoalsAgainst: 0 
                    }
                };
            });

            const seasonsSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons`));
            
            for (const seasonDoc of seasonsSnap.docs) {
                const sId = seasonDoc.id;
                const sData = seasonDoc.data() as Season;
                const isCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';

                const seasonIdToNameKeyMap: Record<string, string> = {};
                const coopPairToNamesMap: Record<string, { p1: string, p2: string }> = {};

                if (isCoop) {
                    const coopSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/coopLeagueTable`));
                    coopSnap.docs.forEach(d => {
                        const data = d.data() as CoOpLeagueEntry;
                        
                        const rawP1 = normalize(data.player1Name);
                        const rawP2 = normalize(data.player2Name);
                        
                        const p1NK = NAME_ALIASES[rawP1] || rawP1;
                        const p2NK = NAME_ALIASES[rawP2] || rawP2;
                        
                        seasonIdToNameKeyMap[d.id] = normalize(data.teamName);
                        coopPairToNamesMap[d.id] = { p1: p1NK, p2: p2NK };

                        if (currentPlayerMap[p1NK]) {
                            const s = currentPlayerMap[p1NK].stats;
                            s.overallPlayed += (data.played || 0);
                            s.overallWin += (data.win || 0);
                            s.overallDraw += (data.draw || 0);
                            s.overallLoss += (data.loss || 0);
                            s.overallGoalsFor += (data.player1Goals || 0);
                            s.overallGoalsAgainst += (data.goalsAgainst || 0);
                        }
                        if (currentPlayerMap[p2NK]) {
                            const s = currentPlayerMap[p2NK].stats;
                            s.overallPlayed += (data.played || 0);
                            s.overallWin += (data.win || 0);
                            s.overallDraw += (data.draw || 0);
                            s.overallLoss += (data.loss || 0);
                            s.overallGoalsFor += (data.player2Goals || 0);
                            s.overallGoalsAgainst += (data.goalsAgainst || 0);
                        }
                    });
                } else {
                    const tableSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/leagueTable`));
                    tableSnap.docs.forEach(d => {
                        const data = d.data() as LeagueEntry;
                        const rawNK = normalize(data.playerName);
                        const nameKey = NAME_ALIASES[rawNK] || rawNK;
                        
                        seasonIdToNameKeyMap[data.playerId] = nameKey;

                        if (currentPlayerMap[nameKey]) {
                            const s = currentPlayerMap[nameKey].stats;
                            s.overallPlayed += (data.played || 0);
                            s.overallWin += (data.win || 0);
                            s.overallDraw += (data.draw || 0);
                            s.overallLoss += (data.loss || 0);
                            s.overallGoalsFor += (data.goalsFor || 0);
                            s.overallGoalsAgainst += (data.goalsAgainst || 0);
                        }
                    });
                }

                const matchesSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/matches`));
                
                matchesSnap.docs.forEach(mDoc => {
                    const m = mDoc.data() as Match;
                    if (!m.isCompleted) return;
                    if (m.round === 'Group' || !m.round) return;

                    const isMatchBo3 = isCoop || (m.round && m.round !== 'Group');
                    const s1 = isMatchBo3 ? (m.player1Wins ?? m.player1Score ?? 0) : (m.player1Score ?? 0);
                    const s2 = isMatchBo3 ? (m.player2Wins ?? m.player2Score ?? 0) : (m.player2Score ?? 0);
                    
                    const ga1 = Number(m.player2Score) || 0;
                    const ga2 = Number(m.player1Score) || 0;

                    const res1 = s1 > s2 ? 'W' : (s1 < s2 ? 'L' : 'D');
                    const res2 = s2 > s1 ? 'W' : (s2 < s1 ? 'L' : 'D');

                    const applyToPlayer = (nk: string | undefined, res: string, gf: number, ga: number) => {
                        if (nk && currentPlayerMap[nk]) {
                            const s = currentPlayerMap[nk].stats;
                            s.overallPlayed++;
                            if (res === 'W') s.overallWin++;
                            else if (res === 'L') s.overallLoss++;
                            else s.overallDraw++;
                            s.overallGoalsFor += gf;
                            s.overallGoalsAgainst += ga;
                        }
                    };

                    if (isCoop) {
                        const pair1 = coopPairToNamesMap[m.player1Id];
                        const pair2 = coopPairToNamesMap[m.player2Id];
                        if (pair1) { 
                            const g1 = Number(m.player1p1Goals ?? m.player1Score ?? 0);
                            const g2 = Number(m.player1p2Goals ?? m.player1Score ?? 0);
                            applyToPlayer(pair1.p1, res1, g1, ga1); 
                            applyToPlayer(pair1.p2, res1, g2, ga1); 
                        }
                        if (pair2) { 
                            const g1 = Number(m.player2p1Goals ?? m.player2Score ?? 0);
                            const g2 = Number(m.player2p2Goals ?? m.player2Score ?? 0);
                            applyToPlayer(pair2.p1, res2, g1, ga2); 
                            applyToPlayer(pair2.p2, res2, g2, ga2); 
                        }
                    } else {
                        applyToPlayer(seasonIdToNameKeyMap[m.player1Id], res1, Number(m.player1Score) || 0, ga1);
                        applyToPlayer(seasonIdToNameKeyMap[m.player2Id], res2, Number(m.player2Score) || 0, ga2);
                    }
                });
            }

            const batch = writeBatch(firestore);
            Object.values(currentPlayerMap).forEach(player => {
                batch.update(doc(firestore, 'players', player.id), player.stats);
            });
            await batch.commit();
            
            toast({ 
                title: 'Rekap Selesai!', 
                description: 'Sinkronisasi berhasil mencakup seluruh format Single, Co-Op, dan Hybrid termasuk data gol individu.' 
            });

        } catch (error: any) {
            console.error("Sync error:", error);
            const permissionError = new FirestorePermissionError({
                path: 'players',
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-[92rem] mx-auto px-4 py-8 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -z-10 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
                
                {/* COCKPIT COMMAND HERO BANNER */}
                <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 min-h-[140px] sm:min-h-[180px]">
                    <div className="flex flex-col justify-center space-y-4 flex-1 w-full py-8 sm:py-10 px-8 sm:px-12 relative group/header overflow-hidden bg-black/60 backdrop-blur-3xl border-2 border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-500">
                        {/* High-Tech Grid & Scanline */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:25px_25px] opacity-30 pointer-events-none" />
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-15">
                            <div className="w-full h-[2px] bg-primary blur-[1px] absolute top-0 left-0 animate-scanning" />
                        </div>
                        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-primary via-primary/80 to-primary/30 rounded-l-[2.5rem] shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
                        
                        <div className="relative z-10 space-y-2">
                            <div className="flex flex-wrap items-center gap-2.5 mb-1">
                                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[9px] font-mono font-black text-primary uppercase tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                    <span>SYSTEM_OPERATIONS // CORE_V2.5</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/50 uppercase tracking-wider">
                                    <Server className="w-3 h-3 text-cyan-400" />
                                    <span>NODE: NOMINAL</span>
                                </div>
                            </div>

                            <h1 className="font-headline text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase italic drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] leading-none">
                                APP <span className="text-primary drop-shadow-[0_0_25px_rgba(204,253,1,0.5)]">SETTINGS</span>
                            </h1>
                            <p className="text-white/50 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] font-mono">
                                Central Governance Console & Multi-Format Calibrator
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-[420px] flex items-stretch shrink-0">
                        <LiveClock className="h-full" />
                    </div>
                </div>

                {/* CONTROL MODULES GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    
                    {/* 1. WEBSITE OPERATIONAL STATUS MODULE */}
                    <div className={cn(
                        "flex flex-col group/card relative rounded-[2rem] sm:rounded-[2.3rem] overflow-hidden border-2 bg-gradient-to-b from-[#0D111A]/95 via-[#070A12]/95 to-[#030508]/95 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-500",
                        isDeactivated 
                            ? "border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.15)]" 
                            : "border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.15)]"
                    )}>
                        {/* Top Laser Accent */}
                        <div className={cn(
                            "absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r opacity-80 pointer-events-none z-20",
                            isDeactivated ? "from-transparent via-red-500 to-transparent" : "from-transparent via-emerald-400 to-transparent"
                        )} />

                        {/* Card Header */}
                        <div className={cn(
                            "py-3.5 px-6 flex items-center justify-between overflow-hidden shrink-0 shadow-md relative z-10",
                            isDeactivated 
                                ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white" 
                                : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black"
                        )}>
                            <div className="flex items-center gap-2.5 relative z-10">
                                <div className="bg-black/20 p-1.5 rounded-xl border border-black/10 shadow-inner">
                                    <Power className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider font-headline leading-none">
                                        System Operations
                                    </h2>
                                    <p className={cn(
                                        "text-[8px] font-black uppercase tracking-widest font-mono mt-0.5",
                                        isDeactivated ? "text-white/70" : "text-black/70"
                                    )}>
                                        WEBSITE_FEED_CONTROLLER
                                    </p>
                                </div>
                            </div>
                            
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[8px] font-black font-mono uppercase tracking-widest",
                                isDeactivated ? "border-white/20 bg-white/10 text-white" : "border-black/20 bg-black/15 text-black"
                            )}>
                                <Activity className="w-3 h-3 animate-pulse" />
                                <span>{isDeactivated ? "OFFLINE" : "LIVE"}</span>
                            </div>
                        </div>

                        {/* Card Body */}
                        <CardContent className="p-6 sm:p-7 space-y-6 relative z-10">
                            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
                                <div className="space-y-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full animate-pulse",
                                            isDeactivated ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                                        )} />
                                        <p className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-white/50">
                                            BROADCAST_STATUS
                                        </p>
                                    </div>
                                    <p className="text-base sm:text-lg font-black uppercase italic tracking-tight font-headline">
                                        {isDeactivated ? (
                                            <span className="text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">MAINTENANCE LOCKED</span>
                                        ) : (
                                            <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">OPERATIONAL // LIVE</span>
                                        )}
                                    </p>
                                </div>

                                <Switch 
                                    checked={!isDeactivated} 
                                    onCheckedChange={(checked) => {
                                        setPendingAction(() => () => updateDeactivationStatus(!checked));
                                        setPasswordPromptOpen(true);
                                    }} 
                                    className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-red-600 scale-125 transition-all shadow-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">PUBLIC_ROUTE</span>
                                    <p className="text-[11px] font-mono font-bold text-white/80">
                                        {isDeactivated ? "REVERT_TO_HOLD" : "OPEN_ACCESS"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">ADMIN_GATEWAY</span>
                                    <p className="text-[11px] font-mono font-bold text-cyan-400">UNRESTRICTED</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <Scan className="w-4 h-4 mt-0.5 text-white/40 shrink-0" />
                                <p className="text-[10px] font-bold text-white/50 leading-relaxed font-mono">
                                    Saat dinonaktifkan, publik akan melihat layar pemeliharaan. Admin tetap dapat mengakses portal melalui kunci otorisasi.
                                </p>
                            </div>
                        </CardContent>
                    </div>

                    {/* 2. ADMIN SECURITY CONTROL CENTER MODULE */}
                    <div className="flex flex-col group/card relative rounded-[2rem] sm:rounded-[2.3rem] overflow-hidden border-2 border-cyan-500/40 bg-gradient-to-b from-[#0D111A]/95 via-[#070A12]/95 to-[#030508]/95 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:border-cyan-400/80 hover:shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all duration-500">
                        {/* Top Laser Accent */}
                        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 pointer-events-none z-20" />

                        {/* Card Header */}
                        <div className="py-3.5 px-6 flex items-center justify-between overflow-hidden shrink-0 shadow-md relative z-10 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 text-black">
                            <div className="flex items-center gap-2.5 relative z-10">
                                <div className="bg-black/20 p-1.5 rounded-xl border border-black/10 shadow-inner">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider font-headline leading-none">
                                        Security Control
                                    </h2>
                                    <p className="text-[8px] font-black uppercase tracking-widest font-mono text-black/70 mt-0.5">
                                        ENCRYPTED_CYPHER_ACCESS
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-black/20 bg-black/15 text-[8px] font-black font-mono uppercase tracking-widest text-black">
                                <ShieldCheck className="w-3 h-3" />
                                <span>SECURE // LEVEL 4</span>
                            </div>
                        </div>

                        {/* Card Body */}
                        <CardContent className="p-6 sm:p-7 space-y-6 relative z-10">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <Cpu className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em]">
                                        AUTHENTICATION_CORE
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-white/70 leading-relaxed font-mono">
                                    Kunci otorisasi universal untuk manajemen turnamen, penjadwalan, draft tim, mutasi skor, dan penguncian administrasi.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-white/40 uppercase">
                                    <span>HASH_ALGORITHM</span>
                                    <span className="text-cyan-400">SHA-256 SALT</span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-white/40 uppercase">
                                    <span>STATUS</span>
                                    <span className="text-emerald-400">AUTHENTICATED</span>
                                </div>
                            </div>

                            <Button 
                                onClick={() => setShowPasswordManager(true)} 
                                className="w-full h-14 font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] bg-gradient-to-r from-cyan-400 to-sky-500 text-black hover:from-cyan-300 hover:to-sky-400"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <KeyRound className="w-4 h-4" />
                                    GANTI KATA SANDI ADMIN
                                </span>
                            </Button>
                        </CardContent>
                    </div>

                    {/* 3. MULTI-FORMAT HISTORICAL RECALIBRATION ENGINE (FULL SPAN) */}
                    <div className="flex flex-col group/card relative rounded-[2rem] sm:rounded-[2.3rem] overflow-hidden border-2 border-amber-500/40 bg-gradient-to-b from-[#0D111A]/95 via-[#070A12]/95 to-[#030508]/95 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:border-amber-400/80 hover:shadow-[0_0_50px_rgba(245,158,11,0.2)] transition-all duration-500 lg:col-span-2">
                        {/* Top Laser Accent */}
                        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 pointer-events-none z-20" />

                        {/* Card Header */}
                        <div className="py-3.5 px-6 flex items-center justify-between overflow-hidden shrink-0 shadow-md relative z-10 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-black">
                            <div className="flex items-center gap-2.5 relative z-10">
                                <div className="bg-black/20 p-1.5 rounded-xl border border-black/10 shadow-inner">
                                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                </div>
                                <div>
                                    <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider font-headline leading-none">
                                        Historical Telemetry Recalibrator
                                    </h2>
                                    <p className="text-[8px] font-black uppercase tracking-widest font-mono text-black/70 mt-0.5">
                                        FORMAT_AGNOSTIC_DATA_ENGINE // V2.5
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-black/20 bg-black/15 text-[8px] font-black font-mono uppercase tracking-widest text-black">
                                <Binary className="w-3 h-3" />
                                <span>MULTI-SEASON</span>
                            </div>
                        </div>

                        {/* Card Body */}
                        <CardContent className="p-6 sm:p-8 space-y-6 relative z-10">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { label: 'SINGLE 1v1', desc: 'Individu Standings' },
                                    { label: 'CO-OP 2v2', desc: 'Duo Pairs & Goals' },
                                    { label: 'HYBRID KNOCKOUT', desc: 'Group & Playoff' },
                                    { label: 'GOAL DIFFERENTIALS', desc: 'Career Historical' }
                                ].map((badge, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                                        <div className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-widest">{badge.label}</div>
                                        <div className="text-[9px] text-white/50 font-bold truncate">{badge.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 flex gap-4 items-start relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 shrink-0 mt-0.5">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="space-y-1 relative z-10">
                                    <p className="text-[10px] font-mono font-black text-amber-300 uppercase tracking-widest">
                                        Format Agnostic Engine Sync Protocol
                                    </p>
                                    <p className="text-xs font-bold text-amber-200/80 leading-relaxed font-mono">
                                        Mendukung sinkronisasi mendalam dari histori klasemen Season 1 hingga musim aktif. 
                                        Secara otomatis menghitung ulang total pertandingan, menang, seri, kalah, dan akumulasi gol individu masing-masing pemain.
                                    </p>
                                </div>
                            </div>

                            <Button 
                                onClick={() => {
                                    setPendingAction(() => () => handleSyncCareerStats());
                                    setPasswordPromptOpen(true);
                                }} 
                                disabled={isSyncing || !isPasswordLoaded} 
                                className="w-full h-14 font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black hover:from-amber-400 hover:to-yellow-300"
                            >
                                <span className="flex items-center justify-center gap-3">
                                    {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                    {isSyncing ? "CALIBRATING DATA MATRICES..." : "REKAP SELURUH FORMAT MUSIM (V2.5)"}
                                </span>
                            </Button>
                        </CardContent>
                    </div>

                </div>

                <PasswordManager open={showPasswordManager} onOpenChange={setShowPasswordManager} />

                {/* CYBER MATRIX AUTHORIZATION DIALOG */}
                <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
                    <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-2 border-amber-500/50 bg-[#0B0F19]/98 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-white">
                        <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none" />

                        <DialogHeader className="space-y-3">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div className="text-left min-w-0">
                                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase italic font-headline text-white leading-none">
                                        Otorisasi Rekap
                                    </DialogTitle>
                                    <p className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-amber-400/80 mt-1">
                                        SECURITY_CLEARANCE // LEVEL 04
                                    </p>
                                </div>
                            </div>
                            <DialogDescription className="font-mono text-white/50 text-xs leading-relaxed text-left border-l-2 border-amber-500/40 pl-3">
                                Masukkan kata sandi administrator untuk mengonfirmasi kalibrasi data historis menyeluruh.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="password-input" className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-amber-400 italic">
                                    CIPHER_KEY_INPUT
                                </Label>
                                <Input 
                                    id="password-input" 
                                    type="password" 
                                    value={passwordInput} 
                                    onChange={(e) => setPasswordInput(e.target.value)} 
                                    placeholder="••••••••" 
                                    className="h-14 bg-black/60 border-white/10 rounded-2xl focus:border-amber-400 text-xl font-mono font-black tracking-[0.3em] text-amber-300 px-5" 
                                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button 
                                onClick={handlePasswordCheck} 
                                className="w-full h-14 font-black tracking-[0.2em] text-xs uppercase italic rounded-2xl shadow-xl shadow-amber-500/25 text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all flex items-center justify-center gap-2.5"
                            >
                                <Scan className="w-4 h-4" />
                                KONFIRMASI & EKSEKUSI
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
