import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, Calendar, FolderOpen, ArrowLeft, Shield } from "lucide-react";

const CoachDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoach, isLoading } = useCoachAccess();

  if (isLoading) {
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

  const menuItems = [
    {
      title: "Programs",
      description: "Create and manage training programs",
      icon: FolderOpen,
      href: "/coach/programs",
    },
    {
      title: "Workouts",
      description: "Build workout templates for programs",
      icon: Dumbbell,
      href: "/coach/workouts",
    },
    {
      title: "Clients",
      description: "Manage clients and assign programs",
      icon: Users,
      href: "/coach/clients",
    },
    {
      title: "Schedule",
      description: "View and manage client schedules",
      icon: Calendar,
      href: "/coach/schedule",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coach Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your training programs</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Card
              key={item.title}
              className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(item.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CoachDashboard;
