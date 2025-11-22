
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  shareText: string;
}

export function ShareDialog({ open, onOpenChange, title, shareText }: ShareDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    toast({
      title: t('copied_to_clipboard_title'),
      description: t('copied_to_clipboard_desc'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t('share_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            value={shareText}
            readOnly
            className="h-48 text-sm bg-muted/50"
            aria-label={t('participant_list_label')}
          />
          <Button onClick={handleCopy} className="w-full">
            <Copy className="mr-2 h-4 w-4" />
            {t('copy_to_clipboard')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
