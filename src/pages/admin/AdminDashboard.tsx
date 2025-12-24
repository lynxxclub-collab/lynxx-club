import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Activity,
  DollarSign,
  Heart,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Video,
  CreditCard
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  revenueToday: number;
  pendingStories: number;
  pendingFraudFlags: number;
  pendingWithdrawals: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'video_date' | 'success_story' | 'withdrawal';
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    revenueToday: 0,
    pendingStories: 0,
    pendingFraudFlags: 0,
    pendingWithdrawals: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active users (created in last 7 days as proxy)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'active');

      // Revenue today (platform fees from transactions)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('usd_amount')
        .gte('created_at', today.toISOString())
        .not('usd_amount', 'is', null);

      const revenueToday = transactions?.reduce((sum, t) => 
        sum + Math.abs(Number(t.usd_amount) || 0) * 0.30, 0) || 0;

      // Pending success story reviews
      const { count: pendingStories } = await supabase
        .from('success_stories')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');

      // Pending fraud flags
      const { count: pendingFraudFlags } = await supabase
        .from('fraud_flags')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      // Pending withdrawals
      const { count: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        revenueToday: Math.round(revenueToday * 100) / 100,
        pendingStories: pendingStories || 0,
        pendingFraudFlags: pendingFraudFlags || 0,
        pendingWithdrawals: pendingWithdrawals || 0
      });

      // Recent activity
      const activities: RecentActivity[] = [];

      // Recent users
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      recentUsers?.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user',
          message: `New user: ${user.name || 'Anonymous'} joined`,
          timestamp: user.created_at || ''
        });
      });

      // Recent video dates
      const { data: recentVideoDates } = await supabase
        .from('video_dates')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(2);

      recentVideoDates?.forEach(vd => {
        activities.push({
          id: vd.id,
          type: 'video_date',
          message: `Video date ${vd.status}`,
          timestamp: vd.created_at
        });
      });

      // Recent success stories
      const { data: recentStories } = await supabase
        .from('success_stories')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(2);

      recentStories?.forEach(story => {
        activities.push({
          id: story.id,
          type: 'success_story',
          message: `Success story submitted (${story.status})`,
          timestamp: story.created_at || ''
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function getActivityIcon(type: RecentActivity['type']) {
    switch (type) {
      case 'user': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'video_date': return <Video className="h-4 w-4 text-blue-500" />;
      case 'success_story': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'withdrawal': return <CreditCard className="h-4 w-4 text-orange-500" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Overview</h2>
        <p className="text-muted-foreground">Welcome to the Lynxx Club admin dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Today
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenueToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingStories}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/success-stories">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Review Success Stories
                </span>
                <div className="flex items-center gap-2">
                  {stats.pendingStories > 0 && (
                    <Badge variant="secondary">{stats.pendingStories}</Badge>
                  )}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>

            <Link to="/admin/fraud-flags">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Review Fraud Flags
                </span>
                <div className="flex items-center gap-2">
                  {stats.pendingFraudFlags > 0 && (
                    <Badge variant="destructive">{stats.pendingFraudFlags}</Badge>
                  )}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>

            <Link to="/admin/transactions">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Approve Withdrawals
                </span>
                <div className="flex items-center gap-2">
                  {stats.pendingWithdrawals > 0 && (
                    <Badge variant="secondary">{stats.pendingWithdrawals}</Badge>
                  )}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
