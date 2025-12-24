import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Camera, 
  MapPin, 
  Bell, 
  Shield, 
  DollarSign, 
  Loader2,
  ArrowLeft,
  Save
} from 'lucide-react';
import Header from '@/components/layout/Header';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [video30Rate, setVideo30Rate] = useState(300);
  const [video60Rate, setVideo60Rate] = useState(500);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const isEarner = profile?.user_type === 'earner';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setCity(profile.location_city || '');
      setState(profile.location_state || '');
      setVideo30Rate(profile.video_30min_rate || 300);
      setVideo60Rate(profile.video_60min_rate || 500);
    }
  }, [profile]);

  const calculateEarnings = (credits: number) => {
    const usd = credits * 0.10;
    const earnings = usd * 0.70;
    return { usd, earnings };
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        name,
        bio,
        location_city: city,
        location_state: state,
      };

      if (isEarner) {
        updates.video_30min_rate = video30Rate;
        updates.video_60min_rate = video60Rate;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {isEarner && <TabsTrigger value="rates">Rates</TabsTrigger>}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your profile details visible to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-border">
                    <AvatarImage src={profile?.profile_photos?.[0]} />
                    <AvatarFallback>
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={4}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your profile and content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to discover your profile
                    </p>
                  </div>
                  <Switch
                    checked={profileVisible}
                    onCheckedChange={setProfileVisible}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Online Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others see when you're online
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Read Receipts</Label>
                    <p className="text-sm text-muted-foreground">
                      Show when you've read messages
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive a message
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Earnings Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new earnings
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional content and updates
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rates Tab (Earners only) */}
          {isEarner && (
            <TabsContent value="rates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Video Call Rates
                  </CardTitle>
                  <CardDescription>
                    Set your rates for video calls. Users pay in credits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* 30 minute rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">30 Minute Video Call</Label>
                      <span className="text-lg font-bold text-primary">{video30Rate} credits</span>
                    </div>
                    
                    <Slider
                      value={[video30Rate]}
                      onValueChange={([value]) => setVideo30Rate(value)}
                      min={250}
                      max={350}
                      step={10}
                      className="py-4"
                    />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>250 credits</span>
                      <span>350 credits</span>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {video30Rate} credits (${calculateEarnings(video30Rate).usd.toFixed(2)})
                        </span>
                        <span className="font-bold text-primary">
                          → You earn ${calculateEarnings(video30Rate).earnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 60 minute rate */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">60 Minute Video Call</Label>
                      <span className="text-lg font-bold text-primary">{video60Rate} credits</span>
                    </div>
                    
                    <Slider
                      value={[video60Rate]}
                      onValueChange={([value]) => setVideo60Rate(value)}
                      min={400}
                      max={600}
                      step={10}
                      className="py-4"
                    />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>400 credits</span>
                      <span>600 credits</span>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {video60Rate} credits (${calculateEarnings(video60Rate).usd.toFixed(2)})
                        </span>
                        <span className="font-bold text-primary">
                          → You earn ${calculateEarnings(video60Rate).earnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-medium mb-2">Earnings Breakdown</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Credits are worth $0.10 each</li>
                      <li>• You receive 70% of the credit value</li>
                      <li>• Platform fee is 30%</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  );
}