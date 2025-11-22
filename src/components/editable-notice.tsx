
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Notice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, Info, X, Plus, Trash2, Lock, Unlock } from 'lucide-react';
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

const NOTICE_ID = 'main';
const ADMIN_PASSWORD = 'Office88';

const DEFAULT_NOTICE: Notice = {
  rules: [],
  schedule: ""
};

export function EditableNotice() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const noticeRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'notices', NOTICE_ID) : null),
    [firestore]
  );
  
  const { data: noticeData, isLoading } = useDoc<Notice>(noticeRef);

  const [isEditing, setIsEditing] = useState(false);
  const [editableNotice, setEditableNotice] = useState<Notice>(noticeData ?? DEFAULT_NOTICE);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    // This effect now ONLY syncs the local editing state
    // when the data from Firestore changes. It no longer writes to the DB.
    if (noticeData) {
      setEditableNotice(noticeData);
    } else {
      setEditableNotice(DEFAULT_NOTICE);
    }
  }, [noticeData]);
  
  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
        setIsEditing(true);
        setPasswordPromptOpen(false);
        setPasswordInput('');
        // When entering edit mode, ensure we're editing the latest data
        setEditableNotice(noticeData ?? DEFAULT_NOTICE);
    } else {
        toast({
            variant: "destructive",
            title: "Incorrect Password",
        });
    }
  };
  
  const handleSave = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'notices', NOTICE_ID);
    // Filter out any empty rules before saving
    const noticeToSave = {
        ...editableNotice,
        rules: editableNotice.rules.filter(rule => rule.trim() !== '')
    };
    // Use setDoc with merge:true to either create or update the document safely.
    setDocumentNonBlocking(docRef, noticeToSave, { merge: true });
    setIsEditing(false);
    toast({
      title: "Notice Updated",
      description: "The notice board has been saved.",
    });
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...editableNotice.rules];
    newRules[index] = value;
    setEditableNotice({ ...editableNotice, rules: newRules });
  };

  const handleAddRule = () => {
    setEditableNotice({ ...editableNotice, rules: [...editableNotice.rules, ''] });
  }

  const handleRemoveRule = (index: number) => {
    const newRules = editableNotice.rules.filter((_, i) => i !== index);
    setEditableNotice({ ...editableNotice, rules: newRules });
  }

  const handleScheduleChange = (value: string) => {
    setEditableNotice({ ...editableNotice, schedule: value });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Revert to the last saved data from Firestore
    setEditableNotice(noticeData ?? DEFAULT_NOTICE);
  }

  if (isLoading) {
    return <NoticeSkeleton />;
  }

  const displayData = isEditing ? editableNotice : (noticeData ?? DEFAULT_NOTICE);

  return (
    <>
      <div className="bg-card border rounded-lg overflow-hidden relative">
        <div className="absolute top-2 right-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPasswordPromptOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Notice
            </Button>
          )}
        </div>
        <div className="grid md:grid-cols-[200px_1fr]">
          <div className="p-6 bg-secondary/30 flex flex-col items-center justify-center text-center gap-2">
            <Info className="w-10 h-10 text-primary" />
            <h2 className="text-xl font-bold text-primary">Notice</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                  <div className="space-y-2">
                      {displayData.rules.map((rule, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <Input
                                  type="text"
                                  value={rule}
                                  onChange={(e) => handleRuleChange(index, e.target.value)}
                                  className="flex-grow"
                                  placeholder="Enter a rule..."
                              />
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={handleAddRule}>
                          <Plus className="mr-2 h-4 w-4"/> Add Rule
                      </Button>
                  </div>
                <Textarea
                  value={displayData.schedule}
                  onChange={(e) => handleScheduleChange(e.target.value)}
                  className="text-center bg-muted/20"
                  rows={4}
                  placeholder="Enter schedule information..."
                />
              </div>
            ) : (
              <>
                <ul className="space-y-2 text-sm text-foreground list-disc pl-5 mb-6 min-h-[50px]">
                  {displayData.rules && displayData.rules.length > 0 ? (
                    displayData.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic list-none">No rules have been added.</p>
                  )}
                </ul>
                <div className="text-center bg-primary p-4 rounded-md text-sm text-primary-foreground min-h-[50px]">
                  {displayData.schedule ? displayData.schedule : <p className="italic">No schedule has been set.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Admin Authentication</DialogTitle>
                <DialogDescription>Please enter the admin password to edit the notice.</DialogDescription>
            </DialogHeader>
             <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-input" className="text-right">
                  Password
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
              <Button onClick={handlePasswordCheck}>Submit</Button>
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
        <div className="p-6 bg-secondary/30 flex flex-col items-center justify-center text-center gap-2">
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
