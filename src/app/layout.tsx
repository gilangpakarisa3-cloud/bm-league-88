import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { VantaBackground } from '@/components/vanta-background';
import { LanguageProvider } from '@/context/language-context';
import { PasswordProvider } from '@/context/password-context';


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
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <LanguageProvider>
          <FirebaseClientProvider>
            <PasswordProvider>
              <VantaBackground />
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 z-10">
                  {children}
                </main>
                <Footer />
              </div>
              <Toaster />
            </PasswordProvider>
          </FirebaseClientProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
