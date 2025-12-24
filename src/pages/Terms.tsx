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

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using this platform, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our platform provides a dating service that connects users for video dates and messaging. Users can participate as either seekers or earners, with different roles and responsibilities for each.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must be at least 18 years old to use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the service to harass, abuse, or harm another person. You will not engage in any activity that is illegal or violates these terms. We reserve the right to terminate accounts that violate our community guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payments and Credits</h2>
            <p className="text-muted-foreground leading-relaxed">
              All purchases of credits are final and non-refundable unless otherwise required by law. Credits have no cash value and cannot be exchanged for currency. Earnings are subject to platform fees as disclosed in the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The service is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the platform.
            </p>
          </section>
        </div>

        <p className="text-sm text-muted-foreground mt-12">
          Last updated: December 2024
        </p>
      </div>
    </div>
  );
};

export default Terms;
