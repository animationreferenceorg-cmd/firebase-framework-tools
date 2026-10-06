'use client';

import { useUser } from './use-user';
import { formatUsd, getIntroOffer, getProOffers, isIntroEligible } from '@/lib/plans';

/**
 * The first-month intro offer as this visitor would actually be charged it.
 * Hidden for past subscribers (checkout won't apply the coupon for them), so
 * the price shown always matches the price charged.
 */
export function useIntroOffer() {
  const { userProfile, loading } = useUser();
  const offer = getIntroOffer();
  const regularCents = getProOffers().pro_monthly.amountCents;
  const intro = offer && !loading && isIntroEligible(userProfile) ? offer : null;
  const regular = formatUsd(regularCents);

  return {
    intro,
    regularCents,
    /** Short price for buttons: "$1 first month" or "$5/mo". */
    shortPrice: intro ? `${formatUsd(intro.amountCents)} first month` : `${regular}/mo`,
    /** One-line terms: "$1 for your first month, then $5/mo. Cancel anytime." */
    terms: intro
      ? `${formatUsd(intro.amountCents)} for your first month, then ${regular}/mo. Cancel anytime.`
      : `${regular}/mo. Cancel anytime.`,
  };
}
