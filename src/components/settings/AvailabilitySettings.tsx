import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Loader2, Clock } from "lucide-react";

interface AvailabilitySlot {
  id?: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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

export default function AvailabilitySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Record<number, { enabled: boolean; slots: Set<string> }>>({});

  // Initialize default availability structure
  useEffect(() => {
    const defaultAvailability: Record<number, { enabled: boolean; slots: Set<string> }> = {};
    DAYS.forEach((day) => {
      defaultAvailability[day.value] = { enabled: false, slots: new Set() };
    });
    setAvailability(defaultAvailability);
  }, []);

  // Fetch existing availability
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.from("earner_availability").select("*").eq("user_id", user.id);

        if (error) throw error;

        // Process fetched data into our state structure
        const processed: Record<number, { enabled: boolean; slots: Set<string> }> = {};
        DAYS.forEach((day) => {
          processed[day.value] = { enabled: false, slots: new Set() };
        });

        (data || []).forEach((slot: any) => {
          if (!processed[slot.day_of_week]) {
            processed[slot.day_of_week] = { enabled: false, slots: new Set() };
          }
          if (slot.is_active) {
            processed[slot.day_of_week].enabled = true;
            processed[slot.day_of_week].slots.add(slot.start_time.substring(0, 5));
          }
        });

        setAvailability(processed);
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [user]);

  const toggleDay = (dayOfWeek: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        enabled: !prev[dayOfWeek]?.enabled,
        slots: new Set(), // Start with no pre-selected slots
      },
    }));
  };

  const toggleTimeSlot = (dayOfWeek: number, time: string) => {
    setAvailability((prev) => {
      const newSlots = new Set(prev[dayOfWeek]?.slots || []);
      if (newSlots.has(time)) {
        newSlots.delete(time);
      } else {
        newSlots.add(time);
      }
      return {
        ...prev,
        [dayOfWeek]: {
          ...prev[dayOfWeek],
          enabled: newSlots.size > 0,
          slots: newSlots,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete existing availability
      await supabase.from("earner_availability").delete().eq("user_id", user.id);

      // Insert new availability slots
      const slotsToInsert: Omit<AvailabilitySlot, "id">[] = [];

      Object.entries(availability).forEach(([day, { enabled, slots }]) => {
        if (enabled && slots.size > 0) {
          slots.forEach((startTime) => {
            // Each time slot is 30 minutes
            const [hours, mins] = startTime.split(":").map(Number);
            const endMinutes = mins + 30;
            const endHours = hours + Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}:00`;

            slotsToInsert.push({
              user_id: user.id,
              day_of_week: parseInt(day),
              start_time: `${startTime}:00`,
              end_time: endTime,
              is_active: true,
            });
          });
        }
      });

      if (slotsToInsert.length > 0) {
        const { error } = await supabase.from("earner_availability").insert(slotsToInsert);

        if (error) throw error;
      }

      toast.success("Availability saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    // Special formatting for midnight and noon
    if (hours === 0 && mins === 0) return "12AM";
    if (hours === 12 && mins === 0) return "12PM";

    return mins === 0 ? `${displayHours}${ampm}` : `${displayHours}:${String(mins).padStart(2, "0")}${ampm}`;
  };

  if (loading) {
    return (
      <Card className="bg-[#1a1a1f]/50 border-white/10">
        <CardContent className="flex items-center justify-center py-8">
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
          Call Availability
        </CardTitle>
        <CardDescription className="text-white/50">
          Set your available hours for audio and video calls. Seekers will only be able to book during these times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS.map((day, index) => (
          <div key={day.value}>
            {index > 0 && <Separator className="my-4 bg-white/10" />}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={availability[day.value]?.enabled || false}
                    onCheckedChange={() => toggleDay(day.value)}
                    className="data-[state=checked]:bg-rose-500"
                  />
                  <Label className="text-base font-medium text-white">{day.label}</Label>
                </div>
                {availability[day.value]?.enabled && (
                  <span className="text-sm text-white/50">
                    {availability[day.value].slots.size} slot(s) selected
                  </span>
                )}
              </div>

              {availability[day.value]?.enabled && (
                <div className="ml-10 flex flex-wrap gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => toggleTimeSlot(day.value, time)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                        ${
                          availability[day.value].slots.has(time)
                            ? "bg-rose-500 text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                        }
                      `}
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-semibold"
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

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-rose-400" />
            How it works
          </h4>
          <ul className="text-sm text-white/50 space-y-1">
            <li>• Toggle a day to enable/disable availability</li>
            <li>• Click time slots to mark when you're available</li>
            <li>• Seekers can only book during your available times</li>
            <li>• All times are in Eastern Time (EST)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
