'use client';

import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { SeasonRecord, WithId } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { SeasonRecordCard } from "@/components/season-record-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Trophy, Unlock, Award, LayoutGrid, KeyRound } from "lucide-react";
import { useState } from "react";
import { useSharedPassword } from "@/context/password-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    const handlePasswordCheck = () => {
        if (!isPasswordLoaded) return;
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAdmin(true);
            setPasswordPromptOpen(false);
            toast({ title: t('admin_mode_unlocked_title') });
        } else {
            toast({ variant: 'destructive', title: t('incorrect_password') });
        }
        passwordInput('');
    };

    const handleDelete = () => {
        if (!firestore || !deletingRecord) return;
        const recordRef = doc(firestore, 'hallOfFame', deletingRecord.id);
        deleteDocumentNonBlocking(recordRef);
        toast({
            title: t('record_deleted_title', { defaultValue: 'Catatan Dihapus' }),
            description: t('record_deleted_desc', { defaultValue: `Catatan untuk '${deletingRecord.seasonName}' telah dihapus dari Daftar Juara.`, seasonName: deletingRecord.seasonName }),
        });
        setDeletingRecord(null);
    };

    if (isLoading || !isPasswordLoaded) {
        return (
            <div className="container mx-auto px-4 py-8">
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-12">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-6 w-96 mx-auto" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[450px] w-full rounded-2xl" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background decorative glows */}
            <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-white/10 pb-10">
                    <div className="text-center md:text-left space-y-3">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-tighter text-primary uppercase italic">
                                {t('hall_of_fame_title')}
                            </h1>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-lg">
                            {t('hall_of_fame_desc')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                            variant="outline" 
                            disabled={!isPasswordLoaded}
                            className={cn(
                                "h-12 px-6 font-black tracking-widest text-xs uppercase transition-all duration-500 relative overflow-hidden group/admin",
                                isAdmin ? "bg-primary/10 text-primary border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.15)]" : "border-white/20"
                            )}
                        >
                            {/* Dynamic Scanning Animation Layer */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className={cn(
                                    "w-full h-[2px] bg-current absolute top-0 left-0 transition-opacity duration-500",
                                    isAdmin ? "animate-scanning opacity-20" : "opacity-0"
                                )} />
                            </div>

                            <div className="relative z-10 flex items-center">
                                {isAdmin ? <Unlock className="mr-2 w-4 h-4" /> : <Lock className="mr-2 w-4 h-4" />}
                                {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                            </div>
                        </Button>
                    </div>
                </div>
                
                {seasonRecords && seasonRecords.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {seasonRecords.map(record => (
                           <SeasonRecordCard 
                                key={record.id} 
                                record={record} 
                                isAdmin={isAdmin}
                                onDelete={() => setDeletingRecord(record)}
                           />
                        ))}
                    </div>
                ): (
                    <div className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-card/40 p-20 text-center backdrop-blur-md">
                        <Trophy className="w-20 h-20 text-white/5 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-muted-foreground uppercase tracking-widest">{t('hall_of_fame_empty_title')}</h2>
                        <p className="text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter max-w-md mx-auto leading-relaxed">
                            {t('hall_of_fame_empty_desc')}
                        </p>
                    </div>
                )}
            </div>
            
            {/* Password Dialog */}
            <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-2xl rounded-none shadow-[0_0_50px_rgba(204,253,1,0.2)]">
                    <DialogHeader>
                        <div className="flex items-center gap-4 text-primary mb-2">
                            <KeyRound className="w-8 h-8" />
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('admin_auth')}</DialogTitle>
                        </div>
                        <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{t('admin_auth_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 sm:py-6">
                        <div className="space-y-2">
                            <Label htmlFor="password-input" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">{t('password')}</Label>
                            <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-12 sm:h-14 bg-white/5 border-white/10 rounded-none focus:border-primary/50 text-lg font-black" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20">{t('unlock')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingRecord} onOpenChange={(isOpen) => !isOpen && setDeletingRecord(null)}>
                <AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        {t('delete_record_confirm_desc', { defaultValue: `Ini akan menghapus catatan untuk '${deletingRecord?.seasonName}' secara permanen. Tindakan ini tidak dapat dibatalkan.`, seasonName: deletingRecord?.seasonName })}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[10px] uppercase h-12"
                    >
                        {t('delete')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
