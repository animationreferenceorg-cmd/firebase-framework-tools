
import type { Metadata } from 'next';
import './globals.css';
import { DocumentShell } from '@/components/layout/DocumentShell';
import { HREFLANG_LANGUAGES } from '@/lib/i18n-seo';

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
    languages: HREFLANG_LANGUAGES,
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
      urlTemplate: 'https://animationreference.org/categories?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Animation Reference',
  url: 'https://animationreference.org',
  logo: 'https://animationreference.org/icon.png',
  sameAs: [
    'https://twitter.com/animreference',
    'https://github.com/animationreferenceorg-cmd',
    'https://www.youtube.com/@animationreference',
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
      description: '15 daily references, unlimited visual boards, and 100% free frame-by-frame player.',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
        <link rel="preconnect" href="https://commondatastorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://www.sakugabooru.com" />
        <link rel="dns-prefetch" href="https://www.sakugabooru.com" />
        <link rel="preconnect" href="https://vz-79893c7f-720.b-cdn.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vz-79893c7f-720.b-cdn.net" />
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
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
        <DocumentShell>{children}</DocumentShell>
      </body>
    </html>
  );
}
