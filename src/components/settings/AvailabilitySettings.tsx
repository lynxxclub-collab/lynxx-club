import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Loader2, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityRow {
  id?: string;
  user_id: string;
  day_of_week: number; // 0-6
  start_time: string;  // "HH:MM:SS"
  end_time: string;    // "HH:MM:SS"
  is_active: boolean;
}

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TIME_SLOTS = [
  "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
  "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30",
];

type DayState = { enabled: boolean; slots: Set<string> }; // slots are "HH:MM"

function addMinutesHHMM(timeHHMM: string, minutesToAdd: number) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const total = h * 60 + m + minutesToAdd;
  const wrapped = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mm = String(wrapped % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function formatTime(timeHHMM: string) {
  const [hours, mins] = timeHHMM.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  if (hours === 0 && mins === 0) return "12AM";
  if (hours === 12 && mins === 0) return "12PM";

  return mins === 0
    ? `${displayHours}${ampm}`
    : `${displayHours}:${String(mins).padStart(2, "0")}${ampm}`;
}

export default function AvailabilitySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [availability, setAvailability] = useState<Record<number, DayState>>(() => {
    const init: Record<number, DayState> = {};
    DAYS.forEach((d) => (init[d.value] = { enabled: false, slots: new Set() }));
    return init;
  });

  const timeLabels = useMemo(() => {
    const map: Record<string, string> = {};
    TIME_SLOTS.forEach((t) => (map[t] = formatTime(t)));
    return map;
  }, []);

  // Fetch existing availability
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("earner_availability")
          .select("day_of_week,start_time,is_active")
          .eq("user_id", user.id);

        if (error) throw error;

        const next: Record<number, DayState> = {};
        DAYS.forEach((d) => (next[d.value] = { enabled: false, slots: new Set() }));

        (data || []).forEach((row: any) => {
          if (!row.is_active) return;
          const day = row.day_of_week as number;
          const startHHMM = String(row.start_time).substring(0, 5);
          if (!next[day]) next[day] = { enabled: false, slots: new Set() };
          next[day].slots.add(startHHMM);
          next[day].enabled = true;
        });

        setAvailability(next);
      } catch (err: any) {
        console.error("fetch availability error:", err);
        toast.error(err?.message || "Failed to load availability");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [user?.id]);

  const setDayEnabled = (dayOfWeek: number, enabled: boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        enabled,
        slots: new Set(prev[dayOfWeek]?.slots || []),
      },
    }));
  };

  const toggleTimeSlot = (dayOfWeek: number, time: string) => {
    setAvailability((prev) => {
      const current = prev[dayOfWeek] || { enabled: false, slots: new Set<string>() };
      const nextSlots = new Set(current.slots);

      if (nextSlots.has(time)) nextSlots.delete(time);
      else nextSlots.add(time);

      return {
        ...prev,
        [dayOfWeek]: {
          enabled: nextSlots.size > 0,
          slots: nextSlots,
        },
      };
    });
  };

  const selectAllForDay = (dayOfWeek: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: { enabled: true, slots: new Set(TIME_SLOTS) },
    }));
  };

  const clearDay = (dayOfWeek: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: { enabled: false, slots: new Set() },
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const rows: AvailabilityRow[] = [];

      Object.entries(availability).forEach(([dayStr, dayState]) => {
        const day = Number(dayStr);
        if (!dayState.enabled || dayState.slots.size === 0) return;

        dayState.slots.forEach((startHHMM) => {
          rows.push({
            user_id: user.id,
            day_of_week: day,
            start_time: `${startHHMM}:00`,
            end_time: addMinutesHHMM(startHHMM, 30),
            is_active: true,
          });
        });
      });

      if (rows.length === 0) {
        const { error } = await supabase.from("earner_availability").delete().eq("user_id", user.id);
        if (error) throw error;
        toast.success("Availability cleared.");
        return;
      }

      // Wipe then insert strategy
      const del = await supabase.from("earner_availability").delete().eq("user_id", user.id);
      if (del.error) throw del.error;

      const ins = await supabase.from("earner_availability").insert(rows);
      if (ins.error) throw ins.error;

      toast.success("Availability saved successfully!");
    } catch (err: any) {
      console.error("save availability error:", err);
      toast.error(err?.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#0f0f12] border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-[#0f0f12] border-white/10 shadow-lg overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-white tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/20">
            <Calendar className="w-4 h-4 text-rose-400" />
          </div>
          Video Date Availability
        </CardTitle>
        <CardDescription className="text-white/50 text-sm">
          Set the times you accept video bookings. Seekers can only book within your available slots (EST).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {DAYS.map((day, index) => {
          const dayState = availability[day.value] || { enabled: false, slots: new Set<string>() };
          const selectedCount = dayState.slots.size;

          return (
            <div key={day.value}>
              {index > 0 && <Separator className="my-4 bg-white/5" />}

              <div className="space-y-4">
                {/* Day header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dayState.enabled}
                      onCheckedChange={(v) => setDayEnabled(day.value, v)}
                      className="data-[state=checked]:bg-rose-500"
                    />
                    <Label className="text-base font-semibold text-white">{day.label}</Label>
                  </div>

                  {dayState.enabled && (
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <span className="text-xs text-white/40 font-medium uppercase tracking-wide bg-white/5 px-2 py-1 rounded">
                        {selectedCount} selected
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => selectAllForDay(day.value)}
                        className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => clearDay(day.value)}
                        className="h-8 px-3 rounded-lg text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                {/* Slots - Using Grid for better responsiveness */}
                {dayState.enabled && (
                  <div className="ml-0 sm:ml-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {TIME_SLOTS.map((time) => {
                      const active = dayState.slots.has(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleTimeSlot(day.value, time)}
                          className={cn(
                            "h-9 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 border relative overflow-hidden",
                            active
                              ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20 hover:bg-rose-400"
                              : "bg-white/[0.02] text-white/40 border-white/5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white/60"
                          )}
                        >
                          {timeLabels[time]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Save */}
        <div className="pt-6 border-t border-white/5">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full h-11 text-base font-bold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </div>

        {/* Help box */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" />
            How it works
          </h4>
          <ul className="text-xs text-white/50 space-y-1 list-disc pl-5 leading-relaxed">
            <li>Turn a day on to choose specific time slots.</li>
            <li>Tap slots to select/deselect (30 min blocks).</li>
            <li>Seekers can only book inside your selected times.</li>
            <li>All times are shown in Eastern Time (EST).</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}