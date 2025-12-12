import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { useBlockedDates, isDateBlocked } from "@/hooks/useBlockedDates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, Calendar, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const ClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const queryClient = useQueryClient();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: blockedDates } = useBlockedDates();
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      return data;
    },
    enabled: isCoach,
  });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isCoach,
  });

  const { data: clientPrograms } = useQuery({
    queryKey: ["client-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_programs")
        .select("*, programs(*)");

      if (error) throw error;
      return data;
    },
    enabled: isCoach,
  });

  const assignProgram = useMutation({
    mutationFn: async () => {
      if (!selectedClient || !selectedProgram) return;

      // First, create the client_program assignment
      const { data: assignment, error: assignError } = await supabase
        .from("client_programs")
        .insert({
          user_id: selectedClient,
          program_id: selectedProgram,
          start_date: startDate,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (assignError) throw assignError;

      // Get program details and workouts
      const { data: program } = await supabase
        .from("programs")
        .select("*, workout_templates(*)")
        .eq("id", selectedProgram)
        .single();

      if (program && program.workout_templates) {
        // Schedule all workouts for the client, respecting blocked dates
        const startDateObj = new Date(startDate);
        const userWorkouts: { user_id: string; workout_template_id: string; scheduled_date: string }[] = [];

        // Helper to find next available date
        const findNextAvailableDate = (date: Date): Date => {
          let checkDate = new Date(date);
          // Max 30 days of searching to prevent infinite loops
          for (let i = 0; i < 30; i++) {
            if (!isDateBlocked(checkDate, blockedDates || [], selectedClient)) {
              return checkDate;
            }
            checkDate = addDays(checkDate, 1);
          }
          return date; // Fallback to original date if no available found
        };

        let currentDate = new Date(startDateObj);
        
        // Sort workouts by week and day number
        const sortedWorkouts = [...program.workout_templates].sort((a: any, b: any) => {
          if (a.week_number !== b.week_number) {
            return a.week_number - b.week_number;
          }
          return a.day_number - b.day_number;
        });

        for (const workout of sortedWorkouts as any[]) {
          // Find the next available date that isn't blocked
          currentDate = findNextAvailableDate(currentDate);

          userWorkouts.push({
            user_id: selectedClient,
            workout_template_id: workout.id,
            scheduled_date: format(currentDate, "yyyy-MM-dd"),
          });

          // Move to the next day for the next workout
          currentDate = addDays(currentDate, 1);
        }

        if (userWorkouts.length > 0) {
          const { error: scheduleError } = await supabase
            .from("user_workouts")
            .insert(userWorkouts);

          if (scheduleError) throw scheduleError;
        }
      }

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-programs"] });
      setIsAssignOpen(false);
      setSelectedClient(null);
      setSelectedProgram("");
      toast.success("Program assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign program: " + error.message);
    },
  });

  const getClientProgram = (clientId: string) => {
    return clientPrograms?.find((cp) => cp.user_id === clientId);
  };

  if (isCheckingAccess || isLoadingClients) {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
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
              <h1 className="text-xl font-bold text-foreground">Clients</h1>
              <p className="text-sm text-muted-foreground">Manage clients and assign programs</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {clients?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No clients yet</h2>
            <p className="text-muted-foreground">Clients will appear here when they sign up</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients?.map((client) => {
              const clientProgram = getClientProgram(client.id);
              return (
                <Card
                  key={client.id}
                  className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/coach/clients/${client.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-foreground">
                          {client.full_name || "Unnamed User"}
                        </CardTitle>
                        <CardDescription>
                          {client.fitness_level || "No fitness level set"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clientProgram ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-foreground">
                            {(clientProgram as any).programs?.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Started: {format(new Date(clientProgram.start_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client.id);
                          setIsAssignOpen(true);
                        }}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Program
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Program</DialogTitle>
            <DialogDescription>
              Select a program and start date for this client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} ({program.duration_weeks}w / {program.days_per_week}x)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              onClick={() => assignProgram.mutate()}
              disabled={!selectedProgram || assignProgram.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {assignProgram.isPending ? "Assigning..." : "Assign Program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
