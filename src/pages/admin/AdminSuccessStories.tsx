import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X, AlertTriangle, Eye } from 'lucide-react';

interface SuccessStory {
  id: string;
  initiator_id: string;
  partner_id: string;
  story_text: string;
  status: string;
  fraud_score: number | null;
  fraud_risk: string | null;
  fraud_flags: any;
  created_at: string | null;
}

export default function AdminSuccessStories() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadStories();
  }, [activeTab]);

  async function loadStories() {
    setLoading(true);
    try {
      let query = supabase
        .from('success_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending_review');
      } else if (activeTab === 'approved') {
        query = query.eq('status', 'approved');
      } else if (activeTab === 'rejected') {
        query = query.in('status', ['rejected_fraud', 'rejected']);
      }

      const { data, error } = await query;
      if (error) throw error;

      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStoryStatus(storyId: string, status: string) {
    try {
      const { error } = await supabase
        .from('success_stories')
        .update({ 
          status,
          alumni_access_granted: status === 'approved'
        })
        .eq('id', storyId);

      if (error) throw error;

      toast.success(`Story ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      loadStories();
    } catch (error) {
      console.error('Error updating story:', error);
      toast.error('Failed to update story');
    }
  }

  function getRiskBadge(risk: string | null) {
    switch (risk) {
      case 'HIGH':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500">Medium Risk</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Success Stories</h2>
        <p className="text-muted-foreground">Review and manage success story submissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No stories in this category
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stories.map((story) => (
                <Card key={story.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Success Story</CardTitle>
                        {getRiskBadge(story.fraud_risk)}
                        {story.fraud_score !== null && (
                          <span className="text-sm text-muted-foreground">
                            Score: {story.fraud_score}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {story.created_at
                          ? new Date(story.created_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Story</h4>
                      <p className="text-muted-foreground">{story.story_text}</p>
                    </div>

                    {story.fraud_flags && story.fraud_flags.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          Fraud Flags
                        </h4>
                        <div className="space-y-2">
                          {story.fraud_flags.map((flag: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded"
                            >
                              <Badge
                                variant={flag.severity === 'HIGH' ? 'destructive' : 'secondary'}
                              >
                                {flag.severity}
                              </Badge>
                              <span>{flag.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'pending' && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => updateStoryStatus(story.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateStoryStatus(story.id, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
