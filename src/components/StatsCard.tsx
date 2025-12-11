import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  delay?: number;
}

const StatsCard = ({ icon: Icon, label, value, subtext, delay = 0 }: StatsCardProps) => {
  return (
    <div 
      className="card-gradient rounded-xl p-5 border border-border hover:border-primary/30 transition-all duration-300 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {subtext && (
          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
            {subtext}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
};

export default StatsCard;
