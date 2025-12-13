import { useState } from "react";
import { Bell, User, Menu, LogOut, Shield, Trophy, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { useNavigate, useLocation } from "react-router-dom";
import louroLogo from "@/assets/louro-logo.png";
import MessagingPanel from "@/components/MessagingPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const { signOut, user } = useAuth();
  const { isCoach } = useCoachAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Fetch coach info for messaging (for athletes)
  const { data: coachInfo } = useQuery({
    queryKey: ["coach-for-messaging", user?.id],
    queryFn: async () => {
      if (!user?.id || isCoach) return null;

      // Find the coach who assigned a program to this user
      const { data: clientProgram } = await supabase
        .from("client_programs")
        .select("assigned_by")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!clientProgram?.assigned_by) return null;

      // Get coach profile
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", clientProgram.assigned_by)
        .single();

      return coachProfile;
    },
    enabled: !!user?.id && !isCoach,
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
          <img src={louroLogo} alt="Louro Training" className="h-20" />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a 
            onClick={() => navigate("/")}
            className={`font-medium hover:text-primary transition-colors cursor-pointer ${isActive("/") ? "text-primary" : "text-foreground"}`}
          >
            Dashboard
          </a>
          <a 
            onClick={() => navigate("/badges")}
            className={`hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${isActive("/badges") ? "text-primary" : "text-muted-foreground"}`}
          >
            <Trophy className="w-4 h-4" />
            Trophy Closet
          </a>
          <a 
            onClick={() => navigate("/community")}
            className={`hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${isActive("/community") ? "text-primary" : "text-muted-foreground"}`}
          >
            <Users className="w-4 h-4" />
            Community
          </a>
          {isCoach && (
            <a 
              onClick={() => navigate("/coach")}
              className={`font-medium hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1 ${isActive("/coach") ? "text-primary" : "text-primary"}`}
            >
              <Shield className="w-4 h-4" />
              Coach
            </a>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isCoach && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-primary hover:text-primary/80 hover:bg-secondary"
              onClick={() => navigate("/coach")}
              title="Coach Dashboard"
            >
              <Shield className="w-5 h-5" />
            </Button>
          )}
          
          {/* Message Coach button for athletes */}
          {!isCoach && coachInfo && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => setIsMessagingOpen(true)}
              title="Message Coach"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          )}
          
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
            <User className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messaging Panel for athletes */}
      {coachInfo && (
        <MessagingPanel
          isOpen={isMessagingOpen}
          onClose={() => setIsMessagingOpen(false)}
          recipientId={coachInfo.id}
          recipientName={coachInfo.full_name || "Coach"}
          recipientAvatar={coachInfo.avatar_url}
        />
      )}
    </header>
  );
};

export default Header;
