
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Notice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, Info, X, Plus, Trash2, ShieldCheck, Zap, BellRing, Settings2, ScrollText, Calendar, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { cn } from '@/lib/utils';


const NOTICE_ID = 'main';


const DEFAULT_NOTICE: Notice = {
  rules: [],
  schedule: ""
};

export function EditableNotice() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

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
    if (noticeData) {
        setEditableRules(noticeData.rules);
        setEditableSchedule(noticeData.schedule);
    } else {
        setEditableRules(DEFAULT_NOTICE.rules);
        setEditableSchedule(DEFAULT_NOTICE.schedule);
    }
  }

  if (isLoading || !isPasswordLoaded) {
    return <NoticeSkeleton />;
  }

  const displayRules = isEditing ? editableRules : (noticeData?.rules ?? []);
  const displaySchedule = isEditing ? editableSchedule : (noticeData?.schedule ?? '');

  return (
    <>
      <div className="bg-card/40 border-2 border-white/5 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden relative backdrop-blur-xl group/notice">
        {/* HUD Decoration Corner */}
        <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-primary/30 rounded-tl-2xl sm:rounded-tl-3xl pointer-events-none group-hover/notice:border-primary transition-colors duration-500" />
        
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          {isEditing ? (
            <div className="flex gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest h-8 sm:h-9 bg-black/40 border-white/10 px-2 sm:px-3">
                <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest h-8 sm:h-9 shadow-lg shadow-primary/20 px-2 sm:px-3">
                <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPasswordPromptOpen(true)} className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest h-8 sm:h-9 bg-black/40 border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all px-2 sm:px-3">
                <Settings2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-2" />
                <span className="hidden xs:inline">{t('edit_notice')}</span>
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-[240px_1fr]">
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
            {/* Background Icon */}
            <BellRing className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-24 h-24 sm:w-32 sm:h-32 text-white/[0.02] -rotate-12 pointer-events-none" />
            
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg sm:blur-xl animate-pulse" />
                <div className="bg-primary/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-primary/20 text-primary relative z-10">
                    <ScrollText className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 relative z-10">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter pr-1 sm:pr-2">{t('notice')}</h2>
                <p className="text-[8px] sm:text-[10px] font-black text-primary/60 uppercase tracking-[0.15em] sm:tracking-[0.2em]">Tactical Briefing</p>
            </div>
          </div>

          <div className="p-6 sm:p-10 relative">
            {isEditing ? (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-2 sm:space-y-3">
                      <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">Tournament Regulations</Label>
                      <div className="space-y-2">
                        {displayRules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2 group/input">
                                <Input
                                    type="text"
                                    value={rule}
                                    onChange={(e) => handleRuleChange(index, e.target.value)}
                                    className="flex-grow bg-black/40 border-white/10 focus:border-primary/50 font-bold text-xs sm:text-sm"
                                    placeholder={t('enter_a_rule')}
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)} className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-red-500/10 text-white/20 hover:text-red-500 border border-white/5 transition-all">
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddRule} className="w-full font-black text-[8px] sm:text-[10px] uppercase tracking-widest border-dashed border-white/10 hover:border-primary/50 transition-all bg-white/5 h-8 sm:h-10">
                          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5"/> {t('add_rule')}
                      </Button>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">Match Schedule Text</Label>
                    <Textarea
                        value={displaySchedule}
                        onChange={(e) => setEditableSchedule(e.target.value)}
                        className="bg-black/40 border-white/10 focus:border-primary/50 font-bold text-xs sm:text-sm min-h-[100px] sm:min-h-[120px]"
                        placeholder={t('enter_schedule')}
                    />
                  </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-700">
                <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40">Official Guidelines</span>
                    </div>
                    <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm font-bold text-white/80 leading-relaxed pl-1 sm:pl-2">
                    {displayRules.length > 0 ? (
                        displayRules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2.5 sm:gap-3 group/item">
                            <div className="mt-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(204,253,1,0.6)] group-hover/item:scale-125 transition-transform shrink-0" />
                            <span className="flex-1">{rule}</span>
                        </li>
                        ))
                    ) : (
                        <p className="text-white/20 italic font-black uppercase tracking-widest text-[10px] sm:text-xs py-4">{t('no_rules_added')}</p>
                    )}
                    </ul>
                </div>

                <div className="relative group/sched">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl sm:rounded-2xl blur opacity-0 group-hover/sched:opacity-100 transition duration-1000" />
                    <div className="relative bg-primary text-black p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 overflow-hidden">
                        {/* Decorative Pattern */}
                        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-black/[0.05] -mr-6 -mt-6 sm:-mr-8 sm:-mt-8 rounded-full pointer-events-none" />
                        
                        <div className="bg-black/10 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-black/5 shrink-0">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 text-center">
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.2em] opacity-60 mb-0.5 sm:mb-1">Time & Venue Briefing</p>
                            <div className="text-[11px] sm:text-sm font-black uppercase italic leading-tight text-center">
                                {displaySchedule ? displaySchedule : t('no_schedule_set')}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-2xl rounded-none shadow-[0_0_50px_rgba(204,253,1,0.2)]">
            <DialogHeader>
                <div className="flex items-center gap-4 text-primary mb-2">
                    <KeyRound className="w-8 h-8" />
                    <DialogTitle className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-primary">{t('admin_auth')}</DialogTitle>
                </div>
                <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{t('enter_admin_password_notice')}</DialogDescription>
            </DialogHeader>
             <div className="grid gap-4 sm:gap-6 py-4 sm:py-6">
              <div className="space-y-2">
                <Label htmlFor="password-input" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">
                  {t('password')}
                </Label>
                <Input
                  id="password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="h-12 sm:h-14 bg-white/5 border-white/10 rounded-none focus:border-primary/50 font-black text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black uppercase tracking-widest italic shadow-xl shadow-primary/20 text-xs sm:text-sm rounded-none">{t('submit')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NoticeSkeleton() {
  return (
    <div className="bg-card/40 border-2 border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden animate-pulse">
      <div className="grid md:grid-cols-[240px_1fr]">
        <div className="p-6 sm:p-10 bg-black/20 flex flex-col items-center gap-4">
          <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl" />
          <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
        </div>
        <div className="p-6 sm:p-10 space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-3 sm:h-4 w-full opacity-20" />
            ))}
          </div>
          <Skeleton className="h-16 sm:h-20 w-full opacity-40 rounded-xl sm:rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
