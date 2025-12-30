import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreatorCapStatus {
  current_count: number;
  limit: number;
  is_capped: boolean;
  spots_remaining: number;
}

export function useCreatorCap() {
  const [capStatus, setCapStatus] = useState<CreatorCapStatus>({
    current_count: 0,
    limit: 50,
    is_capped: false,
    spots_remaining: 50,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_creator_cap_status');
      
      if (error) throw error;
      
      if (data) {
        setCapStatus(data as unknown as CreatorCapStatus);
      }
    } catch (err: any) {
      console.error('Error fetching creator cap status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapStatus();
  }, []);

  return {
    ...capStatus,
    loading,
    error,
    refetch: fetchCapStatus,
  };
}
