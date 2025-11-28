'use client';

import { useMemo } from 'react';
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

interface PasswordManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const baseFormSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string(),
});

export function PasswordManager({ open, onOpenChange }: PasswordManagerProps) {
  const { toast } = useToast();
  const { password: currentPassword, updatePassword } = useSharedPassword();
  const { t } = useTranslation();

  const formSchema = useMemo(() => {
    return baseFormSchema.extend({
        oldPassword: z.string().min(1, { message: t('current_password_required') }),
        newPassword: z.string().min(6, { message: t('password_min_length') }),
    }).refine(data => data.newPassword === data.confirmPassword, {
      message: t('passwords_do_not_match'),
      path: ['confirmPassword'],
    })
    .refine(data => data.oldPassword === currentPassword, {
        message: t('incorrect_current_password'),
        path: ['oldPassword'],
    });
  }, [currentPassword, t]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!currentPassword) {
         toast({
            variant: 'destructive',
            title: t('error'),
            description: "Cannot change password, old password not loaded.",
        });
        return;
    }
    const success = updatePassword(values.newPassword);
    if (success) {
      toast({
        title: t('password_updated_title'),
        description: t('password_updated_desc'),
      });
      form.reset();
      onOpenChange(false);
    } else {
        toast({
            variant: 'destructive',
            title: t('error'),
            description: t('password_update_error'),
        })
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manage_admin_password')}</DialogTitle>
          <DialogDescription>
            {t('manage_admin_password_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('current_password')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('new_password')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirm_new_password')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
