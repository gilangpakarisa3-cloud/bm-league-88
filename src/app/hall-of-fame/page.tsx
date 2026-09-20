'use client';

import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { SeasonRecord, WithId } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { SeasonRecordCard } from "@/components/season-record-card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lock, 
  Trophy, 
  Unlock, 
  Award, 
  LayoutGrid, 
  KeyRound, 
  Crown, 
  Sparkles, 
  Flame, 
  Medal, 
  Scan, 
  ShieldCheck, 
  Target 
} from "lucide-react";
import { useState, useMemo } from "react";
import { useSharedPassword } from "@/context/password-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HallOfFamePage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();

  // Admin state management
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  // Delete confirmation state
  const [deletingRecord, setDeletingRecord] = useState<WithId<SeasonRecord> | null>(null);

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc')) : null),
    [firestore]
  );

  const { data: seasonRecords, isLoading } = useCollection<SeasonRecord>(hallOfFameCollection);

  // Compute Dynasty Leaders (Champions ranked by title count)
  const dynastyLeaders = useMemo(() => {
    if (!seasonRecords || seasonRecords.length === 0) return [];
    
    const countMap: Record<string, { name: string; photoUrl?: string; teamName: string; count: number; seasons: string[] }> = {};
    
    seasonRecords.forEach(rec => {
      const key = rec.winnerPlayerId || rec.winnerPlayerName;
      if (!countMap[key]) {
        countMap[key] = {
          name: rec.winnerPlayerName,
          photoUrl: rec.winnerPhotoUrl,
          teamName: rec.winnerTeamName,
          count: 0,
          seasons: []
        };
      }
      countMap[key].count += 1;
      countMap[key].seasons.push(rec.seasonName);
    });

    return Object.values(countMap).sort((a, b) => b.count - a.count);
  }, [seasonRecords]);

  // Aggregate Championship Statistics
  const championshipStats = useMemo(() => {
    if (!seasonRecords || seasonRecords.length === 0) {
      return { totalSeasons: 0, totalFinalsGoals: 0, highestPoints: 0, topChampion: null };
    }

    const totalSeasons = seasonRecords.length;
    const totalFinalsGoals = seasonRecords.reduce((sum, r) => sum + (r.winnerStats.goalsFor || 0), 0);
    const highestPoints = Math.max(...seasonRecords.map(r => r.winnerStats.points || 0));
    const topChampion = dynastyLeaders[0] || null;

    return { totalSeasons, totalFinalsGoals, highestPoints, topChampion };
  }, [seasonRecords, dynastyLeaders]);

  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPasswordPromptOpen(false);
      toast({ title: t('admin_mode_unlocked_title') });
    } else {
      toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordInput('');
  };

  const handleDelete = () => {
    if (!firestore || !deletingRecord) return;
    const recordRef = doc(firestore, 'hallOfFame', deletingRecord.id);
    deleteDocumentNonBlocking(recordRef);
    toast({
      title: t('record_deleted_title', { defaultValue: 'Catatan Dihapus' }),
      description: t('record_deleted_desc', { 
        defaultValue: `Catatan untuk '${deletingRecord.seasonName}' telah dihapus dari Daftar Juara.`, 
        seasonName: deletingRecord.seasonName 
      }),
    });
    setDeletingRecord(null);
  };

  if (isLoading || !isPasswordLoaded) {
    return (
      <div className="max-w-[94rem] mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-44 w-full rounded-[2.5rem] bg-white/5 border border-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[520px] rounded-[2.5rem] bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }
    
  return (
    <div className="max-w-[94rem] mx-auto px-2 sm:px-6 py-8 relative">
      {/* Background Decorative Atmosphere Lasers */}
      <div className="absolute top-0 right-10 -z-10 w-[550px] h-[550px] bg-yellow-400/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Championship Sanctuary Hero Header */}
        <div className="relative group/header overflow-hidden bg-black/70 backdrop-blur-3xl border border-yellow-400/30 rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.85)] p-6 sm:p-10 aero-card">
          {/* Golden edge laser */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-600 rounded-l-[2.5rem] shadow-[0_0_35px_rgba(250,204,21,0.9)]" />
          
          <div className="absolute inset-0 cyber-grid-overlay opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-400/15 rounded-2xl text-yellow-400 border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                  <Crown className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-yellow-400 italic">
                    HALL OF CHAMPIONS // TROPHY SANCTUARY ARCHIVE
                  </span>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                </div>
              </div>

              <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                {t('hall_of_fame_title')}{' '}
                <span className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.5)]">
                  SANCTUARY
                </span>
              </h1>

              <p className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-[0.2em] max-w-xl leading-relaxed">
                {t('hall_of_fame_desc', { defaultValue: "Arsip keabadian para juara liga amatir Engineering EightyEight. Catatan kejayaan, performa puncak, dan gelar kehormatan sepanjang masa."})}
              </p>
            </div>

            {/* Admin Action Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                variant="outline" 
                disabled={!isPasswordLoaded}
                className={cn(
                  "h-12 sm:h-14 px-7 font-black tracking-widest text-xs uppercase rounded-full transition-all duration-500 relative overflow-hidden group/admin border",
                  isAdmin 
                    ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.4)]" 
                    : "bg-white/5 text-white/50 border-white/10 hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
                )}
              >
                <div className="relative z-10 flex items-center">
                  {isAdmin ? <Unlock className="mr-2 w-4 h-4" /> : <Lock className="mr-2 w-4 h-4" />}
                  {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Championship Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-yellow-400 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
              <span>SEASONS_CONCLUDED</span>
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black italic text-yellow-400 tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                {championshipStats.totalSeasons}
              </span>
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">EDITIONS</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full w-full shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-amber-500 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
              <span>DYNASTY_LEADER</span>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 truncate">
              <span className="text-2xl sm:text-3xl font-black italic text-white tracking-tight truncate leading-none">
                {championshipStats.topChampion?.name || 'BELUM ADA'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase text-amber-400 font-mono">
              <span>{championshipStats.topChampion ? `${championshipStats.topChampion.count}X CHAMPION` : 'ACTIVE'}</span>
              <span>DYNASTY</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-primary transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
              <span>CHAMPION_GOALS</span>
              <Flame className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
                {championshipStats.totalFinalsGoals}
              </span>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">GOALS</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-full shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-emerald-500 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
              <span>PEAK_AGGREGATE</span>
              <Target className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
                {championshipStats.highestPoints}
              </span>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">PTS MAX</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full w-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            </div>
          </div>
        </div>

        {/* Dynasty Champions Podium Ribbon (if champions exist) */}
        {dynastyLeaders.length > 0 && (
          <div className="p-5 rounded-3xl border border-white/10 bg-black/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">
                  ALL-TIME DYNASTY LEADERBOARD
                </h3>
              </div>
              <span className="text-[9px] font-mono font-black text-white/40 uppercase tracking-widest">
                VERIFIED_RECORDS // OFFICIAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dynastyLeaders.map((leader, idx) => (
                <div 
                  key={leader.name}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-white/5 hover:border-yellow-400/40 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                      idx === 0 ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]" :
                      idx === 1 ? "bg-slate-300 text-black" :
                      idx === 2 ? "bg-amber-600 text-white" :
                      "bg-white/10 text-white/60"
                    )}>
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-black text-sm uppercase italic tracking-tight text-white group-hover:text-yellow-400 transition-colors truncate">
                        {leader.name}
                      </span>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                        {leader.teamName}
                      </span>
                    </div>
                  </div>

                  <Badge className="bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 text-[10px] font-black uppercase tracking-widest font-mono shrink-0">
                    🏆 {leader.count}x JUARA
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Season Records Grid */}
        {seasonRecords && seasonRecords.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <LayoutGrid className="w-4 h-4 text-yellow-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
                CHRONOLOGICAL CHAMPIONSHIP PODIUMS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {seasonRecords.map(record => (
                <SeasonRecordCard 
                  key={record.id} 
                  record={record} 
                  isAdmin={isAdmin}
                  onDelete={() => setDeletingRecord(record)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-16 text-center backdrop-blur-xl">
            <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-black text-white/60 uppercase tracking-widest">
              {t('hall_of_fame_empty_title')}
            </h2>
            <p className="text-xs font-bold text-white/40 mt-2 uppercase tracking-wide max-w-md mx-auto leading-relaxed">
              {t('hall_of_fame_empty_desc')}
            </p>
          </div>
        )}

        {/* Admin Password Prompt Dialog */}
        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border border-yellow-400/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(250,204,21,0.25)] p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-4 text-yellow-400 mb-1">
                <div className="p-3 bg-yellow-400/10 rounded-2xl border border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  <KeyRound className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase italic leading-none text-white">
                    {t('admin_auth')}
                  </DialogTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400/70 mt-1">
                    Status: Championship_Lock
                  </p>
                </div>
              </div>
              <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px] text-left border-l-2 border-yellow-400/40 pl-3.5">
                {t('admin_auth_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="hall-password-input" className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400/70 ml-1 italic">
                  ENCRYPTED_KEY_TRANSMISSION
                </Label>
                <div className="relative group/input">
                  <Input 
                    id="hall-password-input" 
                    type="password" 
                    value={passwordInput} 
                    onChange={(e) => setPasswordInput(e.target.value)} 
                    className="h-14 bg-black/70 border-white/10 rounded-2xl focus:border-yellow-400/60 text-xl font-black tracking-[0.25em] text-yellow-400 px-5" 
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePasswordCheck} 
              className="w-full h-14 font-black tracking-[0.25em] text-sm uppercase italic rounded-2xl shadow-xl shadow-yellow-400/25 text-black bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
              <Scan className="w-4 h-4" />
              {t('unlock')}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={!!deletingRecord} onOpenChange={(isOpen) => !isOpen && setDeletingRecord(null)}>
          <AlertDialogContent className="border border-rose-500/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.25)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase italic text-rose-500">
                {t('are_you_sure')}
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px]">
                {t('delete_record_confirm_desc', { 
                  defaultValue: `Apakah Anda yakin ingin menghapus catatan kejuaraan '${deletingRecord?.seasonName}'? Aksi ini tidak dapat dibatalkan.`, 
                  seasonName: deletingRecord?.seasonName 
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-6">
              <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12 rounded-xl border border-white/10 bg-white/5">
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-500 text-white hover:bg-rose-600 font-black tracking-widest text-[10px] uppercase h-12 rounded-xl shadow-lg shadow-rose-500/25"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
