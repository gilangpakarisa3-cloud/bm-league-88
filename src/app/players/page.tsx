
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
import { PlusCircle, Lock, Unlock } from 'lucide-react';
import type { Player, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

const ADMIN_PASSWORD = '123123';

export default function PlayersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<WithId<Player> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const handlePasswordCheck = () => {
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
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            {t('players_page_title')}
            </h1>
             <div className="flex gap-2">
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('add_new_player')}
                </Button>
                 <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline">
                    {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
                    {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                </Button>
            </div>
        </div>
        <PlayerList onEdit={handleEdit} isAdmin={isAdmin} withAdminCheck={withAdminCheck} />

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingPlayer ? t('edit_player_title') : t('add_new_player')}</DialogTitle>
                <DialogDescription>
                {editingPlayer ? t('edit_player_desc', { playerName: editingPlayer.name }) : t('add_player_desc')}
                </DialogDescription>
            </DialogHeader>
            <PlayerForm player={editingPlayer} onSave={handleDialogClose} />
            </DialogContent>
        </Dialog>

        <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
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

      </div>
    </div>
  );
}
