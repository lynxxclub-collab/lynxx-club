import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BackgroundEffects from '@/components/BackgroundEffects';
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Heart,
  Home,
} from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  display_name: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function ApplicationStatus() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('creator_applications')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setApplication({
            id: data.id,
            display_name: data.display_name,
            status: data.status,
            created_at: data.created_at || new Date().toISOString(),
            reviewed_at: data.reviewed_at,
            review_notes: data.review_notes
          });
        }
      } catch (error) {
        console.error('Error fetching application:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApplication();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background">
        <BackgroundEffects />
        <div className="relative z-10 container max-w-lg mx-auto py-20 px-4">
          <Card className="glass-card">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">No Application Found</h3>
              <p className="text-muted-foreground mb-6">
                You haven't submitted a creator application yet.
              </p>
              <Link to="/">
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStatusContent = () => {
    switch (application.status) {
      case 'pending':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">
              Under Review
            </Badge>
            <h3 className="text-2xl font-display font-bold mb-3">Application Pending</h3>
            <p className="text-muted-foreground mb-6">
              We're reviewing your application to become a Lynxx Club creator. You'll hear from us within 48 hours.
            </p>
            <div className="p-4 rounded-xl bg-muted/50 text-left space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Submitted:</span>{' '}
                <span className="font-medium">{format(new Date(application.created_at), 'PPp')}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{application.display_name}</span>
              </p>
            </div>
          </>
        );

      case 'approved':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
              Approved!
            </Badge>
            <h3 className="text-2xl font-display font-bold mb-3">Welcome to Lynxx Club!</h3>
            <p className="text-muted-foreground mb-6">
              Congratulations! Your creator application has been approved. Complete your profile setup to start earning.
            </p>
            <Button 
              onClick={() => navigate('/onboarding')}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400"
            >
              Complete Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        );

      case 'rejected':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <Badge variant="destructive" className="mb-4">
              Not Approved
            </Badge>
            <h3 className="text-2xl font-display font-bold mb-3">Application Not Approved</h3>
            <p className="text-muted-foreground mb-6">
              Unfortunately, we're unable to accept your creator application at this time.
            </p>
            {application.review_notes && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6 text-left">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{application.review_notes}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              You can still join Lynxx Club as a seeker and connect with creators.
            </p>
            <Link to="/auth?type=seeker">
              <Button variant="outline">
                Join as Seeker
              </Button>
            </Link>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <BackgroundEffects />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-display">
                Lynxx Club
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 container max-w-lg mx-auto py-12 px-4">
        <Card className="glass-card">
          <CardContent className="pt-8 pb-8 text-center">
            {renderStatusContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
