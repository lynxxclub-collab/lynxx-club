import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: December 27, 2025
        </p>

        <div className="space-y-10">
          {/* 1. Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By accessing or using Lynxx Club ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lynxx Club is operated by Driven LLC ("we," "us," or "our"). The Service provides a platform 
              where users can connect for dating and companionship, with some users ("Seekers") paying credits to 
              initiate conversations with other users ("Earners") who receive compensation for their time.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You must be at least 18 years old to use this Service. By creating an account, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You are at least 18 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You are not prohibited by law from using the Service</li>
              <li>You have not been previously banned from the Service</li>
              <li>You will comply with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* 3. Account Registration */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use the Service, you must create an account and choose whether to register as a Seeker or Earner:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Seekers:</strong> Users who purchase credits to initiate conversations and book dates</li>
              <li><strong>Earners:</strong> Users who receive payment for responding to messages and participating in dates</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Providing accurate and complete information</li>
              <li>Keeping your account information up to date</li>
            </ul>
          </section>

          {/* 4. What Lynxx Club IS and IS NOT */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. What Lynxx Club IS and IS NOT</h2>
            
            <div className="mb-6">
              <p className="font-semibold text-green-500 mb-2">✅ Lynxx Club IS:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>A dating and social connection platform</li>
                <li>A marketplace for paid conversations and companionship</li>
                <li>A service where Earners are compensated for their time and attention</li>
                <li>A platform for virtual video dates and in-person meetings in public places</li>
              </ul>
            </div>

            <div className="mb-6">
              <p className="font-semibold text-destructive mb-2">❌ Lynxx Club IS NOT:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>An escort service or platform for sexual services</li>
                <li>A marketplace for illegal activities of any kind</li>
                <li>A guarantee of any particular outcome or relationship</li>
                <li>Responsible for agreements made between users outside the platform</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">
                ⚠️ IMPORTANT: Any solicitation or arrangement for sexual services is strictly prohibited and will result 
                in immediate account termination and potential legal action.
              </p>
            </div>
          </section>

          {/* 5. Credits and Payment */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Credits and Payment</h2>
            
            <h3 className="text-xl font-medium mb-3">5.1 Credit System</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Credits are a platform token used for all interactions on Lynxx Club. Different credit packs offer 
              different amounts at various price points.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Text messages cost <strong>5 credits</strong></li>
              <li>Image unlock costs <strong>10 credits</strong></li>
              <li>Video dates cost <strong>200-900 credits</strong> depending on duration and Earner rates</li>
              <li>Credits are non-refundable once purchased</li>
              <li>Credits do not expire but may be forfeited if account is terminated for violation of Terms</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.2 Earner Compensation</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Earners receive <strong>70%</strong> of the credit value from paid interactions</li>
              <li>Platform retains <strong>30%</strong> to support operations, safety, and payments</li>
              <li>Earnings become available after a <strong>48-hour</strong> processing period for security and fraud prevention</li>
              <li>Minimum payout threshold is <strong>$25.00</strong></li>
              <li>Payouts are sent <strong>weekly, every Friday</strong></li>
              <li>Creators connect a bank account through our secure payout partner (Stripe Connect)</li>
              <li>Earners are responsible for reporting income and paying applicable taxes</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.3 Refund Policy</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Credits are non-refundable once purchased or spent. If you experience a technical issue, 
              contact support and we'll review it. We may issue refunds at our sole discretion in cases of:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Technical errors that prevented service delivery</li>
              <li>Fraudulent activity by the other party (after investigation)</li>
              <li>Violation of Terms by the other party resulting in account termination</li>
            </ul>
          </section>

          {/* 6. Prohibited Conduct */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Solicit or arrange sexual services or escort services</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Share explicit sexual content without consent</li>
              <li>Impersonate another person or entity</li>
              <li>Use the Service if you are under 18 years old</li>
              <li>Share personal contact information outside the platform to avoid fees</li>
              <li>Attempt to manipulate the credit or earnings system</li>
              <li>Create multiple accounts to abuse promotions or defraud the platform</li>
              <li>Use automated tools, bots, or scrapers on the Service</li>
              <li>Reverse engineer or attempt to access source code</li>
              <li>Engage in any illegal activity</li>
              <li>Spam or send unsolicited commercial messages</li>
              <li>Upload viruses, malware, or malicious code</li>
              <li>Violate intellectual property rights</li>
            </ul>
          </section>

          {/* 7. Content and Conduct */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Content and Conduct</h2>
            
            <h3 className="text-xl font-medium mb-3">7.1 User Content</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You retain ownership of content you post ("User Content"), but grant us a worldwide, non-exclusive, 
              royalty-free license to use, display, and distribute your content in connection with the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">7.2 Content Standards</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">All User Content must:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Be accurate and not misleading</li>
              <li>Not violate any laws or regulations</li>
              <li>Not infringe on third-party rights</li>
              <li>Not contain explicit sexual content (profile photos, messages)</li>
              <li>Not promote violence, hate speech, or discrimination</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">7.3 Monitoring and Removal</h3>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right (but have no obligation) to monitor, review, and remove any User Content that 
              violates these Terms. We may also suspend or terminate accounts that repeatedly violate our policies.
            </p>
          </section>

          {/* 8. Safety and Meeting in Person */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Safety and Meeting in Person</h2>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-2">
                ⚠️ Your safety is your responsibility. We strongly recommend:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Always meet in public places for first meetings</li>
                <li>Tell a friend or family member where you're going</li>
                <li>Use the platform's check-in features during in-person dates</li>
                <li>Never send money to other users outside the platform</li>
                <li>Report suspicious behavior immediately</li>
                <li>Trust your instincts - if something feels wrong, leave</li>
              </ul>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Lynxx Club is not responsible for any physical meetings between users or any harm that may occur. 
              You assume all risks associated with in-person meetings.
            </p>
          </section>

          {/* 9. Verification and Identity */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Verification and Identity</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may offer optional identity verification features. Verification badges indicate that a user has 
              completed our verification process, but do not guarantee:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>The safety or character of the user</li>
              <li>The accuracy of all profile information</li>
              <li>That the user will behave appropriately</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Verification is not an endorsement. You are responsible for your own safety and due diligence.
            </p>
          </section>

          {/* 10. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Service, including its design, features, text, graphics, logos, and software, is owned by 
              Driven LLC and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
            </p>
          </section>

          {/* 11. Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed mb-4 font-medium uppercase">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not warrant that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>The Service will be uninterrupted or error-free</li>
              <li>Defects will be corrected</li>
              <li>The Service is free of viruses or harmful components</li>
              <li>Results from using the Service will meet your expectations</li>
              <li>Other users' information is accurate or truthful</li>
              <li>You will find a romantic match or achieve any particular outcome</li>
            </ul>
          </section>

          {/* 12. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-4 font-medium uppercase">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LYNXX CLUB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our total liability for all claims related to the Service shall not exceed the amount you paid us in 
              the 12 months prior to the claim, or $100, whichever is greater.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We are not liable for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Actions or conduct of other users</li>
              <li>Disputes between users</li>
              <li>Physical harm during in-person meetings</li>
              <li>Financial loss from interactions with other users</li>
              <li>Content posted by users</li>
              <li>Third-party services (Stripe, Daily.co, etc.)</li>
            </ul>
          </section>

          {/* 13. Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree to indemnify and hold harmless Lynxx Club, its officers, directors, employees, and agents 
              from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or regulations</li>
              <li>Your User Content</li>
              <li>Your interactions with other users</li>
            </ul>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
            
            <h3 className="text-xl font-medium mb-3">14.1 By You</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may pause or delete your account at any time through your Settings page. Upon account deletion:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Unused credits are forfeited (non-refundable)</li>
              <li>Earners can withdraw available earnings before deletion</li>
              <li>Your profile and content will be removed</li>
              <li>Data will be retained for legal and security purposes as outlined in our Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">14.2 By Us</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may suspend or terminate your account immediately if:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>You violate these Terms</li>
              <li>You engage in fraudulent activity</li>
              <li>You create safety concerns for other users</li>
              <li>Required by law</li>
              <li>The Service is discontinued</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Upon termination for Terms violation, all credits are forfeited and pending earnings may be withheld.
            </p>
          </section>

          {/* 15. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Dispute Resolution</h2>
            
            <h3 className="text-xl font-medium mb-3">15.1 Informal Resolution</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Before filing a claim, you agree to contact us at legal@lynxxclub.com to attempt to resolve the dispute informally.
            </p>

            <h3 className="text-xl font-medium mb-3">15.2 Arbitration</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Any dispute that cannot be resolved informally shall be resolved through binding arbitration in accordance 
              with the rules of the American Arbitration Association.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You agree to waive your right to a jury trial and to participate in a class action lawsuit.
            </p>

            <h3 className="text-xl font-medium mb-3">15.3 Exceptions</h3>
            <p className="text-muted-foreground leading-relaxed">
              Either party may seek injunctive relief in court to prevent irreparable harm.
            </p>
          </section>

          {/* 16. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Michigan, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          {/* 17. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon 
              posting to the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We will notify you of material changes via email or prominent notice on the Service.
            </p>
          </section>

          {/* 18. Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Miscellaneous</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Lynxx Club</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect</li>
              <li><strong>No Waiver:</strong> Our failure to enforce any right does not waive that right</li>
              <li><strong>Assignment:</strong> You may not assign these Terms; we may assign them without restriction</li>
              <li><strong>Force Majeure:</strong> We are not liable for delays due to circumstances beyond our control</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">19. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For questions about these Terms, contact us at:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email: legal@lynxxclub.com</li>
              <li>Address: 42 Ash Highland, Michigan</li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <p className="text-foreground font-semibold text-center mb-4">
              BY CREATING AN ACCOUNT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Last updated: December 24, 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
