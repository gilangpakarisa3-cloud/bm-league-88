'use client';

import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { SeasonRecord, WithId } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { SeasonRecordCard } from "@/components/season-record-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Trophy, Unlock } from "lucide-react";
import { useState } from "react";
import { useSharedPassword } from "@/context/password-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        setPasswordInput('');
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
                        <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">{t('hall_of_fame_title')}</h1>
                        <p className="mt-2 max-w-2xl mx-auto text-lg text-foreground">
                            {t('hall_of_fame_desc')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[350px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">{t('hall_of_fame_title')}</h1>
                    <p className="mt-2 max-w-2xl mx-auto text-lg text-foreground">
                        {t('hall_of_fame_desc')}
                    </p>
                </div>
                
                 <div className="flex justify-end mb-8">
                    <Button onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} variant="outline" disabled={!isPasswordLoaded}>
                        {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </Button>
                </div>
                
                {seasonRecords && seasonRecords.length > 0 ? (
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
                ): (
                    <div className="text-center border-2 border-dashed border-primary/50 rounded-lg p-12 bg-card shadow-lg shadow-primary/10">
                        <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
                        <h2 className="text-2xl font-bold text-primary">{t('hall_of_fame_empty_title')}</h2>
                        <p className="mt-2 text-foreground">
                            {t('hall_of_fame_empty_desc')}
                        </p>
                    </div>
                )}
            </div>
            
            {/* Password Dialog */}
            <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin_auth')}</DialogTitle>
                        <DialogDescription>{t('admin_auth_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password-input" className="text-right">
                            {t('password')}
                            </Label>
                            <Input
                            id="password-input"
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="col-span-3"
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handlePasswordCheck}>{t('unlock')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingRecord} onOpenChange={(isOpen) => !isOpen && setDeletingRecord(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('delete_record_confirm_desc', { defaultValue: `Ini akan menghapus catatan untuk '${deletingRecord?.seasonName}' secara permanen. Tindakan ini tidak dapat dibatalkan.`, seasonName: deletingRecord?.seasonName })}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {t('delete')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
