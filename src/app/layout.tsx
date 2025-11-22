import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { VantaBackground } from '@/components/vanta-background';
import Script from 'next/script';


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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <FirebaseClientProvider>
          <VantaBackground />
          <div className="relative flex min-h-screen flex-col bg-transparent">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </FirebaseClientProvider>
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js" />
        <Script src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js" />
      </body>
    </html>
  );
}
