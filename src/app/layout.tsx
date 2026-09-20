
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { VantaBackground } from '@/components/vanta-background';
import { LanguageProvider } from '@/context/language-context';
import { PasswordProvider } from '@/context/password-context';
import { DeactivatedGuard } from '@/components/layout/deactivated-guard';


import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Engineering EightyEight Liga Tarkam',
  description: 'League and cup tracking for the Engineering EightyEight amateur football league.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn('dark', inter.className)}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={cn('font-body antialiased')}>
        <LanguageProvider>
          <FirebaseClientProvider>
            <PasswordProvider>
              <DeactivatedGuard>
                <VantaBackground />
                <div className="relative flex min-h-screen flex-col pb-20 md:pb-0">
                  <Header />
                  <main className="flex-1 z-10">
                    {children}
                  </main>
                  <Footer />
                  <MobileBottomNav />
                </div>
                <Toaster />
              </DeactivatedGuard>
            </PasswordProvider>
          </FirebaseClientProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
