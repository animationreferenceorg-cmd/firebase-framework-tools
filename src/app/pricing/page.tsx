import type { Metadata } from 'next';
import { PricingPageClient } from '@/components/pricing/PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing: Free vs Pro Plans',
  description: 'Compare Free and Pro animator plans. Unlock unlimited reference video study, private boards, side-by-side playblast comparison, and clip downloads.',
  alternates: { canonical: 'https://animationreference.org/pricing' },
  openGraph: {
    title: 'Animation Reference Pricing | $1 First Month Intro Offer',
    description: 'Compare Free and Pro plans for animators. Unlimited reference studies, 24 FPS MP4 downloads, side-by-side playblast comparison, and private boards.',
    url: 'https://animationreference.org/pricing',
    type: 'website',
  },
};

const pricingFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What does the Animation Reference Free plan include?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Free plan includes 25 free reference clips every day (plus 8 guest views before signup), unlimited public reference boards, frame-by-frame controls, and community uploads. Any clip you have previously opened remains free to rewatch forever.',
      },
    },
    {
      '@type': 'Question',
      name: 'What extra features come with Animation Reference Pro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pro unlocks unlimited daily reference studies, private encrypted boards for NDA studio projects, 24 FPS MP4 video downloads, synchronized side-by-side playblast compare, and 1-click PureRef contact sheet exports for $5/month (or $1 for your first month).',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel my Pro subscription anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can cancel with 1 click anytime directly in the Stripe customer billing portal. You will retain Pro access until the end of your current billing period.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a student pass or discount?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Students at partner animation programs and universities (including San José State University) get complimentary unlimited Pro access with their student email.',
      },
    },
  ],
};

const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Animation Reference Pro Membership',
  image: 'https://animationreference.org/icon.png',
  description: 'Professional motion study platform for 2D and 3D animators with frame-by-frame scrubbing, playblast compare, and 24 FPS MP4 downloads.',
  brand: {
    '@type': 'Brand',
    name: 'Animation Reference',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Pro Monthly Membership (Intro Offer)',
      price: '1.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      url: 'https://animationreference.org/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Pro Monthly Membership (Regular)',
      price: '5.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      url: 'https://animationreference.org/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Pro Annual Membership',
      price: '45.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      url: 'https://animationreference.org/pricing',
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <PricingPageClient />
    </>
  );
}
