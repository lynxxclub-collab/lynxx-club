import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Eye } from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveReport(reportId: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Report resolved');
      loadReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status === 'resolved');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Reports</h2>
        <p className="text-muted-foreground">Review and resolve user-submitted reports</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Reports */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Pending Reports ({pendingReports.length})
            </h3>
            
            {pendingReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending reports
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg capitalize">
                            {report.reason.replace(/_/g, ' ')}
                          </CardTitle>
                          {getStatusBadge(report.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {report.description && (
                        <p className="text-muted-foreground">{report.description}</p>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => resolveReport(report.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Users
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Reports */}
          {resolvedReports.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Resolved Reports ({resolvedReports.length})
              </h3>
              
              <div className="space-y-4">
                {resolvedReports.slice(0, 10).map((report) => (
                  <Card key={report.id} className="opacity-60">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg capitalize">
                            {report.reason.replace(/_/g, ' ')}
                          </CardTitle>
                          <Badge variant="outline">Resolved</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{report.description || 'No description'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
