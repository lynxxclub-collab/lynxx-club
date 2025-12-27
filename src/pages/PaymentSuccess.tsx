import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="border-primary/20 shadow-lg overflow-hidden">
            {/* Confetti decoration */}
            <div className="h-2 bg-gradient-to-r from-primary via-yellow-500 to-primary" />
            
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              {/* Success icon with animation */}
              <div className="relative inline-flex">
                <div className="absolute inset-0 animate-ping bg-green-500/20 rounded-full" />
                <div className="relative bg-green-500/10 rounded-full p-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
              </div>

              {/* Success message */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Payment Successful!
                </h1>
                <p className="text-muted-foreground">
                  Your credits have been added to your account.
                </p>
              </div>

              {/* Credits indicator */}
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-4 py-2 rounded-full">
                <Coins className="h-5 w-5" />
                <span className="font-semibold">Credits Added</span>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
                size="lg"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Auto-redirect notice */}
              <p className="text-sm text-muted-foreground">
                Redirecting automatically in {countdown} seconds...
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PaymentSuccess;
