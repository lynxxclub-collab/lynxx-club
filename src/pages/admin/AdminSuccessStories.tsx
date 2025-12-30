import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Check, Clock, X, ChevronRight } from 'lucide-react';
import { StoryReviewModal } from '@/components/admin/StoryReviewModal';

interface SuccessStory {
  id: string;
  initiator_id: string;
  partner_id: string;
  story_text: string;
  how_we_met: string | null;
  first_date_type: string | null;
  days_until_first_date: number | null;
  helpful_features: any;
  improvement_suggestions: string | null;
  share_story: boolean | null;
  share_anonymously: boolean | null;
  status: string;
  fraud_score: number | null;
  fraud_risk: string | null;
  fraud_flags: any;
  initiator_photo_url: string | null;
  partner_photo_url: string | null;
  initiator_gift_card_email: string | null;
  partner_gift_card_email: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface StoryWithProfiles extends SuccessStory {
  initiator_name?: string;
  partner_name?: string;
}

export default function AdminSuccessStories() {
  const [stories, setStories] = useState<StoryWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadStories();
    loadCounts();
  }, [filter, sortBy]);

  async function loadCounts() {
    const { count: pending } = await supabase
      .from('success_stories')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_review', 'under_investigation']);

    const { count: approved } = await supabase
      .from('success_stories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: rejected } = await supabase
      .from('success_stories')
      .select('*', { count: 'exact', head: true })
      .in('status', ['rejected_fraud', 'rejected']);

    setCounts({
      pending: pending || 0,
      approved: approved || 0,
      rejected: rejected || 0
    });
  }

  async function loadStories() {
    setLoading(true);
    try {
      let query = supabase
        .from('success_stories')
        .select('*');

      // Apply filter
      if (filter === 'pending') {
        query = query.in('status', ['pending_review', 'under_investigation']);
      } else if (filter === 'approved') {
        query = query.eq('status', 'approved');
      } else if (filter === 'rejected') {
        query = query.in('status', ['rejected_fraud', 'rejected', 'rejected_partner_denied']);
      }

      // Apply sort
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'highest_risk') {
        query = query.order('fraud_score', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load profile names for each story
      const storiesWithNames: StoryWithProfiles[] = [];
      for (const story of data || []) {
        const { data: initiator } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', story.initiator_id)
          .single();

        const { data: partner } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', story.partner_id)
          .single();

        storiesWithNames.push({
          ...story,
          initiator_name: initiator?.name || 'Unknown',
          partner_name: partner?.name || 'Unknown'
        });
      }

      setStories(storiesWithNames);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRiskCard(story: StoryWithProfiles) {
    const risk = story.fraud_risk;
    const score = story.fraud_score;
    const flags = Array.isArray(story.fraud_flags) ? story.fraud_flags : [];

    let bgClass = 'bg-white/[0.02] border-white/10';
    let icon = <Check className="h-5 w-5 text-green-500" />;
    let riskLabel = 'LOW RISK';

    if (risk === 'HIGH') {
      bgClass = 'bg-destructive/10 border-destructive/30';
      icon = <AlertTriangle className="h-5 w-5 text-destructive" />;
      riskLabel = 'HIGH RISK';
    } else if (risk === 'MEDIUM') {
      bgClass = 'bg-yellow-500/10 border-yellow-500/30';
      icon = <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      riskLabel = 'MEDIUM RISK';
    }

    const daysAgo = story.created_at
      ? Math.floor((Date.now() - new Date(story.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <Card
        key={story.id}
        className={`${bgClass} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => setSelectedStory(story)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {icon}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-white">{riskLabel}</span>
                  {score !== null && (
                    <Badge variant="outline" className="border-white/20 text-white/60">Score: {score}</Badge>
                  )}
                </div>
                <p className="font-medium text-white">
                  {story.initiator_name} & {story.partner_name}
                </p>
                <p className="text-sm text-white/40">
                  Submitted {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
                </p>
                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {flags.slice(0, 3).map((flag: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {flag.type || flag.description}
                      </Badge>
                    ))}
                    {flags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{flags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected_fraud':
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'under_investigation':
        return <Badge className="bg-yellow-500">Under Investigation</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Success Story Reviews</h2>
        <p className="text-white/60">Review and manage success story submissions</p>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
                className={filter !== 'pending' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                Pending Review
                {counts.pending > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {counts.pending}
                  </Badge>
                )}
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={filter !== 'all' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                All
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilter('approved')}
                className={filter !== 'approved' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                Approved
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
                className={filter !== 'rejected' ? 'border-white/10 text-white hover:bg-white/10' : ''}
              >
                Rejected
              </Button>
            </div>
            <div className="flex-1" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest_risk">Highest Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Story List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : stories.length === 0 ? (
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="py-12 text-center text-white/40">
            No success stories in this category
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => getRiskCard(story))}
        </div>
      )}

      {/* Story Review Modal */}
      {selectedStory && (
        <StoryReviewModal
          story={selectedStory}
          open={!!selectedStory}
          onClose={() => setSelectedStory(null)}
          onUpdate={() => {
            loadStories();
            loadCounts();
          }}
        />
      )}
    </div>
  );
}
