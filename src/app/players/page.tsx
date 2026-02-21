
'use client';

import { useState } from 'react';
import { PlayerList } from '@/components/player-list';
import { PlayerForm } from '@/components/player-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Lock, Unlock, Users, LayoutGrid, Zap } from 'lucide-react';
import type { Player, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { Badge } from '@/components/ui/badge';
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
  }

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPlayer(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
       {/* Background decorative glows */}
       <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-white/10 pb-10">
            <div className="text-center md:text-left space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Users className="w-6 h-6" />
                    </div>
                    <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-tighter text-primary uppercase italic">
                        {t('players_page_title')}
                    </h1>
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-lg">
                  {t('players_page_subtitle', { defaultValue: "Daftar elit pemain profesional Engineering EightyEight."})}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {isAdmin && (
                    <Button onClick={handleAdd} className="h-12 px-6 font-black tracking-tighter text-lg gap-2 shadow-[0_0_20px_rgba(204,253,1,0.2)]">
                        <PlusCircle className="w-5 h-5" />
                        {t('add_new_player')}
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
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Registered Elite Athletes</h2>
            </div>
            <PlayerList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{editingPlayer ? t('edit_player_title') : t('add_new_player')}</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                {editingPlayer ? t('edit_player_desc', { playerName: editingPlayer.name }) : t('add_player_desc')}
                </DialogDescription>
            </DialogHeader>
            <PlayerForm player={editingPlayer} onSave={handleDialogClose} />
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
