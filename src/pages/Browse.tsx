import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ProfileCard from "@/components/browse/ProfileCard";
import PreviewProfileCard from "@/components/browse/PreviewProfileCard";
import EmptyState from "@/components/ui/EmptyState";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  Users,
  Rocket,
  X,
  MapPin,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  Filter,
  Grid3X3,
  LayoutGrid,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBrowseProfiles, BrowseProfile, PreviewProfile, isFullProfile } from "@/hooks/useBrowseProfiles";
import { useProfileLikeNotifications } from "@/hooks/useProfileLikeNotifications";
import { useSavedProfiles } from "@/hooks/useSavedProfiles";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

export default function Browse() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!user;

  useProfileLikeNotifications();
  const { isSaved, toggleSave } = useSavedProfiles();

  // Temporarily disabled for public access
  // useEffect(() => {
  //   if (!loading && profile) {
  //     if (profile.account_status === "paused") {
  //       navigate("/reactivate");
  //       return;
  //     }
  //     if (profile.account_status === "alumni") {
  //       navigate("/alumni");
  //       return;
  //     }
  //     if (profile.account_status === "pending_verification" || profile.account_status === "pending") {
  //       navigate("/verify");
  //       return;
  //     }
  //     if (profile.verification_status !== "verified") {
  //       navigate("/verify");
  //       return;
  //     }
  //     if (profile.account_status !== "active") {
  //       navigate("/onboarding");
  //       return;
  //     }
  //   }
  // }, [profile, loading, navigate]);

  const { data: profiles = [], isLoading, error, refetch } = useBrowseProfiles(isAuthenticated);

  const [showFilters, setShowFilters] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState<"comfortable" | "compact">("comfortable");

  // Filters
  const [searchCity, setSearchCity] = useState("");
  const [ageRange, setAgeRange] = useState([18, 50]);
  const [typeFilter, setTypeFilter] = useState<"all" | "seeker" | "earner">("all");
  const [sortBy, setSortBy] = useState("newest");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 1000]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchCity) count++;
    if (ageRange[0] !== 18 || ageRange[1] !== 50) count++;
    if (typeFilter !== "all") count++;
    if (onlineOnly) count++;
    if (priceRange[0] !== 0 || priceRange[1] !== 1000) count++;
    return count;
  }, [searchCity, ageRange, typeFilter, onlineOnly, priceRange]);

  // SEO
  useEffect(() => {
    document.title = "Browse Profiles | Lynxx Club";
  }, []);

  // Fetch liked profiles
  useEffect(() => {
    const fetchLikes = async () => {
      if (!user?.id || profile?.user_type !== "earner") return;
      const { data } = await supabase.from("profile_likes").select("liked_id").eq("liker_id", user.id);
      if (data) {
        setLikedProfiles(new Set(data.map((l) => l.liked_id)));
      }
    };
    fetchLikes();
  }, [user?.id, profile?.user_type]);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    if (typeFilter !== "all") {
      result = result.filter((p) => p.user_type === typeFilter);
    }

    if (searchCity.trim()) {
      result = result.filter((p) => p.location_city?.toLowerCase().includes(searchCity.toLowerCase()));
    }

    if (isAuthenticated && result.length > 0 && isFullProfile(result[0] as BrowseProfile | PreviewProfile)) {
      result = result.filter((p) => {
        const fullProfile = p as BrowseProfile;
        if (!fullProfile.age) return true;
        return fullProfile.age >= ageRange[0] && fullProfile.age <= ageRange[1];
      });

      // Price filter for earners
      if (priceRange[0] > 0 || priceRange[1] < 1000) {
        result = result.filter((p) => {
          const fullProfile = p as BrowseProfile;
          const rate = fullProfile.video_30min_rate || 0;
          return rate >= priceRange[0] && rate <= priceRange[1];
        });
      }

      // Sort
      if (sortBy === "newest") {
        result.sort(
          (a, b) =>
            new Date((b as BrowseProfile).created_at).getTime() - new Date((a as BrowseProfile).created_at).getTime(),
        );
      } else if (sortBy === "rating") {
        result.sort((a, b) => ((b as BrowseProfile).average_rating || 0) - ((a as BrowseProfile).average_rating || 0));
      } else if (sortBy === "rate_low") {
        result.sort(
          (a, b) => ((a as BrowseProfile).video_30min_rate || 0) - ((b as BrowseProfile).video_30min_rate || 0),
        );
      } else if (sortBy === "rate_high") {
        result.sort(
          (a, b) => ((b as BrowseProfile).video_30min_rate || 0) - ((a as BrowseProfile).video_30min_rate || 0),
        );
      } else if (sortBy === "featured") {
        result.sort((a, b) => {
          const aFeatured = (a as BrowseProfile).is_featured ? 1 : 0;
          const bFeatured = (b as BrowseProfile).is_featured ? 1 : 0;
          return bFeatured - aFeatured;
        });
      }
    }

    return result;
  }, [profiles, searchCity, ageRange, sortBy, typeFilter, isAuthenticated, onlineOnly, priceRange]);

  const handleProfileClick = (p: BrowseProfile | PreviewProfile) => {
    if (isAuthenticated) {
      navigate(`/profile/${p.id}`);
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const handleLikeToggle = async (profileId: string) => {
    if (!user?.id) return;
    const isLiked = likedProfiles.has(profileId);

    if (isLiked) {
      await supabase.from("profile_likes").delete().eq("liker_id", user.id).eq("liked_id", profileId);
      setLikedProfiles((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    } else {
      await supabase.from("profile_likes").insert({ liker_id: user.id, liked_id: profileId });
      setLikedProfiles((prev) => new Set(prev).add(profileId));
    }
  };

  const resetFilters = () => {
    setSearchCity("");
    setAgeRange([18, 50]);
    setTypeFilter("all");
    setOnlineOnly(false);
    setPriceRange([0, 1000]);
  };

  const isEarner = profile?.user_type === "earner";

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10">
          <Header />
          <div className="container py-8">
            {/* Skeleton header */}
            <div className="mb-8">
              <div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg mb-2" />
              <div className="h-4 w-64 bg-white/5 animate-pulse rounded-lg" />
            </div>
            <div
              className={cn(
                "grid gap-4",
                gridSize === "comfortable"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              )}
            >
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          <MobileNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
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

        <div className="container py-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Browse Members
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Discover{" "}
                  <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                    People
                  </span>
                </h1>
                <p className="text-white/50 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {filteredProfiles.length} {filteredProfiles.length === 1 ? "profile" : "profiles"} available
                </p>
              </div>

              {/* Grid toggle - desktop only */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGridSize("comfortable")}
                  className={cn(
                    "h-9 w-9 rounded-xl border",
                    gridSize === "comfortable"
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGridSize("compact")}
                  className={cn(
                    "h-9 w-9 rounded-xl border",
                    gridSize === "compact"
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search by city..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                {searchCity && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-white/50 hover:text-white"
                    onClick={() => setSearchCity("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="w-full sm:w-[180px] h-11 bg-white/5 border-white/10 text-white rounded-xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <div className="flex items-center gap-2">
                    {sortBy === "newest" && <Clock className="w-4 h-4 text-white/50" />}
                    {sortBy === "rating" && <Star className="w-4 h-4 text-white/50" />}
                    {sortBy === "featured" && <Sparkles className="w-4 h-4 text-white/50" />}
                    {(sortBy === "rate_low" || sortBy === "rate_high") && (
                      <TrendingUp className="w-4 h-4 text-white/50" />
                    )}
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-white/10">
                  <SelectItem value="featured" className="text-white/70 focus:bg-white/10 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Featured First
                    </div>
                  </SelectItem>
                  <SelectItem value="newest" className="text-white/70 focus:bg-white/10 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Newest
                    </div>
                  </SelectItem>
                  <SelectItem value="rating" className="text-white/70 focus:bg-white/10 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Highest Rated
                    </div>
                  </SelectItem>
                  {!isEarner && (
                    <>
                      <SelectItem value="rate_low" className="text-white/70 focus:bg-white/10 focus:text-white">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Price: Low to High
                        </div>
                      </SelectItem>
                      <SelectItem value="rate_high" className="text-white/70 focus:bg-white/10 focus:text-white">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 rotate-180" />
                          Price: High to Low
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Filter Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 gap-2 rounded-xl border-white/10 text-white/70 hover:text-white hover:bg-white/5",
                      activeFilterCount > 0 && "border-purple-500/50 bg-purple-500/10 text-white",
                    )}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 h-5 w-5 flex items-center justify-center rounded-full bg-purple-500 text-white text-xs font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md bg-[#0a0a0f] border-white/10">
                  <SheetHeader>
                    <SheetTitle
                      className="flex items-center gap-2 text-white"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <SlidersHorizontal className="w-5 h-5 text-purple-400" />
                      Filter Profiles
                    </SheetTitle>
                    <SheetDescription className="text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Narrow down your search to find the perfect match.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="py-6 space-y-6">
                    {/* Profile Type */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Profile Type
                      </Label>
                      <ToggleGroup
                        type="single"
                        value={typeFilter}
                        onValueChange={(value) => value && setTypeFilter(value as "all" | "seeker" | "earner")}
                        className="justify-start"
                      >
                        <ToggleGroupItem
                          value="all"
                          className="px-4 data-[state=on]:bg-purple-500 data-[state=on]:text-white border-white/10 text-white/70"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          All
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="seeker"
                          className="px-4 data-[state=on]:bg-purple-500 data-[state=on]:text-white border-white/10 text-white/70"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          Seekers
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="earner"
                          className="px-4 data-[state=on]:bg-purple-500 data-[state=on]:text-white border-white/10 text-white/70"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          Earners
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {/* Age Range */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label
                          className="text-sm font-medium text-white"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          Age Range
                        </Label>
                        <span className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {ageRange[0]} - {ageRange[1]} years
                        </span>
                      </div>
                      <Slider
                        value={ageRange}
                        onValueChange={setAgeRange}
                        min={18}
                        max={60}
                        step={1}
                        className="py-2"
                      />
                    </div>

                    {/* Price Range - only for seekers viewing earners */}
                    {!isEarner && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label
                            className="text-sm font-medium text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Video Date Rate
                          </Label>
                          <span className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {priceRange[0]} - {priceRange[1]} credits
                          </span>
                        </div>
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          min={0}
                          max={1000}
                          step={25}
                          className="py-2"
                        />
                      </div>
                    )}

                    {/* Toggle Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="space-y-0.5">
                          <Label
                            className="text-sm font-medium text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Online Only
                          </Label>
                          <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Show only users who are currently online
                          </p>
                        </div>
                        <Switch checked={onlineOnly} onCheckedChange={setOnlineOnly} />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="space-y-0.5">
                          <Label
                            className="text-sm font-medium text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Verified Only
                          </Label>
                          <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Show only verified profiles
                          </p>
                        </div>
                        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                      </div>
                    </div>
                  </div>

                  <SheetFooter className="flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Reset All
                    </Button>
                    <SheetClose asChild>
                      <Button
                        className="flex-1 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Apply Filters
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters Pills */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Active filters:
                </span>
                {searchCity && (
                  <Badge className="gap-1 pr-1 bg-white/10 text-white/70 border-white/10 hover:bg-white/20">
                    <MapPin className="w-3 h-3" />
                    {searchCity}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent text-white/50 hover:text-white"
                      onClick={() => setSearchCity("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {(ageRange[0] !== 18 || ageRange[1] !== 50) && (
                  <Badge className="gap-1 pr-1 bg-white/10 text-white/70 border-white/10 hover:bg-white/20">
                    Age: {ageRange[0]}-{ageRange[1]}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent text-white/50 hover:text-white"
                      onClick={() => setAgeRange([18, 50])}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {typeFilter !== "all" && (
                  <Badge className="gap-1 pr-1 capitalize bg-white/10 text-white/70 border-white/10 hover:bg-white/20">
                    {typeFilter}s
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent text-white/50 hover:text-white"
                      onClick={() => setTypeFilter("all")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {onlineOnly && (
                  <Badge className="gap-1 pr-1 bg-white/10 text-white/70 border-white/10 hover:bg-white/20">
                    Online only
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent text-white/50 hover:text-white"
                      onClick={() => setOnlineOnly(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs h-7 text-white/50 hover:text-white"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* Results */}
          {error ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Can't load profiles
              </h3>
              <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {(error as Error).message}
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Retry
              </Button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex items-center justify-center py-16 px-4">
              <div className="max-w-md text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <Rocket className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Be Among the{" "}
                  <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                    First!
                  </span>
                </h2>
                <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We're just getting started. Sign up now and be one of the first members of our community.
                </p>
                {!isAuthenticated && (
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth?mode=signup")}
                    className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Join Now
                  </Button>
                )}
              </div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No matches found
              </h3>
              <p className="text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Try adjusting your filters to see more profiles.
              </p>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                gridSize === "comfortable"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",
              )}
            >
              {filteredProfiles.map((p) =>
                isAuthenticated && isFullProfile(p) ? (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    onClick={() => handleProfileClick(p)}
                    showLikeButton={isEarner}
                    isLiked={likedProfiles.has(p.id)}
                    onLikeToggle={() => handleLikeToggle(p.id)}
                    showSaveButton={isAuthenticated}
                    isSaved={isSaved(p.id)}
                    onSaveToggle={() => toggleSave(p.id)}
                  />
                ) : (
                  <PreviewProfileCard key={p.id} profile={p as PreviewProfile} onClick={() => handleProfileClick(p)} />
                ),
              )}
            </div>
          )}
        </div>

        <Footer />
        <MobileNav />
      </div>

    </div>
  );
}
