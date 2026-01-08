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
 * ✅ FIXED: Call pricing configuration with correct minimums per duration
 */
export const CALL_PRICING = {
  /** Maximum rate for all durations (credits) */
  MAX_RATE: 900,
  
  /** ✅ Minimum rate per duration (credits) - FIXED */
  MIN_RATES: {
    15: 200,  // 15 min minimum
    30: 280,  // 30 min minimum
    60: 392,  // 60 min minimum
    90: 412,  // 90 min minimum
  } as const,
  
  /** Available durations in minutes */
  DURATIONS: [15, 30, 60, 90] as const,
  
  /** Audio is 70% of video price */
  AUDIO_MULTIPLIER: 0.70,
  
  /** @deprecated Use MIN_RATES[duration] instead */
  MIN_RATE: 200,
} as const;

export type CallDuration = typeof CALL_PRICING.DURATIONS[number];
export type CallType = 'audio' | 'video';

/**
 * ✅ NEW: Get minimum rate for a specific duration
 */
export function getMinRateForDuration(duration: CallDuration): number {
  return CALL_PRICING.MIN_RATES[duration];
}

/**
 * ✅ NEW: Validate rate is within bounds for duration
 */
export function validateRateForDuration(rate: number, duration: CallDuration): {
  valid: boolean;
  clampedRate: number;
  error?: string;
} {
  const minRate = CALL_PRICING.MIN_RATES[duration];
  const maxRate = CALL_PRICING.MAX_RATE;
  
  if (rate < minRate) {
    return {
      valid: false,
      clampedRate: minRate,
      error: `${duration} min rate must be at least ${minRate} credits`,
    };
  }
  
  if (rate > maxRate) {
    return {
      valid: false,
      clampedRate: maxRate,
      error: `${duration} min rate cannot exceed ${maxRate} credits`,
    };
  }
  
  return { valid: true, clampedRate: rate };
}

/**
 * Derive audio price from video price (70% of video)
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
  const minRate = CALL_PRICING.MIN_RATES[duration];
  
  let videoRate: number;
  switch (duration) {
    case 15: videoRate = videoRates.video_15min_rate || minRate; break;
    case 30: videoRate = videoRates.video_30min_rate || minRate; break;
    case 60: videoRate = videoRates.video_60min_rate || minRate; break;
    case 90: videoRate = videoRates.video_90min_rate || minRate; break;
    default: videoRate = minRate;
  }
  
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
 * Calculate creator earnings from credits (what earner receives)
 * Formula: credits × $0.10 × 0.70 = credits × $0.07
 * 
 * Example: 200 credits → $20 gross → $14 to earner
 */
export function calculateCreatorEarnings(credits: number): number {
  return Math.round(credits * PRICING.CREDIT_TO_USD * PRICING.CREATOR_SHARE * 100) / 100;
}

/**
 * Calculate platform fee from credits (what platform receives)
 * Formula: credits × $0.10 × 0.30 = credits × $0.03
 * 
 * Example: 200 credits → $20 gross → $6 to platform
 */
export function calculatePlatformFee(credits: number): number {
  return Math.round(credits * PRICING.CREDIT_TO_USD * PRICING.PLATFORM_SHARE * 100) / 100;
}

/**
 * Calculate all pricing components at once
 * 
 * Example for 200 credits:
 * - grossUsd: $20.00
 * - creatorUsd: $14.00
 * - platformUsd: $6.00
 */
export function calculateAllPricing(credits: number) {
  const grossUsd = calculateGrossUSD(credits);
  const creatorUsd = calculateCreatorEarnings(credits);
  const platformUsd = calculatePlatformFee(credits);
  
  return {
    credits,
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
 * ✅ NEW: Validate all rates are within their respective bounds
 */
export function validateAllRates(rates: {
  video_15min_rate: number;
  video_30min_rate: number;
  video_60min_rate: number;
  video_90min_rate: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const check15 = validateRateForDuration(rates.video_15min_rate, 15);
  const check30 = validateRateForDuration(rates.video_30min_rate, 30);
  const check60 = validateRateForDuration(rates.video_60min_rate, 60);
  const check90 = validateRateForDuration(rates.video_90min_rate, 90);
  
  if (!check15.valid && check15.error) errors.push(check15.error);
  if (!check30.valid && check30.error) errors.push(check30.error);
  if (!check60.valid && check60.error) errors.push(check60.error);
  if (!check90.valid && check90.error) errors.push(check90.error);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
