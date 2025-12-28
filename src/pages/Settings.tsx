import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Camera,
  Shield,
  Trash2,
  Loader2,
  Save,
  Upload,
  X,
  LogOut,
  Pause,
  AlertTriangle,
  Gem,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const INTERESTS = [
  "Travel",
  "Music",
  "Movies",
  "Fitness",
  "Cooking",
  "Reading",
  "Gaming",
  "Art",
  "Photography",
  "Dancing",
  "Hiking",
  "Yoga",
  "Sports",
  "Fashion",
  "Technology",
  "Food & Wine",
  "Pets",
  "Nature",
  "Meditation",
  "Comedy",
];

export default function Settings() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [height, setHeight] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  // Earner settings - match Dashboard rates
  const [video15Rate, setVideo15Rate] = useState(200);
  const [video30Rate, setVideo30Rate] = useState(200);
  const [video60Rate, setVideo60Rate] = useState(200);
  const [video90Rate, setVideo90Rate] = useState(200);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const isEarner = profile?.user_type === "earner";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setCity(profile.location_city || "");
      setState(profile.location_state || "");
      setHeight(profile.height || "");
      setInterests(profile.interests || []);
      setPhotos(profile.profile_photos || []);
      setVideo15Rate((profile as any).video_15min_rate || 200);
      setVideo30Rate(profile.video_30min_rate || 200);
      setVideo60Rate(profile.video_60min_rate || 200);
      setVideo90Rate((profile as any).video_90min_rate || 200);
    }
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error } = await supabase.storage.from("profile-photos").upload(path, file);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-photos").getPublicUrl(path);

        newPhotos.push(publicUrl);
      }

      const updatedPhotos = [...photos, ...newPhotos].slice(0, 6);
      setPhotos(updatedPhotos);

      await supabase.from("profiles").update({ profile_photos: updatedPhotos }).eq("id", user.id);

      toast.success("Photos uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);

    if (user) {
      await supabase.from("profiles").update({ profile_photos: updatedPhotos }).eq("id", user.id);
    }
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else if (interests.length < 6) {
      setInterests([...interests, interest]);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updates: Record<string, any> = {
        name,
        bio,
        location_city: city,
        location_state: state,
        height,
        interests,
        updated_at: new Date().toISOString(),
      };

      if (isEarner) {
        updates.video_15min_rate = video15Rate;
        updates.video_30min_rate = video30Rate;
        updates.video_60min_rate = video60Rate;
        updates.video_90min_rate = video90Rate;
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Settings saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePauseAccount = async () => {
    if (!user) return;

    try {
      await supabase
        .from("profiles")
        .update({
          account_status: "paused",
          paused_date: new Date().toISOString(),
        })
        .eq("id", user.id);

      toast.success("Account paused");
      navigate("/reactivate");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause account");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE" || !user) return;

    try {
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <div className="container max-w-4xl py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Photos</span>
            </TabsTrigger>
            {isEarner && (
              <TabsTrigger value="rates" className="gap-2">
                <Gem className="w-4 h-4" />
                <span className="hidden sm:inline">Rates</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="account" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photos[0]} />
                    <AvatarFallback className="text-2xl">{name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{name || "Your Name"}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {profile?.user_type === "earner" ? "Earner" : "Seeker"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g., 5'10&quot;"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">About You</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
                </div>

                <div className="space-y-2">
                  <Label>Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-all",
                          interests.includes(interest)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80",
                        )}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Select up to 6 interests ({interests.length}/6)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Profile Photos</CardTitle>
                <CardDescription>
                  Upload up to 6 photos. The first photo will be your main profile picture.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {i === 0 && <Badge className="absolute bottom-2 left-2 bg-primary text-xs">Main</Badge>}
                    </div>
                  ))}

                  {photos.length < 6 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors border-border hover:border-primary hover:bg-primary/5">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rates Tab - Earners only */}
          {isEarner && (
            <TabsContent value="rates">
              <Card>
                <CardHeader>
                  <CardTitle>Your Rates</CardTitle>
                  <CardDescription>Set your video date rates. You earn 70% of the credit value.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>15 min video</Label>
                        <Badge variant="secondary">${(video15Rate * 0.07).toFixed(2)} earnings</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={video15Rate}
                          onChange={(e) => setVideo15Rate(Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                        <Slider
                          value={[video15Rate]}
                          onValueChange={([v]) => setVideo15Rate(v)}
                          min={200}
                          max={1000}
                          step={25}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>30 min video</Label>
                        <Badge variant="secondary">${(video30Rate * 0.07).toFixed(2)} earnings</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={video30Rate}
                          onChange={(e) => setVideo30Rate(Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                        <Slider
                          value={[video30Rate]}
                          onValueChange={([v]) => setVideo30Rate(v)}
                          min={200}
                          max={1000}
                          step={25}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>60 min video</Label>
                        <Badge variant="secondary">${(video60Rate * 0.07).toFixed(2)} earnings</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={video60Rate}
                          onChange={(e) => setVideo60Rate(Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                        <Slider
                          value={[video60Rate]}
                          onValueChange={([v]) => setVideo60Rate(v)}
                          min={200}
                          max={1000}
                          step={25}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>90 min video</Label>
                        <Badge variant="secondary">${(video90Rate * 0.07).toFixed(2)} earnings</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={video90Rate}
                          onChange={(e) => setVideo90Rate(Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                        <Slider
                          value={[video90Rate]}
                          onValueChange={([v]) => setVideo90Rate(v)}
                          min={200}
                          max={1000}
                          step={25}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-medium mb-2">Earnings Breakdown</h4>
                    <p className="text-sm text-muted-foreground">
                      For every credit spent by seekers, you earn $0.07 (70% of $0.10 credit value). The platform
                      retains 30% as a service fee.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Email notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email updates</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Push notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Message alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified for new messages</p>
                  </div>
                  <Switch checked={messageNotifications} onCheckedChange={setMessageNotifications} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Marketing emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional content</p>
                  </div>
                  <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={handleSignOut} className="w-full justify-start">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>

                <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pause your account?</DialogTitle>
                      <DialogDescription>
                        Your profile will be hidden and you won't receive new messages. You can reactivate anytime.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handlePauseAccount} className="bg-amber-500 hover:bg-amber-600">
                        Pause Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Delete Account
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. All your data will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                      <Label>Type DELETE to confirm</Label>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== "DELETE"}
                      >
                        Delete Forever
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
      <MobileNav />
    </div>
  );
}
