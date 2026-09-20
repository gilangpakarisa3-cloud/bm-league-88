'use client';

import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSharedPassword } from '@/context/password-context';
import { useTranslation } from '@/hooks/use-translation';
import { KeyRound, ShieldCheck, Zap, Scan, Lock } from 'lucide-react';

interface PasswordManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const baseFormSchema = z.object({
    oldPassword: z.string().optional(),
    newPassword: z.string().min(6),
    confirmPassword: z.string(),
});

export function PasswordManager({ open, onOpenChange }: PasswordManagerProps) {
  const { toast } = useToast();
  const { password: currentPassword, updatePassword, isLoaded } = useSharedPassword();
  const { t } = useTranslation();

  const isInitialSetup = isLoaded && !currentPassword;

  const formSchema = useMemo(() => {
    return baseFormSchema.extend({
        newPassword: z.string().min(6, { message: t('password_min_length') }),
    }).refine(data => data.newPassword === data.confirmPassword, {
      message: t('passwords_do_not_match'),
      path: ['confirmPassword'],
    })
    .refine(data => {
        if (!isInitialSetup) {
            return data.oldPassword === currentPassword;
        }
        return true;
    }, {
        message: t('incorrect_current_password'),
        path: ['oldPassword'],
    });
  }, [currentPassword, t, isInitialSetup]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
      form.reset();
  }, [open, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isInitialSetup && values.oldPassword !== currentPassword) {
         toast({
            variant: 'destructive',
            title: t('error'),
            description: t('incorrect_current_password'),
        });
        return;
    }
    const success = updatePassword(values.newPassword);
    if (success) {
      toast({
        title: isInitialSetup ? t('password_set_title', {defaultValue: 'Password Set!'}) : t('password_updated_title'),
        description: isInitialSetup ? t('password_set_desc', {defaultValue: 'Your admin password has been set.'}) : t('password_updated_desc'),
      });
      form.reset();
      onOpenChange(false);
    } else {
        toast({
            variant: 'destructive',
            title: t('error'),
            description: t('password_update_error'),
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-2 border-cyan-500/40 bg-[#0B0F19]/98 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.25)] text-white">
        {/* Cyan Top Laser Accent */}
        <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400">
              <KeyRound className="w-7 h-7" />
            </div>
            <div className="text-left min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase italic font-headline text-white leading-none">
                {t('manage_admin_password')}
              </DialogTitle>
              <p className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-cyan-400/80 mt-1">
                CIPHER_SECURITY_ROTATION // V2.5
              </p>
            </div>
          </div>
          <DialogDescription className="font-mono text-white/50 text-xs leading-relaxed text-left border-l-2 border-cyan-500/40 pl-3">
            {isInitialSetup 
              ? t('set_initial_password_desc', {defaultValue: "Inisialisasi kata sandi administrator pusat untuk memproteksi seluruh kontrol liga."})
              : t('manage_admin_password_desc')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {!isInitialSetup && (
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 text-left">
                    <FormLabel className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-cyan-400">
                      CURRENT_CIPHER_KEY
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="••••••••"
                        className="h-12 bg-black/60 border-white/10 rounded-2xl focus:border-cyan-400 text-sm font-mono font-bold text-white px-4" 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400 font-mono" />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5 text-left">
                  <FormLabel className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-cyan-400">
                    NEW_CIPHER_KEY (MIN 6 CHARS)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      placeholder="••••••••"
                      className="h-12 bg-black/60 border-white/10 rounded-2xl focus:border-cyan-400 text-sm font-mono font-bold text-white px-4" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400 font-mono" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5 text-left">
                  <FormLabel className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-cyan-400">
                    CONFIRM_NEW_CIPHER_KEY
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      placeholder="••••••••"
                      className="h-12 bg-black/60 border-white/10 rounded-2xl focus:border-cyan-400 text-sm font-mono font-bold text-white px-4" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400 font-mono" />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-3">
              <Button 
                type="submit" 
                disabled={!isLoaded} 
                className="w-full h-13 font-black tracking-widest text-xs uppercase italic font-headline rounded-2xl shadow-xl shadow-cyan-500/25 text-black bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 transition-all flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" />
                {isInitialSetup ? t('set_password', {defaultValue: 'Set Password'}) : t('save_changes')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

