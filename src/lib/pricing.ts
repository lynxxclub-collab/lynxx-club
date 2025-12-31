/**
 * AUTHORITATIVE PRICING CONSTANTS
 * 
 * This is the SINGLE SOURCE OF TRUTH for all pricing calculations.
 * These constants MUST match platform_settings in the database.
 * 
 * DO NOT hardcode pricing values anywhere else in the codebase.
 * Always import and use these functions for consistency.
 */

export const PRICING = {
  /** 1 credit = $0.10 USD */
  CREDIT_TO_USD: 0.10,
  /** Creator receives 70% of gross value */
  CREATOR_SHARE: 0.70,
  /** Platform receives 30% of gross value */
  PLATFORM_SHARE: 0.30,
} as const;

/**
 * Calculate the gross USD value from credits
 * Formula: credits × $0.10
 */
export function calculateGrossUSD(credits: number): number {
  return Math.round(credits * PRICING.CREDIT_TO_USD * 100) / 100;
}

/**
 * Calculate creator earnings from credits
 * Formula: credits × $0.10 × 0.70 = credits × $0.07
 */
export function calculateCreatorEarnings(credits: number): number {
  return Math.round(credits * PRICING.CREDIT_TO_USD * PRICING.CREATOR_SHARE * 100) / 100;
}

/**
 * Calculate platform fee from credits
 * Formula: credits × $0.10 × 0.30 = credits × $0.03
 */
export function calculatePlatformFee(credits: number): number {
  return Math.round(credits * PRICING.CREDIT_TO_USD * PRICING.PLATFORM_SHARE * 100) / 100;
}

/**
 * Calculate all pricing components at once
 */
export function calculateAllPricing(credits: number) {
  const grossUsd = calculateGrossUSD(credits);
  const creatorUsd = calculateCreatorEarnings(credits);
  const platformUsd = calculatePlatformFee(credits);
  
  return {
    grossUsd,
    creatorUsd,
    platformUsd,
  };
}

/**
 * Validate that earner amount matches expected calculation
 * Allows 1 cent tolerance for rounding
 */
export function validateEarningsMatch(credits: number, earnerAmount: number): boolean {
  const expected = calculateCreatorEarnings(credits);
  return Math.abs(expected - earnerAmount) < 0.01;
}

/**
 * Format credits as USD display string
 */
export function formatCreditsAsUSD(credits: number): string {
  return `$${calculateGrossUSD(credits).toFixed(2)}`;
}

/**
 * Format creator earnings display string
 */
export function formatCreatorEarnings(credits: number): string {
  return `$${calculateCreatorEarnings(credits).toFixed(2)}`;
}
