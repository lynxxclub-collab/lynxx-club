import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
            <h1 className="text-3xl font-bold text-white/90 mb-4">Verification Under Review</h1>
            <p className="text-white/60 text-lg mb-8">
              We're reviewing your documents. This usually takes 24-48 hours.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              What's next?
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-rose-400">1</span>
                </div>
                <div>
                  <p className="font-medium text-white/90">Admin Review</p>
                  <p className="text-sm text-white/50">Our team is reviewing your ID and selfie</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white/40">2</span>
                </div>
                <div>
                  <p className="font-medium text-white/50">Email Notification</p>
                  <p className="text-sm text-white/40">You'll receive an email when approved</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white/40">3</span>
                </div>
                <div>
                  <p className="font-medium text-white/50">Start Connecting</p>
                  <p className="text-sm text-white/40">Once verified, you'll have full access</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-sm text-white/40 mb-4">
              Submitted on {profile?.verification_submitted_at 
                ? new Date(profile.verification_submitted_at).toLocaleDateString() 
                : 'recently'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            >
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
            <h1 className="text-3xl font-bold text-white/90 mb-4">You're Verified!</h1>
            <p className="text-white/60 text-lg mb-8">
              Your identity has been verified. You have full access to Lynxx Club.
            </p>
            <Button 
              onClick={() => navigate(profile?.user_type === 'seeker' ? '/browse' : '/dashboard')}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
            >
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
                  ? 'w-8 bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30'
                  : 'w-8 bg-white/20'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-white/50 mb-8">Step 4 of 4 - Identity Verification</p>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-3xl font-bold text-white/90 mb-2">Verify Your Identity</h1>
          <p className="text-white/60">
            Complete verification to unlock all features and build trust with other members.
          </p>
        </div>

        {/* Why verify card */}
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white/90 mb-4">Why verify?</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/70">Access messaging and video dates</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/70">Build trust with verified badge on your profile</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/70">Protect the community from fake profiles</span>
            </li>
          </ul>
        </div>

        {/* Upload Documents card */}
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white/90 mb-2">Upload Documents</h3>
            <p className="text-sm text-white/50">
              Your documents are securely stored and only used for verification purposes.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="document-type" className="text-white/80">ID Document Type</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger 
                  id="document-type"
                  className="bg-white/5 border-white/10 text-white/90 focus:ring-rose-500/40"
                >
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(240,10%,8%)] border-white/10">
                  <SelectItem value="passport" className="text-white/90 focus:bg-white/10 focus:text-white">Passport</SelectItem>
                  <SelectItem value="drivers_license" className="text-white/90 focus:bg-white/10 focus:text-white">Driver's License</SelectItem>
                  <SelectItem value="national_id" className="text-white/90 focus:bg-white/10 focus:text-white">National ID Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID Document Upload */}
            <div className="space-y-2">
              <Label className="text-white/80">ID Document Photo</Label>
              <div 
                onClick={() => idInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-rose-500/50 hover:bg-white/[0.02] transition-colors"
              >
                {idPreview ? (
                  <div className="space-y-2">
                    <img 
                      src={idPreview} 
                      alt="ID preview" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-white/50">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-rose-400" />
                    </div>
                    <p className="text-sm font-medium text-white/80">Upload your ID document</p>
                    <p className="text-xs text-white/40">
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
              <Label className="text-white/80">Selfie with ID</Label>
              <div 
                onClick={() => selfieInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-rose-500/50 hover:bg-white/[0.02] transition-colors"
              >
                {selfiePreview ? (
                  <div className="space-y-2">
                    <img 
                      src={selfiePreview} 
                      alt="Selfie preview" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-white/50">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-rose-400" />
                    </div>
                    <p className="text-sm font-medium text-white/80">Take a selfie holding your ID</p>
                    <p className="text-xs text-white/40">
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
            <div className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <AlertCircle className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/50">
                Your documents are encrypted and stored securely. They will only be used 
                to verify your identity and will not be shared with other users or third parties.
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={!documentType || !idDocument || !selfie || isSubmitting}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white disabled:opacity-50"
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Verify;
