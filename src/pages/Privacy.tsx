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
          Last Updated: December 24, 2025
        </p>

        <div className="space-y-10">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lynxx Club ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our dating and social 
              connection platform (the "Service").
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using the Service, you consent to the data practices described in this Privacy Policy. If you do not 
              agree with this Privacy Policy, please do not use the Service.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Account Information:</strong> Name, email address, date of birth, gender, location (city/state)</li>
              <li><strong>Profile Information:</strong> Photos, bio, preferences, user type (Seeker or Earner)</li>
              <li><strong>Payment Information:</strong> Credit card details, billing address (processed by Stripe)</li>
              <li><strong>Communications:</strong> Messages sent through the platform, support requests</li>
              <li><strong>Verification Data:</strong> Identity documents if you choose to verify your account</li>
              <li><strong>Success Stories:</strong> Stories and photos you voluntarily share</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Service</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, analytics data</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Payment Processors:</strong> Transaction status from Stripe</li>
              <li><strong>Video Services:</strong> Call metadata from Daily.co</li>
              <li><strong>Authentication:</strong> Login information if you use social sign-in</li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Create and manage your account</li>
              <li>Process transactions and send related information</li>
              <li>Match you with other users based on your preferences</li>
              <li>Facilitate communication between users</li>
              <li>Send administrative messages, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address fraud and security issues</li>
              <li>Enforce our Terms of Service and other policies</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* 4. How We Share Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
            
            <h3 className="text-xl font-medium mb-3">4.1 With Other Users</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your profile information (name, photos, bio, location, ratings) is visible to other users of the Service. 
              Messages you send are visible to the recipients.
            </p>

            <h3 className="text-xl font-medium mb-3">4.2 With Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">We share information with third parties who perform services on our behalf:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Daily.co:</strong> Video call services</li>
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Analytics providers:</strong> Usage analysis</li>
              <li><strong>Cloud hosting:</strong> Data storage and infrastructure</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">4.3 For Legal Reasons</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">We may disclose your information if required to do so by law or in response to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Subpoenas, court orders, or legal process</li>
              <li>Government requests</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>To investigate potential violations of our Terms</li>
              <li>To protect against legal liability</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">4.4 Business Transfers</h3>
            <p className="text-muted-foreground leading-relaxed">
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred 
              as part of that transaction. We will notify you of any change in ownership or use of your information.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We retain your information for as long as:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Your account is active</li>
              <li>Needed to provide the Service</li>
              <li>Required by law (e.g., tax, legal, or accounting requirements)</li>
              <li>Necessary to resolve disputes and enforce agreements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              After account deletion, we may retain certain information for up to 3 years for fraud prevention, 
              legal compliance, and safety purposes.
            </p>
          </section>

          {/* 6. Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
            
            <h3 className="text-xl font-medium mb-3">6.1 Access and Update</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You can access and update your account information through your Settings page at any time.
            </p>

            <h3 className="text-xl font-medium mb-3">6.2 Account Deletion</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You can request deletion of your account through Settings. We will delete your personal information 
              within 30 days, except for data we are required to retain for legal purposes.
            </p>

            <h3 className="text-xl font-medium mb-3">6.3 Communication Preferences</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You can opt out of promotional emails by clicking the unsubscribe link. You cannot opt out of 
              transactional or security-related communications.
            </p>

            <h3 className="text-xl font-medium mb-3">6.4 California Residents</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">Under the CCPA, California residents have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Know what personal information we collect</li>
              <li>Request deletion of personal information</li>
              <li>Opt out of the sale of personal information (we do not sell your data)</li>
              <li>Non-discrimination for exercising these rights</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">6.5 European Users (GDPR)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">If you are in the EU/EEA, you have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure ("right to be forgotten")</li>
              <li>Restrict processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
          </section>

          {/* 7. Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure payment processing through Stripe (PCI-DSS compliant)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute 
              security of your information.
            </p>
          </section>

          {/* 8. Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze how the Service is used</li>
              <li>Prevent fraud</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              You can control cookies through your browser settings, but disabling cookies may affect functionality.
            </p>
          </section>

          {/* 9. Third-Party Links */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may contain links to third-party websites. We are not responsible for the privacy practices 
              of these websites. We encourage you to read their privacy policies.
            </p>
          </section>

          {/* 10. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for anyone under 18 years of age. We do not knowingly collect personal 
              information from children. If we learn that we have collected information from a child, we will 
              delete it immediately.
            </p>
          </section>

          {/* 11. International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have different data protection laws. By using the Service, you consent to such transfers.
            </p>
          </section>

          {/* 12. Changes to This Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending you an email notification</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Your continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* 13. Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email: privacy@lynxxclub.com</li>
              <li>Address: [Your Company Address]</li>
              <li>Phone: [Your Phone Number]</li>
            </ul>
          </section>

          {/* Data Protection Officer */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Data Protection Officer</h2>
            <p className="text-muted-foreground leading-relaxed">
              For GDPR-related inquiries, you can contact our Data Protection Officer at: dpo@lynxxclub.com
            </p>
          </section>

          {/* Acknowledgment */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <p className="text-foreground font-semibold text-center mb-4">
              BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY.
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

export default Privacy;
