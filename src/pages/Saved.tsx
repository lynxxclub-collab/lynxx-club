import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedProfiles } from '@/hooks/useSavedProfiles';
import { useBrowseProfiles, isFullProfile } from '@/hooks/useBrowseProfiles';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/Footer';
import ProfileCard from '@/components/browse/ProfileCard';
import ProfileDetailSheet from '@/components/browse/ProfileDetailSheet';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Bookmark, Loader2 } from 'lucide-react';

export default function Saved() {
  const { user, loading: authLoading, profile } = useAuth();
  const { savedProfileIds, isLoading: savedLoading, toggleSave, isSaved } = useSavedProfiles();
  const { data: allProfiles = [], isLoading: profilesLoading } = useBrowseProfiles(!!user);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Temporarily disabled for public access
  // if (!user) {
  //   return <Navigate to="/auth" replace />;
  // }

  const isLoading = savedLoading || profilesLoading;

  // Filter to only show saved profiles
  const savedProfilesList = allProfiles.filter(
    p => isFullProfile(p) && savedProfileIds.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-primary" />
            Saved Profiles
          </h1>
          <p className="text-muted-foreground mt-1">
            Profiles you've saved for later
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : savedProfilesList.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="w-8 h-8 text-muted-foreground" />}
            title="No saved profiles yet"
            description="When you save profiles while browsing, they'll appear here for easy access."
            action={
              <Button asChild>
                <Link to={profile?.user_type === 'seeker' ? '/browse' : '/dashboard'}>
                  Browse Profiles
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {savedProfilesList.map((profileItem) => (
              isFullProfile(profileItem) && (
                <ProfileCard
                  key={profileItem.id}
                  profile={profileItem}
                  onClick={() => setSelectedProfile(profileItem)}
                  showSaveButton
                  isSaved={isSaved(profileItem.id)}
                  onSaveToggle={() => toggleSave(profileItem.id)}
                />
              )
            ))}
          </div>
        )}
      </main>

      {selectedProfile && isFullProfile(selectedProfile) && (
        <ProfileDetailSheet
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      <Footer />
      <MobileNav />
    </div>
  );
}
