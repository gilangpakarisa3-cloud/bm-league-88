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

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 sm:gap-6 min-h-[140px] sm:min-h-[180px]">
          <div className="flex flex-col justify-center space-y-3 sm:space-y-4 flex-1 w-full py-6 sm:py-10 px-4 sm:px-10 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-500">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-emerald-400 italic">
                                Strategic Asset Registry
                            </span>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight uppercase italic leading-[0.95] flex flex-wrap items-baseline gap-x-3 sm:gap-x-5">
                            <span className="inline-block pr-4 sm:pr-6 pb-1 headline-white-gradient">
                                {t('teams_page_title')}
                            </span>
                            <span className="inline-block pr-4 sm:pr-6 pb-1 text-emerald-400">
                                ARCHIVE
                            </span>
                        </h1>
                        <div className="h-[2px] w-36 sm:w-56 mt-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white/[0.04] px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-inner">
                        <Binary className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        <p className="text-[10px] sm:text-xs font-black text-white/70 uppercase tracking-[0.15em] sm:tracking-[0.2em] italic">
                          {t('teams_page_subtitle', { defaultValue: "Arsip resmi klub elit Engineering EightyEight."})}
                        </p>
                    </div>
                </div>
            </div>
          </div>
          <div className="w-full md:w-[380px] lg:w-[420px] flex items-stretch shrink-0"><LiveClock className="h-full" /></div>
        </div>

        {/* AERODYNAMIC CONTROLS BAR */}
        <div className={cn(
            "relative bg-black/60 border border-white/10 p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500 rounded-2xl sm:rounded-3xl",
            isAdmin ? "w-full" : "w-full sm:w-fit sm:mx-auto"
        )}>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto relative group/select">
                <div className="p-2 sm:p-3 bg-emerald-500/10 text-emerald-400 hidden xs:flex rounded-2xl border border-emerald-500/30 items-center justify-center">
                    <Scan className="w-4 h-4" />
                </div>
                <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center justify-center flex-1 sm:flex-initial sm:min-w-[200px]">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/70 italic">Authorized Club Members</span>
                </div>
            </div>

            <div className={cn("flex items-center gap-2", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                {isAdmin && (
                    <Button 
                        onClick={handleAdd} 
                        className="h-12 sm:h-14 px-7 font-black text-xs uppercase tracking-widest italic rounded-full bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-300 transition-all flex items-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        {t('add_new_team')}
                    </Button>
                )}
                
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} 
                    className={cn(
                        "h-12 sm:h-14 px-7 font-black text-xs uppercase tracking-widest italic rounded-full transition-all duration-500 relative overflow-hidden group/admin border", 
                        isAdmin 
                            ? "bg-primary text-black border-primary shadow-[0_0_25px_rgba(204,253,1,0.3)]" 
                            : "bg-white/5 text-white/50 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    )}
                    disabled={!isPasswordLoaded}
                >
                    <div className="flex items-center relative z-10">
                        {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        <div className="space-y-8 px-2 sm:px-0">
            <div className="flex flex-col gap-1 items-center justify-center">
                <div className="flex items-center gap-4">
                    <div className="h-0.5 w-12 sm:w-20 bg-gradient-to-r from-transparent to-primary/40 rounded-full" />
                    <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.4em] sm:tracking-[0.6em] flex items-center justify-center gap-3 italic pr-4">
                        <Zap className="w-4 h-4 text-primary animate-pulse"/> VERIFIED STRATEGIC UNITS
                    </h2>
                    <div className="h-0.5 w-12 sm:w-20 bg-gradient-to-l from-transparent to-primary/40 rounded-full" />
                </div>
            </div>
            
            <TeamList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="max-w-xl border border-primary/40 p-0 overflow-hidden bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_80px_rgba(204,253,1,0.15)] transition-all">
                <DialogHeader className="p-6 sm:p-8 border-b border-white/10 bg-black/40 shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/30">
                            <Shield className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase italic pr-4">
                            {editingTeam ? t('edit_team_title') : t('add_new_team')}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                        {editingTeam ? t('edit_team_desc', { teamName: editingTeam.name}) : t('add_team_desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 sm:p-8">
                    <TeamForm team={editingTeam} onSave={handleDialogClose} />
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
            <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border border-primary/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.2)] p-6 sm:p-8">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-4 text-primary mb-1">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/30">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase italic leading-none">{t('admin_auth')}</DialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70 mt-1">Status: Restricted_Access</p>
                        </div>
                    </div>
                    <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px] text-left border-l-2 border-white/10 pl-3.5">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                    <div className="space-y-2">
                        <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 ml-1 italic">ENCRYPTED_KEY_TRANSMISSION</Label>
                        <div className="relative group/input">
                            <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-14 bg-black/60 border-white/10 rounded-2xl focus:border-primary/50 text-xl font-black tracking-[0.25em] text-primary px-5" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePasswordCheck} className="w-full h-14 font-black tracking-[0.25em] text-base uppercase italic rounded-2xl shadow-xl shadow-primary/25 text-black bg-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-3">
                        <Scan className="w-5 h-5" />
                        {t('unlock')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}