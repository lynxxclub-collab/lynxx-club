import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

interface FeaturedEarner {
  id: string;
  name: string;
  profile_photo: string | null;
}

export const FeaturedEarners = () => {
  const [earners, setEarners] = useState<FeaturedEarner[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEarners = async () => {
      try {
        const { data, error } = await supabase.rpc('get_featured_earners');
        
        if (error) {
          console.error('Error fetching featured earners:', error);
          return;
        }
        
        setEarners(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarners();
  }, []);

  const handleEarnerClick = () => {
    navigate('/auth');
  };

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (earners.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Meet Our Earners
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Connect with amazing people who are ready to chat. Sign up to start your journey.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8">
          {earners.map((earner) => (
            <div
              key={earner.id}
              onClick={handleEarnerClick}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300 relative">
                  <AvatarImage 
                    src={earner.profile_photo || undefined} 
                    alt={earner.name || 'Earner'}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors duration-300 text-center line-clamp-1">
                {earner.name}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={handleEarnerClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors duration-300"
          >
            Join Now to Connect
          </button>
        </div>
      </div>
    </section>
  );
};
