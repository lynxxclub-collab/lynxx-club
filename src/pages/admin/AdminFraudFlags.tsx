import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { FlagDetailModal } from '@/components/admin/FlagDetailModal';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  reason: string;
  severity: string;
  details: any;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  created_at: string | null;
}

interface FlagWithUser extends FraudFlag {
  user_name?: string;
  user_email?: string;
}

export default function AdminFraudFlags() {
  const [flags, setFlags] = useState<FlagWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
  const [counts, setCounts] = useState({
    unresolved: 0,
    critical: 0,
    high: 0,
    medium: 0
  });

  useEffect(() => {
    loadFlags();
    loadCounts();
  }, [statusFilter, severityFilter]);

  async function loadCounts() {
    const { count: unresolved } = await supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    const { count: critical } = await supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'CRITICAL')
      .eq('resolved', false);

    const { count: high } = await supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'HIGH')
      .eq('resolved', false);

    const { count: medium } = await supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'MEDIUM')
      .eq('resolved', false);

    setCounts({
      unresolved: unresolved || 0,
      critical: critical || 0,
      high: high || 0,
      medium: medium || 0
    });
  }

  async function loadFlags() {
    setLoading(true);
    try {
      let query = supabase
        .from('fraud_flags')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter === 'unresolved') {
        query = query.eq('resolved', false);
      } else if (statusFilter === 'resolved') {
        query = query.eq('resolved', true);
      }

      // Apply severity filter
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load user names for each flag
      const flagsWithUsers: FlagWithUser[] = [];
      for (const flag of data || []) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', flag.user_id)
          .single();

        flagsWithUsers.push({
          ...flag,
          user_name: userData?.name || 'Unknown',
          user_email: userData?.email || ''
        });
      }

      setFlags(flagsWithUsers);
    } catch (error) {
      console.error('Error loading flags:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  }

  function getSeverityBadge(severity: string) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  }

  function getTimeAgo(dateString: string | null) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  function getFlagCard(flag: FlagWithUser) {
    const severity = flag.severity.toUpperCase();
    let bgClass = 'bg-white/[0.02] border-white/10';

    if (severity === 'CRITICAL') {
      bgClass = 'bg-destructive/10 border-destructive/30';
    } else if (severity === 'HIGH') {
      bgClass = 'bg-orange-500/10 border-orange-500/30';
    } else if (severity === 'MEDIUM') {
      bgClass = 'bg-yellow-500/10 border-yellow-500/30';
    }

    return (
      <Card
        key={flag.id}
        className={`${bgClass} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => setSelectedFlag(flag)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getSeverityIcon(severity)}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getSeverityBadge(severity)}
                  {flag.resolved && (
                    <Badge variant="outline" className="text-green-600 border-green-600/30">
                      <Check className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-white">
                  User: {flag.user_name}
                  <span className="text-white/40 ml-2">
                    (#{flag.user_id.slice(0, 8)})
                  </span>
                </p>
                <p className="text-sm text-white/60 capitalize">
                  Type: {flag.flag_type.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-white/40">
                  Created: {getTimeAgo(flag.created_at)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Fraud Flags</h2>
        <p className="text-white/60">Review and resolve fraud detection alerts</p>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'unresolved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('unresolved')}
                className={statusFilter !== 'unresolved' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Unresolved
                {counts.unresolved > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {counts.unresolved}
                  </Badge>
                )}
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter !== 'all' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('resolved')}
                className={statusFilter !== 'resolved' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                <Check className="h-4 w-4 mr-2" />
                Resolved
              </Button>
            </div>

            <div className="flex-1" />

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10">
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">
                  🔴 Critical {counts.critical > 0 && `(${counts.critical})`}
                </SelectItem>
                <SelectItem value="high">
                  🟠 High {counts.high > 0 && `(${counts.high})`}
                </SelectItem>
                <SelectItem value="medium">
                  🟡 Medium {counts.medium > 0 && `(${counts.medium})`}
                </SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Flag List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : flags.length === 0 ? (
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="py-12 text-center text-white/40">
            No fraud flags found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => getFlagCard(flag))}
        </div>
      )}

      {/* Flag Detail Modal */}
      {selectedFlag && (
        <FlagDetailModal
          flag={selectedFlag}
          open={!!selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onUpdate={() => {
            loadFlags();
            loadCounts();
          }}
        />
      )}
    </div>
  );
}
