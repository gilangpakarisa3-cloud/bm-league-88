
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Notice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, Info, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { useTranslation } from '@/hooks/use-translation';


const NOTICE_ID = 'main';
const ADMIN_PASSWORD = 'Office88';

const DEFAULT_NOTICE: Notice = {
  rules: [],
  schedule: ""
};

export function EditableNotice() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const noticeRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'notices', NOTICE_ID) : null),
    [firestore]
  );
  
  const { data: noticeData, isLoading } = useDoc<Notice>(noticeRef);

  const [isEditing, setIsEditing] = useState(false);
  const [editableRules, setEditableRules] = useState<string[]>([]);
  const [editableSchedule, setEditableSchedule] = useState<string>('');
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

   useEffect(() => {
    // Sync local state only when Firestore data changes or when editing is cancelled.
    if (noticeData) {
      setEditableRules(noticeData.rules);
      setEditableSchedule(noticeData.schedule);
    } else {
      setEditableRules(DEFAULT_NOTICE.rules);
      setEditableSchedule(DEFAULT_NOTICE.schedule);
    }
  }, [noticeData]);
  
  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
        setIsEditing(true);
        setPasswordPromptOpen(false);
        setPasswordInput('');
        // When entering edit mode, ensure we're editing the latest data
        if (noticeData) {
          setEditableRules(noticeData.rules);
          setEditableSchedule(noticeData.schedule);
        }
    } else {
        toast({
            variant: "destructive",
            title: t('incorrect_password'),
        });
    }
  };
  
  const handleSave = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'notices', NOTICE_ID);
    
    const noticeToSave: Notice = {
        rules: editableRules.filter(rule => rule.trim() !== ''),
        schedule: editableSchedule,
    };
    
    setDocumentNonBlocking(docRef, noticeToSave, { merge: true });
    setIsEditing(false);
    toast({
      title: t('notice_updated_title'),
      description: t('notice_updated_desc'),
    });
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...editableRules];
    newRules[index] = value;
    setEditableRules(newRules);
  };

  const handleAddRule = () => {
    setEditableRules([...editableRules, '']);
  }

  const handleRemoveRule = (index: number) => {
    const newRules = editableRules.filter((_, i) => i !== index);
    setEditableRules(newRules);
  }

  const handleCancel = () => {
    setIsEditing(false);
    // Revert to the last saved data from Firestore
    if (noticeData) {
        setEditableRules(noticeData.rules);
        setEditableSchedule(noticeData.schedule);
    } else {
        setEditableRules(DEFAULT_NOTICE.rules);
        setEditableSchedule(DEFAULT_NOTICE.schedule);
    }
  }

  if (isLoading) {
    return <NoticeSkeleton />;
  }

  const displayRules = isEditing ? editableRules : (noticeData?.rules ?? []);
  const displaySchedule = isEditing ? editableSchedule : (noticeData?.schedule ?? '');

  return (
    <>
      <div className="bg-card border-2 border-primary shadow-lg shadow-primary/20 rounded-lg overflow-hidden relative">
        <div className="absolute top-2 right-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> {t('cancel')}
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPasswordPromptOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> {t('edit_notice')}
            </Button>
          )}
        </div>
        <div className="grid md:grid-cols-[200px_1fr]">
          <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <Info className="w-10 h-10 text-primary" />
            <h2 className="text-xl font-bold text-primary">{t('notice')}</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                  <div className="space-y-2">
                      {displayRules.map((rule, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <Input
                                  type="text"
                                  value={rule}
                                  onChange={(e) => handleRuleChange(index, e.target.value)}
                                  className="flex-grow"
                                  placeholder={t('enter_a_rule')}
                              />
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={handleAddRule}>
                          <Plus className="mr-2 h-4 w-4"/> {t('add_rule')}
                      </Button>
                  </div>
                <Textarea
                  value={displaySchedule}
                  onChange={(e) => setEditableSchedule(e.target.value)}
                  className="text-center bg-muted/20"
                  rows={4}
                  placeholder={t('enter_schedule')}
                />
              </div>
            ) : (
              <>
                <ul className="space-y-2 text-sm text-foreground list-disc pl-5 mb-6 min-h-[50px]">
                  {displayRules.length > 0 ? (
                    displayRules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic list-none">{t('no_rules_added')}</p>
                  )}
                </ul>
                <div className="text-center bg-primary/80 text-primary-foreground p-4 rounded-md text-sm font-semibold min-h-[50px]">
                  {displaySchedule ? displaySchedule : <p className="italic">{t('no_schedule_set')}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('admin_auth')}</DialogTitle>
                <DialogDescription>{t('enter_admin_password_notice')}</DialogDescription>
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
              <Button onClick={handlePasswordCheck}>{t('submit')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NoticeSkeleton() {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="grid md:grid-cols-[200px_1fr]">
        <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

    

    
