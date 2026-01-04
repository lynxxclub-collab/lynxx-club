import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Star, ArrowRight, Sparkles } from "lucide-react";

type FeaturedEarnerPreview = {
  id: string;
  first_name: string;
  profile_photo: string | null;
  has_photo: boolean;
};

function getPublicPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;

  // If it's already a full URL, return it.
  if (/^https?:\/\//i.test(photoPath)) return photoPath;

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) return null;

  // Normalize if someone stored "profile-photos/xxx.jpg"
  const normalized = photoPath.startsWith("profile-photos/")
    ? photoPath.replace("profile-photos/", "")
    : photoPath;

  return `${base}/storage/v1/object/public/profile-photos/${normalized}`;
}

export function FeaturedEarners() {
  const [earners, setEarners] = useState<FeaturedEarnerPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const authRedirect = useMemo(() => {
    // after auth, take them somewhere useful
    return encodeURIComponent("/browse");
  }, []);

  useEffect(() => {
    let alive = true;

    async function fetchEarners() {
      setLoading(true);
      try {
        // IMPORTANT:
        // This assumes you have a Postgres function named get_featured_earners_preview
        // and it returns columns that match FeaturedEarnerPreview.
        const { data, error } = await supabase.rpc("get_featured_earners_preview");

        if (error) {
          console.error("Error fetching featured earners:", error);
          return;
        }

        if (!alive) return;

        // data can be null, so fallback safely
        setEarners((data as FeaturedEarnerPreview[]) ?? []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchEarners();

    return () => {
      alive = false;
    };
  }, []);

  const handleEarnerClick = () => {
    // optionally include redirect param
    navigate(`/auth?redirect=${authRedirect}`);
  };

  if (loading) {
    return (
      <section className="py-20 px-4 relative bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4 bg-white/5" />
            <Skeleton className="h-6 w-96 mx-auto bg-white/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4 p-6">
                <Skeleton className="h-28 w-28 rounded-full bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!earners.length) return null;

  return (
    <section className="py-20 px-4 relative overflow-hidden bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-amber-500/20 mb-6">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-amber-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Featured Earners
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
            Ready to{" "}
            <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
              connect
            </span>
          </h2>

          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Our featured earners are waiting to chat. Sign up to see full profiles and start meaningful conversations.
          </p>
        </div>

        {/* Earners grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {earners.map((earner, index) => {
            const photoUrl = getPublicPhotoUrl(earner.profile_photo);

            return (
              <button
                key={earner.id}
                type="button"
                onClick={handleEarnerClick}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl text-left cursor-pointer transition-all duration-500 hover:bg-white/[0.03] border border-white/5 hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                style={{
                  animation: "fadeInUp 0.5s ease-out forwards",
                  animationDelay: `${index * 0.06}s`,
                }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Avatar */}
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-rose-500/40 via-purple-500/40 to-amber-500/40 opacity-0 group-hover:opacity-100 blur-md transition-all duration-500 group-hover:animate-pulse" />
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <Avatar className="relative h-24 w-24 md:h-28 md:w-28 ring-2 ring-white/10 group-hover:ring-rose-400/40 transition-all duration-300">
                    {photoUrl ? (
                      <AvatarImage
                        src={photoUrl}
                        alt={earner.first_name}
                        className="object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-amber-500/20 text-white/40">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Featured badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                </div>

                {/* Name */}
                <span
                  className="text-base font-medium text-white/80 group-hover:text-white transition-colors duration-300 text-center line-clamp-1 relative z-10"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {earner.first_name}
                </span>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex items-center gap-2 text-white font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span>View Profile</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex flex-col items-center gap-4">
            <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Join now to see full profiles, message, and video chat
            </p>

            <button
              onClick={handleEarnerClick}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 text-white font-semibold transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] bg-[length:200%_100%] hover:bg-right overflow-hidden"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Sparkles className="w-5 h-5" />
              <span className="relative">Start Connecting</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-purple-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                💎 First 100 seekers get 100 free credits
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}