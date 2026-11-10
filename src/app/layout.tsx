
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { LanguageProvider } from '@/context/language-context';
import { PasswordProvider } from '@/context/password-context';
import { SeasonThemeProvider } from '@/context/season-theme-context';
import { DeactivatedGuard } from '@/components/layout/deactivated-guard';
import { VantaBackground } from '@/components/vanta-background';


export const metadata: Metadata = {
  title: 'Engineering EightyEight Liga Tarkam',
  description: 'League and cup tracking for the Engineering EightyEight amateur football league.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BM LEAGUE 88',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

import { PwaProvider } from '@/context/pwa-context';
import { PwaRegister } from '@/components/pwa-register';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BM LEAGUE 88" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={cn('font-body antialiased')}>
        <LanguageProvider>
          <FirebaseClientProvider>
            <PasswordProvider>
              <SeasonThemeProvider>
                <PwaProvider>
                  <DeactivatedGuard>
                    <VantaBackground />
                    <div className="relative flex min-h-screen flex-col pb-24 md:pb-0">
                      <Header />
                      <main className="flex-1 z-10">
                        {children}
                      </main>
                      <Footer />
                      <MobileBottomNav />
                    </div>
                    <Toaster />
                    <PwaRegister />
                  </DeactivatedGuard>
                </PwaProvider>
              </SeasonThemeProvider>
            </PasswordProvider>
          </FirebaseClientProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
