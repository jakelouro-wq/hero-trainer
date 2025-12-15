import { useMemo, useState } from "react";
import { startOfWeek, addDays, format, isToday, startOfMonth, endOfMonth, isSameMonth, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManualActivities, useDeleteManualActivity, ACTIVITY_TYPES } from "@/hooks/useManualActivities";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Trash2, Dumbbell, Clock, CheckCircle2, Calendar, Eye, CalendarDays, Expand, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const WeeklyCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rescheduleWorkoutId, setRescheduleWorkoutId] = useState<string | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState<Date | undefined>(undefined);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [fullCalendarMonth, setFullCalendarMonth] = useState(new Date());
  
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

  // Fetch all user workouts for the full calendar month
  const { data: monthWorkouts } = useQuery({
    queryKey: ["monthly-workouts", user?.id, format(fullCalendarMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const monthStart = startOfMonth(fullCalendarMonth);
      const monthEnd = endOfMonth(fullCalendarMonth);
      
      const { data, error } = await supabase
        .from("user_workouts")
        .select("*, workout_templates(title, duration, focus)")
        .eq("user_id", user.id)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && showFullCalendar,
  });

  // Fetch manual activities for this week
  const { data: activities } = useManualActivities();
  const deleteActivity = useDeleteManualActivity();

  const getMonthWorkoutForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthWorkouts?.find(w => w.scheduled_date === dateStr);
  };
  
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

  // Delete workout mutation
  const deleteWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from("user_workouts")
        .delete()
        .eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-workouts"] });
      toast({ title: "Workout deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting workout", variant: "destructive" });
    },
  });

  // Reschedule workout mutation
  const rescheduleWorkout = useMutation({
    mutationFn: async ({ workoutId, newDate }: { workoutId: string; newDate: string }) => {
      const { error } = await supabase
        .from("user_workouts")
        .update({ scheduled_date: newDate })
        .eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-workouts"] });
      setRescheduleWorkoutId(null);
      setNewScheduleDate(undefined);
      toast({ title: "Workout rescheduled" });
    },
    onError: (error) => {
      toast({ title: "Error rescheduling workout", variant: "destructive" });
    },
  });

  const handleReschedule = (workoutId: string) => {
    setRescheduleWorkoutId(workoutId);
  };

  const confirmReschedule = () => {
    if (rescheduleWorkoutId && newScheduleDate) {
      rescheduleWorkout.mutate({
        workoutId: rescheduleWorkoutId,
        newDate: format(newScheduleDate, "yyyy-MM-dd"),
      });
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFullCalendar(true)}
            className="h-8 w-8"
            title="View full calendar"
          >
            <Expand className="w-4 h-4" />
          </Button>
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
                          <div className="flex-1">
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
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedDate(null);
                                navigate(`/workout/${workout.id}`);
                              }}
                              className="h-8 w-8"
                              title="View workout"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Reschedule"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <CalendarComponent
                                  mode="single"
                                  selected={rescheduleWorkoutId === workout.id ? newScheduleDate : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      rescheduleWorkout.mutate({
                                        workoutId: workout.id,
                                        newDate: format(date, "yyyy-MM-dd"),
                                      });
                                    }
                                  }}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteWorkout.mutate(workout.id)}
                              disabled={deleteWorkout.isPending}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete workout"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Full Calendar Dialog */}
      <Dialog open={showFullCalendar} onOpenChange={setShowFullCalendar}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Full Calendar</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFullCalendarMonth(addDays(startOfMonth(fullCalendarMonth), -1))}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(fullCalendarMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFullCalendarMonth(addDays(endOfMonth(fullCalendarMonth), 1))}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const monthStart = startOfMonth(fullCalendarMonth);
                const monthEnd = endOfMonth(fullCalendarMonth);
                const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                const calendarEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), 6);
                
                const days: Date[] = [];
                let day = calendarStart;
                while (day <= calendarEnd) {
                  days.push(day);
                  day = addDays(day, 1);
                }

                return days.map((date, index) => {
                  const workout = getMonthWorkoutForDate(date);
                  const activity = activities?.find(a => a.activity_date === format(date, "yyyy-MM-dd"));
                  const isCurrentMonth = isSameMonth(date, fullCalendarMonth);
                  const isActiveDay = isToday(date);
                  const hasWorkout = !!workout;
                  const workoutCompleted = workout?.completed;
                  const hasActivity = !!activity;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedDate(date);
                        setShowFullCalendar(false);
                      }}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg transition-all duration-200 min-h-[60px]",
                        !isCurrentMonth && "opacity-30",
                        isActiveDay
                          ? "bg-primary text-primary-foreground"
                          : workoutCompleted
                          ? "bg-primary/20 text-primary"
                          : hasActivity
                          ? "bg-accent/20 text-foreground"
                          : hasWorkout
                          ? "bg-secondary/50 text-foreground hover:bg-secondary"
                          : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      <span className="text-sm font-bold">{format(date, "d")}</span>
                      
                      {/* Indicators */}
                      <div className="flex flex-col gap-0.5 mt-1 items-center">
                        {hasWorkout && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            workoutCompleted ? "bg-primary" : "bg-muted-foreground/50"
                          )} />
                        )}
                        {hasActivity && (
                          <span className="text-xs">{getActivityIcon(activity.activity_type)}</span>
                        )}
                      </div>
                      
                      {/* Workout title preview */}
                      {hasWorkout && isCurrentMonth && (
                        <span className="text-[10px] text-center line-clamp-1 mt-1 opacity-70">
                          {workout.workout_templates?.title}
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeeklyCalendar;
