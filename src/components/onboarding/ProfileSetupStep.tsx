import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  FileText,
  DollarSign,
  X,
  Ruler,
  Tag,
  Sparkles,
  Loader2,
  AlertCircle,
  ImagePlus,
  Users,
  Heart,
  Compass,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ProfileSetupStepProps {
  onComplete: () => void;
}

interface FormData {
  // Required
  photos: string[];
  bio: string;
  city: string;
  state: string;
  // Basic info
  height: string;
  occupation: string;
  education: string;
  relationshipStatus: string;
  languages: string[];
  // Interests & Personality
  hobbies: string[];
  interests: string[];
  personalityTraits: string[];
  lookingFor: string;
  // Lifestyle
  smoking: string;
  drinking: string;
  fitnessLevel: string;
  // Earner rates
  video30Rate: number;
  video60Rate: number;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_PHOTOS = 4;
const MAX_PHOTOS = 6;
const MAX_BIO_LENGTH = 500;
const MIN_BIO_LENGTH = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const RATE_CONFIG = {
  video30: { min: 280, max: 900, default: 280, step: 10 },
  video60: { min: 392, max: 900, default: 450, step: 10 },
  creditValue: 0.1,
  earnerShare: 0.7,
} as const;

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

const RELATIONSHIP_OPTIONS = [
  "Single",
  "In a relationship",
  "Married",
  "Divorced",
  "Widowed",
  "It's complicated",
  "Prefer not to say",
];

const SMOKING_OPTIONS = ["Never", "Occasionally", "Socially", "Regularly", "Trying to quit", "Prefer not to say"];
const DRINKING_OPTIONS = ["Never", "Rarely", "Socially", "Regularly", "Prefer not to say"];
const FITNESS_OPTIONS = ["Not active", "Light activity", "Moderate", "Very active", "Athlete", "Prefer not to say"];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
  "Dutch",
  "Swedish",
  "Polish",
  "Turkish",
  "Vietnamese",
  "Thai",
  "Other",
];

const INTERESTS_OPTIONS = [
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

const HOBBIES_OPTIONS = [
  "Reading",
  "Writing",
  "Painting",
  "Photography",
  "Cooking",
  "Baking",
  "Gardening",
  "Hiking",
  "Camping",
  "Running",
  "Cycling",
  "Swimming",
  "Yoga",
  "Dancing",
  "Singing",
  "Playing Music",
  "Video Games",
  "Board Games",
  "Crafts",
  "Traveling",
  "Volunteering",
];

const PERSONALITY_OPTIONS = [
  "Adventurous",
  "Ambitious",
  "Artistic",
  "Calm",
  "Caring",
  "Charismatic",
  "Confident",
  "Creative",
  "Curious",
  "Easy-going",
  "Empathetic",
  "Energetic",
  "Friendly",
  "Funny",
  "Generous",
  "Honest",
  "Independent",
  "Intellectual",
  "Introverted",
  "Extroverted",
  "Kind",
  "Loyal",
  "Open-minded",
  "Optimistic",
  "Patient",
  "Passionate",
  "Playful",
  "Romantic",
  "Spontaneous",
  "Thoughtful",
  "Witty",
];

// =============================================================================
// VALIDATION
// =============================================================================

const profileSetupSchema = z.object({
  bio: z.string().trim().min(MIN_BIO_LENGTH, `Bio must be at least ${MIN_BIO_LENGTH} characters`).max(MAX_BIO_LENGTH),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().min(1, "State is required"),
  photos: z.array(z.string()).min(MIN_PHOTOS, `Please upload at least ${MIN_PHOTOS} photos`).max(MAX_PHOTOS),
});

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: "File too large (max 5MB)" };
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: "Invalid file type" };
  return { valid: true };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const FormField = ({
  label,
  icon,
  error,
  children,
  optional,
  hint,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
  hint?: string;
}) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2 text-sm font-medium">
      {icon}
      {label}
      {optional && <span className="text-muted-foreground text-xs">(optional)</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </p>
    )}
  </div>
);

