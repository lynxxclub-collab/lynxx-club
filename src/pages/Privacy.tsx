import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: December 27, 2025
        </p>

        <div className="space-y-10">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lynxx Club ("we," "us," or "our") respects your privacy and is committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using Lynxx Club, you consent to the data practices described in this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Account Information:</strong> Email, name, date of birth, gender, location</li>
              <li><strong>Profile Information:</strong> Photos, bio, preferences, rates (for Earners)</li>
              <li><strong>Payment Information:</strong> Credit card details (processed by Stripe), bank account info for payouts</li>
              <li><strong>Communications:</strong> Messages, conversation history, ratings, reviews</li>
              <li><strong>Verification Data:</strong> ID documents, selfies for verification</li>
              <li><strong>Video Date Content:</strong> Recordings are NOT stored; metadata (duration, participants) is retained</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device ID</li>
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, clicks</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address</li>
              <li><strong>Cookies:</strong> Session cookies, preference cookies, analytics cookies</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Social Media:</strong> If you sign up via Google, we receive your name, email, and profile picture</li>
              <li><strong>Payment Processors:</strong> Transaction status and payment method details from Stripe</li>
              <li><strong>Identity Verification:</strong> Verification results from third-party services</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide and maintain the Service</li>
              <li>Process payments and payouts</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Enable communication between users</li>
              <li>Personalize your experience</li>
              <li>Send notifications about your account or transactions</li>
              <li>Improve the Service and develop new features</li>
              <li>Analyze usage patterns and trends</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms of Service</li>
              <li>Resolve disputes and provide customer support</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>
          </section>

          {/* Legal Basis for Processing */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">If you are in the European Economic Area (EEA), we process your data based on:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Contract:</strong> To provide the Service you've agreed to use</li>
              <li><strong>Legitimate Interests:</strong> To improve the Service, prevent fraud, ensure security</li>
              <li><strong>Consent:</strong> For marketing communications and optional features</li>
              <li><strong>Legal Obligation:</strong> To comply with laws and regulations</li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. How We Share Your Information</h2>
            
            <h3 className="text-xl font-medium mb-3">5.1 With Other Users</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you use the Service, certain information is visible to other users:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Profile information (photos, bio, age, location)</li>
              <li>Ratings and reviews (visible on your profile)</li>
              <li>Messages you send (only to the recipient)</li>
              <li>Online status and activity</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.2 With Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">We share data with trusted third parties who help us operate the Service:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Stripe:</strong> Payment processing and payouts</li>
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Daily.co:</strong> Video calling infrastructure</li>
              <li><strong>Vercel:</strong> Hosting and content delivery</li>
              <li><strong>Resend/SendGrid:</strong> Email delivery</li>
              <li><strong>Google Analytics:</strong> Usage analytics</li>
              <li><strong>Sentry:</strong> Error tracking</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.3 For Legal Reasons</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">We may disclose your information if required to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Comply with legal process (court orders, subpoenas)</li>
              <li>Enforce our Terms of Service</li>
              <li>Protect our rights, property, or safety</li>
              <li>Investigate fraud or security issues</li>
              <li>Respond to government requests</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.4 Business Transfers</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
            </p>

            <h3 className="text-xl font-medium mb-3">5.5 With Your Consent</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may share information with other parties when you explicitly consent to such sharing.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We retain your information for as long as necessary to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Provide the Service</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">Specific retention periods:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Active accounts:</strong> Data retained while account is active</li>
              <li><strong>Paused accounts:</strong> Data retained for 2 years, then deleted</li>
              <li><strong>Deleted accounts:</strong> Most data deleted within 30 days; financial and fraud-related data retained for 7 years</li>
              <li><strong>Messages:</strong> Retained for 2 years from last message</li>
              <li><strong>Transaction records:</strong> Retained for 7 years (tax and legal requirements)</li>
              <li><strong>Verification data:</strong> Retained for 1 year after verification</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Secure database with row-level security (RLS)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication</li>
              <li>Monitoring and logging of suspicious activity</li>
              <li>Employee training on data protection</li>
            </ul>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-600 dark:text-yellow-400">
                ⚠️ However, no system is 100% secure. You are responsible for maintaining the confidentiality of your password.
              </p>
            </div>
          </section>

          {/* Your Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Privacy Rights</h2>
            
            <h3 className="text-xl font-medium mb-3">8.1 All Users</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
              <li><strong>Data Portability:</strong> Download your data in a machine-readable format</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">8.2 California Residents (CCPA)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">If you are a California resident, you have additional rights:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Right to know what personal information we collect, use, and disclose</li>
              <li>Right to delete personal information (with exceptions)</li>
              <li>Right to opt-out of sale of personal information (we do NOT sell your data)</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">8.3 EEA/UK Residents (GDPR)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">If you are in the EEA or UK, you have additional rights:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Right to object to processing based on legitimate interests</li>
              <li>Right to restrict processing in certain circumstances</li>
              <li>Right to lodge a complaint with your local data protection authority</li>
              <li>Right to withdraw consent at any time</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">8.4 How to Exercise Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To exercise any of these rights, email us at <strong>privacy@lynxxclub.com</strong> with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Subject line: "Privacy Rights Request"</li>
              <li>Your full name and email associated with your account</li>
              <li>Description of your request</li>
              <li>Verification of your identity (we may request additional info)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We will respond within 30 days.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Essential Cookies:</strong> Required for login and security</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences</li>
              <li><strong>Analytics Cookies:</strong> Understand how you use the Service (Google Analytics)</li>
              <li><strong>Advertising Cookies:</strong> Show relevant ads (if applicable)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              You can control cookies through your browser settings. However, disabling cookies may affect functionality.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive font-medium">
                ⚠️ Lynxx Club is NOT intended for users under 18 years of age.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not knowingly collect personal information from anyone under 18. If we discover that a minor has 
              created an account, we will immediately terminate the account and delete all associated data.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you believe a minor has created an account, please report it to <strong>safety@lynxxclub.com</strong>.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your country of residence, 
              including the United States. These countries may have different data protection laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When we transfer data internationally, we use appropriate safeguards such as:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Privacy Shield certification (where applicable)</li>
              <li>Your explicit consent</li>
            </ul>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may contain links to third-party websites or services. We are not responsible for the 
              privacy practices of these third parties. We encourage you to read their privacy policies.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending you an email notification</li>
              <li>Displaying a prominent notice on the Service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Your continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For questions or concerns about this Privacy Policy or our data practices, contact us at:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Email: privacy@lynxxclub.com</li>
              <li>Address: 42 Ash Highland, Michigan</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              For EEA/UK residents: You have the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>

          {/* Data We Do NOT Collect */}
          <section className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">✅ What We Do NOT Do:</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>We do NOT sell your personal data to third parties</li>
              <li>We do NOT record video dates (only metadata is stored)</li>
              <li>We do NOT share your financial information with other users</li>
              <li>We do NOT access your device camera/microphone outside of video dates</li>
              <li>We do NOT track your location in real-time</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
