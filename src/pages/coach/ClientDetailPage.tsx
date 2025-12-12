import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Mail, 
  User, 
  Dumbbell,
  CheckCircle2,
  XCircle,
  GripVertical,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";

const ClientDetailPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const queryClient = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Fetch client profile
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isCoach && !!clientId,
  });

  // Fetch client's email from auth (via user_roles for reference)
  const { data: clientEmail } = useQuery({
    queryKey: ["client-email", clientId],
    queryFn: async () => {
      // We can get email from the profiles or by querying auth users indirectly
      // For now, we'll check if there's a way to get it from existing data
      // Since we don't have direct access to auth.users, we'll note this limitation
      return null;
    },
    enabled: isCoach && !!clientId,
  });

  // Fetch client's assigned program
  const { data: clientProgram } = useQuery({
    queryKey: ["client-program", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_programs")
        .select("*, programs(*)")
        .eq("user_id", clientId)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isCoach && !!clientId,
  });

  // Fetch all workouts for this client
  const { data: workouts, isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ["client-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workouts")
        .select("*, workout_templates(title, focus, duration)")
        .eq("user_id", clientId)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isCoach && !!clientId,
  });

  // Fetch last workout completion
  const { data: lastCompletedWorkout } = useQuery({
    queryKey: ["client-last-workout", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workouts")
        .select("completed_at")
        .eq("user_id", clientId)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isCoach && !!clientId,
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
      queryClient.invalidateQueries({ queryKey: ["client-workouts", clientId] });
      setIsRescheduleOpen(false);
      setSelectedWorkout(null);
      setNewDate("");
      toast.success("Workout rescheduled successfully");
    },
    onError: (error) => {
      toast.error("Failed to reschedule: " + error.message);
    },
  });

  const handleReschedule = (workout: any) => {
    setSelectedWorkout(workout);
    setNewDate(workout.scheduled_date);
    setIsRescheduleOpen(true);
  };

  // Calculate stats
  const completedWorkouts = workouts?.filter(w => w.completed) || [];
  const upcomingWorkouts = workouts?.filter(w => !w.completed && new Date(w.scheduled_date) >= new Date()) || [];
  const pastIncompleteWorkouts = workouts?.filter(w => !w.completed && new Date(w.scheduled_date) < new Date()) || [];

  const daysSinceLastWorkout = lastCompletedWorkout?.completed_at 
    ? differenceInDays(new Date(), parseISO(lastCompletedWorkout.completed_at))
    : null;

  const memberSince = client?.created_at 
    ? differenceInDays(new Date(), parseISO(client.created_at))
    : null;

  if (isCheckingAccess || isLoadingClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <User className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Client Not Found</h1>
        <Button onClick={() => navigate("/coach/clients")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/coach/clients")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {client.full_name || "Unnamed Client"}
              </h1>
              <p className="text-sm text-muted-foreground">Client Details & Calendar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fitness Level</p>
                  <p className="font-semibold text-foreground capitalize">
                    {client.fitness_level || "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member For</p>
                  <p className="font-semibold text-foreground">
                    {memberSince !== null ? `${memberSince} days` : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Since Last Workout</p>
                  <p className="font-semibold text-foreground">
                    {daysSinceLastWorkout !== null ? daysSinceLastWorkout : "No workouts yet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Workouts Completed</p>
                  <p className="font-semibold text-foreground">{completedWorkouts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Program */}
        {clientProgram && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                Current Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-lg">
                    {(clientProgram as any).programs?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started: {format(new Date(clientProgram.start_date), "MMMM d, yyyy")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {(clientProgram as any).programs?.duration_weeks}w / {(clientProgram as any).programs?.days_per_week}x per week
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workout Calendar */}
        <div className="space-y-6">
          {/* Missed Workouts */}
          {pastIncompleteWorkouts.length > 0 && (
            <Card className="bg-card border-border border-destructive/50">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  Missed Workouts ({pastIncompleteWorkouts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastIncompleteWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-destructive/20"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">
                            {workout.workout_templates?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled: {format(new Date(workout.scheduled_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReschedule(workout)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Workouts */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Workouts ({upcomingWorkouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingWorkouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No upcoming workouts scheduled</p>
              ) : (
                <div className="space-y-2">
                  {upcomingWorkouts.slice(0, 10).map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">
                            {workout.workout_templates?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(workout.scheduled_date), "EEEE, MMM d, yyyy")}
                            {workout.workout_templates?.duration && (
                              <span> • {workout.workout_templates.duration}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReschedule(workout)}
                      >
                        Move
                      </Button>
                    </div>
                  ))}
                  {upcomingWorkouts.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {upcomingWorkouts.length - 10} more workouts
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Workouts */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Completed Workouts ({completedWorkouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedWorkouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No workouts completed yet</p>
              ) : (
                <div className="space-y-2">
                  {completedWorkouts.slice(-10).reverse().map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="font-medium text-foreground">
                            {workout.workout_templates?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Completed: {workout.completed_at 
                              ? format(new Date(workout.completed_at), "MMM d, yyyy")
                              : format(new Date(workout.scheduled_date), "MMM d, yyyy")}
                            {workout.duration_seconds && (
                              <span> • {Math.floor(workout.duration_seconds / 60)}m</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {completedWorkouts.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      Showing last 10 of {completedWorkouts.length} completed workouts
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reschedule Workout</DialogTitle>
            <DialogDescription>
              {selectedWorkout?.workout_templates?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">New Date</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              onClick={() => rescheduleWorkout.mutate({ 
                workoutId: selectedWorkout?.id, 
                newDate 
              })}
              disabled={!newDate || rescheduleWorkout.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {rescheduleWorkout.isPending ? "Saving..." : "Save New Date"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetailPage;
