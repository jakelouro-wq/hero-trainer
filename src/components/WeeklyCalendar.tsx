import { useMemo, useState } from "react";
import { startOfWeek, addDays, format, isToday } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManualActivities, useDeleteManualActivity, ACTIVITY_TYPES } from "@/hooks/useManualActivities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Dumbbell, Clock, CheckCircle2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WeeklyCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
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
        .select("*, workout_templates(title, duration, focus)")
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
  const deleteActivity = useDeleteManualActivity();
  
  const getActivitiesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return activities?.filter(a => a.activity_date === dateStr) || [];
  };

  const getWorkoutsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workouts?.filter(w => w.scheduled_date === dateStr) || [];
  };

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

  const getActivityLabel = (type: string) => {
    return ACTIVITY_TYPES.find(a => a.value === type)?.label || type;
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity.mutateAsync(activityId);
      toast({ title: "Activity deleted" });
    } catch (error) {
      toast({ title: "Error deleting activity", variant: "destructive" });
    }
  };

  // Get data for selected date
  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate) : [];
  const selectedDateActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];
  const hasSelectedDateContent = selectedDateWorkouts.length > 0 || selectedDateActivities.length > 0;

  return (
    <>
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
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 relative ${
                  isActive 
                    ? "bg-primary text-primary-foreground glow" 
                    : workoutCompleted
                    ? "bg-primary/10 text-primary"
                    : hasActivity
                    ? "bg-accent/20 text-foreground"
                    : hasWorkout
                    ? "bg-secondary/50 text-foreground hover:bg-secondary"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
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

      {/* Day Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!hasSelectedDateContent ? (
              <p className="text-muted-foreground text-center py-4">No activities on this day</p>
            ) : (
              <>
                {/* Workouts */}
                {selectedDateWorkouts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" />
                      Workouts
                    </h4>
                    {selectedDateWorkouts.map((workout: any) => (
                      <div
                        key={workout.id}
                        className="p-3 bg-secondary/50 rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {workout.workout_templates?.title || "Workout"}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              {workout.workout_templates?.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {workout.workout_templates.duration}
                                </span>
                              )}
                              {workout.completed && (
                                <span className="flex items-center gap-1 text-primary">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Completed
                                </span>
                              )}
                            </div>
                            {workout.duration_seconds && workout.completed && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Duration: {Math.floor(workout.duration_seconds / 60)}m {workout.duration_seconds % 60}s
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Activities */}
                {selectedDateActivities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Activities</h4>
                    {selectedDateActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3 bg-secondary/50 rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getActivityIcon(activity.activity_type)}</span>
                            <div>
                              <p className="font-medium text-foreground">
                                {getActivityLabel(activity.activity_type)}
                              </p>
                              {activity.duration_minutes && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.duration_minutes} minutes
                                </p>
                              )}
                              {activity.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteActivity(activity.id)}
                            disabled={deleteActivity.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeeklyCalendar;
