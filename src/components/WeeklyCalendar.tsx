import { useMemo } from "react";
import { startOfWeek, addDays, format, isToday, isSameDay, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManualActivities, ACTIVITY_TYPES } from "@/hooks/useManualActivities";

const WeeklyCalendar = () => {
  const { user } = useAuth();
  
  // Get the start of the current week (Monday)
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  
  // Generate the 7 days of the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch user workouts for this week
  const { data: workouts } = useQuery({
    queryKey: ["weekly-workouts", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const weekEnd = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from("user_workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch manual activities for this week
  const { data: activities } = useManualActivities();
  
  const getActivityForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return activities?.find(a => a.activity_date === dateStr);
  };

  const getWorkoutForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workouts?.find(w => w.scheduled_date === dateStr);
  };

  const getActivityIcon = (type: string) => {
    return ACTIVITY_TYPES.find(a => a.value === type)?.icon || "💪";
  };

  return (
    <div className="card-gradient rounded-xl p-4 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{format(weekStart, "MMMM yyyy")}</span>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const workout = getWorkoutForDate(date);
          const activity = getActivityForDate(date);
          const isActive = isToday(date);
          const hasWorkout = !!workout;
          const workoutCompleted = workout?.completed;
          const hasActivity = !!activity;
          
          return (
            <button
              key={index}
              className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 relative ${
                isActive 
                  ? "bg-primary text-primary-foreground glow" 
                  : workoutCompleted
                  ? "bg-primary/10 text-primary"
                  : hasActivity
                  ? "bg-accent/20 text-foreground"
                  : hasWorkout
                  ? "bg-secondary/50 text-foreground hover:bg-secondary"
                  : "bg-secondary/30 text-muted-foreground"
              }`}
            >
              <span className="text-xs font-medium opacity-70">{format(date, "EEE")}</span>
              <span className="text-lg font-bold">{format(date, "d")}</span>
              
              {/* Indicators */}
              <div className="flex gap-0.5 mt-1 h-4 items-center">
                {workoutCompleted && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {hasWorkout && !workoutCompleted && (
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                )}
                {hasActivity && (
                  <span className="text-xs">{getActivityIcon(activity.activity_type)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
