'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Notice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, Info, X, Plus, Trash2, ShieldCheck, Zap, BellRing, Settings2, ScrollText, Calendar, KeyRound, Scan, Binary } from 'lucide-react';
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
      <div className="bg-black/40 border-2 border-white/5 shadow-2xl rounded-2xl sm:rounded-[2.5rem] overflow-hidden relative backdrop-blur-3xl group/notice">
        {/* HUD Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        
        {/* HUD Decoration Corner */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary/20 rounded-tl-2xl sm:rounded-tl-[2.5rem] pointer-events-none group-hover/notice:border-primary/40 transition-colors duration-700" />
        
        <div className="absolute top-4 right-4 z-30">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} className="font-black text-[10px] uppercase tracking-widest h-10 bg-black/60 border-white/10 px-4 -skew-x-[12deg] rounded-none">
                <span className="skew-x-[12deg] flex items-center"><X className="mr-2 h-4 w-4" /> {t('cancel')}</span>
              </Button>
              <Button size="sm" onClick={handleSave} className="font-black text-[10px] uppercase tracking-widest h-10 shadow-lg shadow-primary/20 px-4 -skew-x-[12deg] rounded-none border-r-4 border-black/20">
                <span className="skew-x-[12deg] flex items-center"><Save className="mr-2 h-4 w-4" /> {t('save')}</span>
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPasswordPromptOpen(true)} className="font-black text-[10px] uppercase tracking-widest h-10 bg-black/60 border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all px-4 -skew-x-[12deg] rounded-none group/edit">
                <span className="skew-x-[12deg] flex items-center">
                    <Settings2 className="h-4 w-4 mr-2 group-hover/edit:rotate-90 transition-transform duration-500" />
                    <span className="hidden xs:inline">{t('edit_notice')}</span>
                </span>
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-[280px_1fr] relative z-10">
          {/* Left Panel: Identity */}
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
            {/* Background Phantom Icon */}
            <BellRing className="absolute -bottom-6 -left-6 w-48 h-48 text-white/[0.02] -rotate-12 pointer-events-none" />
            
            <div className="relative mb-2">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="bg-primary/10 p-5 rounded-2xl border-2 border-primary/20 text-primary relative z-10 shadow-[0_0_30px_rgba(204,253,1,0.2)]">
                    <ScrollText className="w-10 h-10" />
                </div>
            </div>
            
            <div className="space-y-1 relative z-10">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter pr-2">{t('notice')}</h2>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em]">Tactical Briefing</p>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2 opacity-20">
                <Binary className="w-5 h-5 text-white" />
                <div className="h-px w-12 bg-white" />
            </div>
          </div>

          {/* Right Panel: Content */}
          <div className="p-8 sm:p-12 relative">
            {isEditing ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-4">
                      <div className="flex items-center gap-3">
                          <Scan className="w-4 h-4 text-primary" />
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic">Tournament Regulations Manifest</Label>
                      </div>
                      <div className="space-y-3">
                        {displayRules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-3 group/input">
                                <div className="h-10 w-1 flex-shrink-0 bg-primary/20 rounded-full" />
                                <Input
                                    type="text"
                                    value={rule}
                                    onChange={(e) => handleRuleChange(index, e.target.value)}
                                    className="flex-grow bg-black/40 border-white/10 focus:border-primary/50 font-bold text-sm h-12 rounded-xl"
                                    placeholder={t('enter_a_rule')}
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)} className="h-12 w-12 hover:bg-red-500/10 text-white/20 hover:text-red-500 border border-white/5 transition-all rounded-xl">
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddRule} className="w-full font-black text-[10px] uppercase tracking-widest border-dashed border-white/10 hover:border-primary/50 transition-all bg-white/5 h-12 rounded-xl">
                          <Plus className="mr-2 h-4 w-4"/> {t('add_rule')}
                      </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic">Match Schedule Transmission</Label>
                    </div>
                    <Textarea
                        value={displaySchedule}
                        onChange={(e) => setEditableSchedule(e.target.value)}
                        className="bg-black/40 border-white/10 focus:border-primary/50 font-bold text-sm min-h-[140px] rounded-2xl resize-none p-6"
                        placeholder={t('enter_schedule')}
                    />
                  </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-1000">
                <div className="space-y-6 mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-5 h-5 text-primary fill-primary animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Official Guidelines Manifest</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                    <ul className="grid grid-cols-1 gap-4 text-sm sm:text-base font-bold text-white/80 leading-relaxed">
                    {displayRules.length > 0 ? (
                        displayRules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-4 group/item p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-500 hover:translate-x-1">
                            <div className="mt-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_12px_rgba(204,253,1,0.8)] group-hover/item:scale-125 transition-transform shrink-0" />
                            <span className="flex-1 italic tracking-tight">{rule}</span>
                        </li>
                        ))
                    ) : (
                        <div className="text-center py-10 opacity-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <p className="font-black uppercase tracking-widest text-xs italic">{t('no_rules_added')}</p>
                        </div>
                    )}
                    </ul>
                </div>

                <div className="relative group/sched mt-auto">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl blur-xl opacity-0 group-hover/sched:opacity-100 transition duration-1000" />
                    
                    {/* Schedule Block - Super Sport Solid Style */}
                    <div className="relative overflow-hidden rounded-[2rem] border-2 border-primary/20 shadow-2xl">
                        {/* Header Banner */}
                        <div className="bg-primary px-8 py-3 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg ml-[-10px] w-[calc(100%+20px)]">
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                <Calendar className="w-5 h-5 text-black" />
                                <h3 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase italic text-black leading-none pr-2">Time & Venue Briefing</h3>
                            </div>
                            <Scan className="w-4 h-4 text-black/40 relative z-10 skew-x-[12deg]" />
                        </div>

                        <div className="bg-black/60 backdrop-blur-2xl p-8 sm:p-10 pt-12 flex flex-col sm:flex-row items-center gap-8 relative">
                            {/* Decorative Grid Overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none opacity-20" />
                            
                            <div className="flex-1 text-center sm:text-left relative z-10">
                                <div className="text-sm sm:text-lg font-black uppercase italic tracking-tight leading-relaxed text-white/90 whitespace-pre-wrap">
                                    {displaySchedule ? displaySchedule : t('no_schedule_set')}
                                </div>
                            </div>

                            <div className="shrink-0 relative z-10">
                                <div className="p-6 rounded-full bg-primary/10 border-4 border-primary/20 shadow-[0_0_40px_rgba(204,253,1,0.15)] group-hover/sched:scale-110 transition-transform duration-700">
                                    <Zap className="w-10 h-10 text-primary fill-primary animate-pulse" />
                                </div>
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
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-3xl rounded-none shadow-[0_0_100px_rgba(204,253,1,0.3)]">
            <DialogHeader className="space-y-4">
                <div className="flex items-center gap-5 text-primary">
                    <div className="p-3 bg-primary/10 rounded-xl border-2 border-primary/20">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter leading-none">{t('admin_auth')}</DialogTitle>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">Verification Required</p>
                    </div>
                </div>
                <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[10px] leading-relaxed text-left border-l-2 border-white/10 pl-4">{t('enter_admin_password_notice')}</DialogDescription>
            </DialogHeader>
             <div className="grid gap-6 py-8">
              <div className="space-y-2.5">
                <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 ml-1">
                  {t('password')} • ENCRYPTED_KEY
                </Label>
                <div className="relative group/input">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                    <Input
                        id="password-input"
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="h-14 bg-black/60 border-white/10 focus:border-primary/50 font-black text-xl tracking-widest rounded-none pl-6 text-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                    />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordCheck} className="w-full h-14 font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-primary/20 text-sm rounded-none border-r-4 border-black/20 group/submit relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/submit:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                    <Scan className="w-5 h-5" />
                    {t('submit')}
                </span>
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NoticeSkeleton() {
  return (
    <div className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] overflow-hidden animate-pulse">
      <div className="grid md:grid-cols-[280px_1fr]">
        <div className="p-12 bg-black/20 flex flex-col items-center gap-6 border-r border-white/5">
          <Skeleton className="w-20 h-20 rounded-2xl opacity-20" />
          <Skeleton className="h-6 w-32 opacity-10" />
        </div>
        <div className="p-12 space-y-10">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full opacity-5 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-32 w-full opacity-10 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
