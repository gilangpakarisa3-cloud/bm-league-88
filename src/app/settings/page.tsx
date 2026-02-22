'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordManager } from '@/components/password-manager';
import { useTranslation } from '@/hooks/use-translation';
import { KeyRound, RefreshCw, Loader2, AlertTriangle, Database } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Season, Match, Player, CoOpLeagueEntry, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSharedPassword } from '@/context/password-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

    const handleSyncCareerStats = async () => {
        if (!firestore) return;
        setIsSyncing(true);

        try {
            const playersSnap = await getDocs(collection(firestore, 'players'));
            const currentPlayerMap: Record<string, { id: string, stats: any }> = {};
            
            // Helper normalization function
            const normalize = (name: string) => name.toLowerCase().replace(/\s|\./g, '').trim();
            
            // Name Aliases Mapping (Old Key -> New Key)
            const NAME_ALIASES: Record<string, string> = {
                'agusm': 'aguii' // Maps "Agus M" to "Aguii"
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
                const isCoop = sData.type === 'Co-Op';

                const seasonIdToNameKeyMap: Record<string, string> = {};
                const coopPairToNamesMap: Record<string, { p1: string, p2: string }> = {};

                if (isCoop) {
                    const coopSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/coopLeagueTable`));
                    coopSnap.docs.forEach(d => {
                        const data = d.data() as CoOpLeagueEntry;
                        
                        const rawP1 = normalize(data.player1Name);
                        const rawP2 = normalize(data.player2Name);
                        
                        // Apply Aliases
                        const p1NK = NAME_ALIASES[rawP1] || rawP1;
                        const p2NK = NAME_ALIASES[rawP2] || rawP2;
                        
                        seasonIdToNameKeyMap[d.id] = normalize(data.teamName);
                        coopPairToNamesMap[d.id] = { p1: p1NK, p2: p2NK };

                        [p1NK, p2NK].forEach(nk => {
                            if (currentPlayerMap[nk]) {
                                const s = currentPlayerMap[nk].stats;
                                s.overallPlayed += (data.played || 0);
                                s.overallWin += (data.win || 0);
                                s.overallLoss += (data.loss || 0);
                            }
                        });
                    });
                } else {
                    const tableSnap = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${sId}/leagueTable`));
                    tableSnap.docs.forEach(d => {
                        const data = d.data() as LeagueEntry;
                        const rawNK = normalize(data.playerName);
                        
                        // Apply Aliases
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
                    
                    const gf1 = Number(m.player1Score) || 0;
                    const ga1 = Number(m.player2Score) || 0;
                    const gf2 = Number(m.player2Score) || 0;
                    const ga2 = Number(m.player1Score) || 0;

                    const res1 = s1 > s2 ? 'W' : (s1 < s2 ? 'L' : 'D');
                    const res2 = s2 > s1 ? 'W' : (s2 < s1 ? 'L' : 'D');

                    const applyToPlayer = (nk: string | undefined, res: string, gf: number, ga: number) => {
                        // Alias was already applied in the map building above
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
                            applyToPlayer(pair1.p1, res1, gf1, ga1); 
                            applyToPlayer(pair1.p2, res1, gf1, ga1); 
                        }
                        if (pair2) { 
                            applyToPlayer(pair2.p1, res2, gf2, ga2); 
                            applyToPlayer(pair2.p2, res2, gf2, ga2); 
                        }
                    } else {
                        applyToPlayer(seasonIdToNameKeyMap[m.player1Id], res1, gf1, ga1);
                        applyToPlayer(seasonIdToNameKeyMap[m.player2Id], res2, gf2, ga2);
                    }
                });
            }

            const batch = writeBatch(firestore);
            Object.values(currentPlayerMap).forEach(player => {
                batch.update(doc(firestore, 'players', player.id), player.stats);
            });
            batch.commit()
              .then(() => {
                toast({ 
                    title: 'Rekap Selesai!', 
                    description: 'Sinkronisasi berhasil. Data Agus M telah digabung ke profil Aguii secara otomatis.' 
                });
              })
              .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: 'players',
                  operation: 'update',
                });
                errorEmitter.emit('permission-error', permissionError);
              });

        } catch (error) {
            console.error("Sync error:", error);
            toast({ variant: 'destructive', title: 'Gagal Sinkronisasi', description: 'Terjadi kesalahan saat memproses histori.' });
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
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
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
                                <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} /> Rekap Histori Klasemen
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-muted-foreground uppercase">Kompilasi data berdasarkan hasil akhir klasemen di setiap season.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-amber-200 uppercase">Akurasi Berbasis Nama</p>
                                    <p className="text-[10px] font-bold text-amber-200/60 leading-relaxed">Sistem akan mencocokkan data pemain berdasarkan NAMA. Data Agus M (S1) otomatis digabung ke profil Aguii.</p>
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
                                        Sinkronkan Berbasis Klasemen
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
                            <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tindakan ini akan memindai seluruh klasemen season 1, 2, dan 3.</DialogDescription>
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
