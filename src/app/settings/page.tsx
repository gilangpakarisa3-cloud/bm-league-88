'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordManager } from '@/components/password-manager';
import { useTranslation } from '@/hooks/use-translation';
import { KeyRound, RefreshCw, Loader2, AlertTriangle, Database } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Season, Match, Player, CoOpLeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSharedPassword } from '@/context/password-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const LEAGUE_ID = 'main-league';

export default function SettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

    const [showPasswordManager, setShowPasswordManager] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    const handlePasswordCheck = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordPromptOpen(false);
            setPasswordInput('');
            handleSyncCareerStats();
        } else {
            toast({ variant: 'destructive', title: t('incorrect_password') });
        }
    };

    /**
     * SYNC LOGIC:
     * Scans ALL seasons (Season 1, 2, 3, etc.) and ALL matches.
     * Recalculates the permanent "Overall" stats for every player.
     */
    const handleSyncCareerStats = async () => {
        if (!firestore) return;
        setIsSyncing(true);

        try {
            // 1. Get all registered players to reset their stats
            const playersSnap = await getDocs(collection(firestore, 'players'));
            const playerStats: Record<string, any> = {};
            playersSnap.docs.forEach(d => {
                playerStats[d.id] = { 
                    overallPlayed: 0, 
                    overallWin: 0, 
                    overallDraw: 0, 
                    overallLoss: 0, 
                    overallGoalsFor: 0, 
                    overallGoalsAgainst: 0 
                };
            });

            // 2. Get all seasons from the league
            const seasonsSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons`));
            
            // 3. Iterate through every single season
            for (const seasonDoc of seasonsSnap.docs) {
                const sId = seasonDoc.id;
                const sData = seasonDoc.data() as Season;
                const isCoop = sData.type === 'Co-Op';

                // Map co-op teams back to individual players
                const coopPlayersMap: Record<string, { p1: string, p2: string }> = {};
                if (isCoop) {
                    const coopSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/coopLeagueTable`));
                    coopSnap.docs.forEach(d => {
                        const data = d.data() as CoOpLeagueEntry;
                        coopPlayersMap[d.id] = { p1: data.player1Id, p2: data.player2Id };
                    });
                }

                // Get all matches for this specific season
                const matchesSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/matches`));
                
                matchesSnap.docs.forEach(mDoc => {
                    const m = mDoc.data() as Match;
                    if (!m.isCompleted) return;

                    // Determine format (Bo3 for Co-Op and Playoffs)
                    const isMatchBo3 = isCoop || (m.round && m.round !== 'Group');
                    const s1 = isMatchBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
                    const s2 = isMatchBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
                    
                    const gf1 = Number(m.player1Score) || 0;
                    const ga1 = Number(m.player2Score) || 0;
                    const gf2 = Number(m.player2Score) || 0;
                    const ga2 = Number(m.player1Score) || 0;

                    const res1 = s1 > s2 ? 'W' : (s1 < s2 ? 'L' : 'D');
                    const res2 = s2 > s1 ? 'W' : (s2 < s1 ? 'L' : 'D');

                    const addStats = (pId: string, res: string, gf: number, ga: number) => {
                        if (!pId || pId === 'TBD' || !playerStats[pId]) return;
                        const p = playerStats[pId];
                        p.overallPlayed++;
                        if (res === 'W') p.overallWin++;
                        else if (res === 'L') p.overallLoss++;
                        else p.overallDraw++;
                        
                        p.overallGoalsFor += gf;
                        p.overallGoalsAgainst += ga;
                    };

                    if (isCoop) {
                        const pair1 = coopPlayersMap[m.player1Id];
                        const pair2 = coopPlayersMap[m.player2Id];
                        if (pair1) { addStats(pair1.p1, res1, gf1, ga1); addStats(pair1.p2, res1, gf1, ga1); }
                        if (pair2) { addStats(pair2.p1, res2, gf2, ga2); addStats(pair2.p2, res2, gf2, ga2); }
                    } else {
                        addStats(m.player1Id, res1, gf1, ga1);
                        addStats(m.player2Id, res2, gf2, ga2);
                    }
                });
            }

            // 4. Update the database in one go
            const batch = writeBatch(firestore);
            Object.entries(playerStats).forEach(([id, stats]) => {
                batch.update(doc(firestore, 'players', id), stats);
            });
            await batch.commit();

            toast({ 
                title: 'Rekap Selesai!', 
                description: 'Seluruh data Season 1, 2, dan 3 telah berhasil dikompilasi ke dalam Career Overview.' 
            });
        } catch (error) {
            console.error("Sync error:", error);
            toast({ variant: 'destructive', title: 'Gagal Sinkronisasi', description: 'Terjadi kesalahan saat memproses data histori.' });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary uppercase italic">
                        {t('settings_page_title', { defaultValue: 'Application Settings' })}
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground font-bold tracking-tight">
                        {t('settings_page_subtitle', { defaultValue: 'Kelola konfigurasi global liga Anda.' })}
                    </p>
                </div>

                <div className="grid gap-6">
                    <Card className="border-2 border-primary/20 bg-card/60 backdrop-blur-xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-primary">
                                <KeyRound className="w-5 h-5" /> Keamanan Admin
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase">Atur akses kontrol untuk fitur administratif.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => setShowPasswordManager(true)} className="w-full h-12 font-black tracking-tighter uppercase italic">
                                {t('manage_admin_password_button', { defaultValue: 'Ganti Kata Sandi Admin' })}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-amber-500/20 bg-card/60 backdrop-blur-xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-amber-500">
                                <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} /> Rekap Histori Musim
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase">Kompilasi data Season 1, 2, 3 ke Career Overview.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-amber-200 uppercase">Perhatian Data Histori</p>
                                    <p className="text-[10px] font-bold text-amber-200/60 leading-relaxed">Sistem akan memindai Season 1, 2, dan 3 untuk menghitung ulang total Menang/Kalah/Poin setiap pemain agar tampil akurat di halaman Profil.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => setPasswordPromptOpen(true)} 
                                disabled={isSyncing || !isPasswordLoaded} 
                                variant="outline"
                                className="w-full h-14 font-black tracking-tighter uppercase italic border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-2"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Sedang Merekap...
                                    </>
                                ) : (
                                    <>
                                        <Database className="h-5 w-5" />
                                        Sinkronkan Seluruh Season
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <PasswordManager open={showPasswordManager} onOpenChange={setShowPasswordManager} />

                <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
                    <DialogContent className="border-amber-500/50 bg-card/95 backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-amber-500">Otorisasi Rekap Data</DialogTitle>
                            <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tindakan ini akan memindai database secara menyeluruh dari Season 1.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password-input" className="text-right text-[10px] font-black uppercase tracking-widest">Sandi</Label>
                                <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="col-span-3 h-12 bg-white/5 border-white/10" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handlePasswordCheck} className="w-full h-12 font-black tracking-tighter bg-amber-500 text-white hover:bg-amber-600 uppercase italic">Konfirmasi & Mulai</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}