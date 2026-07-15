
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordManager } from '@/components/password-manager';
import { useTranslation } from '@/hooks/use-translation';
import { KeyRound, RefreshCw, Loader2, AlertTriangle, Database, Scan, Binary, Zap, ShieldCheck, Power, Activity } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Season, Match, Player, CoOpLeagueEntry, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSharedPassword } from '@/context/password-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
            <div className="absolute top-0 right-0 -z-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 min-h-[140px] sm:min-h-[190px]">
                    <div className="flex flex-col justify-center space-y-4 flex-1 w-full py-8 sm:py-10 px-8 sm:px-12 relative group/header overflow-hidden bg-black/60 backdrop-blur-3xl border-b-4 border-primary/20 rounded-none shadow-[0_20px_80px_rgba(0,0,0,0.8)] transition-all duration-500">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20 pointer-events-none" />
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
                            <div className="w-full h-[2px] bg-primary blur-[1px] absolute top-0 left-0 animate-scanning" />
                        </div>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
                        
                        <div className="relative z-10 space-y-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-primary italic">Global Configuration Hub</span>
                            </div>
                            <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] leading-none">
                                APP <span className="text-primary">SETTINGS</span>
                            </h1>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0"><LiveClock /></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* WEBSITE OPERATIONAL STATUS CARD */}
                    <div className="flex flex-col group/card relative">
                        <div className="bg-red-600 px-6 py-2.5 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                <Power className="w-4 h-4 text-white" />
                                <h2 className="text-xs font-black uppercase italic tracking-widest text-white leading-none pr-2">System Operations</h2>
                            </div>
                            <Activity className="w-4 h-4 text-white/40 relative z-10 skew-x-[12deg]" />
                        </div>
                        <Card className="border-2 border-red-600/20 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-red-600/40 transition-all duration-500 relative z-10">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">WEBSITE_VISIBILITY_STATE</p>
                                        <p className="text-sm font-bold text-white/90">Status: <span className={isDeactivated ? "text-red-500" : "text-primary"}>{isDeactivated ? "DEACTIVATED" : "ACTIVE"}</span></p>
                                    </div>
                                    <Switch 
                                        checked={!isDeactivated} 
                                        onCheckedChange={(checked) => {
                                            setPendingAction(() => () => updateDeactivationStatus(!checked));
                                            setPasswordPromptOpen(true);
                                        }} 
                                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-red-600 scale-125 transition-all"
                                    />
                                </div>
                                <div className="flex items-start gap-3 opacity-40">
                                    <Scan className="w-4 h-4 mt-0.5" />
                                    <p className="text-[10px] font-bold text-white leading-relaxed">Saat dinonaktifkan, publik hanya akan melihat pesan pemeliharaan. Admin tetap dapat mengakses halaman pengaturan ini.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ADMIN SECURITY CARD */}
                    <div className="flex flex-col group/card relative">
                        <div className="bg-primary px-6 py-2.5 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                <KeyRound className="w-4 h-4 text-black" />
                                <h2 className="text-xs font-black uppercase italic tracking-widest text-black leading-none pr-2">Security Control</h2>
                            </div>
                            <Scan className="w-4 h-4 text-black/40 relative z-10 skew-x-[12deg]" />
                        </div>
                        <Card className="border-2 border-white/10 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-primary/30 transition-all duration-500 relative z-10">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">ACCESS_PROTOCOL_VERIFIED</p>
                                    <p className="text-sm font-bold text-white/70 leading-relaxed">Kelola otorisasi pusat untuk fitur administratif di seluruh station.</p>
                                </div>
                                <Button 
                                    onClick={() => setShowPasswordManager(true)} 
                                    className="w-full h-14 font-black uppercase italic tracking-widest text-xs rounded-none -skew-x-[12deg] border-r-8 border-black/20 shadow-xl transition-all hover:scale-[1.02]"
                                >
                                    <span className="skew-x-[12deg] flex items-center gap-2"><Zap className="w-4 h-4 fill-current"/> GANTI KATA SANDI ADMIN</span>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* DATA RECAP CARD */}
                    <div className="flex flex-col group/card relative">
                        <div className="bg-amber-500 px-6 py-2.5 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                <RefreshCw className={cn("w-4 h-4 text-black", isSyncing && "animate-spin")} />
                                <h2 className="text-xs font-black uppercase italic tracking-widest text-black leading-none pr-2">History Recalibration</h2>
                            </div>
                            <Binary className="w-4 h-4 text-black/40 relative z-10 skew-x-[12deg]" />
                        </div>
                        <Card className="border-2 border-amber-500/20 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-amber-500/40 transition-all duration-500 relative z-10">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                            <CardContent className="p-8 space-y-6">
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-4 items-start relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 -mr-8 -mt-8 rounded-full blur-xl" />
                                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                                    <div className="space-y-1 relative z-10">
                                        <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest">Format Agnostic Engine</p>
                                        <p className="text-[11px] font-bold text-amber-200/60 leading-relaxed italic">Mendukung sinkronisasi penuh dari data Single, Co-Op, dan Hybrid termasuk data gol individu dari seluruh fase kompetisi.</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => {
                                        setPendingAction(() => () => handleSyncCareerStats());
                                        setPasswordPromptOpen(true);
                                    }} 
                                    disabled={isSyncing || !isPasswordLoaded} 
                                    variant="outline"
                                    className="w-full h-16 font-black uppercase italic tracking-widest text-[10px] border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-none -skew-x-[12deg] border-r-8 transition-all"
                                >
                                    <span className="skew-x-[12deg] flex items-center justify-center gap-3">
                                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                        {isSyncing ? "CALIBRATING DATA..." : "REKAP SELURUH FORMAT (V2.5)"}
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <PasswordManager open={showPasswordManager} onOpenChange={setShowPasswordManager} />

                <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
                    <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-amber-500 border-8 bg-[#0A192F]/95 backdrop-blur-3xl rounded-none shadow-[0_0_150px_rgba(245,158,11,0.2)]">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-5 text-amber-500">
                                <div className="p-4 bg-amber-500/10 rounded-none border-2 border-amber-500/40 -skew-x-[12deg]">
                                    <ShieldCheck className="w-10 h-10 skew-x-[12deg]" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic pr-4 leading-none">Otorisasi Rekap</DialogTitle>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/60 mt-1">Status: Restricted_Access</p>
                                </div>
                            </div>
                            <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[10px] leading-relaxed text-left border-l-2 border-white/10 pl-4">Tindakan ini akan memindai seluruh data histori klasemen dari Season 1 hingga saat ini secara menyeluruh.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-8 py-10">
                            <div className="space-y-3">
                                <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60 ml-1 italic">ENCRYPTED_KEY_TRANSMISSION</Label>
                                <div className="relative group/input">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] z-20" />
                                    <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-16 bg-black/60 border-white/10 rounded-none focus:border-amber-500/50 text-2xl font-black tracking-[0.3em] text-amber-500 pl-8" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handlePasswordCheck} className="w-full h-16 font-black tracking-[0.3em] text-lg sm:text-xl uppercase italic rounded-none shadow-2xl shadow-amber-500/30 text-black bg-amber-500 border-r-8 border-black/20 group/unlock relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/unlock:translate-x-[100%] transition-transform duration-700" />
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    <Scan className="w-6 h-6" />
                                    KONFIRMASI & MULAI
                                </span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
