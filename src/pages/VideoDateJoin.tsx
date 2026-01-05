import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * URL usage:
 * /video-date/join?id=<videoDateId>
 *
 * This page:
 *  - Loads the video_dates row
 *  - Ensures room + tokens exist (only seeker can create; earner will never create)
 *  - Redirects to Daily room URL with the correct token
 */
export default function VideoDateJoin() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const videoDateId = useMemo(() => params.get("id"), [params]);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [videoDate, setVideoDate] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (!user) {
          toast.error("Please log in again.");
          navigate("/login");
          return;
        }
        if (!videoDateId) {
          toast.error("Missing video date id.");
          navigate("/video-dates");
          return;
        }

        setLoading(true);

        const { data, error } = await supabase
          .from("video_dates")
          .select(
            "id, seeker_id, earner_id, call_type, status, daily_room_url, daily_room_name, seeker_meeting_token, earner_meeting_token"
          )
          .eq("id", videoDateId)
          .single();

        if (error) throw error;

        if (!mounted) return;
        setVideoDate(data);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load video date");
        navigate("/video-dates");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user, videoDateId, navigate]);

  const join = async () => {
    if (!user || !videoDateId) return;

    setJoining(true);
    try {
      // Re-fetch fresh row (avoid stale tokens/room)
      const { data: fresh, error: freshErr } = await supabase
        .from("video_dates")
        .select(
          "id, seeker_id, earner_id, call_type, status, daily_room_url, daily_room_name, seeker_meeting_token, earner_meeting_token"
        )
        .eq("id", videoDateId)
        .single();

      if (freshErr) throw freshErr;

      const isSeeker = fresh.seeker_id === user.id;
      const isEarner = fresh.earner_id === user.id;
      if (!isSeeker && !isEarner) {
        toast.error("You are not part of this video date.");
        return;
      }

      // If missing room/tokens, invoke function to ensure they exist.
      // IMPORTANT: Your updated edge function will:
      //  - allow seeker to create room
      //  - prevent earner from creating room
      const needsRoom = !fresh.daily_room_url;
      const needsTokens = !fresh.seeker_meeting_token || !fresh.earner_meeting_token;

      if (needsRoom || needsTokens) {
        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !sessionData.session?.access_token) {
          toast.error("Session expired. Please log in again.");
          return;
        }

        const invoke = await supabase.functions.invoke("create-daily-room", {
          body: {
            videoDateId,
            callType: fresh.call_type || "video",
            regenerateTokens: true, // safe: will only create if seeker; earner will only regen if room exists
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (invoke.error) {
          throw invoke.error;
        }
      }

      // Fetch again after ensure
      const { data: ensured, error: ensuredErr } = await supabase
        .from("video_dates")
        .select("daily_room_url, seeker_meeting_token, earner_meeting_token, seeker_id, earner_id")
        .eq("id", videoDateId)
        .single();

      if (ensuredErr) throw ensuredErr;

      if (!ensured.daily_room_url) {
        toast.error("Room not ready yet. Please try again in a moment.");
        return;
      }

      const token = ensured.seeker_id === user.id ? ensured.seeker_meeting_token : ensured.earner_meeting_token;

      if (!token) {
        toast.error("Join token not ready yet. Please try again.");
        return;
      }

      // Redirect into the SAME room with the correct token.
      // Daily supports `?t=` for meeting tokens.
      // (If you embed Daily via iframe/call object, you’d pass the token there instead.)
      const url = new URL(ensured.daily_room_url);
      url.searchParams.set("t", token);

      window.location.assign(url.toString());
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to join call");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!videoDate) return null;

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Join Call</h1>
      <p className="text-sm text-muted-foreground">
        You’ll join the same private room. If the room isn’t ready, we’ll prepare it automatically.
      </p>

      <Button onClick={join} disabled={joining} className="w-full">
        {joining && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Join Now
      </Button>

      <Button variant="ghost" onClick={() => navigate("/video-dates")} className="w-full">
        Back
      </Button>
    </div>
  );
}