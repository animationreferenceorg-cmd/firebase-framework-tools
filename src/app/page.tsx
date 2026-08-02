import { Metadata } from 'next';
import LandingPage from '@/app/landing/page';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

export const metadata: Metadata = {
  title: 'Animation Reference - 7,600+ Free Animation Clips & References',
  description: 'Browse 7,600+ free animation reference clips organized by tag. Study body mechanics, acting, combat, locomotion & more. Frame-by-frame analysis for animators, game developers & motion designers. Build your professional portfolio and get discovered by studios.',
  keywords: [
    'animation reference',
    'animation tutorial',
    'animation clips',
    'animation breakdown',
    'body mechanics',
    'acting animation',
    'character animation',
    'game animation reference',
    'professional animation',
    'free animation resources',
    'animation study',
    'animation library',
    'motion reference',
    'animation school',
  ],
  authors: [{ name: 'Animation Reference' }],
  creator: 'Animation Reference',
  publisher: 'Animation Reference',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      'en-US': BASE_URL,
      es: `${BASE_URL}/es`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    title: 'Animation Reference - Free Animation Clips & Professional Portfolio Platform',
    description: '7,600+ curated animation reference clips. Study professional motion, build your portfolio, get discovered by studios. Free for animators & game developers.',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Animation Reference - Animation Clips & Portfolio Platform',
        type: 'image/jpeg',
      },
    ],
    siteName: 'Animation Reference',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Animation Reference - Free Animation Clips',
    description: 'Browse 7,600+ animation reference clips. Study body mechanics, acting, combat & more. Free for animators.',
    creator: '@animationref',
    images: [`${BASE_URL}/og-image.jpg`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Animation Reference',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
  },
};

export default function RootHomePage() {
  return <LandingPage />;
}
