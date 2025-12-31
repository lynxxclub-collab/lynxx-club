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
  photos: string[];
  bio: string;
  city: string;
  state: string;
  height: string;
  hobbies: string[];
  interests: string[];
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
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const RATE_CONFIG = {
  video30: { min: 200, max: 450, default: 250, step: 10 },
  video60: { min: 450, max: 900, default: 500, step: 10 },
  creditValue: 0.1,
  earnerShare: 0.7,
} as const;

// =============================================================================
// VALIDATION
// =============================================================================

const profileSetupSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(MIN_BIO_LENGTH, `Bio must be at least ${MIN_BIO_LENGTH} characters`)
    .max(MAX_BIO_LENGTH, `Bio must be less than ${MAX_BIO_LENGTH} characters`),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "City can only contain letters, spaces, hyphens, and apostrophes"),
  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .max(50, "State must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "State can only contain letters, spaces, hyphens, and apostrophes"),
  photos: z
    .array(z.string().url())
    .min(MIN_PHOTOS, `Please upload at least ${MIN_PHOTOS} photos`)
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos allowed`),
});

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Only JPG, PNG, and WebP are allowed" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Invalid file extension" };
  }

  return { valid: true };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const calculateEarnings = (credits: number): { usd: number; earnings: number } => {
  const usd = credits * RATE_CONFIG.creditValue;
  const earnings = usd * RATE_CONFIG.earnerShare;
  return { usd, earnings };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
  hint?: string;
}

const FormField = ({ label, icon, error, children, optional, hint }: FormFieldProps) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2 text-sm font-medium">
      {icon}
      {label}
      {optional && <span className="text-muted-foreground text-xs">(optional)</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && (
      <p className="flex items-center gap-1.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

interface PhotoGridProps {
  photos: string[];
  maxPhotos: number;
  minPhotos: number;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}

const PhotoGrid = ({ photos, maxPhotos, minPhotos, uploading, onUpload, onRemove }: PhotoGridProps) => (
  <div className="grid grid-cols-3 gap-3">
    {photos.map((photo, index) => (
      <div
        key={`${photo}-${index}`}
        className="relative aspect-square rounded-xl overflow-hidden group border-2 border-transparent hover:border-primary/30 transition-colors"
      >
        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-2 right-2 w-7 h-7 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
          aria-label={`Remove photo ${index + 1}`}
        >
          <X className="w-4 h-4 text-destructive-foreground" />
        </button>
        {index === 0 && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-medium">
            Main
          </span>
        )}
      </div>
    ))}

    {photos.length < maxPhotos && (
      <label
        className={cn(
          "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
          "bg-secondary/30 hover:bg-secondary/50",
          uploading ? "border-primary/50 cursor-wait" : "border-border hover:border-primary/50",
        )}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
        )}
        <span className="text-xs text-muted-foreground text-center px-2">
          {uploading ? "Uploading..." : "Add Photo"}
        </span>
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

interface TagInputProps {
  tags: string[];
  placeholder: string;
  colorClass: string;
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}

const TagInput = ({ tags, placeholder, colorClass, onAdd, onRemove }: TagInputProps) => {
  const [value, setValue] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setValue("");
    }
  }, [value, tags, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                colorClass,
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="bg-secondary/50"
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!value.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
};

interface RateSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const RateSlider = ({ label, value, min, max, step, onChange }: RateSliderProps) => {
  const earnings = useMemo(() => calculateEarnings(value), [value]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-sm">
          {label}: {value} credits
        </Label>
        <span className="text-sm font-semibold text-gold">You earn ${earnings.earnings.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="[&_[role=slider]]:bg-gold [&_[role=slider]]:border-gold/50"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min} credits</span>
        <span>{max} credits</span>
      </div>
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

  // Form state
  const [formData, setFormData] = useState<FormData>({
    photos: [],
    bio: "",
    city: "",
    state: "",
    height: "",
    hobbies: [],
    interests: [],
    video30Rate: RATE_CONFIG.video30.default,
    video60Rate: RATE_CONFIG.video60.default,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Computed values
  const photoCount = formData.photos.length;
  const bioLength = formData.bio.length;
  const canSubmit = useMemo(() => {
    return (
      formData.photos.length >= MIN_PHOTOS &&
      formData.bio.trim().length >= MIN_BIO_LENGTH &&
      formData.city.trim().length > 0 &&
      formData.state.trim().length > 0
    );
  }, [formData]);

  // Field updaters
  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
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
        const sanitizedExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : "jpg";
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sanitizedExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("profile-photos")
            .upload(fileName, file, { contentType: file.type });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error("Failed to upload photo");
            continue;
          }

          // Store only the path - signed URLs will be generated when displaying
          newPhotos.push(fileName);
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("Failed to upload photo");
        }
      }

      if (newPhotos.length > 0) {
        updateField("photos", [...formData.photos, ...newPhotos]);
        toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? "s" : ""} uploaded`);
      }

      setUploading(false);
      // Reset input
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

  // Tag handlers
  const handleAddHobby = useCallback(
    (hobby: string) => {
      if (formData.hobbies.length < 10) {
        updateField("hobbies", [...formData.hobbies, hobby]);
      }
    },
    [formData.hobbies, updateField],
  );

  const handleRemoveHobby = useCallback(
    (index: number) => {
      updateField(
        "hobbies",
        formData.hobbies.filter((_, i) => i !== index),
      );
    },
    [formData.hobbies, updateField],
  );

  const handleAddInterest = useCallback(
    (interest: string) => {
      if (formData.interests.length < 10) {
        updateField("interests", [...formData.interests, interest]);
      }
    },
    [formData.interests, updateField],
  );

  const handleRemoveInterest = useCallback(
    (index: number) => {
      updateField(
        "interests",
        formData.interests.filter((_, i) => i !== index),
      );
    },
    [formData.interests, updateField],
  );

  // Form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

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
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error(Object.values(fieldErrors)[0]);
        return;
      }

      if (!user?.id) {
        toast.error("Please sign in to continue");
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
          hobbies: formData.hobbies,
          interests: formData.interests,
          account_status: "pending_verification",
          onboarding_step: 4,
        };

        if (isEarner) {
          updateData.video_30min_rate = formData.video30Rate;
          updateData.video_60min_rate = formData.video60Rate;
        }

        const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);

        if (error) throw error;

        toast.success("Profile saved! Now verify your identity.");
        onComplete();
        navigate("/verify");
      } catch (error) {
        console.error("Failed to save profile:", error);
        toast.error("Failed to save profile. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [formData, user?.id, isEarner, onComplete, navigate],
  );

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
          Complete your profile
        </CardTitle>
        <CardDescription>Add photos and tell people about yourself</CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <FormField
            label={`Photos (${photoCount}/${MAX_PHOTOS})`}
            icon={<Camera className="w-4 h-4 text-primary" />}
            error={errors.photos}
            hint={`Upload at least ${MIN_PHOTOS} photos. First photo will be your main profile picture.`}
          >
            <PhotoGrid
              photos={formData.photos}
              maxPhotos={MAX_PHOTOS}
              minPhotos={MIN_PHOTOS}
              uploading={uploading}
              onUpload={handlePhotoUpload}
              onRemove={handlePhotoRemove}
            />
          </FormField>

          {/* Bio */}
          <FormField
            label={`Bio (${bioLength}/${MAX_BIO_LENGTH})`}
            icon={<FileText className="w-4 h-4 text-primary" />}
            error={errors.bio}
          >
            <Textarea
              id="bio"
              placeholder="Tell people about yourself... What makes you interesting? What are you looking for?"
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value.slice(0, MAX_BIO_LENGTH))}
              className={cn(
                "bg-secondary/50 min-h-[120px] resize-none transition-colors",
                errors.bio && "border-destructive focus-visible:ring-destructive",
              )}
            />
          </FormField>

          {/* Location */}
          <FormField
            label="Location"
            icon={<MapPin className="w-4 h-4 text-primary" />}
            error={errors.city || errors.state}
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={cn("bg-secondary/50", errors.city && "border-destructive")}
              />
              <Input
                placeholder="State"
                value={formData.state}
                onChange={(e) => updateField("state", e.target.value)}
                className={cn("bg-secondary/50", errors.state && "border-destructive")}
              />
            </div>
          </FormField>

          {/* Height */}
          <FormField label="Height" icon={<Ruler className="w-4 h-4 text-primary" />} optional>
            <Input
              placeholder="e.g., 5'9 or 175cm"
              value={formData.height}
              onChange={(e) => updateField("height", e.target.value)}
              className="bg-secondary/50"
            />
          </FormField>

          {/* Interests */}
          <FormField
            label="Interests"
            icon={<Tag className="w-4 h-4 text-primary" />}
            optional
            hint="Add up to 10 interests"
          >
            <TagInput
              tags={formData.interests}
              placeholder="Add an interest (e.g., Travel, Photography)"
              colorClass="bg-primary/10 text-primary"
              onAdd={handleAddInterest}
              onRemove={handleRemoveInterest}
            />
          </FormField>

          {/* Hobbies */}
          <FormField
            label="Hobbies"
            icon={<Sparkles className="w-4 h-4 text-teal" />}
            optional
            hint="Add up to 10 hobbies"
          >
            <TagInput
              tags={formData.hobbies}
              placeholder="Add a hobby (e.g., Hiking, Cooking)"
              colorClass="bg-teal/10 text-teal"
              onAdd={handleAddHobby}
              onRemove={handleRemoveHobby}
            />
          </FormField>

          {/* Video Rates (Earner only) */}
          {isEarner && (
            <div className="space-y-5 p-5 rounded-xl bg-gradient-to-br from-gold/5 to-gold/10 border border-gold/20">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold text-gold">Set Your Video Date Rates</h3>
                  <p className="text-xs text-muted-foreground">You keep 70% of all earnings</p>
                </div>
              </div>

              <div className="space-y-6">
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
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300",
              "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            )}
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </span>
            ) : (
              "Complete Profile"
            )}
          </Button>

          {/* Progress indicator */}
          <p className="text-center text-xs text-muted-foreground">Step 3 of 4 • Profile Setup</p>
        </form>
      </CardContent>
    </Card>
  );
}
