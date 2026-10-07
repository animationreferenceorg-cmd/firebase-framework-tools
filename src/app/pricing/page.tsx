import type { Metadata } from 'next';
import { PricingPageClient } from '@/components/pricing/PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing — Free vs Pro ($1 First Month)',
  description: 'Try Pro for $1 your first month, then $5/month. Compare Animation Reference Free and Pro. Pro unlocks unlimited reference boards, private uploads, playblast compare, contact sheets and clean exports.',
  alternates: { canonical: 'https://animationreference.org/pricing' },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
