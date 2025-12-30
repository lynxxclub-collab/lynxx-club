import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCreatorCap } from '@/hooks/useCreatorCap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface CreatorApplication {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  social_link: string | null;
  why_join: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function AdminCreatorApplications() {
  const { current_count, limit, is_capped, spots_remaining, refetch: refetchCap } = useCreatorCap();
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('creator_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_creator_application', {
        p_application_id: selectedApp.id,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        toast.error(result.error || 'Failed to approve application');
        return;
      }

      toast.success('Creator application approved!');
      setSelectedApp(null);
      setActionType(null);
      fetchApplications();
      refetchCap();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error(error.message || 'Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_creator_application', {
        p_application_id: selectedApp.id,
        p_reason: rejectReason.trim() || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        toast.error(result.error || 'Failed to reject application');
        return;
      }

      toast.success('Application rejected');
      setSelectedApp(null);
      setActionType(null);
      setRejectReason('');
      fetchApplications();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast.error(error.message || 'Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = applications.filter((app) => app.status === activeTab);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with cap status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Creator Applications</h1>
          <p className="text-white/60">Review and manage creator applications</p>
        </div>
        
        <Card className="w-full md:w-auto bg-white/[0.02] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white/80">Creator Cap</span>
                  <span className="text-sm font-bold text-white">{current_count} / {limit}</span>
                </div>
                <Progress value={(current_count / limit) * 100} className="h-2" />
                <p className="text-xs text-white/40 mt-1">
                  {is_capped ? (
                    <span className="text-amber-400">Cap reached - new applications queued</span>
                  ) : (
                    <span>{spots_remaining} spots remaining</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredApps.length === 0 ? (
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="py-12 text-center">
                <p className="text-white/40">No {activeTab} applications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => (
                <Card key={app.id} className="overflow-hidden bg-white/[0.02] border-white/10">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{app.display_name}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        
                        <div className="text-sm text-white/60 space-y-1">
                          <p>Email: {app.email}</p>
                          {app.social_link && (
                            <p className="flex items-center gap-1">
                              Social: 
                              <a 
                                href={app.social_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {app.social_link}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </p>
                          )}
                          <p>Applied: {format(new Date(app.created_at), 'PPp')}</p>
                        </div>

                        <div className="p-4 rounded-lg bg-white/5">
                          <p className="text-sm font-medium mb-1 text-white/80">Why they want to join:</p>
                          <p className="text-sm text-white/60">{app.why_join}</p>
                        </div>

                        {app.review_notes && (
                          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm font-medium mb-1 text-destructive">Rejection reason:</p>
                            <p className="text-sm text-white/60">{app.review_notes}</p>
                          </div>
                        )}
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex gap-2 md:flex-col">
                          <Button
                            onClick={() => {
                              setSelectedApp(app);
                              setActionType('approve');
                            }}
                            disabled={is_capped}
                            className="bg-green-600 hover:bg-green-500"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setSelectedApp(app);
                              setActionType('reject');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Confirmation Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Creator Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedApp?.display_name}'s application? 
              This will convert them to a creator account.
            </DialogDescription>
          </DialogHeader>
          
          {is_capped && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-amber-400">
                Creator cap is reached. Cannot approve more creators.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={processing || is_capped}
              className="bg-green-600 hover:bg-green-500"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {selectedApp?.display_name}'s creator application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label>Reason for rejection (optional)</Label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
