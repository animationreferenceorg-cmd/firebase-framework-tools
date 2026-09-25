
import type { Metadata } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';

// Display face: a grotesque with enough character to carry headings without
// shouting. Self-hosted by next/font, so no layout shift and no extra request.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

// Timecodes, frame counts and counters — the vocabulary of animation tools.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '700'],
});
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import { UserProvider } from '@/hooks/use-user';
import { LayoutClient } from '@/components/LayoutClient';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://animationreference.org'),
  title: {
    default: 'Animation Reference | Study Movement, Timing & Acting',
    template: '%s | Animation Reference',
  },
  description: 'Find curated animation references for movement, timing, acting, combat, locomotion, and effects. Study the exact motion you need for your next shot.',
  icons: {
    icon: '/site-icon.png',
    shortcut: '/site-icon.png',
    apple: '/site-icon.png',
  },
  openGraph: {
    title: 'Animation Reference',
    description: 'Curated animation references for movement, timing, acting, combat, locomotion, and effects.',
    images: [
      {
        url: '/site-icon.png',
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
    description: 'Curated animation references for movement, timing, acting, combat, locomotion, and effects.',
    images: ['/site-icon.png'],
  },
  alternates: {
    canonical: '/',
  }
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Animation Reference',
  url: 'https://animationreference.org',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://animationreference.org/tags/{search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Animation Reference',
  url: 'https://animationreference.org',
  logo: 'https://animationreference.org/site-icon.png',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://commondatastorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://iframe.mediadelivery.net" />
        <link rel="preconnect" href="https://b-cdn.net" />
        <link rel="dns-prefetch" href="https://commondatastorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <AmbientBackdrop />
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
