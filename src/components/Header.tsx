import { Dumbbell, Bell, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl tracking-wide text-foreground">
            TRAIN<span className="text-primary">HEROIC</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-foreground font-medium hover:text-primary transition-colors">
            Dashboard
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Programs
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Calendar
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Community
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <User className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
