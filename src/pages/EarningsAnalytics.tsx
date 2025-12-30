import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Gift,
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  usd_amount: number | null;
  created_at: string;
  description: string | null;
}

interface GiftTransaction {
  id: string;
  credits_spent: number;
  gross_value_usd: number;
  earner_amount: number;
  platform_fee: number;
  credit_to_usd_rate: number;
  created_at: string;
  message: string | null;
  thank_you_reaction: string | null;
  sender_id: string;
  gift_id: string;
}

interface DailyEarning {
  date: string;
  amount: number;
  messages: number;
  videoDates: number;
  gifts: number;
}

const COLORS = ['#8b5cf6', '#f59e0b', '#f43f5e'];

export default function EarningsAnalytics() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [giftDetails, setGiftDetails] = useState<Map<string, { name: string; emoji: string }>>(new Map());
  const [senderNames, setSenderNames] = useState<Map<string, string>>(new Map());
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    periodEarnings: 0,
    averageDaily: 0,
    bestDay: 0,
    messageEarnings: 0,
    videoEarnings: 0,
    giftEarnings: 0,
    giftCount: 0,
    giftGrossValue: 0,
    platformFees: 0,
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

      // Fetch regular transactions
      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('transaction_type', ['earning', 'video_earning'])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (txnError) throw txnError;

      // Fetch gift transactions
      const { data: giftData, error: giftError } = await supabase
        .from('gift_transactions')
        .select('id, credits_spent, gross_value_usd, earner_amount, platform_fee, credit_to_usd_rate, created_at, message, thank_you_reaction, sender_id, gift_id')
        .eq('recipient_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (giftError) throw giftError;

      // Fetch gift catalog for names/emojis
      const giftIds = [...new Set((giftData || []).map(g => g.gift_id))];
      if (giftIds.length > 0) {
        const { data: catalogData } = await supabase
          .from('gift_catalog')
          .select('id, name, emoji')
          .in('id', giftIds);
        
        const giftMap = new Map<string, { name: string; emoji: string }>();
        (catalogData || []).forEach(g => giftMap.set(g.id, { name: g.name, emoji: g.emoji }));
        setGiftDetails(giftMap);
      }

      // Fetch sender names (first name only for privacy)
      const senderIds = [...new Set((giftData || []).map(g => g.sender_id))];
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', senderIds);
        
        const nameMap = new Map<string, string>();
        (profilesData || []).forEach(p => {
          const firstName = p.name?.split(' ')[0] || 'Anonymous';
          const lastInitial = p.name?.split(' ')[1]?.[0] ? ` ${p.name.split(' ')[1][0]}.` : '';
          nameMap.set(p.id, `${firstName}${lastInitial}`);
        });
        setSenderNames(nameMap);
      }

      setTransactions(txnData || []);
      setGiftTransactions(giftData || []);
      processAnalytics(txnData || [], giftData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (txns: Transaction[], gifts: GiftTransaction[]) => {
    // Calculate totals from transactions
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

    // Calculate gift totals (earner_amount is the 70% share)
    let giftEarnings = 0;
    let giftGrossValue = 0;
    let platformFees = 0;

    gifts.forEach((g) => {
      giftEarnings += Number(g.earner_amount) || 0;
      giftGrossValue += Number(g.gross_value_usd) || 0;
      platformFees += Number(g.platform_fee) || 0;
    });

    totalEarnings += giftEarnings;

    // Group by day
    const dailyMap = new Map<string, DailyEarning>();
    
    txns.forEach((tx) => {
      const date = format(parseISO(tx.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || { date, amount: 0, messages: 0, videoDates: 0, gifts: 0 };
      existing.amount += tx.usd_amount || 0;
      if (tx.transaction_type === 'earning') existing.messages++;
      if (tx.transaction_type === 'video_earning') existing.videoDates++;
      dailyMap.set(date, existing);
    });

    gifts.forEach((g) => {
      const date = format(parseISO(g.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || { date, amount: 0, messages: 0, videoDates: 0, gifts: 0 };
      existing.amount += Number(g.earner_amount) || 0;
      existing.gifts++;
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

    gifts.forEach((g) => {
      const gDate = parseISO(g.created_at);
      const amount = Number(g.earner_amount) || 0;
      
      if (gDate >= thisWeekStart) thisWeek += amount;
      else if (gDate >= lastWeekStart) lastWeek += amount;
      
      if (gDate >= subDays(now, 30)) thisMonth += amount;
      else if (gDate >= subDays(now, 60)) lastMonth += amount;
    });

    setStats({
      totalEarnings,
      periodEarnings: totalEarnings,
      averageDaily,
      bestDay,
      messageEarnings,
      videoEarnings,
      giftEarnings,
      giftCount: gifts.length,
      giftGrossValue,
      platformFees,
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
    });
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Gift', 'Credits', 'Gross USD', 'Your Share (70%)', 'Platform (30%)', 'From', 'Description'];
    
    // Regular transactions
    const txnRows = transactions.map((tx) => [
      format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm'),
      tx.transaction_type,
      '',
      '',
      tx.usd_amount?.toFixed(2) || '0.00',
      tx.usd_amount?.toFixed(2) || '0.00',
      '0.00',
      '',
      tx.description || '',
    ]);

    // Gift transactions
    const giftRows = giftTransactions.map((g) => [
      format(parseISO(g.created_at), 'yyyy-MM-dd HH:mm'),
      'gift',
      giftDetails.get(g.gift_id)?.name || 'Gift',
      g.credits_spent.toString(),
      g.gross_value_usd.toFixed(2),
      g.earner_amount.toFixed(2),
      g.platform_fee.toFixed(2),
      senderNames.get(g.sender_id) || 'Anonymous',
      g.message || '',
    ]);

    const allRows = [...txnRows, ...giftRows].sort((a, b) => b[0].localeCompare(a[0]));
    const csv = [headers.join(','), ...allRows.map((r) => r.map(c => `"${c}"`).join(','))].join('\n');
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
    { name: 'Gifts', value: stats.giftEarnings },
  ].filter(d => d.value > 0);

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background Effects - matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(32 95% 52% / 0.15) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-[800px] h-[800px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(271 81% 56% / 0.15) 0%, transparent 70%)',
          }}
        />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />
        
        <div className="container max-w-6xl py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mb-2 -ml-2 text-white/50 hover:text-white hover:bg-white/5"
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
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <TabsList className="bg-white/[0.02] border border-white/10">
                  <TabsTrigger value="7" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">7D</TabsTrigger>
                  <TabsTrigger value="30" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">30D</TabsTrigger>
                  <TabsTrigger value="90" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">90D</TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">All</TabsTrigger>
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
                  <span className="text-white/50 text-sm">Gift Earnings</span>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.giftEarnings.toFixed(2)}</p>
                <p className="text-xs text-white/50 mt-1">{stats.giftCount} gifts received</p>
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
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${stats.bestDay.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Gift Revenue Breakdown Card */}
          {stats.giftCount > 0 && (
            <Card className="bg-white/[0.02] border-white/10 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-rose-400" />
                  Gift Revenue Breakdown (70/30 Split)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <p className="text-white/50 text-sm">Total Gift Value</p>
                    <p className="text-2xl font-bold text-white">${stats.giftGrossValue.toFixed(2)}</p>
                    <p className="text-xs text-white/50">{giftTransactions.reduce((sum, g) => sum + g.credits_spent, 0).toLocaleString()} credits</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <p className="text-green-400 text-sm">Your Earnings (70%)</p>
                    <p className="text-2xl font-bold text-green-400">${stats.giftEarnings.toFixed(2)}</p>
                    <p className="text-xs text-green-400/70">✓ Your share</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <p className="text-white/50 text-sm">Platform Fee (30%)</p>
                    <p className="text-2xl font-bold text-white/50">${stats.platformFees.toFixed(2)}</p>
                    <p className="text-xs text-white/50">Service fee</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                        stroke="rgba(255,255,255,0.4)"
                        tickFormatter={(v) => format(parseISO(v), 'MMM d')}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white' }}
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
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name === 'Messages' ? 0 : entry.name === 'Video Dates' ? 1 : 2]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-white/50 text-sm">Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-white/50 text-sm">Video Dates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-white/50 text-sm">Gifts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gift Transaction History */}
          {giftTransactions.length > 0 && (
            <Card className="bg-white/[0.02] border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-rose-400" />
                  Gift Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/50">Date</TableHead>
                        <TableHead className="text-white/50">Gift</TableHead>
                        <TableHead className="text-white/50">From</TableHead>
                        <TableHead className="text-white/50 text-right">Credits</TableHead>
                        <TableHead className="text-white/50 text-right">Gross Value</TableHead>
                        <TableHead className="text-white/50 text-right">Your Share (70%)</TableHead>
                        <TableHead className="text-white/50 text-right">Platform (30%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {giftTransactions.slice(0, 20).map((g) => {
                        const gift = giftDetails.get(g.gift_id);
                        return (
                          <TableRow key={g.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white">
                              {format(parseISO(g.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{gift?.emoji || '🎁'}</span>
                                <span className="text-white">{gift?.name || 'Gift'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/50">
                              {senderNames.get(g.sender_id) || 'Anonymous'}
                            </TableCell>
                            <TableCell className="text-right text-white/50">
                              {g.credits_spent.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-white">
                              ${g.gross_value_usd.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-400">
                              +${Number(g.earner_amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-white/50">
                              ${Number(g.platform_fee).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals row */}
                      <TableRow className="border-white/10 bg-white/5 font-semibold">
                        <TableCell colSpan={3} className="text-white">
                          Total ({giftTransactions.length} gifts)
                        </TableCell>
                        <TableCell className="text-right text-white">
                          {giftTransactions.reduce((sum, g) => sum + g.credits_spent, 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-white">
                          ${stats.giftGrossValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          +${stats.giftEarnings.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-white/50">
                          ${stats.platformFees.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {giftTransactions.length > 20 && (
                  <p className="text-center text-white/50 text-sm mt-4">
                    Showing 20 of {giftTransactions.length} gifts. Export CSV for full history.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
                      <XAxis type="number" stroke="rgba(255,255,255,0.4)" tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="date" stroke="rgba(255,255,255,0.4)" width={60} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
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
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <div>
                    <p className="text-white/50 text-sm">This Week vs Last Week</p>
                    <p className="text-xl font-bold text-white">${stats.thisWeek.toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${weekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {weekChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="font-semibold">{Math.abs(weekChange).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <div>
                    <p className="text-white/50 text-sm">This Month vs Last Month</p>
                    <p className="text-xl font-bold text-white">${stats.thisMonth.toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${monthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {monthChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="font-semibold">{Math.abs(monthChange).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-purple-300 text-xs">Avg/Message</p>
                    <p className="text-lg font-bold text-white">
                      ${transactions.filter(t => t.transaction_type === 'earning').length > 0
                        ? (stats.messageEarnings / transactions.filter(t => t.transaction_type === 'earning').length).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-300 text-xs">Avg/Video</p>
                    <p className="text-lg font-bold text-white">
                      ${transactions.filter(t => t.transaction_type === 'video_earning').length > 0
                        ? (stats.videoEarnings / transactions.filter(t => t.transaction_type === 'video_earning').length).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-rose-300 text-xs">Avg/Gift</p>
                    <p className="text-lg font-bold text-white">
                      ${stats.giftCount > 0
                        ? (stats.giftEarnings / stats.giftCount).toFixed(2)
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
