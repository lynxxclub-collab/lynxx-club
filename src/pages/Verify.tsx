import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Camera, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Clock, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';

type DocumentType = 'passport' | 'drivers_license' | 'national_id';

const Verify = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Refresh profile on mount to get latest status
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user]);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    // Validate file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
    }
    
    // Store with user ID as folder name for RLS policy matching
    const fileName = `${user?.id}/${path}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;
    
    // Return the file path (not a public URL - bucket is private)
    return fileName;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to verify your account",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!documentType || !idDocument || !selfie) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload ID document
      const idDocumentUrl = await uploadFile(idDocument, 'verification/id');
      
      // Upload selfie
      const selfieUrl = await uploadFile(selfie, 'verification/selfie');
      
      // Update profile with verification info - set to 'pending' (awaiting admin review)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id_document_type: documentType,
          id_document_url: idDocumentUrl,
          selfie_url: selfieUrl,
          verification_status: 'pending',
          account_status: 'pending',
          verification_submitted_at: new Date().toISOString(),
          verification_attempts: (profile?.verification_attempts || 0) + 1
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Refresh profile to show pending state
      await refreshProfile();
      
      toast({
        title: "Verification submitted!",
        description: "We'll review your documents within 24-48 hours.",
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending review state if verification is submitted
  if (profile?.verification_status === 'pending' || profile?.account_status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/20 mb-6">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Verification Under Review</h1>
            <p className="text-muted-foreground text-lg mb-8">
              We're reviewing your documents. This usually takes 24-48 hours.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                What's next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Admin Review</p>
                    <p className="text-sm text-muted-foreground">Our team is reviewing your ID and selfie</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-muted-foreground">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Email Notification</p>
                    <p className="text-sm text-muted-foreground">You'll receive an email when approved</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-muted-foreground">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Start Connecting</p>
                    <p className="text-sm text-muted-foreground">Once verified, you'll have full access</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Submitted on {profile?.verification_submitted_at 
                ? new Date(profile.verification_submitted_at).toLocaleDateString() 
                : 'recently'}
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Show verified state
  if (profile?.verification_status === 'verified' && profile?.account_status === 'active') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">You're Verified!</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Your identity has been verified. You have full access to Lynxx Club.
            </p>
            <Button onClick={() => navigate(profile?.user_type === 'seeker' ? '/browse' : '/dashboard')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Exploring
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress indicator for onboarding */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === 4
                  ? 'w-8 bg-primary glow-purple'
                  : 'w-8 bg-primary/50'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-muted-foreground mb-8">Step 4 of 4 - Identity Verification</p>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Verify Your Identity</h1>
          <p className="text-muted-foreground">
            Complete verification to unlock all features and build trust with other members.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Why verify?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Access messaging and video dates</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Build trust with verified badge on your profile</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Protect the community from fake profiles</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Your documents are securely stored and only used for verification purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="document-type">ID Document Type</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="national_id">National ID Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID Document Upload */}
            <div className="space-y-2">
              <Label>ID Document Photo</Label>
              <div 
                onClick={() => idInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                {idPreview ? (
                  <div className="space-y-2">
                    <img 
                      src={idPreview} 
                      alt="ID preview" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Upload your ID document</p>
                    <p className="text-xs text-muted-foreground">
                      Make sure all details are clearly visible
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={idInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setIdDocument, setIdPreview)}
              />
            </div>

            {/* Selfie Upload */}
            <div className="space-y-2">
              <Label>Selfie with ID</Label>
              <div 
                onClick={() => selfieInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                {selfiePreview ? (
                  <div className="space-y-2">
                    <img 
                      src={selfiePreview} 
                      alt="Selfie preview" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Take a selfie holding your ID</p>
                    <p className="text-xs text-muted-foreground">
                      Hold your ID next to your face so we can match it
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setSelfie, setSelfiePreview)}
              />
            </div>

            {/* Privacy Notice */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your documents are encrypted and stored securely. They will only be used 
                to verify your identity and will not be shared with other users or third parties.
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={!documentType || !idDocument || !selfie || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Verify;
