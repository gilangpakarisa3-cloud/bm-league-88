
'use client';

import { useState } from 'react';
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
import { usePassword } from '@/hooks/use-password';
import { useTranslation } from '@/hooks/use-translation';

interface PasswordManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordManager({ open, onOpenChange }: PasswordManagerProps) {
  const { toast } = useToast();
  const { password: currentPassword, updatePassword } = usePassword();
  const { t } = useTranslation();

  const formSchema = z.object({
      oldPassword: z.string().min(1, { message: t('current_password_required', { defaultValue: "Current password is required."}) }),
      newPassword: z.string().min(6, { message: t('password_min_length', { defaultValue: "Password must be at least 6 characters."}) }),
      confirmPassword: z.string(),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: t('passwords_do_not_match', { defaultValue: "Passwords don't match"}),
      path: ['confirmPassword'],
    })
    .refine(data => data.oldPassword === currentPassword, {
        message: t('incorrect_current_password', { defaultValue: "Incorrect current password" }),
        path: ['oldPassword'],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const success = updatePassword(values.newPassword);
    if (success) {
      toast({
        title: t('password_updated_title', { defaultValue: "Password Updated" }),
        description: t('password_updated_desc', { defaultValue: "Your admin password has been changed successfully." }),
      });
      form.reset();
      onOpenChange(false);
    } else {
        toast({
            variant: 'destructive',
            title: t('error'),
            description: t('password_update_error', { defaultValue: "Failed to update password." }),
        })
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manage_admin_password', { defaultValue: "Manage Admin Password" })}</DialogTitle>
          <DialogDescription>
            {t('manage_admin_password_desc', { defaultValue: "Change your admin password here. This will be stored locally in your browser." })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('current_password', { defaultValue: "Current Password" })}</FormLabel>
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
                  <FormLabel>{t('new_password', { defaultValue: "New Password" })}</FormLabel>
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
                  <FormLabel>{t('confirm_new_password', { defaultValue: "Confirm New Password" })}</FormLabel>
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
