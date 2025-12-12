
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import { UserProvider } from '@/hooks/use-user';
import { LayoutClient } from '@/components/LayoutClient';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Animation Reference',
  description: 'A Netflix-inspired platform for discovering and enjoying animation clips.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        {/* Global Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#030014]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#4c1d95_0%,_#030014_50%)] opacity-50" />
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
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
