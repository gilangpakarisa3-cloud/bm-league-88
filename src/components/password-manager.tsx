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
    // This check is slightly redundant due to the form validation, but it's good practice.
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
        })
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manage_admin_password')}</DialogTitle>
          <DialogDescription>
            {isInitialSetup 
              ? t('set_initial_password_desc', {defaultValue: "It looks like this is the first time setting up an admin password. Create one now."})
              : t('manage_admin_password_desc')
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isInitialSetup && (
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('current_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
              <Button type="submit" disabled={!isLoaded}>{isInitialSetup ? t('set_password', {defaultValue: 'Set Password'}) : t('save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
