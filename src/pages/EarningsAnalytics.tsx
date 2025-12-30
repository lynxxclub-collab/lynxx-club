import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/layout/MobileNav';
import BackgroundEffects from '@/components/BackgroundEffects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  Download,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  usd_amount: number | null;
  created_at: string;
  description: string | null;
}

interface DailyEarning {
  date: string;
  amount: number;
  messages: number;
  videoDates: number;
}

const COLORS = ['#8b5cf6', '#f59e0b'];

export default function EarningsAnalytics() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    periodEarnings: 0,
    averageDaily: 0,
    bestDay: 0,
    messageEarnings: 0,
    videoEarnings: 0,
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && profile?.user_type !== 'earner') navigate('/dashboard');
  }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const daysAgo = dateRange === 'all' ? 365 : parseInt(dateRange);
      const startDate = subDays(new Date(), daysAgo);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('transaction_type', ['earning', 'video_earning'])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTransactions(data || []);
      processAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (txns: Transaction[]) => {
    // Calculate totals
    let totalEarnings = 0;
    let messageEarnings = 0;
    let videoEarnings = 0;

    txns.forEach((tx) => {
      const amount = tx.usd_amount || 0;
      totalEarnings += amount;
      if (tx.transaction_type === 'earning') {
        messageEarnings += amount;
      } else if (tx.transaction_type === 'video_earning') {
        videoEarnings += amount;
      }
    });

    // Group by day
    const dailyMap = new Map<string, DailyEarning>();
    txns.forEach((tx) => {
      const date = format(parseISO(tx.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || { date, amount: 0, messages: 0, videoDates: 0 };
      existing.amount += tx.usd_amount || 0;
      if (tx.transaction_type === 'earning') existing.messages++;
      if (tx.transaction_type === 'video_earning') existing.videoDates++;
      dailyMap.set(date, existing);
    });

    const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    setDailyEarnings(dailyData);

    // Calculate stats
    const bestDay = dailyData.reduce((max, d) => Math.max(max, d.amount), 0);
    const averageDaily = dailyData.length > 0 ? totalEarnings / dailyData.length : 0;

    // Week over week comparison
    const now = new Date();
    const thisWeekStart = subDays(now, 7);
    const lastWeekStart = subDays(now, 14);
    
    let thisWeek = 0;
    let lastWeek = 0;
    let thisMonth = 0;
    let lastMonth = 0;

    txns.forEach((tx) => {
      const txDate = parseISO(tx.created_at);
      const amount = tx.usd_amount || 0;
      
      if (txDate >= thisWeekStart) thisWeek += amount;
      else if (txDate >= lastWeekStart) lastWeek += amount;
      
      if (txDate >= subDays(now, 30)) thisMonth += amount;
      else if (txDate >= subDays(now, 60)) lastMonth += amount;
    });

    setStats({
      totalEarnings,
      periodEarnings: totalEarnings,
      averageDaily,
      bestDay,
      messageEarnings,
      videoEarnings,
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
    });
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Description'];
    const rows = transactions.map((tx) => [
      format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm'),
      tx.transaction_type,
      tx.usd_amount?.toFixed(2) || '0.00',
      tx.description || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Earnings exported!');
  };

  const pieData = [
    { name: 'Messages', value: stats.messageEarnings },
    { name: 'Video Dates', value: stats.videoEarnings },
  ];

  const topDays = [...dailyEarnings]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((d) => ({ ...d, date: format(parseISO(d.date), 'MMM d') }));

  const weekChange = stats.lastWeek > 0 
    ? ((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100 
    : 0;
  const monthChange = stats.lastMonth > 0 
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 
    : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      <BackgroundEffects />
      <div className="relative z-10">
        <Header />
        
        <div className="container max-w-6xl py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mb-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Earnings Analytics
              </h1>
              <p className="text-white/50">Track your earnings performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <TabsList className="bg-white/[0.02] border border-white/10">
                  <TabsTrigger value="7" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">7D</TabsTrigger>
                  <TabsTrigger value="30" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">30D</TabsTrigger>
                  <TabsTrigger value="90" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">90D</TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                onClick={exportCSV}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Total Earnings</span>
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">This Period</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.periodEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Avg Daily</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.averageDaily.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-sm">Best Day</span>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.bestDay.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Line Chart - Earnings Trend */}
            <Card className="bg-white/[0.02] border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white text-lg">Earnings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        tickFormatter={(v) => format(parseISO(v), 'MMM d')}
                      />
                      <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                        labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={false}
                        fill="url(#amberGradient)"
                      />
                      <defs>
                        <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart - Earnings by Source */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">By Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-white/70 text-sm">Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-white/70 text-sm">Video Dates</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Days */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Top Performing Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDays} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.5)" tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="date" stroke="rgba(255,255,255,0.5)" width={60} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                      />
                      <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Metrics */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-white/50 text-sm">This Week vs Last Week</p>
                    <p className="text-xl font-bold text-white">${stats.thisWeek.toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {weekChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="font-semibold">{Math.abs(weekChange).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-white/50 text-sm">This Month vs Last Month</p>
                    <p className="text-xl font-bold text-white">${stats.thisMonth.toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${monthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {monthChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="font-semibold">{Math.abs(monthChange).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-purple-300 text-sm">Avg per Message</p>
                    <p className="text-xl font-bold text-white">
                      ${transactions.filter(t => t.transaction_type === 'earning').length > 0
                        ? (stats.messageEarnings / transactions.filter(t => t.transaction_type === 'earning').length).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-300 text-sm">Avg per Video</p>
                    <p className="text-xl font-bold text-white">
                      ${transactions.filter(t => t.transaction_type === 'video_earning').length > 0
                        ? (stats.videoEarnings / transactions.filter(t => t.transaction_type === 'video_earning').length).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
        <MobileNav />
      </div>
    </div>
  );
}