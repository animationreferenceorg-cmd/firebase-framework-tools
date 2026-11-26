'use client';

import { useUser } from './use-user';
import { formatUsd, getIntroOffer, getProOffers, isIntroEligible } from '@/lib/plans';

/**
 * The monthly intro offer for guests and eligible accounts.
 */
export function useIntroOffer() {
  const { userProfile, loading } = useUser();
  const offer = getIntroOffer();
  const intro = !loading && isIntroEligible(userProfile) ? offer : null;
  const regularCents = getProOffers().pro_monthly.amountCents;
  const regular = formatUsd(regularCents);
  const months = intro?.months ?? 1;
  const periodLabel = months > 1 ? `for ${months} months` : 'first month';
  const regularPeriodTotalCents = regularCents * months;

  return {
    intro,
    regularCents,
    regularPeriodTotalCents,
    periodLabel,
    campaignLabel: intro?.label ?? 'Intro Offer',
    /** Short price for buttons: "$1 for 3 months" or "$5/mo". */
    shortPrice: intro ? `${formatUsd(intro.amountCents)} ${periodLabel}` : `${regular}/mo`,
    /** One-line terms: "$1 for your first 3 months, then $5/mo. Cancel anytime." */
    terms: intro
      ? months > 1
        ? `${formatUsd(intro.amountCents)} total for your first ${months} months, then ${regular}/mo. Cancel anytime.`
        : `${formatUsd(intro.amountCents)} for your first month, then ${regular}/mo. Cancel anytime.`
      : `${regular}/mo. Cancel anytime.`,
  };
}
