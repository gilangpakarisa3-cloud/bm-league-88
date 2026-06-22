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
import { PlusCircle, Lock, Unlock, Shield, LayoutGrid, KeyRound, Scan, Zap, Activity, Binary } from 'lucide-react';
import type { Team, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';


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
    <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-8 relative">
       {/* Background decorative glows */}
       <div className="absolute top-0 left-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute top-1/2 right-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 sm:gap-10 min-h-[140px] sm:min-h-[190px]">
          <div className="flex flex-col justify-center space-y-4 flex-1 w-full py-8 sm:py-10 px-8 sm:px-12 relative group/header overflow-hidden bg-black/60 backdrop-blur-3xl border-b-4 border-primary/20 rounded-none shadow-[0_20px_80px_rgba(0,0,0,0.8)] transition-all duration-500">
            {/* HUD Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
                <div className="w-full h-[2px] bg-primary blur-[1px] absolute top-0 left-0 animate-scanning" />
            </div>
            
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-primary italic">Strategic Asset Registry</span>
                    </div>
                    
                    <h1 className="font-headline text-4xl sm:text-8xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] leading-none">
                        {t('teams_page_title')} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">ARCHIVE</span>
                    </h1>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-none border-l-4 border-primary shadow-xl">
                        <Binary className="w-4 h-4 text-primary/60" />
                        <p className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-[0.2em] italic">
                          {t('teams_page_subtitle', { defaultValue: "Arsip resmi klub elit Engineering EightyEight."})}
                        </p>
                    </div>
                </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0"><LiveClock /></div>
        </div>

        <div className={cn(
            "relative bg-black/60 border-b-4 border-white/10 p-2 sm:p-3 flex flex-wrap items-center gap-4 shadow-[0_10px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 overflow-hidden",
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/40 pointer-events-none" />

            <div className="flex items-center gap-2 w-full sm:w-auto relative group/select">
                <div className="p-3 bg-primary/10 text-primary hidden xs:block shadow-lg -skew-x-[12deg] border-r-2 border-primary/30">
                    <Scan className="w-4 h-4 skew-x-[12deg]" />
                </div>
                <div className="px-6 py-2 bg-white/5 border border-white/10 -skew-x-[12deg] flex items-center justify-center min-w-[200px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 skew-x-[12deg] italic">Authorized Club Members</span>
                </div>
            </div>

            <div className={cn("flex items-center gap-1", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                {isAdmin && (
                    <Button 
                        onClick={handleAdd} 
                        className="h-12 px-8 font-black text-[10px] uppercase tracking-widest italic rounded-none -skew-x-[12deg] border-r-4 border-black/20 bg-primary text-black shadow-[0_0_30px_rgba(204,253,1,0.2)] hover:scale-105 transition-transform"
                    >
                        <div className="skew-x-[12deg] flex items-center relative z-10">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('add_new_team')}
                        </div>
                    </Button>
                )}
                
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} 
                    className={cn(
                        "h-12 px-8 font-black text-[10px] uppercase tracking-widest italic rounded-none -skew-x-[12deg] border-r-4 transition-all duration-500 relative overflow-hidden group/admin", 
                        isAdmin 
                            ? "bg-primary text-black border-black shadow-[0_0_30px_rgba(204,253,1,0.4)]" 
                            : "bg-primary text-black border-primary/20 hover:bg-primary shadow-[0_0_20px_rgba(204,253,1,0.2)]"
                    )}
                    disabled={!isPasswordLoaded}
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={cn(
                            "w-full h-[2px] bg-current absolute top-0 left-0 transition-opacity duration-500",
                            isAdmin ? "animate-scanning opacity-20" : "opacity-0"
                        )} />
                    </div>

                    <div className="skew-x-[12deg] flex items-center relative z-10 text-black">
                        {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        <div className="space-y-8 px-2 sm:px-0">
            <div className="flex flex-col gap-1 items-center justify-center">
                <div className="flex items-center gap-4">
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-primary/40" />
                    <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.4em] sm:tracking-[0.6em] flex items-center justify-center gap-3 italic pr-4">
                        <Zap className="w-4 h-4 text-primary animate-pulse"/> VERIFIED STRATEGIC UNITS
                    </h2>
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-primary/40" />
                </div>
            </div>
            
            <TeamList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="max-w-xl border-primary border-4 p-0 overflow-hidden bg-background/95 rounded-3xl shadow-2xl transition-all">
                <DialogHeader className="p-6 border-b border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <Shield className="w-6 h-6" />
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">
                            {editingTeam ? t('edit_team_title') : t('add_new_team')}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {editingTeam ? t('edit_team_desc', { teamName: editingTeam.name}) : t('add_team_desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6">
                    <TeamForm team={editingTeam} onSave={handleDialogClose} />
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
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
                    <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20 text-black">{t('unlock')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}