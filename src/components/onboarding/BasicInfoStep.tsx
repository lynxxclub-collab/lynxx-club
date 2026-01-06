import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, Calendar, Heart, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface BasicInfoStepProps {
  onComplete: () => void;
}

type Gender = "male" | "female" | "non_binary" | "other";

interface GenderOption {
  value: Gender;
  label: string;
  emoji: string;
}

interface FormData {
  name: string;
  dateOfBirth: string;
  gender: Gender | "";
  genderPreference: Gender[];
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// =============================================================================
// CONSTANTS
// =============================================================================

const GENDER_OPTIONS: GenderOption[] = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
  { value: "non_binary", label: "Non-binary", emoji: "🧑" },
  { value: "other", label: "Other", emoji: "✨" },
] as const;

const MIN_AGE = 18;
const MAX_NAME_LENGTH = 100;

// =============================================================================
// VALIDATION
// =============================================================================

const calculateAge = (dateString: string): number => {
  const birthDate = new Date(dateString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
};

const getMaxBirthDate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MIN_AGE);
  return date.toISOString().split("T")[0];
};

const basicInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  dateOfBirth: z
    .string()
    .min(1, "Please enter your date of birth")
    .refine((date) => {
      if (!date) return false;
      const age = calculateAge(date);
      return age >= MIN_AGE && age < 120;
    }, `You must be at least ${MIN_AGE} years old to use this app`),
  gender: z.enum(["male", "female", "non_binary", "other"], {
    errorMap: () => ({ message: "Please select your gender" }),
  }),
  genderPreference: z
    .array(z.enum(["male", "female", "non_binary", "other"]))
    .min(1, "Please select at least one gender preference"),
});

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}

