'use client';

import { useState } from 'react';
import { PlayerList } from '@/components/player-list';
import { PlayerForm } from '@/components/player-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Lock, Unlock, Users, KeyRound, Scan, Flame, ShieldAlert, Cpu } from 'lucide-react';
import type { Player, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { cn } from '@/lib/utils';

export default function PlayersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<WithId<Player> | null>(null);
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
  
  const handleEdit = (player: WithId<Player>) => {
    withAdminCheck(() => {
      setEditingPlayer(player);
      setDialogOpen(true);
    });
  };
  
  const handleAdd = () => {
    withAdminCheck(() => {
      setEditingPlayer(null);
      setDialogOpen(true);
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPlayer(null);
  };

  return (
    <div className="max-w-[94rem] mx-auto px-2 sm:px-6 py-8 relative">
      {/* Dynamic Background Atmospheric Lasers */}
      <div className="absolute top-0 right-10 -z-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Cockpit Hero Header */}
        <div className="relative group/header overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-6 sm:p-10 aero-card">
          {/* Neon side laser bar */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-primary via-primary/80 to-primary/30 rounded-l-[2.5rem] shadow-[0_0_35px_rgba(204,253,1,0.9)]" />
          
          {/* Subtle Cyber Grid Overlay */}
          <div className="absolute inset-0 cyber-grid-overlay opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/30 shadow-[0_0_15px_rgba(204,253,1,0.2)]">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-primary italic">
                    ELITE ROSTER DATABASE // FIFA SQUAD HUB
                  </span>
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                </div>
              </div>

              <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                {t('players_page_title').split(' ')[0]}{' '}
                <span className="text-primary drop-shadow-[0_0_25px_rgba(204,253,1,0.5)]">
                  {t('players_page_title').split(' ').slice(1).join(' ') || 'ATHLETES'}
                </span>
              </h1>

              <p className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-[0.2em] max-w-xl leading-relaxed">
                {t('players_page_subtitle', { defaultValue: "Daftar atlet elit profesional Engineering EightyEight dengan sistem penilaian OVR dan statistik performa real-time."})}
              </p>
            </div>

            {/* Action Suite */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {isAdmin && (
                <Button 
                  onClick={handleAdd} 
                  className="h-12 sm:h-14 px-7 font-black tracking-tight text-xs uppercase rounded-full gap-2 shadow-[0_0_30px_rgba(204,253,1,0.4)] bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  {t('add_new_player')}
                </Button>
              )}

              <Button 
                onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} 
                variant="outline" 
                disabled={!isPasswordLoaded}
                className={cn(
                  "h-12 sm:h-14 px-7 font-black tracking-widest text-xs uppercase rounded-full transition-all duration-500 relative overflow-hidden group/admin border",
                  isAdmin 
                    ? "bg-primary text-black border-primary shadow-[0_0_25px_rgba(204,253,1,0.4)]" 
                    : "bg-white/5 text-white/50 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
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

        {/* Player List Component */}
        <PlayerList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />

        {/* Add / Edit Player Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="border border-primary/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_80px_rgba(204,253,1,0.2)] p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase italic text-white">
                {editingPlayer ? t('edit_player_title') : t('add_new_player')}
              </DialogTitle>
              <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px]">
                {editingPlayer ? t('edit_player_desc', { playerName: editingPlayer.name }) : t('add_player_desc')}
              </DialogDescription>
            </DialogHeader>
            <PlayerForm player={editingPlayer} onSave={handleDialogClose} />
          </DialogContent>
        </Dialog>

        {/* Admin Authentication Dialog */}
        <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border border-primary/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.25)] p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-4 text-primary mb-1">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(204,253,1,0.2)]">
                  <KeyRound className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase italic leading-none text-white">
                    {t('admin_auth')}
                  </DialogTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70 mt-1">
                    Status: Restricted_Access
                  </p>
                </div>
              </div>
              <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px] text-left border-l-2 border-primary/40 pl-3.5">
                {t('admin_auth_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 ml-1 italic">
                  ENCRYPTED_KEY_TRANSMISSION
                </Label>
                <div className="relative group/input">
                  <Input 
                    id="password-input" 
                    type="password" 
                    value={passwordInput} 
                    onChange={(e) => setPasswordInput(e.target.value)} 
                    className="h-14 bg-black/70 border-white/10 rounded-2xl focus:border-primary/60 text-xl font-black tracking-[0.25em] text-primary px-5" 
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePasswordCheck} 
              className="w-full h-14 font-black tracking-[0.25em] text-sm uppercase italic rounded-2xl shadow-xl shadow-primary/25 text-black bg-primary hover:bg-primary/90 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
              <Scan className="w-4 h-4" />
              {t('unlock')}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
