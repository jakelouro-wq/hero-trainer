import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";

const SchedulePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoach, isLoading: isCoachLoading } = useCoachAccess();

  // Fetch all clients with their upcoming workouts
  const { data: clientSchedules, isLoading: isScheduleLoading } = useQuery({
    queryKey: ["coach-schedules"],
    queryFn: async () => {
      // Get all clients (users with role 'client')
      const { data: clientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (rolesError) throw rolesError;

      const clientIds = clientRoles?.map((r) => r.user_id) || [];

      if (clientIds.length === 0) return [];

      // Get profiles for these clients
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", clientIds);

      if (profilesError) throw profilesError;

      // Get upcoming workouts for these clients
      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data: workouts, error: workoutsError } = await supabase
        .from("user_workouts")
        .select(`
          id,
          scheduled_date,
          completed,
          user_id,
          workout_template:workout_templates(title, focus)
        `)
        .in("user_id", clientIds)
        .gte("scheduled_date", today)
        .lte("scheduled_date", weekEnd)
        .order("scheduled_date", { ascending: true });

      if (workoutsError) throw workoutsError;

      // Combine data
      return profiles?.map((profile) => ({
        ...profile,
        workouts: workouts?.filter((w) => w.user_id === profile.id) || [],
      })) || [];
    },
    enabled: isCoach,
  });

  if (isCoachLoading) {
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
        <p className="text-muted-foreground text-center">
          You need coach or admin permissions to access this area.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/coach")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Schedule</h1>
                <p className="text-sm text-muted-foreground">View client schedules for the next 7 days</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isScheduleLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-primary">Loading schedules...</div>
          </div>
        ) : clientSchedules?.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Clients Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add clients and assign them programs to see their schedules here.
              </p>
              <Button onClick={() => navigate("/coach/clients")}>
                Manage Clients
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {clientSchedules?.map((client) => (
              <Card key={client.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {client.avatar_url ? (
                        <img
                          src={client.avatar_url}
                          alt={client.full_name || "Client"}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold">
                          {(client.full_name || "C")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-foreground">
                        {client.full_name || "Unnamed Client"}
                      </CardTitle>
                      <CardDescription>
                        {client.workouts.length} workout{client.workouts.length !== 1 ? "s" : ""} scheduled
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.workouts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No workouts scheduled for the next 7 days</p>
                  ) : (
                    <div className="space-y-2">
                      {client.workouts.map((workout: any) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {workout.workout_template?.title || "Workout"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {workout.workout_template?.focus}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(workout.scheduled_date), "EEE, MMM d")}
                            </p>
                            <p className={`text-xs ${workout.completed ? "text-green-500" : "text-muted-foreground"}`}>
                              {workout.completed ? "Completed" : "Scheduled"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SchedulePage;
