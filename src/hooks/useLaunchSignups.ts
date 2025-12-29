import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLaunchSignups = () => {
  const [seekerCount, setSeekerCount] = useState(68);
  const [earnerCount, setEarnerCount] = useState(21);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
    
    const channel = supabase
      .channel('launch_signups_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'launch_signups' },
        () => fetchCounts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCounts = async () => {
    const { data } = await supabase.rpc('get_launch_signup_counts');
    if (data) {
      setSeekerCount(data.seeker_count || 0);
      setEarnerCount(data.earner_count || 0);
    }
    setLoading(false);
  };

  return {
    seekerSpotsLeft: 100 - seekerCount,
    earnerSpotsLeft: 50 - earnerCount,
    seekerCount,
    earnerCount,
    loading
  };
};