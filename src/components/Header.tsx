import { Bell, User, Menu, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { useNavigate } from "react-router-dom";
import louroLogo from "@/assets/louro-logo.png";

const Header = () => {
  const { signOut } = useAuth();
  const { isCoach } = useCoachAccess();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
          <img src={louroLogo} alt="Louro Training" className="h-20" />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a 
            onClick={() => navigate("/")}
            className="text-foreground font-medium hover:text-primary transition-colors cursor-pointer"
          >
            Dashboard
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Programs
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Calendar
          </a>
          {isCoach && (
            <a 
              onClick={() => navigate("/coach")}
              className="text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1"
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
    </header>
  );
};

export default Header;
