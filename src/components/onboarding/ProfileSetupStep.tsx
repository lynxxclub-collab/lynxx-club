import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Camera, MapPin, FileText, DollarSign, X } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export default function ProfileSetupStep({ onComplete }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [video30Rate, setVideo30Rate] = useState([300]);
  const [video60Rate, setVideo60Rate] = useState([500]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEarner = profile?.user_type === 'earner';

  // File validation constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large. Maximum size is 5MB' };
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed' };
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp allowed' };
    }

    return { valid: true };
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || photos.length >= 6) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      if (photos.length >= 6) break;

      // Validate file before upload
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }

      // Sanitize filename - use timestamp and proper extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const sanitizedExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg';
      const fileName = `${user?.id}/${Date.now()}.${sanitizedExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (uploadError) {
        toast.error('Failed to upload photo');
        console.error(uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      setPhotos(prev => [...prev, urlData.publicUrl]);
    }

    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const calculateEarnings = (credits: number) => {
    const usd = credits * 0.10;
    const earnings = usd * 0.70;
    return { usd, earnings };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length < 4) {
      toast.error('Please upload at least 4 photos');
      return;
    }

    if (!bio.trim() || bio.length > 500) {
      toast.error('Please write a bio (max 500 characters)');
      return;
    }

    if (!city.trim() || !state.trim()) {
      toast.error('Please enter your location');
      return;
    }

    setLoading(true);

    const updateData: Record<string, unknown> = {
      profile_photos: photos,
      bio: bio.trim(),
      location_city: city.trim(),
      location_state: state.trim(),
      account_status: 'pending_verification',
      onboarding_step: 4,
    };

    if (isEarner) {
      updateData.video_30min_rate = video30Rate[0];
      updateData.video_60min_rate = video60Rate[0];
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user?.id);

    if (error) {
      toast.error('Failed to save profile. Please try again.');
      console.error(error);
    } else {
      toast.success('Profile saved! Now verify your identity.');
      onComplete();
      navigate('/verify');
    }

    setLoading(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Complete your profile</CardTitle>
        <CardDescription>Add photos and tell people about yourself</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Photos ({photos.length}/6) - Minimum 4 required
            </Label>
            
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              
              {photos.length < 6 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-secondary/30">
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Bio ({bio.length}/500)
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell people about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              className="bg-secondary/50 min-h-[100px] resize-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-secondary/50"
              />
              <Input
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          </div>

          {/* Video Rates (Earner only) */}
          {isEarner && (
            <div className="space-y-6 p-4 rounded-lg bg-gold/5 border border-gold/20">
              <div className="flex items-center gap-2 text-gold">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Set Your Video Date Rates</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>30 Minute Video: {video30Rate[0]} credits</Label>
                    <span className="text-sm text-gold">
                      You earn ${calculateEarnings(video30Rate[0]).earnings.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={video30Rate}
                    onValueChange={setVideo30Rate}
                    min={250}
                    max={350}
                    step={10}
                    className="[&_[role=slider]]:bg-gold"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>60 Minute Video: {video60Rate[0]} credits</Label>
                    <span className="text-sm text-gold">
                      You earn ${calculateEarnings(video60Rate[0]).earnings.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={video60Rate}
                    onValueChange={setVideo60Rate}
                    min={400}
                    max={600}
                    step={10}
                    className="[&_[role=slider]]:bg-gold"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 glow-purple"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
