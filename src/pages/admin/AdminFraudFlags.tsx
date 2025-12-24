import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, AlertTriangle } from 'lucide-react';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  reason: string;
  severity: string;
  details: any;
  resolved: boolean | null;
  created_at: string | null;
}

export default function AdminFraudFlags() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error loading fraud flags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveFlag(flagId: string) {
    try {
      const { error } = await supabase
        .from('fraud_flags')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', flagId);

      if (error) throw error;

      toast.success('Flag resolved successfully');
      loadFlags();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast.error('Failed to resolve flag');
    }
  }

  function getSeverityBadge(severity: string) {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  }

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const resolvedFlags = flags.filter(f => f.resolved);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fraud Flags</h2>
        <p className="text-muted-foreground">Review and resolve fraud detection alerts</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unresolved Flags */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Unresolved Flags ({unresolvedFlags.length})
            </h3>
            
            {unresolvedFlags.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No unresolved fraud flags
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {unresolvedFlags.map((flag) => (
                  <Card key={flag.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg capitalize">
                            {flag.flag_type.replace(/_/g, ' ')}
                          </CardTitle>
                          {getSeverityBadge(flag.severity)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {flag.created_at
                            ? new Date(flag.created_at).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{flag.reason}</p>
                      
                      {flag.details && (
                        <div className="bg-muted/50 p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(flag.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => resolveFlag(flag.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Flags */}
          {resolvedFlags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Resolved Flags ({resolvedFlags.length})
              </h3>
              
              <div className="space-y-4">
                {resolvedFlags.slice(0, 10).map((flag) => (
                  <Card key={flag.id} className="opacity-60">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg capitalize">
                            {flag.flag_type.replace(/_/g, ' ')}
                          </CardTitle>
                          <Badge variant="outline">Resolved</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {flag.created_at
                            ? new Date(flag.created_at).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{flag.reason}</p>
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
