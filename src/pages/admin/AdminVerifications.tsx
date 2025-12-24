import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  ShieldX,
  User,
  FileText,
  Camera,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface PendingVerification {
  id: string;
  name: string | null;
  email: string;
  id_document_type: string | null;
  id_document_url: string | null;
  selfie_url: string | null;
  verification_status: string | null;
  verification_submitted_at: string | null;
  verification_attempts: number | null;
  created_at: string | null;
}

export default function AdminVerifications() {
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingVerification | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPendingVerifications();
  }, []);

  async function loadPendingVerifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, id_document_type, id_document_url, selfie_url, verification_status, verification_submitted_at, verification_attempts, created_at')
        .eq('verification_status', 'pending')
        .order('verification_submitted_at', { ascending: true });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error loading verifications:', error);
      toast({
        title: 'Error loading verifications',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function openReviewModal(user: PendingVerification) {
    setSelectedUser(user);
    setRejectionNotes('');
    setIdDocUrl(null);
    setSelfieUrl(null);
    setLoadingImages(true);

    try {
      // Generate signed URLs for the verification documents
      if (user.id_document_url) {
        const { data: idData, error: idError } = await supabase.storage
          .from('verification-docs')
          .createSignedUrl(user.id_document_url, 3600);
        
        if (idError) throw idError;
        setIdDocUrl(idData.signedUrl);
      }

      if (user.selfie_url) {
        const { data: selfieData, error: selfieError } = await supabase.storage
          .from('verification-docs')
          .createSignedUrl(user.selfie_url, 3600);
        
        if (selfieError) throw selfieError;
        setSelfieUrl(selfieData.signedUrl);
      }
    } catch (error) {
      console.error('Error generating signed URLs:', error);
      toast({
        title: 'Error loading documents',
        description: 'Could not load verification documents',
        variant: 'destructive'
      });
    } finally {
      setLoadingImages(false);
    }
  }

  async function approveVerification() {
    if (!selectedUser) return;
    setProcessingAction(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          account_status: 'active',
          verification_notes: null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Verification approved',
        description: `${selectedUser.name || selectedUser.email} has been verified`
      });

      setSelectedUser(null);
      loadPendingVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification',
        variant: 'destructive'
      });
    } finally {
      setProcessingAction(false);
    }
  }

  async function rejectVerification() {
    if (!selectedUser) return;
    if (!rejectionNotes.trim()) {
      toast({
        title: 'Notes required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    setProcessingAction(true);

    try {
      // Set cooldown before they can reverify (24 hours)
      const canReverifyAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'rejected',
          verification_notes: rejectionNotes.trim(),
          can_reverify_at: canReverifyAt
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Verification rejected',
        description: `${selectedUser.name || selectedUser.email} has been rejected`
      });

      setSelectedUser(null);
      setRejectionNotes('');
      loadPendingVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification',
        variant: 'destructive'
      });
    } finally {
      setProcessingAction(false);
    }
  }

  function getDocumentTypeLabel(type: string | null) {
    switch (type) {
      case 'passport': return 'Passport';
      case 'drivers_license': return "Driver's License";
      case 'national_id': return 'National ID';
      default: return 'Unknown';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Review</h2>
          <p className="text-muted-foreground">
            Review and approve user identity verifications
          </p>
        </div>
        <Button variant="outline" onClick={loadPendingVerifications}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {verifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No pending verification requests at the moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {verifications.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name || 'No name'}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {getDocumentTypeLabel(user.id_document_type)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {user.verification_submitted_at 
                          ? format(new Date(user.verification_submitted_at), 'MMM d, h:mm a')
                          : 'Unknown'
                        }
                      </div>
                    </div>

                    {user.verification_attempts && user.verification_attempts > 1 && (
                      <Badge variant="secondary">
                        Attempt #{user.verification_attempts}
                      </Badge>
                    )}

                    <Button onClick={() => openReviewModal(user)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Review Verification: {selectedUser?.name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{selectedUser?.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedUser?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Document Type</p>
                <p className="font-medium">{getDocumentTypeLabel(selectedUser?.id_document_type || null)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {selectedUser?.verification_submitted_at
                    ? format(new Date(selectedUser.verification_submitted_at), 'PPp')
                    : 'Unknown'
                  }
                </p>
              </div>
            </div>

            {/* Documents */}
            {loadingImages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* ID Document */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    ID Document
                  </div>
                  {idDocUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={idDocUrl}
                        alt="ID Document"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted">
                      No ID document uploaded
                    </div>
                  )}
                </div>

                {/* Selfie */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Selfie with ID
                  </div>
                  {selfieUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selfieUrl}
                        alt="Selfie with ID"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted">
                      No selfie uploaded
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejection Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rejection Notes (required if rejecting)
              </label>
              <Textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="E.g., Document is blurry, face doesn't match, etc."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
                disabled={processingAction}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={rejectVerification}
                disabled={processingAction || loadingImages}
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                onClick={approveVerification}
                disabled={processingAction || loadingImages}
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
