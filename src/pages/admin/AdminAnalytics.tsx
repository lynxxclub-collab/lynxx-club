import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, Users, DollarSign, MessageSquare, Video, Heart, TrendingUp, Star } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface Metrics {
  userGrowth: { date: string; count: number; cumulative: number }[];
  revenue: { date: string; revenue: number; platformFees: number }[];
  engagement: {
    messages: number;
    videoDates: number;
    avgVideoLength: number;
  };
  successStories: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  topEarners: {
    id: string;
    name: string | null;
    earnings_balance: number;
    average_rating: number | null;
  }[];
  userStats: {
    totalUsers: number;
    newUsers: number;
    seekers: number;
    earners: number;
  };
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    userGrowth: [],
    revenue: [],
    engagement: { messages: 0, videoDates: 0, avgVideoLength: 0 },
    successStories: { total: 0, approved: 0, rejected: 0, pending: 0 },
    topEarners: [],
    userStats: { totalUsers: 0, newUsers: 0, seekers: 0, earners: 0 },
  });

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  function getStartDate(range: string): Date {
    const now = new Date();
    if (range === '7days') return subDays(now, 7);
    if (range === '30days') return subDays(now, 30);
    if (range === '90days') return subDays(now, 90);
    return subDays(now, 365);
  }

  async function loadMetrics() {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);
      const startDateStr = startDate.toISOString();

      // Load all data in parallel
      const [
        usersResult,
        transactionsResult,
        messagesResult,
        videoDatesResult,
        storiesResult,
        topEarnersResult,
        totalUsersResult,
      ] = await Promise.all([
        supabase.from('profiles').select('created_at, user_type').gte('created_at', startDateStr),
        supabase.from('transactions').select('created_at, usd_amount, transaction_type').gte('created_at', startDateStr).eq('status', 'completed'),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
        supabase.from('video_dates').select('id, scheduled_duration', { count: 'exact' }).gte('created_at', startDateStr).eq('status', 'completed'),
        supabase.from('success_stories').select('status').gte('created_at', startDateStr),
        supabase.from('profiles').select('id, name, earnings_balance, average_rating').eq('user_type', 'earner').order('earnings_balance', { ascending: false }).limit(10),
        supabase.from('profiles').select('id, user_type', { count: 'exact' }),
      ]);

      // Process user growth
      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      const usersByDay: Record<string, number> = {};
      
      usersResult.data?.forEach((user) => {
        const date = format(startOfDay(new Date(user.created_at!)), 'MMM dd');
        usersByDay[date] = (usersByDay[date] || 0) + 1;
      });

      let cumulative = 0;
      const userGrowth = days.map((day) => {
        const date = format(day, 'MMM dd');
        const count = usersByDay[date] || 0;
        cumulative += count;
        return { date, count, cumulative };
      });

      // Process revenue
      const revenueByDay: Record<string, { revenue: number; platformFees: number }> = {};
      
      transactionsResult.data?.forEach((t) => {
        const date = format(startOfDay(new Date(t.created_at)), 'MMM dd');
        if (!revenueByDay[date]) revenueByDay[date] = { revenue: 0, platformFees: 0 };
        
        const amount = Math.abs(Number(t.usd_amount) || 0);
        if (t.transaction_type === 'credit_purchase') {
          revenueByDay[date].revenue += amount;
        } else if (['message_sent', 'video_date'].includes(t.transaction_type)) {
          revenueByDay[date].platformFees += amount * 0.30;
        }
      });

      const revenue = days.map((day) => {
        const date = format(day, 'MMM dd');
        const data = revenueByDay[date] || { revenue: 0, platformFees: 0 };
        return { 
          date, 
          revenue: Math.round(data.revenue * 100) / 100,
          platformFees: Math.round(data.platformFees * 100) / 100
        };
      });

      // Calculate engagement
      const avgVideoLength = videoDatesResult.data?.length
        ? videoDatesResult.data.reduce((acc, vd) => acc + (vd.scheduled_duration || 0), 0) / videoDatesResult.data.length
        : 0;

      // Process success stories
      const stories = storiesResult.data || [];
      const successStories = {
        total: stories.length,
        approved: stories.filter((s) => s.status === 'approved').length,
        rejected: stories.filter((s) => s.status.includes('rejected')).length,
        pending: stories.filter((s) => ['pending_partner_confirmation', 'pending_review', 'survey_pending'].includes(s.status)).length,
      };

      // User stats
      const allUsers = totalUsersResult.data || [];
      const userStats = {
        totalUsers: totalUsersResult.count || 0,
        newUsers: usersResult.data?.length || 0,
        seekers: allUsers.filter((u) => u.user_type === 'seeker').length,
        earners: allUsers.filter((u) => u.user_type === 'earner').length,
      };

      setMetrics({
        userGrowth,
        revenue,
        engagement: {
          messages: messagesResult.count || 0,
          videoDates: videoDatesResult.count || 0,
          avgVideoLength: Math.round(avgVideoLength),
        },
        successStories,
        topEarners: (topEarnersResult.data || []).map(e => ({
          ...e,
          earnings_balance: Number(e.earnings_balance) || 0
        })),
        userStats,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    let csv = 'Lynxx Club Analytics Report\n';
    csv += `Date Range: ${dateRange}\n`;
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    csv += 'User Growth\n';
    csv += 'Date,New Users,Cumulative\n';
    metrics.userGrowth.forEach((row) => {
      csv += `${row.date},${row.count},${row.cumulative}\n`;
    });
    csv += '\n';

    csv += 'Revenue\n';
    csv += 'Date,Total Revenue,Platform Fees\n';
    metrics.revenue.forEach((row) => {
      csv += `${row.date},${row.revenue},${row.platformFees}\n`;
    });
    csv += '\n';

    csv += 'Engagement Metrics\n';
    csv += `Messages Sent,${metrics.engagement.messages}\n`;
    csv += `Video Dates,${metrics.engagement.videoDates}\n`;
    csv += `Avg Video Length (mins),${metrics.engagement.avgVideoLength}\n\n`;

    csv += 'Success Stories\n';
    csv += `Total,${metrics.successStories.total}\n`;
    csv += `Approved,${metrics.successStories.approved}\n`;
    csv += `Rejected,${metrics.successStories.rejected}\n`;
    csv += `Pending,${metrics.successStories.pending}\n\n`;

    csv += 'Top Earners\n';
    csv += 'Name,Earnings,Rating\n';
    metrics.topEarners.forEach((earner) => {
      csv += `${earner.name || 'Unknown'},${earner.earnings_balance},${earner.average_rating || 'N/A'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lynxx-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  const totalRevenue = metrics.revenue.reduce((acc, r) => acc + r.revenue, 0);
  const totalFees = metrics.revenue.reduce((acc, r) => acc + r.platformFees, 0);

  const pieData = [
    { name: 'Approved', value: metrics.successStories.approved, color: '#22c55e' },
    { name: 'Rejected', value: metrics.successStories.rejected, color: '#ef4444' },
    { name: 'Pending', value: metrics.successStories.pending, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
          <p className="text-white/60">Platform performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10">
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="365days">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" className="border-white/10 text-white hover:bg-white/10">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Users</p>
                <p className="text-2xl font-bold text-white">{metrics.userStats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">New Users</p>
                <p className="text-2xl font-bold text-white">+{metrics.userStats.newUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Platform Fees</p>
                <p className="text-2xl font-bold text-white">${totalFees.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Seekers: </span>
                <span className="font-semibold">{metrics.userStats.seekers}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Earners: </span>
                <span className="font-semibold">{metrics.userStats.earners}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.revenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="platformFees" fill="hsl(var(--muted-foreground))" name="Platform Fees" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement & Success Stories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Messages Sent</span>
              </div>
              <span className="font-bold">{metrics.engagement.messages.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span>Video Dates</span>
              </div>
              <span className="font-bold">{metrics.engagement.videoDates.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span>Avg Video Length</span>
              </div>
              <span className="font-bold">{metrics.engagement.avgVideoLength} mins</span>
            </div>
          </CardContent>
        </Card>

        {/* Success Stories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.successStories.total > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Approved: {metrics.successStories.approved}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Rejected: {metrics.successStories.rejected}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending: {metrics.successStories.pending}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No success stories yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Earners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topEarners.length > 0 ? (
              <div className="space-y-3">
                {metrics.topEarners.slice(0, 5).map((earner, index) => (
                  <div key={earner.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-5">{index + 1}.</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {earner.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${earner.earnings_balance.toLocaleString()}</div>
                      {earner.average_rating !== null && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {Number(earner.average_rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No earners yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
