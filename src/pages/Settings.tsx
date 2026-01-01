import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AvailabilitySettings from "@/components/settings/AvailabilitySettings";
import { AccountTypeSwitcher } from "@/components/settings/AccountTypeSwitcher";
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
  Calendar,
  Trophy,
  Gift,
  Check,
} from "lucide-react";
import GiftingSettings from "@/components/settings/GiftingSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import HiddenGiftersList from "@/components/settings/HiddenGiftersList";
import {
  validateMonotonicPricing,
  validatePerMinuteFloor,
  deriveAudioRate,
  calculateMinRateForDuration,
  CALL_PRICING,
} from "@/lib/pricing";
import { useSignedProfileUrl } from "@/components/ui/ProfileImage";

// ============================================================================
// Constants
// ============================================================================

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

// ============================================================================
// Reusable Components
// ============================================================================

const SettingsCard = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn("bg-white/[0.02] border-rose-500/20", className)}>
    <CardHeader className="px-4 py-4 md:px-6 md:py-5">
      <CardTitle className="text-base md:text-lg text-white">{title}</CardTitle>
      {description && <CardDescription className="text-xs md:text-sm text-white/50">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="px-4 pb-4 md:px-6 md:pb-6">{children}</CardContent>
  </Card>
);

const SettingsRow = ({
  label,
  description,
  children,
  noBorder = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) => (
  <div className={cn("flex items-center justify-between gap-4 py-3 md:py-4", !noBorder && "border-b border-white/5")}>
    <div className="flex-1 min-w-0">
      <Label className="text-sm md:text-base text-white">{label}</Label>
      {description && <p className="text-xs md:text-sm text-white/50 mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

const InterestChip = ({
  interest,
  selected,
  onToggle,
  disabled,
}: {
  interest: string;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) => (
  <button
    onClick={onToggle}
    disabled={disabled && !selected}
    className={cn(
      "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm transition-all touch-manipulation",
      "active:scale-95",
      selected ? "bg-rose-500 text-black font-medium" : "bg-white/[0.05] text-white/70 hover:bg-white/10",
      disabled && !selected && "opacity-50 cursor-not-allowed",
    )}
  >
    {selected && <Check className="w-3 h-3 inline mr-1" />}
    {interest}
  </button>
);

const PhotoThumbnail = ({
  src,
  index,
  isMain,
  onRemove,
}: {
  src: string;
  index: number;
  isMain: boolean;
  onRemove: () => void;
}) => (
  <div className="relative aspect-square rounded-xl overflow-hidden group border border-rose-500/20">
    <img src={src} alt="" className="w-full h-full object-cover" />
    <button
      onClick={onRemove}
      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/60 flex items-center justify-center text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95 touch-manipulation"
      aria-label="Remove photo"
    >
      <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
    </button>
    {isMain && (
      <Badge className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 bg-rose-500 text-black text-[10px] md:text-xs">
        Main
      </Badge>
    )}
  </div>
);

const RateSlider = ({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) => (
  <div className="p-3 md:p-4 rounded-lg bg-rose-500/10 border border-amber-500/20 space-y-2 md:space-y-3">
    <Label className="text-sm md:text-base text-white/70">{label}</Label>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 md:w-24 bg-white/[0.02] border-white/10 text-white text-sm"
        />
        <span className="text-xs md:text-sm text-white/50">Credits</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={25} className="flex-1" />
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
  </div>
);

// ============================================================================
// Tab Content Components
// ============================================================================

// Options for select fields
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
  "Norwegian",
  "Danish",
  "Polish",
  "Turkish",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Tagalog",
  "Other",
];

const HOBBIES = [
  "Reading",
  "Writing",
  "Painting",
  "Drawing",
  "Photography",
  "Cooking",
  "Baking",
  "Gardening",
  "Hiking",
  "Camping",
  "Fishing",
  "Hunting",
  "Running",
  "Cycling",
  "Swimming",
  "Yoga",
  "Meditation",
  "Dancing",
  "Singing",
  "Playing Music",
  "Video Games",
  "Board Games",
  "Puzzles",
  "Crafts",
  "Knitting",
  "Sewing",
  "Woodworking",
  "DIY Projects",
  "Traveling",
  "Bird Watching",
  "Stargazing",
  "Volunteering",
];

const PERSONALITY_TRAITS = [
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
  "Organized",
  "Patient",
  "Passionate",
  "Playful",
  "Practical",
  "Romantic",
  "Sensitive",
  "Spontaneous",
  "Thoughtful",
  "Witty",
];

const ProfileTab = ({
  name,
  setName,
  bio,
  setBio,
  city,
  setCity,
  state,
  setState,
  height,
  setHeight,
  interests,
  toggleInterest,
  avatarUrl,
  profile,
  // New fields
  relationshipStatus,
  setRelationshipStatus,
  education,
  setEducation,
  occupation,
  setOccupation,
  languages,
  setLanguages,
  smoking,
  setSmoking,
  drinking,
  setDrinking,
  fitnessLevel,
  setFitnessLevel,
  lookingFor,
  setLookingFor,
  favoriteFood,
  setFavoriteFood,
  favoriteMusic,
  setFavoriteMusic,
  favoriteMovies,
  setFavoriteMovies,
  valuesBeliefs,
  setValuesBeliefs,
  hobbies,
  setHobbies,
  personalityTraits,
  setPersonalityTraits,
  funFacts,
  setFunFacts,
}: {
  name: string;
  setName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  interests: string[];
  toggleInterest: (i: string) => void;
  avatarUrl: string | null;
  profile: any;
  // New fields
  relationshipStatus: string;
  setRelationshipStatus: (v: string) => void;
  education: string;
  setEducation: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  languages: string[];
  setLanguages: (v: string[]) => void;
  smoking: string;
  setSmoking: (v: string) => void;
  drinking: string;
  setDrinking: (v: string) => void;
  fitnessLevel: string;
  setFitnessLevel: (v: string) => void;
  lookingFor: string;
  setLookingFor: (v: string) => void;
  favoriteFood: string;
  setFavoriteFood: (v: string) => void;
  favoriteMusic: string;
  setFavoriteMusic: (v: string) => void;
  favoriteMovies: string;
  setFavoriteMovies: (v: string) => void;
  valuesBeliefs: string;
  setValuesBeliefs: (v: string) => void;
  hobbies: string[];
  setHobbies: (v: string[]) => void;
  personalityTraits: string[];
  setPersonalityTraits: (v: string[]) => void;
  funFacts: string[];
  setFunFacts: (v: string[]) => void;
}) => {
  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else if (languages.length < 5) {
      setLanguages([...languages, lang]);
    }
  };

  const toggleHobby = (hobby: string) => {
    if (hobbies.includes(hobby)) {
      setHobbies(hobbies.filter((h) => h !== hobby));
    } else if (hobbies.length < 6) {
      setHobbies([...hobbies, hobby]);
    }
  };

  const toggleTrait = (trait: string) => {
    if (personalityTraits.includes(trait)) {
      setPersonalityTraits(personalityTraits.filter((t) => t !== trait));
    } else if (personalityTraits.length < 6) {
      setPersonalityTraits([...personalityTraits, trait]);
    }
  };

  const addFunFact = (fact: string) => {
    if (fact.trim() && funFacts.length < 5) {
      setFunFacts([...funFacts, fact.trim()]);
    }
  };

  const removeFunFact = (index: number) => {
    setFunFacts(funFacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Basic Information */}
      <SettingsCard title="Basic Information" description="Update your personal details">
        <div className="space-y-5 md:space-y-6">
          {/* Avatar & Name Display */}
          <div className="flex items-center gap-3 md:gap-4">
            <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-rose-500/30">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xl md:text-2xl bg-rose-500/20 text-amber-400">
                {name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm md:text-base truncate">{name || "Your Name"}</h3>
              <p className="text-xs md:text-sm text-white/50 truncate">{profile?.email}</p>
              <Badge className="mt-1 bg-rose-500/20 text-amber-400 border-0 text-xs">
                {profile?.user_type === "earner" ? "Earner" : "Seeker"}
              </Badge>
            </div>
          </div>

          {/* Name & Height */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-white/70">
                Display Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-sm text-white/70">
                Height
              </Label>
              <Input
                id="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g., 5'10&quot;"
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
          </div>

          {/* City & State */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm text-white/70">
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-white/70">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="bg-white/[0.02] border-white/10 text-white">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-rose-500/20 max-h-[50vh]">
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-rose-500/10">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relationship & Occupation */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-white/70">Relationship Status</Label>
              <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                <SelectTrigger className="bg-white/[0.02] border-white/10 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-rose-500/20">
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-white hover:bg-rose-500/10">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation" className="text-sm text-white/70">
                Occupation
              </Label>
              <Input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label htmlFor="education" className="text-sm text-white/70">
              Education
            </Label>
            <Input
              id="education"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g., Bachelor's in Computer Science"
              className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm text-white/70">
              About You
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              className="min-h-[100px] bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50 text-sm md:text-base"
              maxLength={500}
            />
            <p className="text-[10px] md:text-xs text-white/40 text-right">{bio.length}/500</p>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-sm text-white/70">Languages</Label>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {LANGUAGES.map((lang) => (
                <InterestChip
                  key={lang}
                  interest={lang}
                  selected={languages.includes(lang)}
                  onToggle={() => toggleLanguage(lang)}
                  disabled={languages.length >= 5}
                />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-white/40">Select up to 5 languages ({languages.length}/5)</p>
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <Label className="text-sm text-white/70">Interests</Label>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {INTERESTS.map((interest) => (
                <InterestChip
                  key={interest}
                  interest={interest}
                  selected={interests.includes(interest)}
                  onToggle={() => toggleInterest(interest)}
                  disabled={interests.length >= 6}
                />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-white/40">Select up to 6 interests ({interests.length}/6)</p>
          </div>

          {/* Hobbies */}
          <div className="space-y-2">
            <Label className="text-sm text-white/70">Hobbies</Label>
            <div className="flex flex-wrap gap-1.5 md:gap-2 max-h-[200px] overflow-y-auto p-1">
              {HOBBIES.map((hobby) => (
                <InterestChip
                  key={hobby}
                  interest={hobby}
                  selected={hobbies.includes(hobby)}
                  onToggle={() => toggleHobby(hobby)}
                  disabled={hobbies.length >= 6}
                />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-white/40">Select up to 6 hobbies ({hobbies.length}/6)</p>
          </div>

          {/* Personality Traits */}
          <div className="space-y-2">
            <Label className="text-sm text-white/70">Personality Traits</Label>
            <div className="flex flex-wrap gap-1.5 md:gap-2 max-h-[200px] overflow-y-auto p-1">
              {PERSONALITY_TRAITS.map((trait) => (
                <InterestChip
                  key={trait}
                  interest={trait}
                  selected={personalityTraits.includes(trait)}
                  onToggle={() => toggleTrait(trait)}
                  disabled={personalityTraits.length >= 6}
                />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-white/40">Select up to 6 traits ({personalityTraits.length}/6)</p>
          </div>
        </div>
      </SettingsCard>

      {/* Lifestyle */}
      <SettingsCard title="Lifestyle" description="Share your lifestyle preferences">
        <div className="space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm text-white/70">Smoking</Label>
              <Select value={smoking} onValueChange={setSmoking}>
                <SelectTrigger className="bg-white/[0.02] border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-rose-500/20">
                  {SMOKING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-white hover:bg-rose-500/10">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-white/70">Drinking</Label>
              <Select value={drinking} onValueChange={setDrinking}>
                <SelectTrigger className="bg-white/[0.02] border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-rose-500/20">
                  {DRINKING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-white hover:bg-rose-500/10">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-white/70">Fitness Level</Label>
              <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
                <SelectTrigger className="bg-white/[0.02] border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-rose-500/20">
                  {FITNESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-white hover:bg-rose-500/10">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valuesBeliefs" className="text-sm text-white/70">
              Values & Beliefs
            </Label>
            <Textarea
              id="valuesBeliefs"
              value={valuesBeliefs}
              onChange={(e) => setValuesBeliefs(e.target.value)}
              placeholder="What matters most to you..."
              className="min-h-[80px] bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50 text-sm md:text-base"
              maxLength={300}
            />
            <p className="text-[10px] md:text-xs text-white/40 text-right">{valuesBeliefs.length}/300</p>
          </div>
        </div>
      </SettingsCard>

      {/* Looking For */}
      <SettingsCard title="Looking For" description="Describe what you're looking for">
        <div className="space-y-2">
          <Textarea
            id="lookingFor"
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="Describe who you'd like to connect with..."
            className="min-h-[100px] bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50 text-sm md:text-base"
            maxLength={500}
          />
          <p className="text-[10px] md:text-xs text-white/40 text-right">{lookingFor.length}/500</p>
        </div>
      </SettingsCard>

      {/* Favorites */}
      <SettingsCard title="Favorites" description="Share your favorite things">
        <div className="space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="favoriteFood" className="text-sm text-white/70">
                Favorite Food
              </Label>
              <Input
                id="favoriteFood"
                value={favoriteFood}
                onChange={(e) => setFavoriteFood(e.target.value)}
                placeholder="e.g., Italian, Sushi"
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favoriteMusic" className="text-sm text-white/70">
                Favorite Music
              </Label>
              <Input
                id="favoriteMusic"
                value={favoriteMusic}
                onChange={(e) => setFavoriteMusic(e.target.value)}
                placeholder="e.g., Jazz, Hip-hop"
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favoriteMovies" className="text-sm text-white/70">
                Favorite Movies
              </Label>
              <Input
                id="favoriteMovies"
                value={favoriteMovies}
                onChange={(e) => setFavoriteMovies(e.target.value)}
                placeholder="e.g., Sci-fi, Comedies"
                className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Fun Facts */}
      <SettingsCard title="Fun Facts About Me" description="Share interesting things about yourself">
        <div className="space-y-4">
          {/* Existing fun facts */}
          {funFacts.length > 0 && (
            <div className="space-y-2">
              {funFacts.map((fact, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="flex-1 text-sm text-white/80">{fact}</span>
                  <button
                    onClick={() => removeFunFact(index)}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 touch-manipulation"
                    aria-label="Remove fun fact"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new fun fact */}
          {funFacts.length < 5 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="newFunFact"
                  placeholder="Add a fun fact about yourself..."
                  className="bg-white/[0.02] border-white/10 text-white focus:border-rose-500/50"
                  maxLength={150}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      addFunFact(input.value);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById("newFunFact") as HTMLInputElement;
                    if (input) {
                      addFunFact(input.value);
                      input.value = "";
                    }
                  }}
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 touch-manipulation"
                >
                  Add
                </Button>
              </div>
              <p className="text-[10px] md:text-xs text-white/40">
                Press Enter or click Add. {funFacts.length}/5 facts added.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
};

const PhotosTab = ({
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
  <SettingsCard
    title="Profile Photos"
    description="Upload up to 6 photos. The first photo will be your main profile picture."
  >
    <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
      {photos.map((photo, i) => (
        <PhotoThumbnail key={i} src={photo} index={i} isMain={i === 0} onRemove={() => onRemove(i)} />
      ))}

      {photos.length < 6 && (
        <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors border-amber-500/30 hover:border-amber-500 hover:bg-rose-500/5 active:bg-rose-500/10 touch-manipulation">
          <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" disabled={uploading} />
          {uploading ? (
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-rose-400" />
          ) : (
            <>
              <Upload className="w-6 h-6 md:w-8 md:h-8 text-white/40 mb-1 md:mb-2" />
              <span className="text-[10px] md:text-xs text-white/40">Upload</span>
            </>
          )}
        </label>
      )}
    </div>
  </SettingsCard>
);

const RatesTab = ({
  video15Rate,
  setVideo15Rate,
  video30Rate,
  setVideo30Rate,
  video60Rate,
  setVideo60Rate,
  video90Rate,
  setVideo90Rate,
}: {
  video15Rate: number;
  setVideo15Rate: (v: number) => void;
  video30Rate: number;
  setVideo30Rate: (v: number) => void;
  video60Rate: number;
  setVideo60Rate: (v: number) => void;
  video90Rate: number;
  setVideo90Rate: (v: number) => void;
}) => {
  const handleRateChange = useCallback(
    (duration: 15 | 30 | 60 | 90, value: number, prevDuration?: 15 | 30 | 60, prevRate?: number) => {
      const clampedValue = Math.max(
        CALL_PRICING.MIN_RATES[duration] || CALL_PRICING.MIN_RATE,
        Math.min(CALL_PRICING.MAX_RATE, value),
      );

      if (prevDuration && prevRate) {
        const minValid = Math.max(
          CALL_PRICING.MIN_RATES[duration] || CALL_PRICING.MIN_RATE,
          calculateMinRateForDuration(prevRate, prevDuration, duration),
        );
        if (clampedValue < minValid && clampedValue < CALL_PRICING.MAX_RATE) {
          toast.info("Adjusted to keep rates consistent", { duration: 2000 });
          return Math.min(minValid, CALL_PRICING.MAX_RATE);
        }
      }
      return clampedValue;
    },
    [],
  );

  const audioRates = useMemo(
    () => [
      { duration: 15, rate: deriveAudioRate(video15Rate) },
      { duration: 30, rate: deriveAudioRate(video30Rate) },
      { duration: 60, rate: deriveAudioRate(video60Rate) },
      { duration: 90, rate: deriveAudioRate(video90Rate) },
    ],
    [video15Rate, video30Rate, video60Rate, video90Rate],
  );

  return (
    <SettingsCard
      title="Your Call Rates"
      description="Set your rates for audio and video calls. Audio calls are 70% of video rates. You earn 70% of the credit value."
    >
      <div className="space-y-4 md:space-y-6">
        {/* Video Rates */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <RateSlider
            label="15 min video"
            value={video15Rate}
            onChange={(v) => setVideo15Rate(handleRateChange(15, v))}
            min={200}
            max={900}
          />
          <RateSlider
            label="30 min video"
            value={video30Rate}
            onChange={(v) => setVideo30Rate(handleRateChange(30, v, 15, video15Rate))}
            min={CALL_PRICING.MIN_RATES[30]}
            max={900}
          />
          <RateSlider
            label="60 min video"
            value={video60Rate}
            onChange={(v) => setVideo60Rate(handleRateChange(60, v, 30, video30Rate))}
            min={CALL_PRICING.MIN_RATES[60]}
            max={900}
          />
          <RateSlider
            label="90 min video"
            value={video90Rate}
            onChange={(v) => setVideo90Rate(handleRateChange(90, v, 60, video60Rate))}
            min={CALL_PRICING.MIN_RATES[90]}
            max={900}
          />
        </div>

        {/* Audio Rates Display */}
        <div className="p-3 md:p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <h4 className="font-medium mb-2 md:mb-3 text-sm md:text-base text-white flex items-center gap-2">
            🎧 Derived Audio Rates
            <span className="text-[10px] md:text-xs text-white/50 font-normal">(70% of video)</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {audioRates.map(({ duration, rate }) => (
              <div key={duration} className="p-2 rounded-lg bg-white/[0.02] text-center">
                <p className="text-[10px] md:text-xs text-white/50">{duration} min</p>
                <p className="font-semibold text-sm md:text-base text-teal-400">{rate} Credits</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 md:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <h4 className="font-medium mb-1 md:mb-2 text-sm md:text-base text-white">Pricing Guidelines</h4>
          <p className="text-xs md:text-sm text-white/50">
            Longer calls can be cheaper per minute, but rates must stay within a consistent range. Users are only
            charged for time used.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
};

const AccountTab = ({
  user,
  profile,
  isEarner,
  refreshProfile,
  onSignOut,
  onPause,
  onDelete,
}: {
  user: any;
  profile: any;
  isEarner: boolean;
  refreshProfile: () => Promise<void>;
  onSignOut: () => void;
  onPause: () => void;
  onDelete: () => void;
}) => {
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const updateNotification = useCallback(
    async (field: string, value: boolean) => {
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user.id);
      await refreshProfile();
    },
    [user, refreshProfile],
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <AccountTypeSwitcher />

      {/* Notifications */}
      <SettingsCard title="Notifications" description="Manage how you receive updates">
        <div className="space-y-1">
          <SettingsRow label="Email notifications" description="Receive email updates">
            <Switch
              checked={profile?.email_notifications_enabled ?? true}
              onCheckedChange={(checked) => updateNotification("email_notifications_enabled", checked)}
            />
          </SettingsRow>
          <SettingsRow label="New Messages" description="Get notified for new messages">
            <Switch
              checked={profile?.notify_new_message ?? true}
              onCheckedChange={(checked) => updateNotification("notify_new_message", checked)}
            />
          </SettingsRow>
          <SettingsRow label="Call Bookings" description="Get notified when someone books a call">
            <Switch
              checked={profile?.notify_video_booking ?? true}
              onCheckedChange={(checked) => updateNotification("notify_video_booking", checked)}
            />
          </SettingsRow>
          <SettingsRow label="Profile Likes" description="Get notified when someone likes your profile">
            <Switch
              checked={profile?.notify_likes ?? true}
              onCheckedChange={(checked) => updateNotification("notify_likes", checked)}
            />
          </SettingsRow>
          {isEarner && (
            <SettingsRow label="Payout Updates" description="Get notified about payout status" noBorder>
              <Switch
                checked={profile?.notify_payouts ?? true}
                onCheckedChange={(checked) => updateNotification("notify_payouts", checked)}
              />
            </SettingsRow>
          )}
        </div>
      </SettingsCard>

      {/* Gift Animation Settings - Earners */}
      {isEarner && (
        <SettingsCard title="Gift Animation Settings" description="Control how gift animations appear">
          <div className="space-y-1">
            <SettingsRow label="Mute gift animations" description="Disable animated effects when receiving gifts">
              <Switch
                checked={profile?.mute_gift_animations ?? false}
                onCheckedChange={(checked) => updateNotification("mute_gift_animations", checked)}
              />
            </SettingsRow>
            <div className="py-3 md:py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-sm md:text-base text-white">Premium animation limit</Label>
                  <p className="text-xs md:text-sm text-white/50">Max premium animations per hour</p>
                </div>
                <Badge className="bg-rose-500/20 text-amber-400 border-0">
                  {profile?.premium_animation_limit ?? 5}/hour
                </Badge>
              </div>
              <Slider
                value={[profile?.premium_animation_limit ?? 5]}
                onValueChange={async ([value]) => {
                  await updateNotification("premium_animation_limit", value as any);
                }}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </SettingsCard>
      )}

      {/* Leaderboard Settings - Earners */}
      {isEarner && (
        <Card className="bg-white/[0.02] border-amber-500/20">
          <CardHeader className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
              <CardTitle className="text-base md:text-lg text-white">Top Gifters Leaderboard</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm text-white/50">
              Control how your supporters are displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6 md:pb-6 space-y-1">
            <SettingsRow label="Show Top Gifters" description="Display leaderboard on your profile">
              <Switch
                checked={(profile as any)?.leaderboard_enabled ?? true}
                onCheckedChange={(checked) => updateNotification("leaderboard_enabled", checked)}
              />
            </SettingsRow>
            <SettingsRow label="Show Daily Rankings" description="Include daily leaderboard tab">
              <Switch
                checked={(profile as any)?.show_daily_leaderboard ?? true}
                onCheckedChange={(checked) => updateNotification("show_daily_leaderboard", checked)}
              />
            </SettingsRow>
            <div className="pt-3 md:pt-4">
              <Label className="text-sm md:text-base text-white">Hidden Gifters</Label>
              <p className="text-xs md:text-sm text-white/50 mb-3">Users hidden from your leaderboard</p>
              <HiddenGiftersList creatorId={user?.id || ""} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <SettingsCard title="Account Actions" description="Manage your account">
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={onSignOut}
            className="w-full justify-start bg-white/[0.02] border-white/10 text-white hover:bg-white/5 hover:border-white/20 py-5 md:py-4 touch-manipulation"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start bg-white/[0.02] border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 py-5 md:py-4 touch-manipulation"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0a0f] border-white/10 mx-4 max-w-[calc(100vw-2rem)] md:mx-auto md:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Pause your account?</DialogTitle>
                <DialogDescription className="text-white/60 text-sm">
                  Your profile will be hidden and you won't receive new messages. You can reactivate anytime.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setShowPauseDialog(false)}
                  className="bg-white/[0.02] border-white/10 text-white hover:bg-white/5 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onPause();
                    setShowPauseDialog(false);
                  }}
                  className="bg-rose-500 hover:bg-rose-600 w-full sm:w-auto"
                >
                  Pause Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start bg-white/[0.02] border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive py-5 md:py-4 touch-manipulation"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0a0f] border-white/10 mx-4 max-w-[calc(100vw-2rem)] md:mx-auto md:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription className="text-white/60 text-sm">
                  This action cannot be undone. All your data will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label className="text-white text-sm">Type DELETE to confirm</Label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-rose-500/50"
                />
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmation("");
                  }}
                  className="bg-white/[0.02] border-white/10 text-white hover:bg-white/5 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteConfirmation === "DELETE") {
                      onDelete();
                      setShowDeleteDialog(false);
                    }
                  }}
                  disabled={deleteConfirmation !== "DELETE"}
                  className="w-full sm:w-auto"
                >
                  Delete Forever
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SettingsCard>
    </div>
  );
};

// ============================================================================
// Main Settings Component
// ============================================================================

export default function Settings() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Avatar URL
  const { signedUrl: avatarUrl } = useSignedProfileUrl(profile?.profile_photos?.[0]);

  // UI State
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [height, setHeight] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  // Earner rates
  const [video15Rate, setVideo15Rate] = useState(200);
  const [video30Rate, setVideo30Rate] = useState(300);
  const [video60Rate, setVideo60Rate] = useState(500);
  const [video90Rate, setVideo90Rate] = useState(700);

  // New profile fields
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteMovies, setFavoriteMovies] = useState("");
  const [valuesBeliefs, setValuesBeliefs] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [funFacts, setFunFacts] = useState<string[]>([]);

  const isEarner = profile?.user_type === "earner";

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Initialize form from profile
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
      setVideo30Rate(profile.video_30min_rate || 300);
      setVideo60Rate(profile.video_60min_rate || 500);
      setVideo90Rate((profile as any).video_90min_rate || 700);
      // New fields
      setRelationshipStatus((profile as any).relationship_status || "");
      setEducation((profile as any).education || "");
      setOccupation((profile as any).occupation || "");
      setLanguages((profile as any).languages || []);
      setSmoking((profile as any).smoking || "");
      setDrinking((profile as any).drinking || "");
      setFitnessLevel((profile as any).fitness_level || "");
      setLookingFor((profile as any).looking_for || "");
      setFavoriteFood((profile as any).favorite_food || "");
      setFavoriteMusic((profile as any).favorite_music || "");
      setFavoriteMovies((profile as any).favorite_movies || "");
      setValuesBeliefs((profile as any).values_beliefs || "");
      setHobbies(profile.hobbies || []);
      setPersonalityTraits((profile as any).personality_traits || []);
      setFunFacts((profile as any).fun_facts || []);
    }
  }, [profile]);

  // Handlers
  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const updatedPhotos = [...photos, ...newPhotos].slice(0, 6);
        setPhotos(updatedPhotos);

        await supabase.from("profiles").update({ profile_photos: updatedPhotos }).eq("id", user.id);
        await refreshProfile();

        toast.success("Photos uploaded!");
      } catch (error: any) {
        toast.error(error.message || "Failed to upload photos");
      } finally {
        setUploading(false);
      }
    },
    [user, photos, refreshProfile],
  );

  const removePhoto = useCallback(
    async (index: number) => {
      const updatedPhotos = photos.filter((_, i) => i !== index);
      setPhotos(updatedPhotos);

      if (user) {
        await supabase.from("profiles").update({ profile_photos: updatedPhotos }).eq("id", user.id);
        await refreshProfile();
      }
    },
    [photos, user, refreshProfile],
  );

  const toggleInterest = useCallback(
    (interest: string) => {
      if (interests.includes(interest)) {
        setInterests(interests.filter((i) => i !== interest));
      } else if (interests.length < 6) {
        setInterests([...interests, interest]);
      }
    },
    [interests],
  );

  const saveProfile = useCallback(async () => {
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
        // New fields
        relationship_status: relationshipStatus,
        education,
        occupation,
        languages,
        smoking,
        drinking,
        fitness_level: fitnessLevel,
        looking_for: lookingFor,
        favorite_food: favoriteFood,
        favorite_music: favoriteMusic,
        favorite_movies: favoriteMovies,
        values_beliefs: valuesBeliefs,
        hobbies,
        personality_traits: personalityTraits,
        fun_facts: funFacts,
        updated_at: new Date().toISOString(),
      };

      if (isEarner) {
        const rates = {
          video_15min_rate: video15Rate,
          video_30min_rate: video30Rate,
          video_60min_rate: video60Rate,
          video_90min_rate: video90Rate,
        };

        const monoCheck = validateMonotonicPricing(rates);
        if (!monoCheck.valid) {
          toast.error(monoCheck.error);
          setSaving(false);
          return;
        }

        const pmCheck = validatePerMinuteFloor(rates);
        if (!pmCheck.valid) {
          toast.error(pmCheck.error);
          setSaving(false);
          return;
        }

        Object.assign(updates, rates);
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
  }, [
    user,
    name,
    bio,
    city,
    state,
    height,
    interests,
    relationshipStatus,
    education,
    occupation,
    languages,
    smoking,
    drinking,
    fitnessLevel,
    lookingFor,
    favoriteFood,
    favoriteMusic,
    favoriteMovies,
    valuesBeliefs,
    hobbies,
    personalityTraits,
    funFacts,
    isEarner,
    video15Rate,
    video30Rate,
    video60Rate,
    video90Rate,
    refreshProfile,
  ]);

  const handlePauseAccount = useCallback(async () => {
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
  }, [user, navigate]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    }
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/auth");
  }, [signOut, navigate]);

  // Tab count for grid
  const tabCount = useMemo(() => {
    if (!isEarner) return 3;
    return profile?.gifting_onboarding_completed ? 6 : 5;
  }, [isEarner, profile?.gifting_onboarding_completed]);

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container max-w-4xl px-3 md:px-4 py-4 md:py-6">
          {/* Header */}
          <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:mb-6">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="mb-1 md:mb-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5 text-sm touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Dashboard
              </Button>
              <h1
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Settings
              </h1>
              <p className="text-xs md:text-sm text-white/50">Manage your account and preferences</p>
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="w-full md:w-auto bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 py-5 md:py-4 touch-manipulation"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
            <TabsList
              className={cn(
                "grid w-full bg-white/[0.02] border border-amber-500/20 h-auto p-1",
                `grid-cols-${Math.min(tabCount, 3)} md:grid-cols-${tabCount}`,
              )}
              style={{
                gridTemplateColumns: `repeat(${Math.min(tabCount, 3)}, minmax(0, 1fr))`,
              }}
            >
              <TabsTrigger
                value="profile"
                className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
              >
                <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
              >
                <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              {isEarner && (
                <>
                  <TabsTrigger
                    value="rates"
                    className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
                  >
                    <Gem className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Rates</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="availability"
                    className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Availability</span>
                  </TabsTrigger>
                  {profile?.gifting_onboarding_completed && (
                    <TabsTrigger
                      value="gifting"
                      className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
                    >
                      <Gift className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Gifting</span>
                    </TabsTrigger>
                  )}
                </>
              )}
              <TabsTrigger
                value="account"
                className="gap-1.5 md:gap-2 py-2.5 md:py-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-amber-400 text-xs md:text-sm"
              >
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileTab
                name={name}
                setName={setName}
                bio={bio}
                setBio={setBio}
                city={city}
                setCity={setCity}
                state={state}
                setState={setState}
                height={height}
                setHeight={setHeight}
                interests={interests}
                toggleInterest={toggleInterest}
                avatarUrl={avatarUrl}
                profile={profile}
                relationshipStatus={relationshipStatus}
                setRelationshipStatus={setRelationshipStatus}
                education={education}
                setEducation={setEducation}
                occupation={occupation}
                setOccupation={setOccupation}
                languages={languages}
                setLanguages={setLanguages}
                smoking={smoking}
                setSmoking={setSmoking}
                drinking={drinking}
                setDrinking={setDrinking}
                fitnessLevel={fitnessLevel}
                setFitnessLevel={setFitnessLevel}
                lookingFor={lookingFor}
                setLookingFor={setLookingFor}
                favoriteFood={favoriteFood}
                setFavoriteFood={setFavoriteFood}
                favoriteMusic={favoriteMusic}
                setFavoriteMusic={setFavoriteMusic}
                favoriteMovies={favoriteMovies}
                setFavoriteMovies={setFavoriteMovies}
                valuesBeliefs={valuesBeliefs}
                setValuesBeliefs={setValuesBeliefs}
                hobbies={hobbies}
                setHobbies={setHobbies}
                personalityTraits={personalityTraits}
                setPersonalityTraits={setPersonalityTraits}
                funFacts={funFacts}
                setFunFacts={setFunFacts}
              />
            </TabsContent>

            <TabsContent value="photos">
              <PhotosTab photos={photos} uploading={uploading} onUpload={handlePhotoUpload} onRemove={removePhoto} />
            </TabsContent>

            {isEarner && (
              <>
                <TabsContent value="rates">
                  <RatesTab
                    video15Rate={video15Rate}
                    setVideo15Rate={setVideo15Rate}
                    video30Rate={video30Rate}
                    setVideo30Rate={setVideo30Rate}
                    video60Rate={video60Rate}
                    setVideo60Rate={setVideo60Rate}
                    video90Rate={video90Rate}
                    setVideo90Rate={setVideo90Rate}
                  />
                </TabsContent>

                <TabsContent value="availability">
                  <AvailabilitySettings />
                </TabsContent>

                {profile?.gifting_onboarding_completed && (
                  <TabsContent value="gifting">
                    <GiftingSettings />
                  </TabsContent>
                )}
              </>
            )}

            <TabsContent value="account">
              <AccountTab
                user={user}
                profile={profile}
                isEarner={isEarner}
                refreshProfile={refreshProfile}
                onSignOut={handleSignOut}
                onPause={handlePauseAccount}
                onDelete={handleDeleteAccount}
              />
            </TabsContent>
          </Tabs>
        </main>

        <Footer />
        <MobileNav />
      </div>
    </div>
  );
}
