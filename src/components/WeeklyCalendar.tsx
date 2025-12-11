const days = [
  { day: "Mon", date: 9, active: false, completed: true },
  { day: "Tue", date: 10, active: false, completed: true },
  { day: "Wed", date: 11, active: true, completed: false },
  { day: "Thu", date: 12, active: false, completed: false },
  { day: "Fri", date: 13, active: false, completed: false },
  { day: "Sat", date: 14, active: false, rest: true },
  { day: "Sun", date: 15, active: false, rest: true },
];

const WeeklyCalendar = () => {
  return (
    <div className="card-gradient rounded-xl p-4 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">This Week</h3>
        <span className="text-sm text-muted-foreground">December 2024</span>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((item, index) => (
          <button
            key={index}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
              item.active 
                ? "bg-primary text-primary-foreground glow" 
                : item.completed
                ? "bg-primary/10 text-primary"
                : item.rest
                ? "bg-secondary/30 text-muted-foreground"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
          >
            <span className="text-xs font-medium opacity-70">{item.day}</span>
            <span className="text-lg font-bold">{item.date}</span>
            {item.completed && !item.active && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
