import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Guidelines = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Community Guidelines</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: December 24, 2025
        </p>

        <div className="space-y-10">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Welcome to Lynxx Club</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lynxx Club is a platform for meaningful connections. Our community guidelines ensure everyone has a 
              safe, respectful, and enjoyable experience. These guidelines apply to all users, whether you're a 
              Seeker or an Earner.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Violating these guidelines may result in warnings, temporary suspensions, or permanent bans, depending 
              on the severity and frequency of violations.
            </p>
          </section>

          {/* Core Values */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Core Values</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">🤝 Respect</h3>
                <p className="text-sm text-muted-foreground">Treat everyone with dignity and kindness, regardless of differences.</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">🔒 Safety</h3>
                <p className="text-sm text-muted-foreground">Prioritize your safety and the safety of others at all times.</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">✨ Authenticity</h3>
                <p className="text-sm text-muted-foreground">Be genuine in your profile and interactions.</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">💬 Communication</h3>
                <p className="text-sm text-muted-foreground">Communicate clearly and honestly with your matches.</p>
              </div>
            </div>
          </section>

          {/* Be Authentic */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Be Authentic</h2>
            
            <h3 className="text-xl font-medium mb-3">✅ DO:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Use recent photos that accurately represent you</li>
              <li>Provide truthful information about yourself</li>
              <li>Be honest about your intentions and expectations</li>
              <li>Use your real name (or a consistent nickname)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">❌ DON'T:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Use fake photos or heavily edited images that misrepresent you</li>
              <li>Lie about your age, location, or other key details</li>
              <li>Impersonate another person or celebrity</li>
              <li>Create multiple accounts</li>
              <li>Use AI-generated photos as your profile pictures</li>
            </ul>
          </section>

          {/* Be Respectful */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Be Respectful</h2>
            
            <h3 className="text-xl font-medium mb-3">✅ DO:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Treat all users with courtesy and respect</li>
              <li>Accept rejection gracefully</li>
              <li>Respect boundaries when someone says no</li>
              <li>Keep conversations appropriate and consensual</li>
              <li>Be punctual for scheduled video dates</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">❌ DON'T:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Send unsolicited explicit content</li>
              <li>Harass, stalk, or repeatedly contact someone who isn't interested</li>
              <li>Use hate speech, slurs, or discriminatory language</li>
              <li>Bully, intimidate, or threaten other users</li>
              <li>Make derogatory comments about race, gender, sexuality, religion, or disability</li>
              <li>Ghost scheduled video dates without notice</li>
            </ul>
          </section>

          {/* Keep It Legal */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Keep It Legal</h2>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-destructive font-medium">
                ⚠️ ZERO TOLERANCE POLICY: The following activities will result in immediate permanent ban and may be reported to law enforcement.
              </p>
            </div>

            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Sexual Services:</strong> Soliciting, offering, or arranging escort or prostitution services</li>
              <li><strong>Minors:</strong> Any sexual content involving minors or attempts to contact minors</li>
              <li><strong>Human Trafficking:</strong> Any activity related to human trafficking or exploitation</li>
              <li><strong>Drugs:</strong> Buying, selling, or promoting illegal drugs</li>
              <li><strong>Violence:</strong> Threats of violence or promotion of violent acts</li>
              <li><strong>Fraud:</strong> Scamming, catfishing, or financial fraud</li>
              <li><strong>Extortion:</strong> Blackmail or sextortion attempts</li>
            </ul>
          </section>

          {/* Messaging Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Messaging Guidelines</h2>
            
            <h3 className="text-xl font-medium mb-3">✅ DO:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Start with a friendly, personalized greeting</li>
              <li>Ask questions and show genuine interest</li>
              <li>Be patient waiting for responses</li>
              <li>Keep conversations within the platform</li>
              <li>Clearly communicate your intentions</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">❌ DON'T:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Send copy-paste messages to multiple users</li>
              <li>Immediately ask for personal contact information</li>
              <li>Send explicit messages without mutual consent</li>
              <li>Spam or send excessive messages</li>
              <li>Share personal contact info to avoid platform fees</li>
              <li>Request or share financial information</li>
            </ul>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-600 dark:text-yellow-400">
                💡 <strong>Tip:</strong> Quality over quantity! Thoughtful messages are more likely to get responses than generic ones.
              </p>
            </div>
          </section>

          {/* Video Date Etiquette */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Video Date Etiquette</h2>
            
            <h3 className="text-xl font-medium mb-3">Before the Date:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Confirm the date 24 hours in advance</li>
              <li>Test your camera and microphone</li>
              <li>Choose a quiet, well-lit location</li>
              <li>Dress appropriately</li>
              <li>Cancel at least 2 hours in advance if needed</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">During the Date:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Be present and engaged</li>
              <li>Maintain appropriate attire throughout</li>
              <li>Keep the conversation respectful</li>
              <li>Don't record or screenshot without consent</li>
              <li>If uncomfortable, you can end the call at any time</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">After the Date:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Leave an honest, constructive rating</li>
              <li>Report any inappropriate behavior</li>
              <li>Don't share private details from the conversation</li>
            </ul>
          </section>

          {/* Profile Photo Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Profile Photo Guidelines</h2>
            
            <h3 className="text-xl font-medium mb-3">✅ Acceptable Photos:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Clear, recent photos of you</li>
              <li>Face clearly visible in at least one photo</li>
              <li>Casual or formal attire</li>
              <li>Photos showing your interests and personality</li>
              <li>Group photos (where you're identifiable)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">❌ Not Allowed:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Nudity or sexually explicit content</li>
              <li>Photos of other people without their consent</li>
              <li>Photos containing minors</li>
              <li>Violent or graphic imagery</li>
              <li>Copyrighted images you don't own</li>
              <li>Photos with weapons prominently displayed</li>
              <li>Memes, text overlays, or screenshots</li>
              <li>AI-generated images misrepresenting yourself</li>
            </ul>
          </section>

          {/* For Earners */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Guidelines for Earners</h2>
            
            <h3 className="text-xl font-medium mb-3">Professional Conduct:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Respond to messages in a timely manner</li>
              <li>Be reliable for scheduled video dates</li>
              <li>Provide genuine conversation and connection</li>
              <li>Set clear boundaries and expectations</li>
              <li>Maintain a complete and attractive profile</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">What's NOT Allowed:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Offering services outside Lynxx Club's scope</li>
              <li>Requesting off-platform payments</li>
              <li>Leading Seekers on without genuine interest</li>
              <li>Manipulating ratings or reviews</li>
              <li>Creating fake urgency or pressure</li>
            </ul>
          </section>

          {/* For Seekers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Guidelines for Seekers</h2>
            
            <h3 className="text-xl font-medium mb-3">Respectful Engagement:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Understand that Earners are providing their time and attention</li>
              <li>Respect boundaries set by Earners</li>
              <li>Pay for services through the platform</li>
              <li>Provide honest, fair ratings after interactions</li>
              <li>Report any suspicious activity</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">What's NOT Allowed:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Expecting services beyond companionship and conversation</li>
              <li>Pressuring Earners to break platform rules</li>
              <li>Requesting off-platform communication to avoid fees</li>
              <li>Leaving unfair or retaliatory ratings</li>
              <li>Disputing legitimate charges fraudulently</li>
            </ul>
          </section>

          {/* In-Person Meetings */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. In-Person Meeting Safety</h2>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                ⚠️ While Lynxx Club facilitates connections, in-person meetings are at your own risk. We strongly recommend following these safety guidelines.
              </p>
            </div>

            <h3 className="text-xl font-medium mb-3">Before Meeting:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Have multiple video dates first</li>
              <li>Verify the person through video chat</li>
              <li>Tell a friend or family member your plans</li>
              <li>Share your location with someone you trust</li>
              <li>Arrange your own transportation</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">During the Meeting:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Meet in a public place</li>
              <li>Stay in public for the first few meetings</li>
              <li>Don't leave drinks unattended</li>
              <li>Trust your instincts - leave if uncomfortable</li>
              <li>Keep your phone charged and accessible</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Never:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Go to a private location on a first meeting</li>
              <li>Share your home address</li>
              <li>Send money to someone you haven't met</li>
              <li>Feel pressured to do anything uncomfortable</li>
            </ul>
          </section>

          {/* Reporting */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Reporting Violations</h2>
            
            <p className="text-muted-foreground leading-relaxed mb-4">
              Help us maintain a safe community by reporting violations. You can report:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Harassment or threatening behavior</li>
              <li>Fake profiles or impersonation</li>
              <li>Solicitation of illegal services</li>
              <li>Scams or fraudulent activity</li>
              <li>Inappropriate content</li>
              <li>Underage users</li>
              <li>Any other Terms of Service violations</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">How to Report:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Use the "Report" button on any profile or message</li>
              <li>Email: safety@lynxxclub.com</li>
              <li>Include screenshots if possible</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed">
              All reports are confidential. We investigate every report and take appropriate action.
            </p>
          </section>

          {/* Consequences */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Consequences of Violations</h2>
            
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">⚠️ Warning</h3>
                <p className="text-sm text-muted-foreground">First-time minor violations may result in a warning.</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">⏸️ Temporary Suspension</h3>
                <p className="text-sm text-muted-foreground">Repeated or moderate violations may result in temporary account suspension (24 hours to 30 days).</p>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-2">🚫 Permanent Ban</h3>
                <p className="text-sm text-muted-foreground">Severe violations or repeated offenses result in permanent account termination. Credits are forfeited and earnings may be withheld.</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Questions?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about these guidelines, contact us at:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>General: support@lynxxclub.com</li>
              <li>Safety concerns: safety@lynxxclub.com</li>
              <li>Report violations: Use the in-app Report feature</li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <p className="text-foreground font-semibold text-center mb-4">
              BY USING LYNXX CLUB, YOU AGREE TO FOLLOW THESE COMMUNITY GUIDELINES.
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

export default Guidelines;
