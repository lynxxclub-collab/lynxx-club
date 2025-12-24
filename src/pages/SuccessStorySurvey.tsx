import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ArrowRight } from 'lucide-react';

export default function SuccessStorySurvey() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 text-white fill-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold">Complete Your Survey</h1>
            <p className="text-muted-foreground">
              Answer a few questions to receive your $25 Amazon gift card and 6 months of Alumni Access.
            </p>
          </div>

          <div className="p-4 bg-secondary rounded-lg text-sm text-muted-foreground">
            <p>This feature is coming soon! Our team will reach out via email to complete your verification and send your rewards.</p>
          </div>

          <Button 
            onClick={() => navigate('/settings')}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            size="lg"
          >
            Back to Settings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
