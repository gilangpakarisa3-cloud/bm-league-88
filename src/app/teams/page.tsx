'use client';

import { useState } from 'react';
import { TeamList } from '@/components/team-list';
import { TeamForm } from '@/components/team-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Lock, Unlock, Shield, LayoutGrid } from 'lucide-react';
import type { Team, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { cn } from '@/lib/utils';


export default function TeamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<WithId<Team> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdmin(true);
        if (passwordPrompt.action) {
            passwordPrompt.action();
        }
        toast({ title: t('admin_mode_unlocked_title') });
    } else {
        toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  };

  const withAdminCheck = (action: () => void) => {
    if (isAdmin) {
        action();
    } else {
        setPasswordPrompt({ open: true, action });
    }
  };

  const handleEdit = (team: WithId<Team>) => {
    withAdminCheck(() => {
      setEditingTeam(team);
      setDialogOpen(true);
    });
  };
  
  const handleAdd = () => {
    withAdminCheck(() => {
      setEditingTeam(null);
      setDialogOpen(true);
    });
  }

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTeam(null);
  };


  return (
    <div className="container mx-auto px-4 py-8 relative">
       {/* Background decorative glows */}
       <div className="absolute top-0 left-0 -z-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute top-1/2 right-0 -z-10 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-white/10 pb-10">
            <div className="text-center md:text-left space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-tighter text-primary uppercase italic">
                        {t('teams_page_title')}
                    </h1>
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-lg">
                  {t('teams_page_subtitle', { defaultValue: "Arsip resmi klub elit Engineering EightyEight."})}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {isAdmin && (
                  <Button onClick={handleAdd} className="h-12 px-6 font-black tracking-tighter text-lg gap-2 shadow-[0_0_20px_rgba(204,253,1,0.2)]">
                      <PlusCircle className="w-5 h-5" />
                      {t('add_new_team')}
                  </Button>
                )}
                 <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} 
                    variant="outline" 
                    disabled={!isPasswordLoaded}
                    className={cn(
                        "h-12 px-6 font-black tracking-widest text-xs uppercase transition-all duration-500",
                        isAdmin ? "bg-primary/10 text-primary border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.15)]" : "border-white/20"
                    )}
                >
                    {isAdmin ? <Unlock className="mr-2 w-4 h-4" /> : <Lock className="mr-2 w-4 h-4" />}
                    {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                </Button>
            </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Authorized Club Members</h2>
            </div>
            <TeamList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{editingTeam ? t('edit_team_title') : t('add_new_team')}</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                {editingTeam ? t('edit_team_desc', { teamName: editingTeam.name}) : t('add_team_desc')}
                </DialogDescription>
            </DialogHeader>
            <TeamForm team={editingTeam} onSave={handleDialogClose} />
            </DialogContent>
        </Dialog>

        <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
            <DialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{t('admin_auth')}</DialogTitle>
                    <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password-input" className="text-right text-[10px] font-black uppercase tracking-widest">
                    {t('password')}
                    </Label>
                    <Input
                    id="password-input"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="col-span-3 h-12 bg-white/5 border-white/10"
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                    />
                </div>
                </div>
                <DialogFooter>
                <Button onClick={handlePasswordCheck} className="w-full h-12 font-black tracking-tighter">{t('unlock')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
