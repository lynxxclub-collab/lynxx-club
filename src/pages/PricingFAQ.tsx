import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import PricingFAQ from '@/components/faq/PricingFAQ';
import CreatorPayoutFAQ from '@/components/faq/CreatorPayoutFAQ';

export default function PricingFAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Pricing & Payout FAQ</h1>
        <p className="text-muted-foreground mb-8">
          Everything you need to know about credits, pricing, and payouts on Lynxx Club.
        </p>

        {/* User Pricing FAQ */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>For Users</CardTitle>
          </CardHeader>
          <CardContent>
            <PricingFAQ showTitle={false} />
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Creator Payout FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>For Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatorPayoutFAQ showTitle={false} />
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <div className="mt-8 p-6 rounded-lg bg-secondary/50 border border-border">
          <h3 className="font-semibold mb-4">Quick Reference</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Interaction Costs</h4>
              <ul className="space-y-1 text-sm">
                <li>Text message: <span className="font-medium">5 credits</span></li>
                <li>Image unlock: <span className="font-medium">10 credits</span></li>
                <li>Video: <span className="font-medium">200–900 credits</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Creator Earnings</h4>
              <ul className="space-y-1 text-sm">
                <li>Revenue share: <span className="font-medium">70%</span></li>
                <li>Minimum payout: <span className="font-medium">$25</span></li>
                <li>Processing delay: <span className="font-medium">48 hours</span></li>
                <li>Payout schedule: <span className="font-medium">Weekly (Fridays)</span></li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
