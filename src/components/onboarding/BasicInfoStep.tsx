import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { User, Calendar, Heart } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

export default function BasicInfoStep({ onComplete }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [genderPreference, setGenderPreference] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePreferenceChange = (value: string, checked: boolean) => {
    if (checked) {
      setGenderPreference([...genderPreference, value]);
    } else {
      setGenderPreference(genderPreference.filter(g => g !== value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !dateOfBirth || !gender || genderPreference.length === 0) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate age (18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      toast.error('You must be at least 18 years old to use Lynxx Club');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        date_of_birth: dateOfBirth,
        gender: gender as 'male' | 'female' | 'non_binary' | 'other',
        gender_preference: genderPreference as ('male' | 'female' | 'non_binary' | 'other')[],
        onboarding_step: 2,
      })
      .eq('id', user?.id);

    if (error) {
      toast.error('Failed to save information. Please try again.');
      console.error(error);
    } else {
      onComplete();
    }

    setLoading(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Tell us about yourself</CardTitle>
        <CardDescription>This helps us personalize your experience</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Your Name
            </Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Your Gender
            </Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-teal" />
              I'm interested in
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {genderOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={genderPreference.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange(option.value, checked as boolean)
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 glow-purple"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
