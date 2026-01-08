diff --git a/functions/_shared/pricing.ts b/functions/_shared/pricing.ts
--- a/functions/_shared/pricing.ts
+++ b/functions/_shared/pricing.ts
@@ -1,65 +1,110 @@
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
 
+const SHARE_SUM = PRICING.CREATOR_SHARE + PRICING.PLATFORM_SHARE;
+if (Math.abs(SHARE_SUM - 1) > 1e-9) {
+  // Fail loud: if this is wrong, payouts will be wrong.
+  console.error("[pricing] CREATOR_SHARE + PLATFORM_SHARE must equal 1", {
+    CREATOR_SHARE: PRICING.CREATOR_SHARE,
+    PLATFORM_SHARE: PRICING.PLATFORM_SHARE,
+    sum: SHARE_SUM,
+  });
+}
+
+function assertValidCredits(credits: number) {
+  if (!Number.isFinite(credits) || credits < 0) {
+    console.error("[pricing] Invalid credits value", { credits });
+    throw new Error("Invalid credits value");
+  }
+}
+
+function creditsToGrossCents(credits: number): number {
+  // Use integer cents to avoid float drift.
+  // For CREDIT_TO_USD=0.10, centsPerCredit=10.
+  const centsPerCredit = Math.round(PRICING.CREDIT_TO_USD * 100);
+  return Math.round(credits * centsPerCredit);
+}
+
 /**
  * Calculate all pricing components from credits
  */
 export function calculateEarnings(credits: number) {
-  const grossUsd = Number((credits * PRICING.CREDIT_TO_USD).toFixed(2));
-  const creatorUsd = Number((grossUsd * PRICING.CREATOR_SHARE).toFixed(2));
-  const platformUsd = Number((grossUsd - creatorUsd).toFixed(2)); // Remainder to platform
-  
+  assertValidCredits(credits);
+
+  const grossCents = creditsToGrossCents(credits);
+  const creatorCents = Math.round(grossCents * PRICING.CREATOR_SHARE);
+  const platformCents = grossCents - creatorCents; // remainder to platform (ensures sums match)
+
+  const grossUsd = Number((grossCents / 100).toFixed(2));
+  const creatorUsd = Number((creatorCents / 100).toFixed(2));
+  const platformUsd = Number((platformCents / 100).toFixed(2));
+
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
-  return Number((credits * PRICING.CREDIT_TO_USD).toFixed(2));
+  return calculateEarnings(credits).grossUsd;
 }
 
 /**
  * Calculate creator earnings from credits
  */
 export function calculateCreatorEarnings(credits: number): number {
-  return Number((credits * PRICING.CREDIT_TO_USD * PRICING.CREATOR_SHARE).toFixed(2));
+  return calculateEarnings(credits).creatorUsd;
 }
 
 /**
  * Calculate platform fee from credits
  */
 export function calculatePlatformFee(credits: number): number {
-  return Number((credits * PRICING.CREDIT_TO_USD * PRICING.PLATFORM_SHARE).toFixed(2));
+  return calculateEarnings(credits).platformUsd;
 }
