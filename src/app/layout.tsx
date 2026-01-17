
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import { UserProvider } from '@/hooks/use-user';
import { LayoutClient } from '@/components/LayoutClient';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://animationreference.org'),
  title: 'Animation Reference',
  description: 'A Netflix-inspired platform for discovering and enjoying animation clips.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Animation Reference',
    description: 'The definitive collection of curated animation references.',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: 'Animation Reference Logo',
      },
    ],
    url: 'https://animationreference.org',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Animation Reference',
    description: 'The definitive collection of curated animation references.',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: '/',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        {/* Global Background Gradients - Lumina Style */}
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#020005]">
          {/* Main Top Glow */}
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] bg-[radial-gradient(circle_at_50%_50%,_rgba(76,29,149,0.3)_0%,_rgba(0,0,0,0)_70%)] blur-[100px]" />

          {/* Vibrant Purple/Pink Accents */}
          <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-purple-600/10 blur-[130px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] left-[5%] w-[700px] h-[700px] bg-indigo-600/10 blur-[130px] rounded-full mix-blend-screen" />

          {/* Subtle center grain/noise if needed, or just deep void */}
          {/* <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" /> */}
        </div>
        <FirebaseClientProvider>
          <AuthProvider>
            <UserProvider>
              <FirebaseErrorListener />
              <LayoutClient>
                {children}
              </LayoutClient>
            </UserProvider>
          </AuthProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
