/**
 * AUTHORITATIVE PRICING CONSTANTS FOR EDGE FUNCTIONS
 * 
 * This is the SINGLE SOURCE OF TRUTH for all pricing calculations in edge functions.
 * These constants MUST match:
 * - src/lib/pricing.ts (frontend)
 * - platform_settings table in database
 * 
 * DO NOT hardcode pricing values anywhere else in edge functions.
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
 * Calculate all pricing components from credits
 */
export function calculateEarnings(credits: number) {
  const grossUsd = Number((credits * PRICING.CREDIT_TO_USD).toFixed(2));
  const creatorUsd = Number((grossUsd * PRICING.CREATOR_SHARE).toFixed(2));
  const platformUsd = Number((grossUsd - creatorUsd).toFixed(2)); // Remainder to platform
  
  return {
    grossUsd,
    creatorUsd,
    platformUsd,
  };
}

/**
 * Calculate gross USD from credits
 */
export function calculateGrossUSD(credits: number): number {
  return Number((credits * PRICING.CREDIT_TO_USD).toFixed(2));
}

/**
 * Calculate creator earnings from credits
 */
export function calculateCreatorEarnings(credits: number): number {
  return Number((credits * PRICING.CREDIT_TO_USD * PRICING.CREATOR_SHARE).toFixed(2));
}

/**
 * Calculate platform fee from credits
 */
export function calculatePlatformFee(credits: number): number {
  return Number((credits * PRICING.CREDIT_TO_USD * PRICING.PLATFORM_SHARE).toFixed(2));
}
