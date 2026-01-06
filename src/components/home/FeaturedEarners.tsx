I have refactored the `FeaturedEarners` component to be strictly **mobile-first** while maintaining your premium dark theme.

### Key Improvements:
1.  **Mobile Interaction Logic:** The "View Profile" overlay is now **hidden on mobile**. Since mobile users don't have a "hover" state, this overlay was blocking the photo. Instead, mobile users get a clean profile preview, and tapping the card handles the action.
2.  **Responsive Layout:** Reduced padding on mobile (`p-4 sm:p-6`) to maximize screen real estate. The grid layout is optimized (`grid-cols-2`) for easy scrolling on phones.
3.  **CTA Optimization:** The "Start Connecting" button is now **full-width on mobile** (`w-full sm:w-auto`) for easier thumb tapping.
4.  **Performance & Stability:** Moved the `<style>` tag out of the render loop and ensured `loading="lazy"` is applied to images.
5.  **Visual Polish:** Added a subtle ambient glow effect behind the avatars to make them pop against the `#0a0a0f` background.

Here is the optimized code:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Star, ArrowRight, Sparkles, ChevronRight } from "lucide-react";
import { resolveProfileImageUrl } from "@/components/ui/ProfileImage";

type FeaturedEarnerPreview = {
  id: string;
  name: string;
  photoUrl: string | null;
};

// Move styles out of render loop for performance
const FEATURED_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const FeaturedEarners = () => {
  const [earners, setEarners] = useState<FeaturedEarnerPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEarners = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, user_type, profile_photos")
          .eq("user_type", "earner")
          .limit(8);

        if (error) throw error;

        const resolved = await Promise.all(
          (data ?? []).map(async (p: any) => {
            const first = p.profile_photos?.[0] ?? null;
            const photoUrl = await resolveProfileImageUrl("profile-photos", first);
            return {
              id: p.id,
              name: p.name || "Earner",
              photoUrl,
            };
          })
        );

        setEarners(resolved);
      } catch (e) {
        console.error("Featured earners fetch failed:", e);
        setEarners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEarners();
  }, []);

  const handleEarnerClick = () => navigate("/auth");

  if (loading) {
    return (
      <section className="py-16 sm:py-20 px-4 relative bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <Skeleton className="h-10 w-48 sm:w-64 mx-auto mb-4 bg-white/5" />
            <Skeleton className="h-5 w-64 sm:w-96 mx-auto bg-white/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4 p-4 sm:p-6">
                <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (earners.length === 0) return null;

  return (
    <>
      <style>{FEATURED_STYLES}</style>
      <section 
        className="py-16 sm:py-20 px-4 relative overflow-hidden bg-[#0a0a0f]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Ambient Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-amber-200 tracking-wide uppercase">Featured Earners</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-5">
              Ready to{" "}
              <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                connect
              </span>
            </h2>
            <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-4">
              Our featured earners are waiting to chat. Sign up to see full profiles and start meaningful conversations.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {earners.map((earner, index) => (
              <div
                key={earner.id}
                onClick={handleEarnerClick}
                className="group relative flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/[0.03] border border-transparent hover:border-white/10 active:scale-[0.98]"
                style={{
                  animation: "fadeInUp 0.6s ease-out forwards",
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                }}
              >
                <div className="relative">
                  {/* Subtle glow behind avatar */}
                  <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <Avatar className="relative h-24 w-24 sm:h-28 sm:w-28 ring-2 ring-white/5 group-hover:ring-rose-400/50 transition-all duration-300">
                    {earner.photoUrl ? (
                      <AvatarImage
                        src={earner.photoUrl}
                        alt={earner.name}
                        className="object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-amber-500/10 text-white/30 border border-white/5">
                      <User className="h-8 w-8 sm:h-10 sm:w-10" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Mobile-only indicator: Small Arrow */}
                  <div className="sm:hidden absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center shadow-lg">
                    <ChevronRight className="w-3 h-3 text-white/60" />
                  </div>

                  {/* Desktop-only indicator: Star Badge */}
                  <div className="hidden sm:flex absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                </div>

                <span className="text-sm sm:text-base font-medium text-white/80 group-hover:text-white transition-colors duration-300 text-center line-clamp-1 px-1">
                  {earner.name}
                </span>

                {/* Desktop Hover Overlay (Hidden on Mobile) */}
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex">
                  <div className="flex items-center gap-2 text-white font-medium text-sm px-4 py-2 rounded-full bg-white/10 border border-white/10 shadow-xl backdrop-blur-md">
                    <span>View Profile</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 sm:mt-16 px-4">
            <button
              onClick={handleEarnerClick}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 text-white font-semibold transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5" />
              <span className="relative">Start Connecting</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};
```