const FormField = ({ label, icon, error, children, required = true }: FormFieldProps) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2 text-sm font-medium text-white">
      {icon}
      {label}
      {required && <span className="text-rose-400">*</span>}
    </Label>
    {children}
    {error && (
      <p className="flex items-center gap-1.5 text-sm text-rose-400 animate-in fade-in slide-in-from-top-1">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

interface GenderPreferenceGridProps {
  options: GenderOption[];
  selected: Gender[];
  onChange: (value: Gender, checked: boolean) => void;
}

const GenderPreferenceGrid = ({ options, selected, onChange }: GenderPreferenceGridProps) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map((option) => {
      const isSelected = selected.includes(option.value);

      return (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
            "border hover:border-rose-500/50 active:scale-[0.98]",
            isSelected
              ? "bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]",
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onChange(option.value, checked as boolean)}
            className={cn(
              "border-white/30 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
              "transition-colors"
            )}
          />
          <span className="flex items-center gap-2">
            <span className="text-lg">{option.emoji}</span>
            <span className={cn("font-medium text-sm", isSelected ? "text-rose-300" : "text-white/70")}>{option.label}</span>
          </span>
        </label>
      );
    })}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BasicInfoStep({ onComplete }: BasicInfoStepProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    dateOfBirth: "",
    gender: "",
    genderPreference: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Set<keyof FormData>>(new Set());

  const maxBirthDate = useMemo(() => getMaxBirthDate(), []);

  const isFormComplete = useMemo(() => {
    return (
      formData.name.trim().length > 0 &&
      formData.dateOfBirth.length > 0 &&
      formData.gender !== "" &&
      formData.genderPreference.length > 0
    );
  }, [formData]);

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

  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const handlePreferenceChange = useCallback(
    (value: Gender, checked: boolean) => {
      setFormData((prev) => ({
        ...prev,
        genderPreference: checked
          ? [...prev.genderPreference, value]
          : prev.genderPreference.filter((g) => g !== value),
      }));

      if (errors.genderPreference) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.genderPreference;
          return newErrors;
        });
      }
    },
    [errors.genderPreference],
  );

  const validateForm = useCallback((): FormErrors | null => {
    const result = basicInfoSchema.safeParse({
      ...formData,
      gender: formData.gender || undefined,
    });

    if (result.success) {
      return null;
    }

    const fieldErrors: FormErrors = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as keyof FormData;
      if (!fieldErrors[field]) {
        fieldErrors[field] = err.message;
      }
    });

    return fieldErrors;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateForm();
      if (validationErrors) {
        setErrors(validationErrors);
        const firstError = Object.values(validationErrors)[0];
        if (firstError) {
          toast.error(firstError);
        }
        return;
      }

      if (!user?.id) {
        toast.error("Please sign in to continue");
        return;
      }

      setLoading(true);

      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            name: formData.name.trim(),
            date_of_birth: formData.dateOfBirth,
            gender: formData.gender as Gender,
            gender_preference: formData.genderPreference,
            onboarding_step: 2,
          })
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        toast.success("Profile saved successfully!");
        onComplete();
      } catch (error) {
        console.error("Failed to save profile:", error);
        toast.error("Failed to save your information. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [formData, user?.id, validateForm, onComplete],
  );

  return (
    <Card 
      className="bg-[#0f0f12] border border-white/10 shadow-2xl overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <CardHeader className="text-center pb-2 pt-6">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 shadow-lg shadow-rose-500/5">
          <User className="w-8 h-8 text-rose-400" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
          Tell us about yourself
        </CardTitle>
        <CardDescription className="text-white/60 mt-2">
          Help us personalize your dating experience
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="Your Name"
            icon={<User className="w-4 h-4 text-rose-400" />}
            error={touched.has("name") ? errors.name : undefined}
          >
            <Input
              id="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              className={cn(
                "bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/30 focus:border-rose-500 focus:ring-rose-500/20 transition-colors h-11",
                errors.name && touched.has("name") && "border-rose-500 focus:ring-rose-500/30",
              )}
            />
          </FormField>

          <FormField
            label="Date of Birth"
            icon={<Calendar className="w-4 h-4 text-rose-400" />}
            error={touched.has("dateOfBirth") ? errors.dateOfBirth : undefined}
          >
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              onBlur={() => handleBlur("dateOfBirth")}
              max={maxBirthDate}
              className={cn(
                "bg-[#0a0a0f] border-white/10 text-white focus:border-rose-500 focus:ring-rose-500/20 transition-colors h-11 [color-scheme:dark]",
                errors.dateOfBirth && touched.has("dateOfBirth") && "border-rose-500 focus:ring-rose-500/30",
              )}
            />
            <p className="text-xs text-white/30">You must be {MIN_AGE}+ to use this app</p>
          </FormField>

          <FormField
            label="Your Gender"
            icon={<Heart className="w-4 h-4 text-rose-400" />}
            error={touched.has("gender") ? errors.gender : undefined}
          >
            <Select value={formData.gender} onValueChange={(value) => updateField("gender", value as Gender)}>
              <SelectTrigger
                className={cn(
                  "bg-[#0a0a0f] border-white/10 text-white focus:border-rose-500 focus:ring-rose-500/20 transition-colors h-11",
                  errors.gender && touched.has("gender") && "border-rose-500 focus:ring-rose-500/30",
                  !formData.gender && "text-white/30",
                )}
                onBlur={() => handleBlur("gender")}
              >
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10 shadow-xl">
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white focus:bg-white/10 focus:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="I'm interested in"
            icon={<Heart className="w-4 h-4 text-purple-400" />}
            error={errors.genderPreference}
          >
            <GenderPreferenceGrid
              options={GENDER_OPTIONS}
              selected={formData.genderPreference}
              onChange={handlePreferenceChange}
            />
          </FormField>

          <Button
            type="submit"
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              "text-white border-0",
            )}
            disabled={loading || !isFormComplete}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </span>
            ) : (
              "Continue"
            )}
          </Button>

          <p className="text-center text-xs text-white/30 font-medium tracking-wide">
            Step 1 of 4 • Basic Information
          </p>
        </form>
      </CardContent>
    </Card>
  );
}