import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  User,
  Heart,
  Camera,
  MapPin,
  Calendar as CalendarIcon,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  X,
  Gem,
  Video,
  MessageSquare,
  DollarSign,
  Wallet,
} from "lucide-react";
import { format, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CALL_PRICING } from "@/lib/pricing";

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

export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [gender, setGender] = useState<string>("");
  const [userType, setUserType] = useState<"seeker" | "earner" | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [height, setHeight] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Earner-specific
  const [video30Rate, setVideo30Rate] = useState(150);
  const [video60Rate, setVideo60Rate] = useState(300);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (profile?.account_status === "active") {
      navigate(profile.user_type === "seeker" ? "/browse" : "/dashboard");
    }

    // Pre-fill existing data
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.date_of_birth) setDateOfBirth(new Date(profile.date_of_birth));
      if (profile.gender) setGender(profile.gender);
      if (profile.user_type) setUserType(profile.user_type);
      if (profile.location_city) setCity(profile.location_city);
      if (profile.location_state) setState(profile.location_state);
      if (profile.bio) setBio(profile.bio);
      if (profile.height) setHeight(profile.height);
      if (profile.interests) setSelectedInterests(profile.interests);
      if (profile.profile_photos) setPhotos(profile.profile_photos);
      if (profile.video_30min_rate) setVideo30Rate(profile.video_30min_rate);
      if (profile.video_60min_rate) setVideo60Rate(profile.video_60min_rate);
      if (profile.onboarding_step) setCurrentStep(profile.onboarding_step);
    }
  }, [profile, navigate]);

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

        newPhotos.push(path);
      }

      setPhotos([...photos, ...newPhotos].slice(0, 6));
      toast.success("Photos uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else if (selectedInterests.length < 6) {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!name.trim()) {
          toast.error("Please enter your name");
          return false;
        }
        if (!dateOfBirth) {
          toast.error("Please enter your date of birth");
          return false;
        }
        if (!gender) {
          toast.error("Please select your gender");
          return false;
        }
        const age = Math.floor((Date.now() - dateOfBirth.getTime()) / 31557600000);
        if (age < 18) {
          toast.error("You must be 18 or older");
          return false;
        }
        return true;
      case 2:
        if (!userType) {
          toast.error("Please select how you want to use Lynxx");
          return false;
        }
        return true;
      case 3:
        if (!city.trim()) {
          toast.error("Please enter your city");
          return false;
        }
        if (!state) {
          toast.error("Please select your state");
          return false;
        }
        return true;
      case 4:
        if (photos.length === 0) {
          toast.error("Please upload at least one photo");
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const saveProgress = async (nextStep?: number) => {
    if (!user) return;
    setSaving(true);

    try {
      const updates: any = {
        onboarding_step: nextStep || currentStep + 1,
        updated_at: new Date().toISOString(),
      };

      if (currentStep === 1) {
        updates.name = name;
        updates.date_of_birth = dateOfBirth?.toISOString().split("T")[0];
        updates.gender = gender;
      } else if (currentStep === 2) {
        updates.user_type = userType;
      } else if (currentStep === 3) {
        updates.location_city = city;
        updates.location_state = state;
        updates.height = height;
      } else if (currentStep === 4) {
        updates.profile_photos = photos;
      } else if (currentStep === 5) {
        updates.bio = bio;
        updates.interests = selectedInterests;
        if (userType === "earner") {
          updates.video_30min_rate = video30Rate;
          updates.video_60min_rate = video60Rate;
        }
        updates.account_status = "pending_verification";
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

      if (error) throw error;

      await refreshProfile();

      if (nextStep) {
        setCurrentStep(nextStep);
      } else if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        navigate("/verify");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    await saveProgress();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0a0a0f] to-purple-500/5" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-rose-400" />
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
              Lynxx Club
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-white/60">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Step Content */}
        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/10 shadow-xl">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl text-white">Let's get started</CardTitle>
                <CardDescription className="text-white/60">Tell us a bit about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 bg-white/[0.05] border-white/10 text-white placeholder:text-white/40 focus:border-rose-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal bg-white/[0.05] border-white/10 hover:bg-white/[0.08]",
                          !dateOfBirth ? "text-white/40" : "text-white",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Select your birthday"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#0a0a0f] border-white/10" align="start">
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        defaultMonth={subYears(new Date(), 25)}
                        startMonth={new Date(1940, 0)}
                        endMonth={new Date(subYears(new Date(), 18).getFullYear(), 11)}
                        captionLayout="dropdown"
                        className="bg-[#0a0a0f] text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Gender</Label>
                  <RadioGroup value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-3">
                    {["male", "female", "non_binary", "other"].map((g) => (
                      <Label
                        key={g}
                        className={cn(
                          "flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all text-white",
                          gender === g
                            ? "border-rose-500 bg-rose-500/10"
                            : "border-white/10 bg-white/[0.02] hover:border-rose-500/50 hover:bg-white/[0.05]",
                        )}
                      >
                        <RadioGroupItem value={g} className="sr-only" />
                        <span className="capitalize">{g.replace("_", "-")}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Role Selection */}
          {currentStep === 2 && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl text-white">How do you want to use Lynxx?</CardTitle>
                <CardDescription className="text-white/60">Choose your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  onClick={() => setUserType("seeker")}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    userType === "seeker"
                      ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/20"
                      : "border-white/10 bg-white/[0.02] hover:border-rose-500/50 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Gem className="w-6 h-6 text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 text-white">I'm a Seeker</h3>
                      <p className="text-white/60 text-sm mb-3">
                        I want to meet new people and have meaningful conversations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Send messages
                        </Badge>
                        <Badge className="bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <Video className="w-3 h-3 mr-1" />
                          Book video dates
                        </Badge>
                      </div>
                    </div>
                    {userType === "seeker" && <Check className="w-6 h-6 text-rose-400 flex-shrink-0" />}
                  </div>
                </button>

                <button
                  onClick={() => setUserType("earner")}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 text-left transition-all",
                    userType === "earner"
                      ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                      : "border-white/10 bg-white/[0.02] hover:border-amber-500/50 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 text-white">I'm an Earner</h3>
                      <p className="text-white/60 text-sm mb-3">I want to connect with others and earn for my time</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Earn money
                        </Badge>
                        <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Video className="w-3 h-3 mr-1" />
                          Host video dates
                        </Badge>
                      </div>
                    </div>
                    {userType === "earner" && <Check className="w-6 h-6 text-amber-400 flex-shrink-0" />}
                  </div>
                </button>
              </CardContent>
            </>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl text-white">Where are you located?</CardTitle>
                <CardDescription className="text-white/60">Help others find you nearby</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-white">
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., Los Angeles"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-12 bg-white/[0.05] border-white/10 text-white placeholder:text-white/40 focus:border-rose-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="h-12 bg-white/[0.05] border-white/10 text-white focus:border-rose-500/50">
                      <SelectValue placeholder="Select your state" className="text-white/40" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-white/10">
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s} className="text-white focus:bg-white/10 focus:text-white">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height" className="text-white">
                    Height <span className="text-white/40">(optional)</span>
                  </Label>
                  <Input
                    id="height"
                    placeholder="e.g., 5'10&quot;"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-12 bg-white/[0.05] border-white/10 text-white placeholder:text-white/40 focus:border-rose-500/50"
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Photos */}
          {currentStep === 4 && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl text-white">Add your photos</CardTitle>
                <CardDescription className="text-white/60">
                  Upload up to 6 photos. First one will be your main photo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {i === 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-gradient-to-r from-rose-500 to-purple-500 text-white border-0">
                          Main
                        </Badge>
                      )}
                    </div>
                  ))}

                  {photos.length < 6 && (
                    <label
                      className={cn(
                        "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                        "border-white/20 bg-white/[0.02] hover:border-rose-500/50 hover:bg-white/[0.05]",
                      )}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-white/40 mb-2" />
                          <span className="text-xs text-white/40">Upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <p className="text-sm text-white/40 text-center mt-4">{photos.length}/6 photos uploaded</p>
              </CardContent>
            </>
          )}

          {/* Step 5: Bio & Interests */}
          {currentStep === 5 && (
            <>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl text-white">Almost done!</CardTitle>
                <CardDescription className="text-white/60">Tell others what makes you unique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white">
                    About You
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Write a short bio about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[120px] resize-none bg-white/[0.05] border-white/10 text-white placeholder:text-white/40 focus:border-rose-500/50"
                    maxLength={500}
                  />
                  <p className="text-xs text-white/40 text-right">{bio.length}/500</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Interests <span className="text-white/40">(select up to 6)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-all",
                          selectedInterests.includes(interest)
                            ? "bg-gradient-to-r from-rose-500 to-purple-500 text-white"
                            : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] border border-white/10",
                        )}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Earner rates */}
                {userType === "earner" && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <Label className="text-white">
                      Set Your Video Date Rates <span className="text-white/40">(200-900 Credits)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-white/60">30 min video</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={video30Rate}
                            onChange={(e) =>
                              setVideo30Rate(
                                Math.max(
                                  CALL_PRICING.MIN_RATE,
                                  Math.min(CALL_PRICING.MAX_RATE, Number(e.target.value)),
                                ),
                              )
                            }
                            className="h-10 bg-white/[0.05] border-white/10 text-white focus:border-rose-500/50"
                            min={200}
                            max={900}
                          />
                          <span className="text-sm text-white/40">Credits</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-white/60">60 min video</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={video60Rate}
                            onChange={(e) =>
                              setVideo60Rate(
                                Math.max(
                                  CALL_PRICING.MIN_RATE,
                                  Math.min(CALL_PRICING.MAX_RATE, Number(e.target.value)),
                                ),
                              )
                            }
                            className="h-10 bg-white/[0.05] border-white/10 text-white focus:border-rose-500/50"
                            min={200}
                            max={900}
                          />
                          <span className="text-sm text-white/40">Credits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="p-6 pt-0 flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 bg-white/[0.05] border-white/20 text-white hover:bg-white/[0.1]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={saving}
              className={cn(
                "flex-1 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white",
                currentStep === 1 && "w-full",
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStep === totalSteps ? (
                <>
                  Complete
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              onClick={() => i + 1 < currentStep && setCurrentStep(i + 1)}
              className={cn(
                "h-2 rounded-full transition-all",
                i + 1 === currentStep
                  ? "w-8 bg-gradient-to-r from-rose-500 to-purple-500"
                  : i + 1 < currentStep
                    ? "w-2 bg-rose-500/50 cursor-pointer hover:bg-rose-500/70"
                    : "w-2 bg-white/20",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
