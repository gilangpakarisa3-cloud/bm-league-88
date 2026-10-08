'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Unlock } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface AdminAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  onAuthorize: () => void;
}

export const AdminAuthDialog = ({
  open,
  onOpenChange,
  passwordInput,
  setPasswordInput,
  onAuthorize
}: AdminAuthDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-primary/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.3)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />
        
        <div className="p-6 sm:p-7 space-y-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.3)] shrink-0">
                <KeyRound className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                  {t('admin_auth')}
                </DialogTitle>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                  SECURITY_PROTOCOL // LEVEL_4_ACCESS
                </p>
              </div>
            </div>
            <DialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
              {t('admin_auth_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="password-input" className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 font-mono">
              ENCRYPTED_SECURITY_KEY
            </Label>
            <div className="relative group/input">
              <Input 
                id="password-input" 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                placeholder="••••••••"
                className="h-13 bg-black/60 border border-white/10 group-hover/input:border-primary/40 focus:border-primary rounded-2xl text-xl font-mono font-black text-primary px-4 tracking-[0.3em] transition-all shadow-inner" 
                onKeyDown={(e) => e.key === 'Enter' && onAuthorize()} 
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col pt-1">
            <Button 
              onClick={onAuthorize} 
              className="w-full h-12 font-headline font-black tracking-wider text-xs uppercase italic rounded-2xl shadow-[0_0_30px_rgba(204,253,1,0.45)] text-black bg-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>AUTHORIZE PROTOCOL // BUKA ADMIN</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
