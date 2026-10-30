
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
import { GoogleAnalytics } from '@/components/layout/GoogleAnalytics';
import { HeyCatchInit } from '@/components/HeyCatchInit';

export const metadata: Metadata = {
  metadataBase: new URL('https://animationreference.org'),
  title: {
    default: 'Animation Reference | Millions of References & Animator Portfolios',
    template: '%s | Animation Reference',
  },
  description: 'Study millions of animation references, 3D models, and clips with live integration across ArtStation, Sketchfab, Pinterest, and Sakugabooru. Frame-by-frame controls, playblast comparison, and animator portfolios.',
  keywords: [
    'animation reference',
    'artstation alternative',
    'animation portfolio',
    'frame by frame video player',
    'animation reference library',
    'walk cycle reference',
    'combat animation reference',
    'character acting reference',
    'maya playblast compare',
    'sakugabooru references',
    '3d animation reference',
    '2d animation reference',
    'creature locomotion',
  ],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'f4VjQ3aKx_7H2q0pXz_auth_placeholder',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Animation Reference | Frame-by-Frame Motion Study & Portfolios',
    description: 'Millions of animation references, 3D models, and clips integrated with ArtStation, Sketchfab, Pinterest, and Sakugabooru with frame scrubbing, side-by-side playblast compare, and clean animator portfolios.',
    images: [
      {
        url: '/icon.png',
        width: 1024,
        height: 1024,
        alt: 'Animation Reference Logo',
      },
    ],
    url: 'https://animationreference.org',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Animation Reference | Frame-by-Frame Motion Study & Portfolios',
    description: 'Millions of animation references, 3D models, and clips integrated with ArtStation, Sketchfab, Pinterest, and Sakugabooru with frame scrubbing, side-by-side playblast compare, and clean animator portfolios.',
    images: ['/icon.png'],
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
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Animation Reference',
  url: 'https://animationreference.org',
  logo: 'https://animationreference.org/icon.png',
  sameAs: [
    'https://twitter.com/animreference',
  ],
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Animation Reference',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All',
  url: 'https://animationreference.org',
  offers: [
    {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      name: 'Free Plan',
      description: '35 daily references, unlimited visual boards, and 100% free frame-by-frame player.',
    },
    {
      '@type': 'Offer',
      price: '1.00',
      priceCurrency: 'USD',
      name: 'Pro First Month Intro Offer',
      description: '$1 intro offer for your first month of Pro. Unlimited 4K reference study, playblast compare, and downloads.',
    },
    {
      '@type': 'Offer',
      price: '5.00',
      priceCurrency: 'USD',
      name: 'Pro Monthly Membership',
      description: 'Unlimited 4K frame-by-frame study, side-by-side playblast comparison, private boards, and reference video downloads.',
    },
    {
      '@type': 'Offer',
      price: '45.00',
      priceCurrency: 'USD',
      name: 'Pro Annual Membership',
      description: 'Annual Pro membership ($3.75/mo equivalent) with unlimited 4K reference study, private boards, and priority features.',
    },
  ],
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
        <link rel="preconnect" href="https://www.sakugabooru.com" />
        <link rel="dns-prefetch" href="https://www.sakugabooru.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <HeyCatchInit />
        <GoogleAnalytics />
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