const PhotoGrid = ({
  photos,
  uploading,
  onUpload,
  onRemove,
}: {
  photos: string[];
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) => (
  <div className="grid grid-cols-3 gap-2 md:gap-3">
    {photos.map((photo, index) => (
      <div
        key={`${photo}-${index}`}
        className="relative aspect-square rounded-xl overflow-hidden group border border-border"
      >
        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation"
        >
          <X className="w-3.5 h-3.5 text-destructive-foreground" />
        </button>
        {index === 0 && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full font-medium">
            Main
          </span>
        )}
      </div>
    ))}
    {photos.length < MAX_PHOTOS && (
      <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors touch-manipulation">
        {uploading ? (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        ) : (
          <>
            <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">Add</span>
          </>
        )}
        <input
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={onUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>
    )}
  </div>
);

const ChipSelector = ({
  options,
  selected,
  onToggle,
  max,
  colorClass = "bg-primary/10 text-primary",
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  max: number;
  colorClass?: string;
}) => (
  <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto p-1">
    {options.map((option) => {
      const isSelected = selected.includes(option);
      const isDisabled = !isSelected && selected.length >= max;
      return (
        <button
          key={option}
          type="button"
          onClick={() => !isDisabled && onToggle(option)}
          disabled={isDisabled}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs transition-all touch-manipulation",
            isSelected ? colorClass + " font-medium" : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
            isDisabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSelected && <Check className="w-3 h-3 inline mr-1" />}
          {option}
        </button>
      );
    })}
  </div>
);

const RateSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) => {
  const earnings = (value * RATE_CONFIG.creditValue * RATE_CONFIG.earnerShare).toFixed(2);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm">
          {label}: {value} credits
        </Label>
        <span className="text-sm font-semibold text-amber-500">You earn ${earnings}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProfileSetupStep({ onComplete }: ProfileSetupStepProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isEarner = profile?.user_type === "earner";

  // Current step (0 = photos/bio, 1 = about you, 2 = interests, 3 = rates for earners)
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = isEarner ? 4 : 3;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    photos: [],
    bio: "",
    city: "",
    state: "",
    height: "",
    occupation: "",
    education: "",
    relationshipStatus: "",
    languages: [],
    hobbies: [],
    interests: [],
    personalityTraits: [],
    lookingFor: "",
    smoking: "",
    drinking: "",
    fitnessLevel: "",
    video30Rate: RATE_CONFIG.video30.default,
    video60Rate: RATE_CONFIG.video60.default,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Field updaters
  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [errors],
  );

  const toggleArrayItem = useCallback(
    (field: "languages" | "hobbies" | "interests" | "personalityTraits", item: string, max: number) => {
      setFormData((prev) => {
        const arr = prev[field];
        if (arr.includes(item)) return { ...prev, [field]: arr.filter((i) => i !== item) };
        if (arr.length >= max) return prev;
        return { ...prev, [field]: [...arr, item] };
      });
    },
    [],
  );

  // Photo handlers
  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || formData.photos.length >= MAX_PHOTOS) return;

      setUploading(true);
      const newPhotos: string[] = [];

      for (const file of Array.from(files)) {
        if (formData.photos.length + newPhotos.length >= MAX_PHOTOS) break;
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        try {
          const { error } = await supabase.storage
            .from("profile-photos")
            .upload(fileName, file, { contentType: file.type });
          if (error) throw error;
          newPhotos.push(fileName);
        } catch {
          toast.error("Failed to upload photo");
        }
      }

      if (newPhotos.length > 0) {
        updateField("photos", [...formData.photos, ...newPhotos]);
        toast.success(`${newPhotos.length} photo(s) uploaded`);
      }

      setUploading(false);
      e.target.value = "";
    },
    [formData.photos, user?.id, updateField],
  );

  const handlePhotoRemove = useCallback(
    (index: number) => {
      updateField(
        "photos",
        formData.photos.filter((_, i) => i !== index),
      );
    },
    [formData.photos, updateField],
  );

  // Step validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          formData.photos.length >= MIN_PHOTOS &&
          formData.bio.trim().length >= MIN_BIO_LENGTH &&
          formData.state.trim().length > 0
        );
      case 1:
        return true; // All optional
      case 2:
        return true; // All optional
      case 3:
        return true; // Rates have defaults
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation
  const goNext = () => {
    if (currentStep === 0) {
      const result = profileSetupSchema.safeParse({
        bio: formData.bio,
        city: formData.city,
        state: formData.state,
        photos: formData.photos,
      });
      if (!result.success) {
        const fieldErrors: FormErrors = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof FormData;
          if (!fieldErrors[field]) fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error(Object.values(fieldErrors)[0]);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        profile_photos: formData.photos,
        bio: formData.bio.trim(),
        location_city: formData.city.trim(),
        location_state: formData.state.trim(),
        height: formData.height.trim() || null,
        occupation: formData.occupation.trim() || null,
        education: formData.education.trim() || null,
        relationship_status: formData.relationshipStatus || null,
        languages: formData.languages,
        hobbies: formData.hobbies,
        interests: formData.interests,
        personality_traits: formData.personalityTraits,
        looking_for: formData.lookingFor.trim() || null,
        smoking: formData.smoking || null,
        drinking: formData.drinking || null,
        fitness_level: formData.fitnessLevel || null,
        account_status: "pending_verification",
        onboarding_step: 4,
      };

      if (isEarner) {
        updateData.video_30min_rate = formData.video30Rate;
        updateData.video_60min_rate = formData.video60Rate;
      }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
      if (error) throw error;

      toast.success("Profile saved!");
      onComplete();
      navigate("/verify");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  }, [formData, user?.id, isEarner, onComplete, navigate]);

  // Step content
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <FormField
              label={`Photos (${formData.photos.length}/${MAX_PHOTOS})`}
              icon={<Camera className="w-4 h-4 text-primary" />}
              error={errors.photos}
              hint={`Upload at least ${MIN_PHOTOS} photos`}
            >
              <PhotoGrid
                photos={formData.photos}
                uploading={uploading}
                onUpload={handlePhotoUpload}
                onRemove={handlePhotoRemove}
              />
            </FormField>

            <FormField
              label={`Bio (${formData.bio.length}/${MAX_BIO_LENGTH})`}
              icon={<FileText className="w-4 h-4 text-primary" />}
              error={errors.bio}
            >
              <Textarea
                placeholder="Tell people about yourself..."
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value.slice(0, MAX_BIO_LENGTH))}
                className="min-h-[100px] bg-secondary/50"
              />
            </FormField>

            <FormField label="Location" icon={<MapPin className="w-4 h-4 text-primary" />} error={errors.state}>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="bg-secondary/50"
                />
                <Select value={formData.state} onValueChange={(v) => updateField("state", v)}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[50vh]">
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormField>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <FormField label="Height" icon={<Ruler className="w-4 h-4 text-primary" />} optional>
              <Input
                placeholder="e.g., 5'9 or 175cm"
                value={formData.height}
                onChange={(e) => updateField("height", e.target.value)}
                className="bg-secondary/50"
              />
            </FormField>

            <FormField label="Occupation" optional>
              <Input
                placeholder="What do you do?"
                value={formData.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
                className="bg-secondary/50"
              />
            </FormField>

            <FormField label="Education" optional>
              <Input
                placeholder="Your education background"
                value={formData.education}
                onChange={(e) => updateField("education", e.target.value)}
                className="bg-secondary/50"
              />
            </FormField>

            <FormField label="Relationship Status" optional>
              <Select value={formData.relationshipStatus} onValueChange={(v) => updateField("relationshipStatus", v)}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Languages" optional hint={`Select up to 5 (${formData.languages.length}/5)`}>
              <ChipSelector
                options={LANGUAGES}
                selected={formData.languages}
                onToggle={(item) => toggleArrayItem("languages", item, 5)}
                max={5}
                colorClass="bg-teal/10 text-teal"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-2">
              <FormField label="Smoking" optional>
                <Select value={formData.smoking} onValueChange={(v) => updateField("smoking", v)}>
                  <SelectTrigger className="bg-secondary/50 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMOKING_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Drinking" optional>
                <Select value={formData.drinking} onValueChange={(v) => updateField("drinking", v)}>
                  <SelectTrigger className="bg-secondary/50 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRINKING_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Fitness" optional>
                <Select value={formData.fitnessLevel} onValueChange={(v) => updateField("fitnessLevel", v)}>
                  <SelectTrigger className="bg-secondary/50 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {FITNESS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <FormField
              label="Interests"
              icon={<Tag className="w-4 h-4 text-primary" />}
              optional
              hint={`Select up to 6 (${formData.interests.length}/6)`}
            >
              <ChipSelector
                options={INTERESTS_OPTIONS}
                selected={formData.interests}
                onToggle={(item) => toggleArrayItem("interests", item, 6)}
                max={6}
                colorClass="bg-primary/10 text-primary"
              />
            </FormField>

            <FormField
              label="Hobbies"
              icon={<Sparkles className="w-4 h-4 text-teal" />}
              optional
              hint={`Select up to 6 (${formData.hobbies.length}/6)`}
            >
              <ChipSelector
                options={HOBBIES_OPTIONS}
                selected={formData.hobbies}
                onToggle={(item) => toggleArrayItem("hobbies", item, 6)}
                max={6}
                colorClass="bg-teal/10 text-teal"
              />
            </FormField>

            <FormField
              label="Personality Traits"
              icon={<Users className="w-4 h-4 text-purple-400" />}
              optional
              hint={`Select up to 6 (${formData.personalityTraits.length}/6)`}
            >
              <ChipSelector
                options={PERSONALITY_OPTIONS}
                selected={formData.personalityTraits}
                onToggle={(item) => toggleArrayItem("personalityTraits", item, 6)}
                max={6}
                colorClass="bg-purple-500/10 text-purple-400"
              />
            </FormField>

            <FormField label="What are you looking for?" icon={<Heart className="w-4 h-4 text-rose-400" />} optional>
              <Textarea
                placeholder="Describe who you'd like to connect with..."
                value={formData.lookingFor}
                onChange={(e) => updateField("lookingFor", e.target.value.slice(0, 300))}
                className="min-h-[80px] bg-secondary/50"
              />
            </FormField>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5 p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-400">Set Your Rates</h3>
                <p className="text-xs text-muted-foreground">You keep 70% of all earnings</p>
              </div>
            </div>

            <RateSlider
              label="30 Minute Video"
              value={formData.video30Rate}
              min={RATE_CONFIG.video30.min}
              max={RATE_CONFIG.video30.max}
              step={RATE_CONFIG.video30.step}
              onChange={(v) => updateField("video30Rate", v)}
            />

            <RateSlider
              label="60 Minute Video"
              value={formData.video60Rate}
              min={RATE_CONFIG.video60.min}
              max={RATE_CONFIG.video60.max}
              step={RATE_CONFIG.video60.step}
              onChange={(v) => updateField("video60Rate", v)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ["Photos & Bio", "About You", "Interests", "Rates"];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center">
          <Camera className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-xl font-display bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
          {stepTitles[currentStep]}
        </CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {totalSteps}
        </CardDescription>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {renderStep()}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={goBack} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canProceed}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Complete Profile
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {currentStep > 0 ? "Optional fields can be completed later in Settings" : "Required fields"}
        </p>
      </CardContent>
    </Card>
  );
}
