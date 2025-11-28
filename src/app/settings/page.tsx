
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordManager } from '@/components/password-manager';
import { useTranslation } from '@/hooks/use-translation';
import { KeyRound } from 'lucide-react';

export default function SettingsPage() {
    const [showPasswordManager, setShowPasswordManager] = useState(false);
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
                        {t('settings_page_title', { defaultValue: 'Application Settings' })}
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        {t('settings_page_subtitle', { defaultValue: 'Manage global settings for the application.' })}
                    </p>
                </div>

                <div className="bg-card border rounded-lg p-6">
                    <Button onClick={() => setShowPasswordManager(true)} className="w-full">
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('manage_admin_password_button', { defaultValue: 'Manage Admin Password' })}
                    </Button>
                </div>

                <PasswordManager open={showPasswordManager} onOpenChange={setShowPasswordManager} />
            </div>
        </div>
    );
}
