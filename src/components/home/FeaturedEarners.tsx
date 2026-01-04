import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Star, ArrowRight, Sparkles } from "lucide-react";
import { resolveProfileImage } from "@/lib/media/profileImage";

interface FeaturedEarnerPreview {
  id: string;
  name?: string | null;
  profile_photos?: string[] | null; // IMPORTANT: your DB uses profile_photos
}

export const FeaturedEarners = () => {
  const [earners, setEarners] = useState<FeaturedEarnerPreview[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEarners = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, profile_photos")
          .eq("user_type", "earner")
          .limit(8);

        if (error) throw error;

        const rows = (data || []) as FeaturedEarnerPreview[];
        setEarners(rows);

        // Build signed URLs for first photo
        const urlMap: Record<string, string | null> = {};
        for (const e of rows) {
          const first = e.profile_photos?.[0] ?? null;
          urlMap[e.id] = await resolveProfileImage("profile-photos", first);
        }
        setPhotoUrls(urlMap);
      } catch (err) {
        console.error("Featured earners error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarners();
  }, []);

  const handleEarnerClick = () => navigate("/auth");

  if (loading) {
    return (
      <section className="py-20 px-4 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4 bg-white/10" />
            <Skeleton className="h-6 w-96 mx-auto bg-white/10" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4 p-6">
                <Skeleton className="h-28 w-28 rounded-full bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (earners.length === 0) return null;

  return (
    <section className="py-20 px-4 relative overflow-hidden bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto relative">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {earners.map((earner, index) => {
            const img = photoUrls[earner.id] ?? null;

            return (
              <div
                key={earner.id}
                onClick={handleEarnerClick}
                className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl cursor-pointer transition-all duration-500 hover:bg-white/[0.03] border border-transparent hover:border-white/10"
                style={{
                  animation: "fadeInUp 0.5s ease-out forwards",
                  animationDelay: `${index * 0.08}s`,
                  opacity: 0,
                }}
              >
                <div className="relative">
                  <Avatar className="relative h-24 w-24 md:h-28 md:w-28 ring-2 ring-white/10 group-hover:ring-rose-400/50 transition-all duration-300">
                    {img ? (
                      <AvatarImage src={img} alt={earner.name ?? "Earner"} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-amber-500/20 text-white/40">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                </div>

                <span className="text-base font-medium text-white/80 group-hover:text-white transition-colors duration-300 text-center line-clamp-1">
                  {earner.name ?? "Earner"}
                </span>

                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <span>View Profile</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <button
            onClick={handleEarnerClick}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 text-white font-semibold transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            <span className="relative">Start Connecting</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};