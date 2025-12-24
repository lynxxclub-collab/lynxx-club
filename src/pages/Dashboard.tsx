import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, MessageSquare, Video } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!loading && profile) {
      if (profile.account_status !== 'active') {
        navigate('/onboarding');
        return;
      }
      if (profile.user_type !== 'earner') {
        navigate('/browse');
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Mock data for demonstration
  const recentActivity = [
    { type: 'message', amount: 1.40, from: 'John', time: '2 hours ago' },
    { type: 'video', amount: 21.00, from: 'Mike', time: 'Yesterday' },
    { type: 'withdrawal', amount: -50.00, from: null, time: 'Dec 20' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Earnings Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Available Balance */}
          <Card className="glass-card border-gold/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gold" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-gold">
                ${(profile?.earnings_balance || 0).toFixed(2)}
              </p>
              <Button className="mt-4 w-full bg-gold text-gold-foreground hover:bg-gold/90">
                Withdraw Money
              </Button>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">$84.00</p>
              <p className="text-sm text-muted-foreground mt-1">Released in 1-3 days</p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">$2,891.00</p>
              <p className="text-sm text-green-500 mt-1">+12% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'message' ? 'bg-primary/20 text-primary' :
                      activity.type === 'video' ? 'bg-teal/20 text-teal' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {activity.type === 'message' ? <MessageSquare className="w-5 h-5" /> :
                       activity.type === 'video' ? <Video className="w-5 h-5" /> :
                       <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        {activity.type === 'message' ? `Message from ${activity.from}` :
                         activity.type === 'video' ? `Video date with ${activity.from}` :
                         'Withdrawal'}
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${
                    activity.amount > 0 ? 'text-green-500' : 'text-destructive'
                  }`}>
                    {activity.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    ${Math.abs(activity.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Rates */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Your Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Text Message</p>
                <p className="font-semibold">20 credits</p>
                <p className="text-xs text-gold">You earn $1.40</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <MessageSquare className="w-6 h-6 text-teal mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Image</p>
                <p className="font-semibold">40 credits</p>
                <p className="text-xs text-gold">You earn $2.80</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Video className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video 30min</p>
                <p className="font-semibold">{profile?.video_30min_rate} credits</p>
                <p className="text-xs text-gold">
                  You earn ${((profile?.video_30min_rate || 300) * 0.10 * 0.70).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Video className="w-6 h-6 text-purple mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video 60min</p>
                <p className="font-semibold">{profile?.video_60min_rate} credits</p>
                <p className="text-xs text-gold">
                  You earn ${((profile?.video_60min_rate || 500) * 0.10 * 0.70).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
