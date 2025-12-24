import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Guidelines = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Community Guidelines</h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          Lynxx Club is built on respect, safety, and genuine connections. These guidelines help create a positive 
          environment for everyone.
        </p>

        <div className="space-y-8 text-muted-foreground">
          {/* Be Respectful */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">✅ Be Respectful</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Treat all users with kindness and respect</li>
              <li>Accept "no" gracefully - respect boundaries</li>
              <li>Be patient with response times</li>
              <li>Use appropriate language</li>
              <li>Be honest in your profile and conversations</li>
            </ul>
          </section>

          {/* Stay Safe */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">🛡️ Stay Safe</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep conversations on the platform initially</li>
              <li>Meet in public places for first meetings</li>
              <li>Tell someone where you're going</li>
              <li>Never send money to other users</li>
              <li>Trust your instincts - report suspicious behavior</li>
              <li>Use the check-in feature for in-person dates</li>
            </ul>
          </section>

          {/* Prohibited Behavior */}
          <section className="bg-destructive/10 border border-destructive/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-destructive mb-4">❌ Prohibited Behavior</h2>
            <p className="mb-4 font-bold text-foreground">The following will result in immediate account termination:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Soliciting sexual services or escort services</strong></li>
              <li>Harassment, threats, or abuse</li>
              <li>Sharing explicit sexual content without consent</li>
              <li>Impersonation or catfishing</li>
              <li>Discrimination based on race, gender, religion, etc.</li>
              <li>Spamming or soliciting for commercial purposes</li>
              <li>Attempting to circumvent platform fees</li>
              <li>Creating multiple accounts to defraud</li>
              <li>Sharing personal contact info to avoid platform fees</li>
              <li>Any illegal activity</li>
            </ul>
          </section>

          {/* Profile Guidelines */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">📷 Profile Guidelines</h2>
            <p className="mb-4 text-foreground"><strong>Your profile should:</strong></p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Use recent, accurate photos of you</li>
              <li>Show your face clearly in at least one photo</li>
              <li>Be appropriate (no nudity or sexual content)</li>
              <li>Represent who you really are</li>
            </ul>
            <p className="mb-4 text-foreground"><strong>Do NOT:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use photos of celebrities or other people</li>
              <li>Use heavily filtered or misleading photos</li>
              <li>Include minors in your photos</li>
              <li>Display weapons, drugs, or illegal items</li>
              <li>Include offensive symbols or gestures</li>
            </ul>
          </section>

          {/* Messaging Guidelines */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-4">💬 Messaging Guidelines</h2>
            <p className="mb-4 text-foreground"><strong>Good conversation practices:</strong></p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Be genuine and engaged</li>
              <li>Ask questions and show interest</li>
              <li>Respond in a reasonable timeframe</li>
              <li>Keep the conversation light initially</li>
              <li>Respect if someone doesn't want to continue talking</li>
            </ul>
            <p className="mb-4 text-foreground"><strong>Do NOT:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send unsolicited explicit messages or photos</li>
              <li>Pressure someone for personal information</li>
              <li>Copy-paste generic messages to multiple people</li>
              <li>Share links to external sites or apps</li>
              <li>Request or share contact info to avoid fees</li>
            </ul>
          </section>

          {/* For Seekers */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">💳 For Seekers</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Understand that Earners are providing their time and attention</li>
              <li>Be respectful - paying for a conversation doesn't entitle you to disrespect</li>
              <li>Don't expect anything beyond conversation and companionship</li>
              <li>Leave honest ratings based on your experience</li>
              <li>Report any violations of platform rules</li>
            </ul>
          </section>

          {/* For Earners */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-4">💰 For Earners</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be responsive and engaged in conversations</li>
              <li>Set clear boundaries and stick to them</li>
              <li>Decline interactions you're uncomfortable with</li>
              <li>Maintain professionalism</li>
              <li>Report inappropriate requests immediately</li>
              <li>Understand you're being paid for time and attention only</li>
            </ul>
          </section>

          {/* Reporting */}
          <section className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">🚨 Reporting Violations</h2>
            <p className="mb-4 font-bold text-foreground">If you experience or witness a violation of these guidelines:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Use the "Report" button on the user's profile or in messages</li>
              <li>Provide specific details about the violation</li>
              <li>Include screenshots if possible</li>
              <li>For safety emergencies, contact local authorities first</li>
            </ul>
            <p>
              <strong className="text-foreground">We review all reports within 24 hours.</strong> False reports may result in action against your account.
            </p>
          </section>

          {/* Consequences */}
          <section className="bg-muted/50 border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold text-destructive mb-4">⚖️ Consequences</h2>
            <p className="mb-4 text-foreground">Violations may result in:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Warning:</strong> First-time minor violations</li>
              <li><strong>Temporary Suspension:</strong> 7-30 days for repeat or moderate violations</li>
              <li><strong>Permanent Ban:</strong> Serious violations (solicitation, harassment, fraud)</li>
              <li><strong>Legal Action:</strong> For illegal activity</li>
            </ul>
            <p className="mt-4 text-sm">
              Decisions are at our sole discretion. Banned users forfeit all credits and pending earnings.
            </p>
          </section>

          {/* Remember */}
          <section className="bg-primary/10 border border-primary/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">💜 Remember</h2>
            <p className="text-lg text-foreground">
              Lynxx Club works best when everyone follows these guidelines. Be kind, be safe, and be yourself. 
              Together, we create a community where genuine connections can flourish.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;
