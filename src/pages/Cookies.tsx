import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: December 24, 2025
        </p>

        <div className="space-y-10">
          {/* What Are Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit our website. They help us provide 
              a better user experience by remembering your preferences and analyzing how you use our Service.
            </p>
          </section>

          {/* Types of Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">🔐 Essential Cookies (Required)</h3>
                <p className="text-muted-foreground mb-4">These cookies are necessary for the Service to function:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                  <li>Authentication cookies (keep you logged in)</li>
                  <li>Security cookies (prevent fraud)</li>
                  <li>Session cookies (maintain your session)</li>
                </ul>
                <p className="text-sm text-muted-foreground font-medium">Cannot be disabled.</p>
              </div>

              {/* Functional Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">⚙️ Functional Cookies</h3>
                <p className="text-muted-foreground mb-4">These cookies remember your preferences:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                  <li>Language preference</li>
                  <li>Theme settings (dark/light mode)</li>
                  <li>Notification preferences</li>
                </ul>
                <p className="text-sm text-muted-foreground font-medium">Can be disabled, but may affect user experience.</p>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">📊 Analytics Cookies</h3>
                <p className="text-muted-foreground mb-4">These cookies help us understand how you use the Service:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                  <li>Google Analytics (page views, interactions)</li>
                  <li>Error tracking (Sentry)</li>
                  <li>Performance monitoring</li>
                </ul>
                <p className="text-sm text-muted-foreground font-medium">Can be disabled in settings.</p>
              </div>

              {/* Advertising Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">📢 Advertising Cookies (If Applicable)</h3>
                <p className="text-muted-foreground mb-4">These cookies may be used to show relevant ads:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                  <li>Retargeting pixels</li>
                  <li>Ad performance tracking</li>
                </ul>
                <p className="text-sm text-muted-foreground font-medium">Can be disabled in settings.</p>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use cookies from trusted third-party services:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Google Analytics:</strong> Usage statistics</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Daily.co:</strong> Video calling</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              These third parties have their own cookie policies, which we encourage you to review.
            </p>
          </section>

          {/* Managing Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You can control cookies through:</p>
            
            <h3 className="text-xl font-medium mb-3">Browser Settings:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Our Cookie Banner:</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you first visit Lynxx Club, you'll see a cookie consent banner where you can accept or customize 
              your cookie preferences.
            </p>
          </section>

          {/* Do Not Track */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Do Not Track</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some browsers have a "Do Not Track" feature. We currently do not respond to Do Not Track signals, 
              but you can control cookies through your browser settings.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an 
              updated "Last Updated" date.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Questions about our use of cookies? Contact us at:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email: privacy@lynxxclub.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
