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
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lynxx Club ("we," "us," or "our") uses cookies and similar tracking technologies on our website and 
              application (the "Service"). This Cookie Policy explains what cookies are, how we use them, and your 
              choices regarding their use.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using the Service, you consent to the use of cookies as described in this policy.
            </p>
          </section>

          {/* What Are Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you 
              visit a website. They help the website remember information about your visit, such as your preferences, 
              which can make your next visit easier and the site more useful to you.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Cookies can be "persistent" (remaining on your device until deleted) or "session" cookies (deleted when 
              you close your browser).
            </p>
          </section>

          {/* Types of Cookies We Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">🔐 Essential Cookies</h3>
                <p className="text-muted-foreground mb-4">
                  These cookies are necessary for the Service to function properly. Without them, you would not be 
                  able to use basic features like logging in or making payments.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-foreground">Cookie</th>
                        <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                        <th className="text-left py-2 text-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">sb-access-token</td>
                        <td className="py-2 pr-4">Authentication session</td>
                        <td className="py-2">1 hour</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">sb-refresh-token</td>
                        <td className="py-2 pr-4">Refresh authentication</td>
                        <td className="py-2">7 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">csrf-token</td>
                        <td className="py-2 pr-4">Security protection</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">⚙️ Functional Cookies</h3>
                <p className="text-muted-foreground mb-4">
                  These cookies remember your preferences and settings to enhance your experience on the Service.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-foreground">Cookie</th>
                        <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                        <th className="text-left py-2 text-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">theme</td>
                        <td className="py-2 pr-4">Light/dark mode preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">locale</td>
                        <td className="py-2 pr-4">Language preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">notifications</td>
                        <td className="py-2 pr-4">Notification settings</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">📊 Analytics Cookies</h3>
                <p className="text-muted-foreground mb-4">
                  These cookies help us understand how visitors interact with the Service, allowing us to improve 
                  performance and user experience.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-foreground">Cookie</th>
                        <th className="text-left py-2 pr-4 text-foreground">Purpose</th>
                        <th className="text-left py-2 text-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">_ga</td>
                        <td className="py-2 pr-4">Google Analytics - distinguishes users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">_ga_*</td>
                        <td className="py-2 pr-4">Google Analytics - session state</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">_gid</td>
                        <td className="py-2 pr-4">Google Analytics - distinguishes users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Third-Party Cookies */}
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3 text-foreground">🔗 Third-Party Cookies</h3>
                <p className="text-muted-foreground mb-4">
                  Some third-party services we use may set their own cookies:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Stripe:</strong> Payment processing and fraud prevention</li>
                  <li><strong>Daily.co:</strong> Video call functionality</li>
                  <li><strong>Google:</strong> Analytics and sign-in (if enabled)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How to Control Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How to Control Cookies</h2>
            
            <h3 className="text-xl font-medium mb-3">Browser Settings</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>View what cookies are stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block all cookies or third-party cookies</li>
              <li>Set preferences for certain websites</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Browser-Specific Instructions</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
            </ul>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-600 dark:text-yellow-400">
                ⚠️ <strong>Note:</strong> Blocking essential cookies will prevent you from logging in and using core 
                features of the Service.
              </p>
            </div>
          </section>

          {/* Do Not Track */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Do Not Track Signals</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some browsers have a "Do Not Track" (DNT) feature that signals to websites that you do not want your 
              online activity tracked. Currently, there is no uniform standard for how websites should respond to 
              DNT signals. We do not currently respond to DNT signals, but you can control cookies through your 
              browser settings as described above.
            </p>
          </section>

          {/* Similar Technologies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Similar Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              In addition to cookies, we may use other similar technologies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Local Storage:</strong> Stores data locally in your browser for faster performance</li>
              <li><strong>Session Storage:</strong> Temporary storage that is cleared when you close the browser</li>
              <li><strong>Pixel Tags:</strong> Small images used to track email opens and website visits</li>
            </ul>
          </section>

          {/* Updates to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other 
              operational, legal, or regulatory reasons. We will notify you of any material changes by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Posting the updated policy on this page</li>
              <li>Updating the "Last Updated" date</li>
              <li>Displaying a notice on the Service (for significant changes)</li>
            </ul>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Email: privacy@lynxxclub.com</li>
              <li>Address: [Your Company Address]</li>
            </ul>
          </section>

          {/* Your Consent */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <p className="text-foreground font-semibold text-center mb-4">
              BY CONTINUING TO USE THE SERVICE, YOU CONSENT TO OUR USE OF COOKIES AS DESCRIBED IN THIS POLICY.
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

export default Cookies;
