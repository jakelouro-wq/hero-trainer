import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Calendar, Dumbbell, Trash2, Edit, Shield, Image } from "lucide-react";
import { toast } from "sonner";
import ProgramImageUpload from "@/components/ProgramImageUpload";

const ProgramsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoach, isLoading: isCheckingAccess } = useCoachAccess();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    duration_weeks: 4,
    days_per_week: 4,
  });

  // Fetch coach profile for default image
  const { data: coachProfile } = useQuery({
    queryKey: ["coach-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isCoach,
  });

  const { data: programs, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isCoach,
  });

  const createProgram = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("programs").insert({
        name: newProgram.name,
        description: newProgram.description,
        duration_weeks: newProgram.duration_weeks,
        days_per_week: newProgram.days_per_week,
        created_by: user?.id,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setIsCreateOpen(false);
      setNewProgram({ name: "", description: "", duration_weeks: 4, days_per_week: 4 });
      toast.success("Program created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create program: " + error.message);
    },
  });

  const deleteProgram = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete program: " + error.message);
    },
  });

  if (isCheckingAccess || isLoading) {
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
                <h1 className="text-xl font-bold text-foreground">Programs</h1>
                <p className="text-sm text-muted-foreground">Create and manage training programs</p>
              </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Program
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Program</DialogTitle>
                  <DialogDescription>
                    Set up a new training program for your clients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Program Name</Label>
                    <Input
                      id="name"
                      value={newProgram.name}
                      onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                      placeholder="e.g., Strength Builder"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProgram.description}
                      onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                      placeholder="Describe the program goals and focus"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weeks">Duration (weeks)</Label>
                      <Input
                        id="weeks"
                        type="number"
                        min={1}
                        max={52}
                        value={newProgram.duration_weeks}
                        onChange={(e) =>
                          setNewProgram({ ...newProgram, duration_weeks: parseInt(e.target.value) || 1 })
                        }
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <Label htmlFor="days">Days per week</Label>
                      <Input
                        id="days"
                        type="number"
                        min={1}
                        max={7}
                        value={newProgram.days_per_week}
                        onChange={(e) =>
                          setNewProgram({ ...newProgram, days_per_week: parseInt(e.target.value) || 1 })
                        }
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => createProgram.mutate()}
                    disabled={!newProgram.name || createProgram.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {createProgram.isPending ? "Creating..." : "Create Program"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {programs?.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No programs yet</h2>
            <p className="text-muted-foreground mb-4">Create your first training program</p>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Program
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs?.map((program) => {
              const displayImage = (program as any).image_url || coachProfile?.avatar_url;
              return (
                <Card
                  key={program.id}
                  className="bg-card border-border hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {/* Program Image */}
                  <div className="relative aspect-video bg-muted">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={program.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-foreground">{program.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{program.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/coach/programs/${program.id}`)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProgram.mutate(program.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{program.duration_weeks} weeks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dumbbell className="w-4 h-4" />
                        <span>{program.days_per_week}x/week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProgramsPage;
