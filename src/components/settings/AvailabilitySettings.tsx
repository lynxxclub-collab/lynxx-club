import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Loader2, Clock, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityRow {
  id?: string;
  user_id: string;
  day_of_week: number; // 0-6
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  is_active: boolean;
}

type DayState = { enabled: boolean; slots: Set<string> }; // slots are "HH:MM" start times

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

const TIME_SLOTS = [
  "00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30",
  "04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30",
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30",
] as const;

const DEFAULT_STATE = DAYS.reduce((acc, d) => {
  acc[d.value] = { enabled: false, slots: new Set<string>() };
  return acc;
}, {} as Record<number, DayState>);

function add30Minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + 30;
  const endH = Math.floor((total % (24 * 60)) / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
}

function toHHMM(time: string) {
  // "HH:MM:SS" -> "HH:MM"
  return time.slice(0, 5);
}

function formatTime(hhmm: string) {
  const [hours, mins] = hhmm.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  if (hours === 0 && mins === 0) return "12AM";
  if (hours === 12 && mins === 0) return "12PM";
  return mins === 0 ? `${displayHours}${ampm}` : `${displayHours}:${String(mins).padStart(2, "0")}${ampm}`;
}

export default function AvailabilitySettings() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Keep state stable + predictable (never wipe slots just because you toggled the day)
  const [availability, setAvailability] = useState<Record<number, DayState>>(DEFAULT_STATE);

  const totalSelected = useMemo(() => {
    return Object.values(availability).reduce((sum, d) => sum + d.slots.size, 0);
  }, [availability]);

  const fetchAvailability = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("earner_availability")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const next: Record<number, DayState> = DAYS.reduce((acc, d) => {
        acc[d.value] = { enabled: false, slots: new Set<string>() };
        return acc;
      }, {} as Record<number, DayState>);

      (data || []).forEach((row: AvailabilityRow) => {
        const day = row.day_of_week;
        if (!next[day]) next[day] = { enabled: false, slots: new Set<string>() };
        if (row.is_active) next[day].slots.add(toHHMM(row.start_time));
      });

      // Enable day if it has ANY selected slots
      Object.keys(next).forEach((k) => {
        const day = Number(k);
        next[day].enabled = next[day].slots.size > 0;
      });

      setAvailability(next);
    } catch (e) {
      console.error("Error fetching availability:", e);
      toast.error("Couldn’t load availability. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // initialize + fetch
    setAvailability(DEFAULT_STATE);
    fetchAvailability();
  }, [fetchAvailability]);

  const setDayEnabled = useCallback((day: number, enabled: boolean) => {
    setAvailability((prev) => {
      const current = prev[day] ?? { enabled: false, slots: new Set<string>() };
      // Don’t wipe slots on disable; just hide UI. Saves sanity.
      return { ...prev, [day]: { ...current, enabled } };
    });
  }, []);

  const toggleSlot = useCallback((day: number, time: string) => {
    setAvailability((prev) => {
      const current = prev[day] ?? { enabled: false, slots: new Set<string>() };
      const nextSlots = new Set(current.slots);

      if (nextSlots.has(time)) nextSlots.delete(time);
      else nextSlots.add(time);

      return {
        ...prev,
        [day]: {
          enabled: current.enabled || nextSlots.size > 0, // auto-enable when they pick a slot
          slots: nextSlots,
        },
      };
    });
  }, []);

  const clearDay = useCallback((day: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { enabled: false, slots: new Set<string>() },
    }));
  }, []);

  const selectCommon = useCallback((day: number, preset: "morning" | "afternoon" | "evening") => {
    const ranges: Record<typeof preset, [string, string]> = {
      morning: ["08:00", "12:00"],
      afternoon: ["12:00", "17:00"],
      evening: ["17:00", "22:00"],
    };
    const [start, end] = ranges[preset];
    const times = TIME_SLOTS.filter((t) => t >= start && t < end);

    setAvailability((prev) => {
      const current = prev[day] ?? { enabled: false, slots: new Set<string>() };
      const nextSlots = new Set(current.slots);
      times.forEach((t) => nextSlots.add(t));
      return { ...prev, [day]: { enabled: true, slots: nextSlots } };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    // Guard: at least one slot somewhere
    if (totalSelected === 0) {
      toast.error("Select at least one time slot before saving.");
      return;
    }

    setSaving(true);
    try {
      // Build insert rows from current state
      const rows: Omit<AvailabilityRow, "id">[] = [];

      Object.entries(availability).forEach(([dayStr, dayState]) => {
        const day = Number(dayStr);
        if (!dayState.enabled || dayState.slots.size === 0) return;

        dayState.slots.forEach((startHHMM) => {
          rows.push({
            user_id: user.id,
            day_of_week: day,
            start_time: `${startHHMM}:00`,
            end_time: add30Minutes(startHHMM),
            is_active: true,
          });
        });
      });

      // Simple + bulletproof: replace all rows for this user
      const del = await supabase.from("earner_availability").delete().eq("user_id", user.id);
      if (del.error) throw del.error;

      if (rows.length > 0) {
        const ins = await supabase.from("earner_availability").insert(rows);
        if (ins.error) throw ins.error;
      }

      toast.success("Availability saved!");
      // Optional: refetch to confirm normalization
      // await fetchAvailability();
    } catch (e: any) {
      console.error("Save availability error:", e);
      toast.error(e?.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }, [availability, fetchAvailability, totalSelected, user?.id]);

  if (loading) {
    return (
      <Card className="bg-[#1a1a1f]/50 border-white/10">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a1f]/50 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-rose-400" />
          Video Date Availability
        </CardTitle>
        <CardDescription className="text-white/50">
          Choose when seekers can book you. All times are Eastern (ET).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top summary row */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <CheckCircle2 className="w-4 h-4 text-rose-400" />
            <span>
              {totalSelected} slot{totalSelected === 1 ? "" : "s"} selected
            </span>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        {DAYS.map((day, index) => {
          const dayState = availability[day.value] ?? { enabled: false, slots: new Set<string>() };
          const enabled = dayState.enabled;
          const selectedCount = dayState.slots.size;

          return (
            <div key={day.value}>
              {index > 0 && <Separator className="my-5 bg-white/10" />}

              <div className="space-y-3">
                {/* Day header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => setDayEnabled(day.value, !!v)}
                      className="data-[state=checked]:bg-rose-500"
                    />
                    <Label className="text-base font-medium text-white">{day.label}</Label>

                    {selectedCount > 0 && (
                      <span className="text-xs text-white/50">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectCommon(day.value, "morning")}
                      disabled={!enabled}
                      className="border-white/10 text-white/70 hover:bg-white/5"
                    >
                      Morning
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectCommon(day.value, "afternoon")}
                      disabled={!enabled}
                      className="border-white/10 text-white/70 hover:bg-white/5"
                    >
                      Afternoon
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectCommon(day.value, "evening")}
                      disabled={!enabled}
                      className="border-white/10 text-white/70 hover:bg-white/5"
                    >
                      Evening
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => clearDay(day.value)}
                      className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Slots */}
                {enabled && (
                  <div className="ml-10 flex flex-wrap gap-2">
                    {TIME_SLOTS.map((time) => {
                      const active = dayState.slots.has(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleSlot(day.value, time)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                            active
                              ? "bg-rose-500 text-white"
                              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70",
                          )}
                          aria-pressed={active}
                        >
                          {formatTime(time)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!enabled && selectedCount > 0 && (
                  <p className="ml-10 text-xs text-white/40">
                    This day is off, but you still have saved selections here. Toggle it on to edit.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Help box */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-rose-400" />
            How it works
          </h4>
          <ul className="text-sm text-white/50 space-y-1">
            <li>• Turn a day on, then tap time slots to mark availability</li>
            <li>• Use Morning/Afternoon/Evening presets to speed it up</li>
            <li>• Bookings only show during enabled + selected times</li>
            <li>• Times are displayed in Eastern Time (ET)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}