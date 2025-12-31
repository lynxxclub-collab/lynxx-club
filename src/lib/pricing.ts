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
 * Call pricing configuration
 */
export const CALL_PRICING = {
  /** Minimum rate per duration (credits) */
  MIN_RATE: 200,
  /** Maximum rate per duration (credits) */
  MAX_RATE: 900,
  /** Available durations in minutes */
  DURATIONS: [15, 30, 60, 90] as const,
  /** Audio is 70% of video price */
  AUDIO_MULTIPLIER: 0.70,
} as const;

export type CallDuration = typeof CALL_PRICING.DURATIONS[number];
export type CallType = 'audio' | 'video';

/**
 * Derive audio price from video price (normal rounding to whole credits)
 */
export function deriveAudioRate(videoRate: number): number {
  return Math.round(videoRate * CALL_PRICING.AUDIO_MULTIPLIER);
}

/**
 * Calculate per-minute rate for a given price and duration
 */
export function calculatePerMinuteRate(price: number, duration: number): number {
  return price / duration;
}

/**
 * Validate monotonic pricing (each duration price >= previous duration price)
 */
export function validateMonotonicPricing(rates: {
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
}): { valid: boolean; error?: string } {
  if (rates.video_30min_rate < rates.video_15min_rate) {
    return { valid: false, error: '30-min price must be ≥ 15-min price' };
  }
  if (rates.video_60min_rate < rates.video_30min_rate) {
    return { valid: false, error: '60-min price must be ≥ 30-min price' };
  }
  if (rates.video_90min_rate < rates.video_60min_rate) {
    return { valid: false, error: '90-min price must be ≥ 60-min price' };
  }
  return { valid: true };
}

/**
 * Validate per-minute rate doesn't increase with duration
 * (longer durations should have same or lower per-minute cost)
 */
export function validatePerMinuteConsistency(rates: {
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
}): { valid: boolean; error?: string } {
  const pm15 = rates.video_15min_rate / 15;
  const pm30 = rates.video_30min_rate / 30;
  const pm60 = rates.video_60min_rate / 60;
  const pm90 = rates.video_90min_rate / 90;
  
  // Allow tiny tolerance for floating point
  const tolerance = 0.001;
  
  if (pm30 > pm15 + tolerance) {
    return { valid: false, error: '30-min per-minute rate cannot exceed 15-min rate' };
  }
  if (pm60 > pm30 + tolerance) {
    return { valid: false, error: '60-min per-minute rate cannot exceed 30-min rate' };
  }
  if (pm90 > pm60 + tolerance) {
    return { valid: false, error: '90-min per-minute rate cannot exceed 60-min rate' };
  }
  return { valid: true };
}

/**
 * Get rate for specific call type and duration
 */
export function getCallRate(
  videoRates: { 
    video_15min_rate?: number; 
    video_30min_rate?: number; 
    video_60min_rate?: number; 
    video_90min_rate?: number; 
  },
  callType: CallType,
  duration: CallDuration
): number {
  const rateKey = `video_${duration}min_rate` as keyof typeof videoRates;
  const videoRate = videoRates[rateKey] || CALL_PRICING.MIN_RATE;
  return callType === 'video' ? videoRate : deriveAudioRate(videoRate);
}

/**
 * Get all derived audio rates from video rates
 */
export function getDerivedAudioRates(videoRates: {
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
}) {
  return {
    audio_15min_rate: deriveAudioRate(videoRates.video_15min_rate),
    audio_30min_rate: deriveAudioRate(videoRates.video_30min_rate),
    audio_60min_rate: deriveAudioRate(videoRates.video_60min_rate),
    audio_90min_rate: deriveAudioRate(videoRates.video_90min_rate),
  };
}

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
