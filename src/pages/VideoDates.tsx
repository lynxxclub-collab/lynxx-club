import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import VideoDateCard from '@/components/video/VideoDateCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Video, Calendar, DollarSign, History, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface VideoDate {
  id: string;
  scheduled_start: string;
  scheduled_duration: number;
  credits_reserved: number;
  earner_amount: number;
  status: string;
  daily_room_url: string | null;
  seeker_id: string;
  earner_id: string;
  seeker_profile?: {
    id: string;
    name: string | null;
    profile_photos: string[] | null;
  };
  earner_profile?: {
    id: string;
    name: string | null;
    profile_photos: string[] | null;
  };
}

export default function VideoDates() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [upcomingDates, setUpcomingDates] = useState<VideoDate[]>([]);
  const [pastDates, setPastDates] = useState<VideoDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPastDates, setShowPastDates] = useState(false);

  const isSeeker = profile?.user_type === 'seeker';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchVideoDates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Fetch upcoming dates
      const { data: upcoming, error: upcomingError } = await supabase
        .from('video_dates')
        .select('*')
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true });

      if (upcomingError) throw upcomingError;

      // Fetch past dates
      const { data: past, error: pastError } = await supabase
        .from('video_dates')
        .select('*')
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .in('status', ['completed', 'cancelled'])
        .order('scheduled_start', { ascending: false })
        .limit(20);

      if (pastError) throw pastError;

      // Fetch profiles for all dates
      const allDates = [...(upcoming || []), ...(past || [])];
      const userIds = new Set<string>();
      allDates.forEach(d => {
        userIds.add(d.seeker_id);
        userIds.add(d.earner_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, profile_photos')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Attach profiles to dates
      const attachProfiles = (dates: any[]) => dates.map(d => ({
        ...d,
        seeker_profile: profileMap.get(d.seeker_id),
        earner_profile: profileMap.get(d.earner_id)
      }));

      setUpcomingDates(attachProfiles(upcoming || []));
      setPastDates(attachProfiles(past || []));
    } catch (error) {
      console.error('Error fetching video dates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideoDates();
    }
  }, [user]);

  // Calculate total earnings for earners
  const totalEarnings = pastDates
    .filter(d => d.status === 'completed' && d.earner_id === user?.id)
    .reduce((sum, d) => sum + d.earner_amount, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container py-6 max-w-2xl">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Video Dates</h1>
            <p className="text-muted-foreground text-sm">
              {isSeeker ? 'Your scheduled video calls' : 'Your upcoming and past calls'}
            </p>
          </div>
        </div>

        {/* Upcoming Dates */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming ({upcomingDates.length})
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-14 h-14 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingDates.length === 0 ? (
            <Card className="bg-secondary/30">
              <CardContent className="p-8 text-center">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No upcoming video dates</p>
                {isSeeker && (
                  <Button onClick={() => navigate('/browse')} variant="outline">
                    Browse Profiles
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingDates.map(date => (
                <VideoDateCard
                  key={date.id}
                  videoDate={date}
                  otherPerson={isSeeker ? date.earner_profile! : date.seeker_profile!}
                  isSeeker={isSeeker}
                  onCancelled={fetchVideoDates}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Dates Summary */}
        <section>
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Past Dates ({pastDates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isSeeker && pastDates.length > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-teal/10 border border-teal/20">
                  <DollarSign className="w-5 h-5 text-teal" />
                  <span className="text-sm text-muted-foreground">Total earned from videos:</span>
                  <span className="font-semibold text-teal">${totalEarnings.toFixed(2)}</span>
                </div>
              )}

              {showPastDates ? (
                <div className="space-y-3">
                  {pastDates.map(date => (
                    <div 
                      key={date.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          date.status === 'completed' ? 'bg-teal' : 'bg-destructive'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">
                            {isSeeker 
                              ? date.earner_profile?.name 
                              : date.seeker_profile?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(date.scheduled_start), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {date.scheduled_duration} min
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {date.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => setShowPastDates(true)}
                >
                  <span>View History</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
