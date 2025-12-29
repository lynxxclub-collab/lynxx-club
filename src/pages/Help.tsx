const categories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    color: "purple",
    questions: [
      {
        q: "How do I create an account?",
        a: 'Click "Sign Up" in the top right, choose whether you want to be a Seeker (spend credits to connect) or an Earner (earn from interactions), then complete your profile with photos and bio. You must be 18+ to join.',
      },
      {
        q: "What's the difference between Seeker and Earner?",
        a: "Seekers purchase credits to initiate conversations and book video dates. Earners earn from interactions on their profile. You can only be one account type at a time.",
      },
      {
        q: "Can I switch from Seeker to Earner?",
        a: "Yes, but only ONCE. Go to Settings → Account Type → Switch Account Type. A waiting period may apply, and your balances may be handled differently depending on the switch. After switching once, you cannot switch again.",
      },
      {
        q: "How do I verify my account?",
        a: "Go to Settings → Verification. Upload a government ID and take a selfie. Verification time can vary. Verified users get a badge on their profile.",
      },
    ],
  },
  {
    id: "credits-payment",
    title: "Credits & Payment",
    icon: "💳",
    color: "amber",
    questions: [
      {
        q: "How do credits work?",
        a: "Credits are the platform token used for interactions on Lynxxclub. Different credit packs may offer different pricing, but interaction costs are always shown in credits before you spend. We do not show a fixed dollar value per credit.",
      },
      {
        q: "How much do messages cost?",
        a: "Text messages cost 5 credits. Image unlocks cost 10 credits. Costs are shown before you spend.",
      },
      {
        q: "How much do video dates cost?",
        a: "Video dates cost 200–900 credits based on the Earner’s set rates and duration options. Earners set their own rates within the allowed range.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe. We do not store your card information.",
      },
      {
        q: "Are credits refundable?",
        a: "Credits are generally non-refundable once purchased or spent. If you experience a technical issue, contact support and we’ll review it.",
      },
      {
        q: "How do I check my credit balance?",
        a: "Your credit balance appears in the top right of the site (💎). Click it to view your history or buy more credits.",
      },
    ],
  },
  {
    id: "for-earners",
    title: "For Earners",
    icon: "💰",
    color: "green",
    questions: [
      {
        q: "How much can I earn?",
        a: "You earn based on interactions on your profile. Text messages earn $0.35 per paid message. Image unlocks earn $0.70 per unlock. Video dates pay out based on your set rate (200–900 credits). Earnings vary based on availability, responsiveness, and demand.",
      },
      {
        q: "When can I withdraw my earnings?",
        a: "Earnings become available after a 48-hour processing period. Creators with at least $25 in available earnings are included in our weekly payout, processed every Friday via Stripe Connect to your bank account.",
      },
      {
        q: "How do I set up withdrawals?",
        a: "Go to Dashboard → Earnings and complete payout setup. The first time, you’ll securely connect your bank account through Stripe Connect. After setup, eligible earnings are automatically paid out weekly every Friday (minimum $25, after the 48-hour processing period).",
      },
      {
        q: "Can I set my own rates?",
        a: "You can set custom rates for video dates within the 200–900 credit range. Message rates are standardized by the platform (5 credits text, 10 credits image) for consistency.",
      },
      {
        q: "Do I have to report this income on my taxes?",
        a: "Yes. You are responsible for reporting your earnings in accordance with applicable tax laws. If required, Stripe may issue tax forms for creators who meet reporting thresholds during a calendar year. We recommend consulting a qualified tax professional for guidance.",
      },
      {
        q: "What if someone is rude or inappropriate?",
        a: "You can block and report any user. Go to their profile → Report. We review reports as quickly as possible. Violations may result in warnings, suspension, or permanent bans.",
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging",
    icon: "💬",
    color: "blue",
    questions: [
      {
        q: "How do I start a conversation?",
        a: 'Browse profiles, click on someone you’re interested in, then select "Send Message." Type your message and send it to start the conversation. Each text message costs 5 credits.',
      },
      {
        q: "Can I send photos?",
        a: "Yes. Tap the photo icon to send an image. Images appear blurred/locked by default—seekers can choose to unlock an image by clicking it. Image unlocks cost 10 credits. Images must be JPG, PNG, or WebP format and no larger than 5MB.",
      },
      {
        q: "Why didn't they respond?",
        a: "Earners may be offline, busy, or unavailable. If an earner does not respond within 12 hours, the message does not count as a paid interaction—no credits are charged and the earner does not receive earnings for that message. If they reply later, the conversation continues normally.",
      },
      {
        q: "Can I get a refund if they don't respond?",
        a: "Refunds aren’t necessary for unanswered messages. If an earner does not respond within 12 hours, the message is not charged and no earnings are paid out. Credit purchases are generally non-refundable.",
      },
      {
        q: "How do I know if they read my message?",
        a: "Read receipts appear as blue checkmarks when a message has been seen. Earners can choose to disable read receipts in their settings, so not all messages will show a read indicator.",
      },
    ],
  },
  {
    id: "video-dates",
    title: "Video Dates",
    icon: "📹",
    color: "rose",
    questions: [
      {
        q: "How do I book a video date?",
        a: 'From a conversation, click "📹 Book Video Date," choose a duration, select a date & time, then confirm. Any credits required will be clearly shown before you confirm.',
      },
      {
        q: "What happens during a video date?",
        a: 'At the scheduled time, both users click "Join Call" in the Upcoming Dates section. You’ll enter a private video room for the duration booked. The call ends automatically when time expires.',
      },
      {
        q: "What if I need to cancel?",
        a: "Cancellation rules depend on the booking policy shown at checkout. If you cancel within the allowed window, any reserved credits are released back to you. Late cancellations or no-shows may be charged based on the policy shown when you booked.",
      },
      {
        q: "Are video dates recorded?",
        a: "No. We do not record video dates. Only basic metadata (duration, participants, scheduled time) may be stored for scheduling and billing support.",
      },
      {
        q: "What if the call quality is bad?",
        a: "Call quality depends on both users’ internet. For best results, use Wi-Fi and close other apps. If you experience technical issues, contact support and we’ll review it.",
      },
      {
        q: "Can I extend a video date?",
        a: "Not during the call. If you're enjoying the conversation, you can book another date or continue via chat.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety & Privacy",
    icon: "🛡️",
    color: "teal",
    questions: [
      {
        q: "Is Lynxx Club safe?",
        a: "We prioritize safety with verification options, reporting tools, fraud detection, and moderation. Always trust your instincts and follow common-sense safety practices.",
      },
      {
        q: "How do I report someone?",
        a: 'Click the "Report" option on their profile or in messages, select a reason, add details, then submit. We review reports as quickly as possible.',
      },
      {
        q: "What happens when I report someone?",
        a: "We review the report and any relevant evidence. Depending on severity, actions may include warnings, suspension, or permanent bans.",
      },
      {
        q: "Can I block someone?",
        a: "Yes. Go to their profile → Block User. They won’t be able to message you, and you won’t see each other in discovery.",
      },
      {
        q: "Is my personal information safe?",
        a: "We use strong security controls and do not sell your personal data. Payment info is handled by Stripe (we never see your full card number). See our Privacy Policy for details.",
      },
      {
        q: "Should I meet someone in person?",
        a: "Only if you feel comfortable. We recommend starting with in-app chat and video dates first, and always meeting in public if you choose to meet offline.",
      },
    ],
  },
  {
    id: "account",
    title: "Account Settings",
    icon: "⚙️",
    color: "orange",
    questions: [
      {
        q: "How do I change my password?",
        a: "Settings → Security → Change Password.",
      },
      {
        q: "How do I update my profile?",
        a: "Settings → Edit Profile. You can update photos, bio, and preferences. Some changes may take time to appear depending on review settings.",
      },
      {
        q: "Can I pause my account?",
        a: "Yes. Settings → Pause Account. Your profile will be hidden until you reactivate.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Delete Account → Confirm. This is permanent. Unused credits are forfeited. Earners should ensure payout setup is complete for any eligible earnings.",
      },
      {
        q: "Why was my account suspended?",
        a: "Accounts may be suspended for violations of our Terms or Community Guidelines. Check your email for details.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical Issues",
    icon: "🔧",
    color: "slate",
    questions: [
      {
        q: "The site is not loading. What do I do?",
        a: "Try refreshing, clearing cache/cookies, using a different browser, and checking your connection. If it persists, contact support with device + browser details.",
      },
      {
        q: "I can't log in. Help!",
        a: "Try resetting your password, checking your email verification link, and clearing cookies. If you’re still stuck, contact support.",
      },
      {
        q: "My messages aren't sending.",
        a: "Check you have enough credits and a stable connection. Refresh the page or log out/in. If it continues, contact support.",
      },
      {
        q: "Video calls aren't working.",
        a: "Check camera/mic permissions, use a modern browser (Chrome/Firefox/Safari/Edge), and try Wi-Fi. If issues continue, contact support.",
      },
      {
        q: "Which browsers are supported?",
        a: "We support Chrome (recommended), Firefox, Safari, and Edge. Keep your browser updated for best results.",
      },
    ],
  },
];
