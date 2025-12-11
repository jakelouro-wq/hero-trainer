import Header from "@/components/Header";
import WorkoutCard from "@/components/WorkoutCard";
import StatsCard from "@/components/StatsCard";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import ProgressRing from "@/components/ProgressRing";
import { Trophy, Flame, Calendar, TrendingUp, Zap } from "lucide-react";

const todayWorkout = {
  title: "Push Day",
  subtitle: "Week 3 • Day 3",
  duration: "55 min",
  calories: "420 cal",
  focus: "Chest & Shoulders",
  progress: 40,
  exercises: [
    { name: "Barbell Bench Press", sets: 4, reps: "8-10", weight: "185 lbs", completed: true },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: "60 lbs", completed: true },
    { name: "Overhead Press", sets: 4, reps: "8-10", weight: "95 lbs", notes: "Focus on strict form" },
    { name: "Dumbbell Lateral Raises", sets: 3, reps: "12-15", weight: "20 lbs" },
    { name: "Cable Flyes", sets: 3, reps: "12-15", notes: "Squeeze at the top" },
    { name: "Tricep Pushdowns", sets: 3, reps: "12-15", weight: "50 lbs" },
  ],
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="mb-8 opacity-0 animate-fade-in">
            <p className="text-muted-foreground mb-2">Welcome back,</p>
            <h1 className="text-4xl md:text-5xl font-display tracking-wide">
              ALEX <span className="text-gradient">JOHNSON</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              You're on a <span className="text-primary font-semibold">12-day streak</span>. Keep pushing!
            </p>
          </div>

          {/* Weekly Calendar */}
          <WeeklyCalendar />
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Today's Workout */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Today's Workout
            </h2>
            <WorkoutCard {...todayWorkout} />
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Your Progress
            </h2>
            
            {/* Progress Rings */}
            <div className="card-gradient rounded-xl p-6 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex justify-around">
                <ProgressRing progress={75} label="Weekly Goal" value="75%" />
                <ProgressRing progress={92} label="Consistency" value="92%" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatsCard
                icon={Trophy}
                label="Total Workouts"
                value="47"
                subtext="+3 this week"
                delay={500}
              />
              <StatsCard
                icon={Flame}
                label="Current Streak"
                value="12"
                subtext="Days"
                delay={600}
              />
              <StatsCard
                icon={Calendar}
                label="This Month"
                value="18"
                subtext="Sessions"
                delay={700}
              />
              <StatsCard
                icon={TrendingUp}
                label="PR's Hit"
                value="8"
                subtext="All time"
                delay={800}
              />
            </div>

            {/* Upcoming */}
            <div className="card-gradient rounded-xl p-5 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "900ms" }}>
              <h3 className="font-semibold text-foreground mb-4">Coming Up</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Pull Day</p>
                    <p className="text-sm text-muted-foreground">Tomorrow</p>
                  </div>
                  <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                    Back & Biceps
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Leg Day</p>
                    <p className="text-sm text-muted-foreground">Friday</p>
                  </div>
                  <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                    Quads & Glutes
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium text-muted-foreground">Rest Day</p>
                    <p className="text-sm text-muted-foreground">Saturday</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-2 py-1 rounded-full">
                    Recovery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
